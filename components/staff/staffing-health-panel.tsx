"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Activity, ShieldAlert, Database, RotateCcw, Wrench } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface StaffingHealthData {
  cache: {
    enabled: boolean
    exists: boolean
    refreshed_at: string | null
    age_seconds: number | null
    is_fresh: boolean
  }
  telemetry: {
    exists: boolean
    window_minutes: number
    total_requests: number
    error_requests: number
    error_rate: number
    p95_latency_ms: number
    endpoints: Array<{ endpoint: string; requests: number; errors: number }>
  }
  workflow?: {
    enabled: boolean
    total_requests: number
    error_requests: number
    error_rate: number
    p95_latency_ms: number
  }
  thresholds?: {
    cache_stale_seconds: number
    error_rate_warn: number
    p95_warn_ms: number
  }
  alerts?: Array<{
    id: string
    severity: 'info' | 'warning' | 'critical'
    message: string
    recommendation?: string
    deep_link?: string
    deep_link_label?: string
    deep_link_type?: string
  }>
  alert_dispatch?: Array<{
    id: string
    sent: boolean
    reason: string
  }>
  self_heal?: {
    attempted: boolean
    success: boolean
    reason: string
  } | null
}

interface StaffingHealthPanelProps {
  venueId: string
}

export function StaffingHealthPanel({ venueId }: StaffingHealthPanelProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<StaffingHealthData | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const [isRefreshingCache, setIsRefreshingCache] = useState(false)
  const [isRunningSelfHeal, setIsRunningSelfHeal] = useState(false)
  const [actionMessage, setActionMessage] = useState<string | null>(null)

  function getAlertDeepLinkLabel(alert: {
    id: string
    deep_link_label?: string
    deep_link_type?: string
  }) {
    if (alert.deep_link_label) return alert.deep_link_label
    if (alert.deep_link_type === 'workflow_task') return 'Inspect blocked tasks'
    if (alert.deep_link_type === 'workflow_message') return 'Open message timeline'
    if (alert.deep_link_type === 'workflow_participant') return 'Review participant changes'
    if (alert.deep_link_type === 'workflow_automation') return 'Open automation timeline'
    if (alert.id === 'workflow_error_rate_high') return 'Open workflow activity'
    if (alert.id === 'cache_stale') return 'Review cache health'
    return 'Open related view'
  }

  async function runOpsAction(action: 'refresh_cache' | 'self_heal') {
    if (!venueId) return
    if (action === 'refresh_cache') setIsRefreshingCache(true)
    else setIsRunningSelfHeal(true)
    setActionMessage(null)
    try {
      const response = await fetch('/api/staffing/ops-actions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          venue_id: venueId,
          action,
        }),
      })
      const payload = await response.json()
      if (!response.ok || !payload?.success) {
        setActionMessage(payload?.error || payload?.result?.reason || 'Operation failed')
        return
      }
      setActionMessage(action === 'refresh_cache' ? 'Cache refresh triggered.' : 'Self-heal executed.')
      setReloadToken((prev) => prev + 1)
    } catch {
      setActionMessage('Operation failed')
    } finally {
      if (action === 'refresh_cache') setIsRefreshingCache(false)
      else setIsRunningSelfHeal(false)
    }
  }

  useEffect(() => {
    if (!venueId) return
    let cancelled = false

    async function load() {
      try {
        setIsLoading(true)
        setError(null)
        const response = await fetch(
          `/api/staffing/health?venue_id=${encodeURIComponent(venueId)}`,
          { cache: 'no-store' }
        )
        const payload = await response.json()
        if (!response.ok || !payload?.success) throw new Error(payload?.error || 'Failed to load health')
        if (!cancelled) setData(payload.data)
      } catch (healthError: any) {
        if (!cancelled) setError(healthError?.message || 'Failed to load health')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    load()
    const id = setInterval(load, 30000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [venueId, reloadToken])

  return (
    <Card className="border-slate-700 bg-slate-900/70">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-white">
          <Activity className="h-5 w-5 text-emerald-400" />
          Staffing system health
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-slate-700 bg-slate-800 text-slate-200"
            onClick={() => runOpsAction('refresh_cache')}
            disabled={isRefreshingCache || isRunningSelfHeal}
          >
            {isRefreshingCache ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="mr-1 h-4 w-4" />
            )}
            Refresh cache now
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-slate-700 bg-slate-800 text-slate-200"
            onClick={() => runOpsAction('self_heal')}
            disabled={isRefreshingCache || isRunningSelfHeal}
          >
            {isRunningSelfHeal ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Wrench className="mr-1 h-4 w-4" />
            )}
            Run self-heal now
          </Button>
          {actionMessage ? (
            <Badge variant="secondary" className="bg-slate-700 text-slate-100">
              {actionMessage}
            </Badge>
          ) : null}
        </div>
        {isLoading ? (
          <div className="flex items-center gap-2 text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading health snapshot...
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 text-amber-300">
            <ShieldAlert className="h-4 w-4" />
            {error}
          </div>
        ) : data ? (
          <>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-3">
                <p className="text-xs uppercase text-slate-400">Cache freshness</p>
                <p className="mt-1 text-lg font-semibold text-white">
                  {data.cache.is_fresh ? 'Healthy' : 'Stale'}
                </p>
                <p className="text-xs text-slate-400">
                  age: {data.cache.age_seconds ?? 'n/a'}s · enabled: {String(data.cache.enabled)}
                </p>
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-3">
                <p className="text-xs uppercase text-slate-400">API error rate</p>
                <p className="mt-1 text-lg font-semibold text-white">
                  {(data.telemetry.error_rate * 100).toFixed(2)}%
                </p>
                <p className="text-xs text-slate-400">
                  {data.telemetry.error_requests}/{data.telemetry.total_requests} last {data.telemetry.window_minutes}m
                </p>
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-3">
                <p className="text-xs uppercase text-slate-400">Latency p95</p>
                <p className="mt-1 text-lg font-semibold text-white">{data.telemetry.p95_latency_ms}ms</p>
                <p className="text-xs text-slate-400">staffing endpoints</p>
              </div>
            </div>
            {data.workflow?.enabled ? (
              <div className="rounded-lg border border-slate-700 bg-slate-800/30 p-3">
                <p className="text-xs uppercase text-slate-400 mb-1">Workflow API health</p>
                <p className="text-sm text-white">
                  errors {(data.workflow.error_rate * 100).toFixed(2)}% · p95 {data.workflow.p95_latency_ms}ms
                </p>
                <p className="text-xs text-slate-400">
                  {data.workflow.error_requests}/{data.workflow.total_requests} requests
                </p>
              </div>
            ) : null}

            <div className="rounded-lg border border-slate-700 bg-slate-800/30 p-3">
              <p className="text-xs uppercase text-slate-400 mb-2">Endpoint activity</p>
              <div className="flex flex-wrap gap-2">
                {data.telemetry.endpoints.length === 0 ? (
                  <Badge variant="secondary" className="bg-slate-700 text-slate-100">
                    <Database className="mr-1 h-3.5 w-3.5" />
                    No recent telemetry
                  </Badge>
                ) : (
                  data.telemetry.endpoints.map((endpoint) => (
                    <Badge key={endpoint.endpoint} variant="secondary" className="bg-slate-700 text-slate-100">
                      {endpoint.endpoint}: {endpoint.requests} req / {endpoint.errors} err
                    </Badge>
                  ))
                )}
              </div>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-800/30 p-3">
              <p className="text-xs uppercase text-slate-400 mb-2">Health alerts</p>
              {data.alerts && data.alerts.length > 0 ? (
                <div className="space-y-2">
                  {data.alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`rounded border px-2 py-1 text-xs ${
                        alert.severity === 'critical'
                          ? 'border-red-700/50 bg-red-900/20 text-red-200'
                          : alert.severity === 'warning'
                            ? 'border-amber-700/50 bg-amber-900/20 text-amber-200'
                            : 'border-cyan-700/50 bg-cyan-900/20 text-cyan-200'
                      }`}
                    >
                      <p>{alert.message}</p>
                      {alert.recommendation ? (
                        <p className="mt-1 text-[11px] opacity-90">{alert.recommendation}</p>
                      ) : null}
                      {alert.deep_link ? (
                        <a
                          href={alert.deep_link}
                          className="mt-1 inline-block text-[11px] underline opacity-90"
                          target="_blank"
                          rel="noreferrer"
                        >
                          {getAlertDeepLinkLabel(alert)}
                        </a>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <Badge variant="secondary" className="bg-emerald-900/30 text-emerald-200">
                  No active alerts
                </Badge>
              )}
              {data.thresholds ? (
                <p className="mt-2 text-[11px] text-slate-500">
                  thresholds: cache {data.thresholds.cache_stale_seconds}s · error{' '}
                  {(data.thresholds.error_rate_warn * 100).toFixed(1)}% · p95 {data.thresholds.p95_warn_ms}ms
                </p>
              ) : null}
              {data.alert_dispatch && data.alert_dispatch.length > 0 ? (
                <p className="mt-2 text-[11px] text-slate-500">
                  webhook dispatch: {data.alert_dispatch.filter((item) => item.sent).length}/
                  {data.alert_dispatch.length} sent
                </p>
              ) : null}
              {data.self_heal ? (
                <p className="mt-2 text-[11px] text-slate-500">
                  self-heal: {data.self_heal.attempted ? (data.self_heal.success ? 'success' : 'failed') : 'not triggered'} ({data.self_heal.reason})
                </p>
              ) : null}
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-400">No health data available.</p>
        )}
      </CardContent>
    </Card>
  )
}
