import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { errors } = await request.json()
    
    if (!Array.isArray(errors) || errors.length === 0) {
      return NextResponse.json({ error: 'Invalid error data' }, { status: 400 })
    }

    // Process and clean error data
    const processedErrors = errors.map(error => ({
      ...error,
      error_message: typeof error.error === 'string' ? error.error : error.error?.message || 'Unknown error',
      error_type: error.error?.name || 'Error',
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
      err.context.includes('Auth') || 
      err.context.includes('Payment') ||
      err.error_message.includes('500')
    )

    if (criticalErrors.length > 0) {
      await notifyExternalMonitoring(criticalErrors)
    }

    return NextResponse.json({ success: true, count: errors.length })
  } catch (error) {
    console.error('Error tracking endpoint error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    const severity = searchParams.get('severity')
    const timeRange = searchParams.get('timeRange') || '24h'
    
    let query = supabase.from('error_reports').select('*')
    
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