'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { LayoutDashboard, RefreshCw, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAdminCapabilities } from '@/hooks/use-admin-capabilities'

// ─── Types ──────────────────────────────────────────────────────────────────

interface OverviewResponse {
  success: boolean
  orgId: string
  orgIdentity: {
    id: string
    organization_name: string | null
    organization_type: string | null
    subtype: string | null
  } | null
  health: {
    activeTourCount: number | null
    openStaffingCount: number | null
    overdueAdvanceCount: number | null
    expiringContractCount: number | null
    pendingFinanceCount?: number | null
    pubFailedCount: number | null
  }
  freshAt: string
}

type PanelState = 'loading' | 'ready' | 'error'

interface HealthCard {
  label: string
  value: number | null
  linkHref: string
  linkLabel: string
  warnAt?: number
  hide?: boolean
}

// ─── Component ───────────────────────────────────────────────────────────────

export function OrgOverviewPanel() {
  const { can } = useAdminCapabilities()
  const canFinance = can('finance.view')

  const [state, setState] = useState<PanelState>('loading')
  const [data, setData] = useState<OverviewResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setState('loading')
    setError(null)
    try {
      const res = await fetch('/api/admin/organization/overview', { credentials: 'include' })
      if (!res.ok) throw new Error(`Overview unavailable (${res.status})`)
      const json: OverviewResponse = await res.json()
      setData(json)
      setState('ready')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
      setState('error')
    }
  }

  useEffect(() => { void load() }, [])

  if (state === 'loading') {
    return (
      <Card className="bg-slate-900/60 border border-slate-700/50 backdrop-blur-sm rounded-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-busy="true" />
            Loading organization overview…
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

  const identity = data?.orgIdentity
  const health = data?.health

  const healthCards: HealthCard[] = [
    {
      label: 'Active tours',
      value: health?.activeTourCount ?? null,
      linkHref: '/admin/dashboard/tours',
      linkLabel: 'View tours',
    },
    {
      label: 'Open staffing gaps',
      value: health?.openStaffingCount ?? null,
      linkHref: '/admin/dashboard/organization?tab=workforce',
      linkLabel: 'View workforce',
      warnAt: 1,
    },
    {
      label: 'Overdue advances',
      value: health?.overdueAdvanceCount ?? null,
      linkHref: '/admin/dashboard/events',
      linkLabel: 'View events',
      warnAt: 1,
    },
    {
      label: 'Contracts expiring (30d)',
      value: health?.expiringContractCount ?? null,
      linkHref: '/admin/dashboard/organization?tab=vendors',
      linkLabel: 'View vendors',
      warnAt: 1,
    },
    {
      label: 'Pending finance approvals',
      value: health?.pendingFinanceCount ?? null,
      linkHref: '/admin/dashboard/organization?tab=finance',
      linkLabel: 'View finance',
      warnAt: 1,
      hide: !canFinance,
    },
    {
      label: 'Publication failures (24h)',
      value: health?.pubFailedCount ?? null,
      linkHref: '/admin/dashboard/organization?tab=publishing',
      linkLabel: 'View publishing',
      warnAt: 1,
    },
  ].filter((c) => !c.hide)

  return (
    <div className="space-y-6">
      {/* ── Org identity ── */}
      <Card className="bg-slate-900/60 border border-slate-700/50 backdrop-blur-sm rounded-sm">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">
                {identity?.organization_name ?? 'Organization'}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                {identity?.organization_type && (
                  <Badge className="bg-slate-700/40 text-slate-300 text-xs capitalize">
                    {identity.organization_type}
                  </Badge>
                )}
                {identity?.subtype && (
                  <Badge className="bg-purple-500/20 text-purple-300 text-xs capitalize">
                    {identity.subtype}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="text-slate-400 text-xs" onClick={() => void load()}>
                <RefreshCw className="h-3 w-3 mr-1" /> Refresh
              </Button>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Freshness: {data ? new Date(data.freshAt).toLocaleTimeString() : '—'}
          </p>
        </CardContent>
      </Card>

      {/* ── Health summary cards ── */}
      <div>
        <h4 className="text-sm font-medium text-slate-400 mb-3">Domain Health</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {healthCards.map((card) => {
            const isWarn = card.warnAt !== undefined && card.value !== null && card.value >= card.warnAt
            const isUnavail = card.value === null
            return (
              <Card
                key={card.label}
                className={`backdrop-blur-sm rounded-sm ${
                  isUnavail
                    ? 'bg-slate-900/60 border border-dashed border-slate-700/50'
                    : isWarn
                    ? 'bg-slate-900/60 border border-yellow-500/30'
                    : 'bg-slate-900/60 border border-slate-700/50'
                }`}
              >
                <CardContent className="p-4">
                  <div className={`text-2xl font-bold ${isUnavail ? 'text-slate-500' : isWarn ? 'text-yellow-300' : 'text-white'}`}>
                    {isUnavail ? '—' : card.value}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">{card.label}</div>
                  <Link
                    href={card.linkHref}
                    className="mt-2 inline-flex items-center gap-0.5 text-xs text-purple-400 hover:text-purple-300"
                  >
                    {card.linkLabel} <ArrowRight className="h-2.5 w-2.5" />
                  </Link>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
