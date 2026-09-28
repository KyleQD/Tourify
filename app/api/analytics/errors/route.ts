import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { assertPlatformAdmin } from '@/lib/auth/platform-admin'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { createRateLimiter, clientKeyFromRequest } from '@/lib/utils/rate-limit'

// Bounds for anonymous client error reports — prevents unbounded spam rows.
const MAX_BATCH = 10
const MAX_MESSAGE_LENGTH = 2000
const MAX_CONTEXT_LENGTH = 120

const reportSchema = z.object({
  errors: z.array(z.object({
    error: z.union([
      z.string().max(MAX_MESSAGE_LENGTH),
      z.object({
        message: z.string().max(MAX_MESSAGE_LENGTH).optional(),
        name: z.string().max(120).optional(),
      }),
    ]),
    context: z.string().max(MAX_CONTEXT_LENGTH).optional(),
    sessionId: z.string().max(120).optional(),
    severity: z.string().max(40).optional(),
    url: z.string().max(500).optional(),
    userAgent: z.string().max(300).optional(),
  })).min(1).max(MAX_BATCH),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const body = await request.json().catch(() => null)
    const parsed = reportSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid error data' }, { status: 400 })
    }

    // Abuse control: cap report volume per client per window.
    const rl = createRateLimiter({ namespace: 'error-reports', limit: 30, windowSec: 600 })
    const { success } = await rl.check(clientKeyFromRequest(request))
    if (!success) {
      return NextResponse.json({ error: 'Too many error reports' }, { status: 429 })
    }

    // Process and clean error data — only known fields are persisted.
    const processedErrors = parsed.data.errors.map(report => ({
      error_message:
        typeof report.error === 'string'
          ? report.error
          : report.error.message || 'Unknown error',
      error_type:
        typeof report.error === 'object' && report.error.name
          ? report.error.name
          : 'Error',
      context: report.context || 'Unknown',
      sessionId: report.sessionId || null,
      severity: report.severity || null,
      url: report.url || null,
      user_agent: report.userAgent || null,
      created_at: new Date().toISOString()
    }))

    // Store errors in Supabase
    const { error } = await supabase
      .from('error_reports')
      .insert(processedErrors)

    if (error) {
      console.error('Error storing error reports:', error)
      return NextResponse.json({ error: 'Failed to store error reports' }, { status: 500 })
    }

    // Send critical errors to external monitoring (optional)
    const criticalErrors = processedErrors.filter(err =>
      String(err.context).includes('Auth') ||
      String(err.context).includes('Payment') ||
      err.error_message.includes('500')
    )

    if (criticalErrors.length > 0) {
      await notifyExternalMonitoring(criticalErrors)
    }

    return NextResponse.json({ success: true, count: parsed.data.errors.length })
  } catch (error) {
    console.error('Error tracking endpoint error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // SECURITY: error reports contain messages, session ids and context —
    // platform-admin only. (Was previously readable by any visitor.)
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!(await assertPlatformAdmin(supabase, user.id))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const svc = createServiceRoleClient()
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    const severity = searchParams.get('severity')
    const timeRange = searchParams.get('timeRange') || '24h'

    let query = svc.from('error_reports').select('*')
    
    if (sessionId) {
      query = query.eq('sessionId', sessionId)
    }
    
    if (severity) {
      query = query.eq('severity', severity)
    }
    
    // Add time range filter
    const hoursAgo = timeRange === '1h' ? 1 : timeRange === '24h' ? 24 : 168
    const cutoffTime = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString()
    query = query.gte('created_at', cutoffTime)
    
    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(500)
    
    if (error) {
      console.error('Error fetching error reports:', error)
      return NextResponse.json({ error: 'Failed to fetch error reports' }, { status: 500 })
    }

    // Aggregate error statistics
    const stats = aggregateErrorStats(data || [])
    
    return NextResponse.json({ errors: data, stats })
  } catch (error) {
    console.error('Error tracking fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function notifyExternalMonitoring(errors: any[]) {
  // Integration with external services like Sentry, Bugsnag, etc.
  try {
    if (process.env.WEBHOOK_ERROR_ALERTS) {
      await fetch(process.env.WEBHOOK_ERROR_ALERTS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `${errors.length} critical errors detected`,
          errors: errors.slice(0, 5), // Send first 5 errors
          timestamp: new Date().toISOString()
        })
      })
    }
  } catch (webhookError) {
    console.error('Failed to send webhook notification:', webhookError)
  }
}

function aggregateErrorStats(errors: any[]) {
  const stats = {
    totalErrors: errors.length,
    errorsByContext: {} as Record<string, number>,
    errorsByType: {} as Record<string, number>,
    sessionsAffected: new Set<string>(),
    mostCommonErrors: [] as any[]
  }
  
  errors.forEach(error => {
    // Count by context
    const context = error.context || 'Unknown'
    stats.errorsByContext[context] = (stats.errorsByContext[context] || 0) + 1
    
    // Count by type
    const type = error.error_type || 'Unknown'
    stats.errorsByType[type] = (stats.errorsByType[type] || 0) + 1
    
    // Track affected sessions
    if (error.sessionId) {
      stats.sessionsAffected.add(error.sessionId)
    }
  })
  
  // Find most common errors
  const errorGroups = errors.reduce((acc, error) => {
    const key = `${error.error_type}:${error.error_message?.substring(0, 100)}`
    if (!acc[key]) {
      acc[key] = { count: 0, example: error }
    }
    acc[key].count++
    return acc
  }, {} as Record<string, any>)
  
  stats.mostCommonErrors = Object.entries(errorGroups)
    .sort(([, a], [, b]) => (b as any).count - (a as any).count)
    .slice(0, 10)
    .map(([key, data]) => ({ key, ...(data as any) }))
  
  return {
    ...stats,
    sessionsAffected: stats.sessionsAffected.size
  }
} 