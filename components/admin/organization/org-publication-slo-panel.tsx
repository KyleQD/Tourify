'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Radio, RefreshCw, AlertTriangle, ExternalLink, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// ─── Types ──────────────────────────────────────────────────────────────────

interface PublicationHealthResponse {
  success: boolean
  orgId: string
  queue: {
    depth: number
    oldestAt: string | null
    failedCount: number
  } | null
  failedLast24h: number | null
  deadLetterCount: number | null
  successRatePct: number | null
  expiringTokenCount: number | null
  unacknowledgedCount: number | null
  freshAt: string
}

type PanelState = 'idle' | 'loading' | 'ready' | 'error'

function MetricRow({
  label,
  value,
  valueClass,
  suffix,
  warn,
}: {
  label: string
  value: number | string | null
  valueClass?: string
  suffix?: string
  warn?: boolean
}) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-800/50 last:border-b-0">
      <span className="text-sm text-slate-300">{label}</span>
      <div className="flex items-center gap-2">
        {warn && <AlertTriangle className="h-3 w-3 text-yellow-400" />}
        <span className={`text-sm font-semibold ${valueClass ?? (value === null ? 'text-slate-500' : 'text-white')}`}>
          {value !== null ? `${value}${suffix ?? ''}` : '—'}
        </span>
      </div>
    </div>
  )
}

// ─── Component ───────────────────────────────────────────────────────────────

export function OrgPublicationSloPanel() {
  const [state, setState] = useState<PanelState>('idle')
  const [data, setData] = useState<PublicationHealthResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setState('loading')
    setError(null)
    try {
      const res = await fetch('/api/admin/organization/publication-health', { credentials: 'include' })
      if (!res.ok) throw new Error(`Publication health unavailable (${res.status})`)
      const json: PublicationHealthResponse = await res.json()
      setData(json)
      setState('ready')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load publication health')
      setState('error')
    }
  }

  useEffect(() => { void load() }, [])

  if (state === 'loading') {
    return (
      <Card className="bg-slate-900/60 border border-slate-700/50 backdrop-blur-sm rounded-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-busy="true" />
            Loading publication health…
          </div>
        </CardContent>
      </Card>
    )
  }

  if (state === 'error') {
    return (
      <Card className="bg-slate-900/60 border border-red-500/30 rounded-sm">
        <CardContent className="p-4">
          <p className="text-sm text-red-400">{error}</p>
          <Button variant="ghost" size="sm" className="mt-2 text-slate-300" onClick={() => void load()}>
            <RefreshCw className="h-3 w-3 mr-1" /> Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  const queueDepth = data?.queue?.depth ?? null
  const oldestAge = data?.queue?.oldestAt
    ? `oldest ${Math.round((Date.now() - new Date(data.queue.oldestAt).getTime()) / 60000)}m ago`
    : null

  const successRatePct = data?.successRatePct ?? null
  const deadLetterCount = data?.deadLetterCount ?? null
  const failedLast24h = data?.failedLast24h ?? null
  const expiringTokenCount = data?.expiringTokenCount ?? null
  const unacknowledgedCount = data?.unacknowledgedCount ?? null

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-white">Publication Health</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Freshness: {data ? new Date(data.freshAt).toLocaleTimeString() : '—'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-200 text-xs" onClick={() => void load()}>
            <RefreshCw className="h-3 w-3 mr-1" /> Refresh
          </Button>
          <Link
            href="/admin/dashboard/publications/deliveries"
            className="inline-flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300"
          >
            View Deliveries <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* ── Outbox queue ── */}
      <Card className="bg-slate-900/60 border border-slate-700/50 backdrop-blur-sm rounded-sm">
        <CardHeader className="px-4 py-3 pb-0">
          <CardTitle className="text-sm font-medium text-slate-300">Outbox Queue</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-2">
          {data?.queue === null ? (
            <p className="text-xs text-slate-500">Publication outbox unavailable.</p>
          ) : (
            <div>
              <MetricRow
                label="Pending / processing items"
                value={queueDepth}
                valueClass={queueDepth !== null && queueDepth > 10 ? 'text-yellow-300' : 'text-white'}
                warn={queueDepth !== null && queueDepth > 10}
              />
              {oldestAge && (
                <MetricRow label="Queue age" value={oldestAge} valueClass="text-slate-300" />
              )}
              <MetricRow
                label="Failed last 24h"
                value={failedLast24h}
                valueClass={failedLast24h !== null && failedLast24h > 0 ? 'text-red-300' : 'text-green-400'}
                warn={failedLast24h !== null && failedLast24h > 0}
              />
              <MetricRow
                label="Dead-letter items"
                value={deadLetterCount}
                valueClass={deadLetterCount !== null && deadLetterCount > 0 ? 'text-red-300' : 'text-green-400'}
                warn={deadLetterCount !== null && deadLetterCount > 0}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Delivery & token health ── */}
      <Card className="bg-slate-900/60 border border-slate-700/50 backdrop-blur-sm rounded-sm">
        <CardHeader className="px-4 py-3 pb-0">
          <CardTitle className="text-sm font-medium text-slate-300">Delivery & Tokens</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-2">
          <MetricRow
            label="7-day delivery success rate"
            value={successRatePct}
            suffix="%"
            valueClass={
              successRatePct === null ? 'text-slate-500' :
              successRatePct >= 95 ? 'text-green-400' :
              successRatePct >= 80 ? 'text-yellow-300' : 'text-red-300'
            }
            warn={successRatePct !== null && successRatePct < 95}
          />
          <MetricRow
            label="Share tokens expiring in 7 days"
            value={expiringTokenCount}
            valueClass={expiringTokenCount !== null && expiringTokenCount > 0 ? 'text-yellow-300' : 'text-green-400'}
            warn={expiringTokenCount !== null && expiringTokenCount > 0}
          />
          <MetricRow
            label="Unacknowledged publications"
            value={unacknowledgedCount}
            valueClass={unacknowledgedCount !== null && unacknowledgedCount > 0 ? 'text-yellow-300' : 'text-green-400'}
            warn={unacknowledgedCount !== null && unacknowledgedCount > 0}
          />
        </CardContent>
      </Card>
    </div>
  )
}
