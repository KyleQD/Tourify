import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { canReviewStaffingApplications } from '@/lib/auth/hiring-permissions'
import { createRateLimiter } from '@/lib/utils/rate-limit'
import { buildStaffingResponseHeaders } from '@/lib/staffing/api-observability'
import { emitStaffingAlertIfNeeded, trySelfHealStaffingCache } from '@/lib/staffing/alerting'

const limiter = createRateLimiter({
  namespace: 'staffing-health',
  limit: 60,
  windowSec: 60,
})

const querySchema = z.object({
  venue_id: z.string().uuid(),
})

async function doesTableExist(supabase: any, table: string) {
  const { error } = await supabase.from(table).select('id', { head: true, count: 'exact' }).limit(1)
  return !error || !String(error.message || '').toLowerCase().includes('does not exist')
}

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID()
  const startedAt = Date.now()
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user)
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401, headers: buildStaffingResponseHeaders({ requestId, startedAt }) }
      )

    const parsed = querySchema.safeParse(
      Object.fromEntries(new URL(request.url).searchParams.entries())
    )
    if (!parsed.success)
      return NextResponse.json(
        { success: false, error: 'venue_id is required' },
        { status: 400, headers: buildStaffingResponseHeaders({ requestId, startedAt }) }
      )

    const venueId = parsed.data.venue_id
    const canView = await canReviewStaffingApplications({ userId: user.id, venueId })
    if (!canView)
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403, headers: buildStaffingResponseHeaders({ requestId, startedAt }) }
      )

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const rl = await limiter.check(`${user.id}:${ip}:${venueId}`)
    const rateLimitRemaining = 'remaining' in rl ? rl.remaining : undefined
    const rateLimitReset = 'reset' in rl ? rl.reset : undefined
    if (!rl.success)
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded' },
        {
          status: 429,
          headers: buildStaffingResponseHeaders({
            requestId,
            startedAt,
            rateLimitRemaining,
            rateLimitReset,
          }),
        }
      )

    const hasCache = await doesTableExist(supabase, 'staffing_overview_cache')
    const hasTelemetry = await doesTableExist(supabase, 'staffing_api_telemetry')

    let cache: any = null
    if (hasCache) {
      const { data } = await supabase
        .from('staffing_overview_cache')
        .select('refreshed_at')
        .eq('venue_id', venueId)
        .maybeSingle()
      cache = data
    }

    const telemetryWindowStart = new Date(Date.now() - 15 * 60 * 1000).toISOString()
    let telemetryRows: any[] = []
    if (hasTelemetry) {
      const { data } = await supabase
        .from('staffing_api_telemetry')
        .select('status_code, latency_ms, endpoint, created_at')
        .eq('venue_id', venueId)
        .gte('created_at', telemetryWindowStart)
      telemetryRows = data || []
    }

    const totalRequests = telemetryRows.length
    const errorRequests = telemetryRows.filter((row) => Number(row.status_code) >= 400).length
    const errorRate = totalRequests > 0 ? Number((errorRequests / totalRequests).toFixed(4)) : 0

    const latencies = telemetryRows
      .map((row) => Number(row.latency_ms))
      .filter((value) => Number.isFinite(value))
      .sort((left, right) => left - right)

    const p95 =
      latencies.length > 0
        ? latencies[Math.max(Math.ceil(latencies.length * 0.95) - 1, 0)]
        : 0

    const endpointMap = telemetryRows.reduce(
      (acc, row) => {
        const key = String(row.endpoint || 'unknown')
        const bucket = acc.get(key) || { endpoint: key, requests: 0, errors: 0 }
        bucket.requests += 1
        if (Number(row.status_code) >= 400) bucket.errors += 1
        acc.set(key, bucket)
        return acc
      },
      new Map<string, { endpoint: string; requests: number; errors: number }>()
    )
    const endpoints = Array.from(endpointMap.values())

    const workflowRows = telemetryRows.filter((row) =>
      String(row.endpoint || '').startsWith('/api/workflows')
    )
    const workflowRequests = workflowRows.length
    const workflowErrors = workflowRows.filter((row) => Number(row.status_code) >= 400).length
    const workflowErrorRate =
      workflowRequests > 0 ? Number((workflowErrors / workflowRequests).toFixed(4)) : 0
    const workflowLatencies = workflowRows
      .map((row) => Number(row.latency_ms))
      .filter((value) => Number.isFinite(value))
      .sort((left, right) => left - right)
    const workflowP95 =
      workflowLatencies.length > 0
        ? workflowLatencies[Math.max(Math.ceil(workflowLatencies.length * 0.95) - 1, 0)]
        : 0

    const cacheAgeSec = cache?.refreshed_at
      ? Math.max(Math.floor((Date.now() - new Date(cache.refreshed_at).getTime()) / 1000), 0)
      : null

    const cacheStaleThresholdSec = Number(process.env.STAFFING_CACHE_STALE_THRESHOLD_SEC || 120)
    const errorRateWarnThreshold = Number(process.env.STAFFING_ERROR_RATE_WARN_THRESHOLD || 0.05)
    const p95WarnThresholdMs = Number(process.env.STAFFING_P95_WARN_THRESHOLD_MS || 1200)
    const isCacheFresh = cacheAgeSec !== null ? cacheAgeSec <= cacheStaleThresholdSec : false

    const alerts: Array<{
      id: string
      severity: 'info' | 'warning' | 'critical'
      message: string
      recommendation?: string
      deep_link?: string
      deep_link_label?: string
      deep_link_type?: string
    }> = []

    if (!dataSourceIsEnabled(process.env.FEATURE_STAFFING_OVERVIEW_CACHE))
      alerts.push({
        id: 'cache_disabled',
        severity: 'info',
        message: 'Overview cache is disabled by feature flag.',
      })

    if (dataSourceIsEnabled(process.env.FEATURE_STAFFING_OVERVIEW_CACHE) && hasCache && !isCacheFresh)
      alerts.push({
        id: 'cache_stale',
        severity: cacheAgeSec !== null && cacheAgeSec > cacheStaleThresholdSec * 3 ? 'critical' : 'warning',
        message: `Staffing overview cache is stale (${cacheAgeSec ?? 'n/a'}s old).`,
        recommendation: 'Run staffing overview refresh cron and verify DB function execution.',
      })

    if (errorRate >= errorRateWarnThreshold)
      alerts.push({
        id: 'error_rate_high',
        severity: errorRate >= errorRateWarnThreshold * 2 ? 'critical' : 'warning',
        message: `Staffing API error rate is elevated (${(errorRate * 100).toFixed(2)}%).`,
        recommendation: 'Inspect recent failing endpoints and consider temporary cache bypass.',
      })

    if (p95 >= p95WarnThresholdMs)
      alerts.push({
        id: 'latency_high',
        severity: p95 >= p95WarnThresholdMs * 2 ? 'critical' : 'warning',
        message: `Staffing API p95 latency is high (${p95}ms).`,
        recommendation: 'Validate indexes, cache freshness, and current DB load.',
      })

    if (dataSourceIsEnabled(process.env.FEATURE_UNIFIED_WORKFLOW_THREADS) && workflowRequests > 0 && workflowErrorRate >= errorRateWarnThreshold)
      alerts.push({
        id: 'workflow_error_rate_high',
        severity: workflowErrorRate >= errorRateWarnThreshold * 2 ? 'critical' : 'warning',
        message: `Workflow API error rate is elevated (${(workflowErrorRate * 100).toFixed(2)}%).`,
        recommendation: 'Inspect workflow thread/task/message endpoints and participant permissions.',
        deep_link: buildAppUrl('/admin/dashboard/tours?tab=overview&workflowFilter=automation&workflowDialog=1'),
        deep_link_label: 'Open workflow automation timeline',
        deep_link_type: 'workflow_automation',
      })

    let alertDispatch: Array<{ id: string; sent: boolean; reason: string }> = []
    for (const alert of alerts) {
      if (alert.severity === 'critical' || alert.severity === 'warning') {
        const emitted = await emitStaffingAlertIfNeeded({
          venueId,
          eventKey: `health_${alert.id}`,
          severity: alert.severity,
          title: 'Staffing health alert',
          message: alert.message,
          metadata: {
            recommendation: alert.recommendation || null,
            p95_latency_ms: p95,
            error_rate: errorRate,
            cache_age_seconds: cacheAgeSec,
            deep_link: alert.deep_link || null,
            deep_link_label: alert.deep_link_label || null,
            deep_link_type: alert.deep_link_type || null,
          },
        })
        alertDispatch.push({ id: alert.id, sent: emitted.sent, reason: String(emitted.reason) })
      }
    }

    let selfHealResult: {
      attempted: boolean
      success: boolean
      reason: string
    } | null = null
    const hasCriticalCacheAlert = alerts.some((alert) => alert.id === 'cache_stale' && alert.severity === 'critical')
    if (hasCriticalCacheAlert) {
      const heal = await trySelfHealStaffingCache({
        venueId,
        reason: 'critical_cache_stale',
      })
      selfHealResult = {
        attempted: heal.attempted,
        success: heal.success,
        reason: String(heal.reason),
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          cache: {
            enabled: dataSourceIsEnabled(process.env.FEATURE_STAFFING_OVERVIEW_CACHE),
            exists: hasCache,
            refreshed_at: cache?.refreshed_at || null,
            age_seconds: cacheAgeSec,
            is_fresh: isCacheFresh,
          },
          telemetry: {
            exists: hasTelemetry,
            window_minutes: 15,
            total_requests: totalRequests,
            error_requests: errorRequests,
            error_rate: errorRate,
            p95_latency_ms: p95,
            endpoints,
          },
          workflow: {
            enabled: dataSourceIsEnabled(process.env.FEATURE_UNIFIED_WORKFLOW_THREADS),
            total_requests: workflowRequests,
            error_requests: workflowErrors,
            error_rate: workflowErrorRate,
            p95_latency_ms: workflowP95,
          },
          thresholds: {
            cache_stale_seconds: cacheStaleThresholdSec,
            error_rate_warn: errorRateWarnThreshold,
            p95_warn_ms: p95WarnThresholdMs,
          },
          alerts,
          alert_dispatch: alertDispatch,
          self_heal: selfHealResult,
        },
      },
      {
        headers: buildStaffingResponseHeaders({
          requestId,
          startedAt,
          rateLimitRemaining,
          rateLimitReset,
          dataSource: 'health',
        }),
      }
    )
  } catch (error) {
    console.error('[staffing/health]', error)
    return NextResponse.json(
      { success: false, error: 'Failed to load staffing health' },
      { status: 500, headers: buildStaffingResponseHeaders({ requestId, startedAt }) }
    )
  }
}

function dataSourceIsEnabled(value?: string) {
  return value !== '0'
}

function buildAppUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || ''
  return base ? `${base}${path}` : path
}
