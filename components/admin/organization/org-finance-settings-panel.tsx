'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { DollarSign, RefreshCw, ArrowRight, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAdminCapabilities } from '@/hooks/use-admin-capabilities'

interface FinanceData {
  approvalPolicies: Array<{
    id: string
    action_type: string
    amount_threshold: number | null
    required_approvers: number
    separation_of_duties: boolean
    is_active: boolean
  }> | null
  fxConfig: {
    rate_source: string | null
    base_currency: string | null
    reporting_currency: string | null
    last_updated_at: string | null
  } | null
  reconciliation: {
    unmatchedInvoiceCount: number | null
    unsettledShowCount: number | null
    failedExportCount: number | null
  }
  freshAt: string
}

type PanelState = 'loading' | 'ready' | 'error'

const STALE_FX_HOURS = 24

export function OrgFinanceSettingsPanel() {
  const { can } = useAdminCapabilities()
  const canApprove = can('finance.approve')

  const [state, setState] = useState<PanelState>('loading')
  const [data, setData] = useState<FinanceData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setState('loading')
    setError(null)
    try {
      const res = await fetch('/api/admin/organization/finance-settings', { credentials: 'include' })
      if (!res.ok) throw new Error(`Finance settings unavailable (${res.status})`)
      const json = await res.json()
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
        <CardContent className="p-4"><div className="flex items-center gap-2 text-slate-400 text-sm"><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Loading finance settings…</div></CardContent>
      </Card>
    )
  }

  if (state === 'error') {
    return (
      <Card className="bg-slate-900/60 border border-red-500/30 rounded-sm">
        <CardContent className="p-4">
          <p className="text-sm text-red-400">{error}</p>
          <Button variant="ghost" size="sm" className="mt-2 text-slate-300" onClick={() => void load()}><RefreshCw className="h-3 w-3 mr-1" /> Retry</Button>
        </CardContent>
      </Card>
    )
  }

  const fx = data?.fxConfig
  const fxStale = fx?.last_updated_at
    ? (Date.now() - new Date(fx.last_updated_at).getTime()) > STALE_FX_HOURS * 60 * 60 * 1000
    : true
  const reconciliation = data?.reconciliation

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-white">Finance Governance</h3>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="text-slate-400 text-xs" onClick={() => void load()}><RefreshCw className="h-3 w-3 mr-1" /> Refresh</Button>
          <Link href="/admin/dashboard/finances" className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1">View Finance <ArrowRight className="h-3 w-3" /></Link>
        </div>
      </div>

      {/* Approval Policies */}
      {canApprove && (
        <Card className="bg-slate-900/60 border border-slate-700/50 backdrop-blur-sm rounded-sm overflow-hidden">
          <CardHeader className="px-4 py-3 border-b border-slate-700/50">
            <CardTitle className="text-sm font-medium text-slate-300">Approval Policies</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {data?.approvalPolicies === null ? (
              <p className="p-4 text-sm text-slate-400">Approval policies unavailable.</p>
            ) : data?.approvalPolicies?.length === 0 ? (
              <p className="p-4 text-sm text-slate-400">No approval policies configured.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700/40 text-left">
                    <th className="px-4 py-2 text-xs text-slate-400">Action</th>
                    <th className="px-4 py-2 text-xs text-slate-400">Threshold</th>
                    <th className="px-4 py-2 text-xs text-slate-400">Approvers</th>
                    <th className="px-4 py-2 text-xs text-slate-400">SoD</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.approvalPolicies ?? []).map((p) => (
                    <tr key={p.id} className="border-b border-slate-800/50 last:border-b-0">
                      <td className="px-4 py-2 text-slate-200">{p.action_type}</td>
                      <td className="px-4 py-2 text-slate-300 font-mono text-xs">{p.amount_threshold != null ? `$${p.amount_threshold.toLocaleString()}` : '—'}</td>
                      <td className="px-4 py-2 text-slate-300">{p.required_approvers}</td>
                      <td className="px-4 py-2">{p.separation_of_duties ? <Badge className="bg-green-500/20 text-green-300 text-xs">Yes</Badge> : <span className="text-slate-500 text-xs">No</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      {/* FX Config */}
      <Card className={`bg-slate-900/60 rounded-sm ${!fx ? 'border border-dashed border-slate-700/50' : 'border border-slate-700/50'} backdrop-blur-sm`}>
        <CardHeader className="px-4 py-3 border-b border-slate-700/50">
          <CardTitle className="text-sm font-medium text-slate-300">FX Configuration</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {!fx ? (
            <p className="text-sm text-slate-400">FX configuration unavailable. No rate source loaded.</p>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400 w-32">Rate source</span>
                <span className="text-sm text-slate-200">{fx.rate_source ?? '—'}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400 w-32">Base currency</span>
                <span className="text-sm font-mono text-slate-200">{fx.base_currency ?? '—'}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400 w-32">Reporting currency</span>
                <span className="text-sm font-mono text-slate-200">{fx.reporting_currency ?? '—'}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400 w-32">Last updated</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-300">{fx.last_updated_at ? new Date(fx.last_updated_at).toLocaleString() : '—'}</span>
                  {fxStale && <Badge className="bg-yellow-500/20 text-yellow-300 text-xs">stale</Badge>}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reconciliation */}
      <Card className="bg-slate-900/60 border border-slate-700/50 backdrop-blur-sm rounded-sm">
        <CardHeader className="px-4 py-3 border-b border-slate-700/50">
          <CardTitle className="text-sm font-medium text-slate-300">Reconciliation Health</CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          {[
            { label: 'Unmatched invoices', value: reconciliation?.unmatchedInvoiceCount ?? null, warnAt: 1 },
            { label: 'Unsettled completed shows', value: reconciliation?.unsettledShowCount ?? null, warnAt: 1 },
            { label: 'Failed finance exports (24h)', value: reconciliation?.failedExportCount ?? null, warnAt: 1 },
          ].map(({ label, value, warnAt }) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-sm text-slate-300">{label}</span>
              <div className="flex items-center gap-2">
                {value !== null && value >= warnAt && <AlertTriangle className="h-3 w-3 text-yellow-400" />}
                <span className={`text-sm font-semibold ${value === null ? 'text-slate-500' : value === 0 ? 'text-green-400' : 'text-yellow-300'}`}>
                  {value !== null ? value : '—'}
                </span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
