'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { BarChart3, RefreshCw, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAdminCapabilities } from '@/hooks/use-admin-capabilities'
import { KPI_CATALOG } from '@/lib/admin/kpi-catalog'

// ─── Types ──────────────────────────────────────────────────────────────────

interface FreshnessSource {
  sourceId: string
  sourceName: string
  lastCompletedAt: string | null
  isStale: boolean
  isPartial: boolean
  completenessPercent: number
  available: boolean
}

// ─── Component ───────────────────────────────────────────────────────────────

export function OrgReportingConfigPanel() {
  const { can } = useAdminCapabilities()
  const canFinance = can('finance.view')

  const [sources, setSources] = useState<FreshnessSource[]>([])
  const [freshnessState, setFreshnessState] = useState<'loading' | 'ready' | 'error'>('loading')

  const loadFreshness = async () => {
    setFreshnessState('loading')
    try {
      const res = await fetch('/api/admin/analytics/freshness', { credentials: 'include' })
      if (!res.ok) throw new Error()
      const json = await res.json()
      setSources(json.freshness?.sources ?? [])
      setFreshnessState('ready')
    } catch {
      setFreshnessState('error')
    }
  }

  useEffect(() => { void loadFreshness() }, [])

  // Group KPIs by domain, filtering finance if not allowed
  const catalog = KPI_CATALOG.filter((kpi) => {
    if (!canFinance && kpi.domain === 'commercial') return false
    return true
  })

  const byDomain = catalog.reduce<Record<string, typeof catalog>>((acc, kpi) => {
    if (!acc[kpi.domain]) acc[kpi.domain] = []
    acc[kpi.domain]!.push(kpi)
    return acc
  }, {})

  const domainOrder = ['operational', 'commercial', 'live_ops', 'reporting']

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-white">Reporting Configuration</h3>
        <Link href="/admin/dashboard/analytics" className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1">View Analytics <ExternalLink className="h-3 w-3" /></Link>
      </div>

      {/* KPI Catalog */}
      <Card className="bg-slate-900/60 border border-slate-700/50 backdrop-blur-sm rounded-sm">
        <CardHeader className="px-4 py-3 border-b border-slate-700/50">
          <CardTitle className="text-sm font-medium text-slate-300">KPI Catalog</CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          {Object.keys(byDomain).length === 0 ? (
            <p className="text-sm text-slate-400">No KPIs configured.</p>
          ) : (
            (domainOrder.filter((d) => byDomain[d]?.length).concat(
              Object.keys(byDomain).filter((d) => !domainOrder.includes(d))
            )).map((domain) => {
              const kpis = byDomain[domain] ?? []
              return (
                <div key={domain}>
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wide">{domain.replace('_', ' ')}</h4>
                    <Badge className="bg-slate-700/40 text-slate-400 text-xs">{kpis.length}</Badge>
                  </div>
                  <div className="space-y-1.5">
                    {kpis.slice(0, 4).map((kpi) => (
                      <div key={kpi.kpiId} className="border-b border-slate-800/40 pb-1.5 last:border-b-0">
                        <p className="text-xs text-slate-200">{kpi.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{kpi.businessQuestion}</p>
                      </div>
                    ))}
                    {kpis.length > 4 && <p className="text-xs text-slate-500">+{kpis.length - 4} more</p>}
                  </div>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>

      {/* Read-Model Freshness */}
      <Card className="bg-slate-900/60 border border-slate-700/50 backdrop-blur-sm rounded-sm">
        <CardHeader className="px-4 py-3 border-b border-slate-700/50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-slate-300">Read-Model Freshness</CardTitle>
            <Button variant="ghost" size="sm" className="text-slate-400 text-xs" onClick={() => void loadFreshness()}>
              <RefreshCw className={`h-3 w-3 mr-1 ${freshnessState === 'loading' ? 'animate-spin' : ''}`} /> Rebuild
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {freshnessState === 'loading' && <div className="flex items-center gap-2 text-slate-400 text-sm"><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Loading freshness data…</div>}
          {freshnessState === 'error' && <p className="text-sm text-slate-400">Freshness data unavailable.</p>}
          {freshnessState === 'ready' && sources.length === 0 && <p className="text-sm text-slate-400">No read models configured.</p>}
          {freshnessState === 'ready' && sources.length > 0 && (
            <div className="space-y-2">
              {sources.map((source) => {
                const lagMin = source.lastCompletedAt
                  ? Math.round((Date.now() - new Date(source.lastCompletedAt).getTime()) / 60000)
                  : null
                const statusBadge = !source.available
                  ? { label: 'unavailable', cls: 'bg-slate-600/30 text-slate-400 border-slate-600/20' }
                  : source.isStale
                  ? { label: 'stale', cls: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/20' }
                  : { label: 'fresh', cls: 'bg-green-500/20 text-green-300 border-green-500/20' }

                return (
                  <div key={source.sourceId} className="flex items-center justify-between border-b border-slate-800/40 pb-2 last:border-b-0">
                    <div>
                      <p className="text-sm text-slate-200">{source.sourceName}</p>
                      <p className="text-xs text-slate-500">
                        {lagMin !== null ? `${lagMin}m ago` : 'No data'} · {source.completenessPercent}%
                      </p>
                    </div>
                    <Badge className={`${statusBadge.cls} border text-xs`}>{statusBadge.label}</Badge>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
