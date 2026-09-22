'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Briefcase, RefreshCw, ArrowRight, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface VendorGovData {
  vendorSummary: {
    total: number
    byStatus: Record<string, number>
  } | null
  expiringComplianceDocs: Array<{
    id: string
    vendor_id: string
    doc_type: string
    expires_at: string
    verification_status: string
  }> | null
  expiringContracts: Array<{
    id: string
    title: string
    counterparty_name: string | null
    expires_at: string
    status: string
  }> | null
  stalledEnvelopeCount: number | null
  freshAt: string
}

type PanelState = 'loading' | 'ready' | 'error'

export function OrgVendorGovernancePanel() {
  const [state, setState] = useState<PanelState>('loading')
  const [data, setData] = useState<VendorGovData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setState('loading')
    setError(null)
    try {
      const res = await fetch('/api/admin/organization/vendor-governance', { credentials: 'include' })
      if (!res.ok) throw new Error(`Vendor governance unavailable (${res.status})`)
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
    return <Card className="bg-slate-900/60 border border-slate-700/50 backdrop-blur-sm rounded-sm"><CardContent className="p-4"><div className="flex items-center gap-2 text-slate-400 text-sm"><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Loading vendor governance…</div></CardContent></Card>
  }

  if (state === 'error') {
    return <Card className="bg-slate-900/60 border border-red-500/30 rounded-sm"><CardContent className="p-4"><p className="text-sm text-red-400">{error}</p><Button variant="ghost" size="sm" className="mt-2 text-slate-300" onClick={() => void load()}><RefreshCw className="h-3 w-3 mr-1" /> Retry</Button></CardContent></Card>
  }

  const vendorByStatus = data?.vendorSummary?.byStatus ?? {}
  const statusOrder = ['approved', 'preferred', 'evaluating', 'restricted', 'inactive']

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-white">Vendor & Contract Governance</h3>
        <Button variant="ghost" size="sm" className="text-slate-400 text-xs" onClick={() => void load()}><RefreshCw className="h-3 w-3 mr-1" /> Refresh</Button>
      </div>

      {/* Vendor Summary */}
      <Card className="bg-slate-900/60 border border-slate-700/50 backdrop-blur-sm rounded-sm">
        <CardHeader className="px-4 py-3 border-b border-slate-700/50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-slate-300">Vendor Master</CardTitle>
            <Link href="/admin/dashboard/contracts?tab=vendor-master" className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1">Manage Vendors <ArrowRight className="h-3 w-3" /></Link>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {data?.vendorSummary === null ? (
            <p className="text-sm text-slate-400">Vendor data unavailable.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {statusOrder.map((s) => {
                const count = vendorByStatus[s] ?? 0
                return (
                  <div key={s} className="text-center px-3 py-2 bg-slate-800/50 rounded">
                    <p className="text-lg font-bold text-white">{count}</p>
                    <p className="text-xs text-slate-400 capitalize">{s}</p>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Compliance Alerts */}
      <Card className="bg-slate-900/60 border border-slate-700/50 backdrop-blur-sm rounded-sm">
        <CardHeader className="px-4 py-3 border-b border-slate-700/50">
          <CardTitle className="text-sm font-medium text-slate-300">
            Compliance Documents Expiring (30d)
            {data?.expiringComplianceDocs && data.expiringComplianceDocs.length > 0 && (
              <Badge className="ml-2 bg-yellow-500/20 text-yellow-300 text-xs">{data.expiringComplianceDocs.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {data?.expiringComplianceDocs === null ? (
            <p className="text-sm text-slate-400">Compliance data unavailable.</p>
          ) : data?.expiringComplianceDocs?.length === 0 ? (
            <p className="text-sm text-green-400">All compliance documents are current.</p>
          ) : (
            <div className="space-y-2">
              {data?.expiringComplianceDocs?.slice(0, 5).map((doc) => (
                <div key={doc.id} className="flex items-center justify-between border-b border-slate-800/40 pb-2 last:border-b-0 last:pb-0">
                  <span className="text-xs text-slate-300">{doc.doc_type}</span>
                  <span className="text-xs text-yellow-300">{new Date(doc.expires_at).toLocaleDateString()}</span>
                </div>
              ))}
              {(data?.expiringComplianceDocs?.length ?? 0) > 5 && (
                <p className="text-xs text-slate-500">+{(data?.expiringComplianceDocs?.length ?? 0) - 5} more</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contract Health */}
      <Card className="bg-slate-900/60 border border-slate-700/50 backdrop-blur-sm rounded-sm">
        <CardHeader className="px-4 py-3 border-b border-slate-700/50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-slate-300">
              Contracts Expiring (90d)
              {data?.expiringContracts && data.expiringContracts.length > 0 && (
                <Badge className="ml-2 bg-yellow-500/20 text-yellow-300 text-xs">{data.expiringContracts.length}</Badge>
              )}
            </CardTitle>
            <Link href="/admin/dashboard/contracts?tab=contracts" className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1">Manage Contracts <ArrowRight className="h-3 w-3" /></Link>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-2">
          {data?.expiringContracts === null ? (
            <p className="text-sm text-slate-400">Contract data unavailable.</p>
          ) : data?.expiringContracts?.length === 0 ? (
            <p className="text-sm text-green-400">No contracts expiring in the next 90 days.</p>
          ) : (
            <>
              {data?.expiringContracts?.slice(0, 5).map((c) => (
                <div key={c.id} className="flex items-center justify-between border-b border-slate-800/40 pb-2 last:border-b-0">
                  <div>
                    <p className="text-xs text-slate-200">{c.title}</p>
                    {c.counterparty_name && <p className="text-xs text-slate-500">{c.counterparty_name}</p>}
                  </div>
                  <span className="text-xs text-yellow-300 whitespace-nowrap ml-2">{new Date(c.expires_at).toLocaleDateString()}</span>
                </div>
              ))}
              {(data?.expiringContracts?.length ?? 0) > 5 && (
                <p className="text-xs text-slate-500">+{(data?.expiringContracts?.length ?? 0) - 5} more</p>
              )}
            </>
          )}
          {data != null && data.stalledEnvelopeCount != null && data.stalledEnvelopeCount > 0 && (
            <div className="flex items-center gap-2 pt-2 border-t border-slate-800/40">
              <AlertTriangle className="h-3.5 w-3.5 text-yellow-400" />
              <p className="text-xs text-yellow-300">{data.stalledEnvelopeCount} signature envelope{data.stalledEnvelopeCount > 1 ? 's' : ''} stalled &gt;14 days</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
