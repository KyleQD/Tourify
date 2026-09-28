'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Globe, RefreshCw, ArrowRight, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

// ─── Types ──────────────────────────────────────────────────────────────────

interface ToursHealthResponse {
  success: boolean
  orgId: string
  lifecycle: Record<string, number> | null
  lifecycleUnavailable: boolean
  signals: {
    routeConflicts: number | null
    missingTravel: number | null
    uncoveredStaffing: number | null
    overdueAdvances: number | null
    contractRisk: number | null
    budgetVariance: number | null
  }
  freshAt: string
}

type PanelState = 'idle' | 'loading' | 'ready' | 'error'

const LIFECYCLE_STATUSES = [
  'draft', 'planning', 'ready', 'published', 'active',
  'completed', 'settled', 'cancelled', 'archived',
] as const

const STATUS_COLORS: Record<string, string> = {
  draft:     'bg-slate-600/30 text-slate-300',
  planning:  'bg-blue-600/20 text-blue-300',
  ready:     'bg-cyan-600/20 text-cyan-300',
  published: 'bg-purple-600/20 text-purple-300',
  active:    'bg-green-600/20 text-green-300',
  completed: 'bg-emerald-600/20 text-emerald-300',
  settled:   'bg-teal-600/20 text-teal-300',
  cancelled: 'bg-red-600/20 text-red-300',
  archived:  'bg-slate-700/30 text-slate-500',
}

function SignalRow({
  label,
  count,
  linkHref,
  linkLabel,
}: {
  label: string
  count: number | null
  linkHref: string
  linkLabel: string
}) {
  const isUnavailable = count === null
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-800/50 last:border-b-0">
      <div className="flex items-center gap-3">
        <div
          className={`w-2 h-2 rounded-full shrink-0 ${
            isUnavailable ? 'bg-slate-600' :
            count === 0    ? 'bg-green-500' :
            count <= 3     ? 'bg-yellow-400' :
                             'bg-red-400'
          }`}
        />
        <span className="text-sm text-slate-200">{label}</span>
      </div>
      <div className="flex items-center gap-3">
        {isUnavailable ? (
          <span className="text-xs text-slate-500">—</span>
        ) : (
          <span className={`text-sm font-semibold ${count === 0 ? 'text-green-400' : count <= 3 ? 'text-yellow-300' : 'text-red-300'}`}>
            {count}
          </span>
        )}
        <Link href={linkHref} className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-0.5">
          {linkLabel} <ArrowRight className="h-2.5 w-2.5" />
        </Link>
      </div>
    </div>
  )
}

// ─── Component ───────────────────────────────────────────────────────────────

export function OrgToursHealthPanel() {
  const [state, setState] = useState<PanelState>('idle')
  const [data, setData] = useState<ToursHealthResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setState('loading')
    setError(null)
    try {
      const res = await fetch('/api/admin/organization/tours-health', { credentials: 'include' })
      if (!res.ok) throw new Error(`Tours health unavailable (${res.status})`)
      const json: ToursHealthResponse = await res.json()
      setData(json)
      setState('ready')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load tours health')
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
            Loading tour portfolio health…
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

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-white">Tour Portfolio Health</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Freshness: {data ? new Date(data.freshAt).toLocaleTimeString() : '—'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-200 text-xs" onClick={() => void load()}>
            <RefreshCw className="h-3 w-3 mr-1" /> Refresh
          </Button>
          <Link href="/admin/dashboard/tours" className="inline-flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300">
            View All Tours <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* ── Lifecycle state badges ── */}
      <Card className="bg-slate-900/60 border border-slate-700/50 backdrop-blur-sm rounded-sm">
        <CardHeader className="px-4 py-3 pb-2">
          <CardTitle className="text-sm font-medium text-slate-300">Lifecycle States</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {data?.lifecycleUnavailable ? (
            <p className="text-xs text-slate-500">Tours table unavailable.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {LIFECYCLE_STATUSES.map((s) => {
                const count = data?.lifecycle?.[s] ?? null
                return (
                  <Link key={s} href={`/admin/dashboard/tours?status=${s}`}>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium hover:opacity-80 transition-opacity ${STATUS_COLORS[s] ?? 'bg-slate-600/30 text-slate-400'}`}>
                      {s}
                      <span className="font-bold">{count ?? '—'}</span>
                    </span>
                  </Link>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Health signals ── */}
      <Card className="bg-slate-900/60 border border-slate-700/50 backdrop-blur-sm rounded-sm">
        <CardHeader className="px-4 py-3 pb-0">
          <CardTitle className="text-sm font-medium text-slate-300">Health Signals</CardTitle>
          <p className="text-xs text-slate-500 mt-0.5">
            Counts show tours with at least one open issue. &quot;—&quot; means data unavailable.
          </p>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-3">
          {data ? (
            <div>
              <SignalRow
                label="Route conflicts"
                count={data.signals.routeConflicts}
                linkHref="/admin/dashboard/tours?signal=route_conflict"
                linkLabel="View"
              />
              <SignalRow
                label="Missing travel / lodging"
                count={data.signals.missingTravel}
                linkHref="/admin/dashboard/tours?signal=missing_travel"
                linkLabel="View"
              />
              <SignalRow
                label="Uncovered critical staffing"
                count={data.signals.uncoveredStaffing}
                linkHref="/admin/dashboard/tours?signal=uncovered_staffing"
                linkLabel="View"
              />
              <SignalRow
                label="Overdue advance sections"
                count={data.signals.overdueAdvances}
                linkHref="/admin/dashboard/events"
                linkLabel="View events"
              />
              <SignalRow
                label="Contract / compliance risk"
                count={data.signals.contractRisk}
                linkHref="/admin/dashboard/contracts"
                linkLabel="View contracts"
              />
              {data.signals.budgetVariance !== null && (
                <SignalRow
                  label="Budget variance exceeded"
                  count={data.signals.budgetVariance}
                  linkHref="/admin/dashboard/finances"
                  linkLabel="View finance"
                />
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-400">Apply a refresh to load health signals.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
