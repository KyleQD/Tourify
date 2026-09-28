'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Ticket, RefreshCw, ArrowRight, CheckCircle, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface TicketingData {
  convergence: {
    legacy: number
    canonical: number
    delta: number
    clear: boolean
  } | null
  deviceFleet: {
    byStatus: { active: number; revoked: number; lost: number }
    oldestSyncAt: string | null
    total: number
  } | null
  webhookHealth: {
    provider: string
    status: string
    last_event_at: string | null
    error_count: number | null
  } | null
  freshAt: string
}

type PanelState = 'loading' | 'ready' | 'error'

export function OrgTicketingSettingsPanel() {
  const [state, setState] = useState<PanelState>('loading')
  const [data, setData] = useState<TicketingData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setState('loading')
    setError(null)
    try {
      const res = await fetch('/api/admin/organization/ticketing-settings', { credentials: 'include' })
      if (!res.ok) throw new Error(`Ticketing settings unavailable (${res.status})`)
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
    return <Card className="bg-slate-900/60 border border-slate-700/50 backdrop-blur-sm rounded-sm"><CardContent className="p-4"><div className="flex items-center gap-2 text-slate-400 text-sm"><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Loading ticketing settings…</div></CardContent></Card>
  }

  if (state === 'error') {
    return <Card className="bg-slate-900/60 border border-red-500/30 rounded-sm"><CardContent className="p-4"><p className="text-sm text-red-400">{error}</p><Button variant="ghost" size="sm" className="mt-2 text-slate-300" onClick={() => void load()}><RefreshCw className="h-3 w-3 mr-1" /> Retry</Button></CardContent></Card>
  }

  const conv = data?.convergence ?? null
  const fleet = data?.deviceFleet ?? null
  const webhook = data?.webhookHealth ?? null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-white">Ticketing Governance</h3>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="text-slate-400 text-xs" onClick={() => void load()}><RefreshCw className="h-3 w-3 mr-1" /> Refresh</Button>
          <Link href="/admin/dashboard/ticketing" className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1">View Ticketing <ArrowRight className="h-3 w-3" /></Link>
        </div>
      </div>

      {/* Legacy/Canonical Convergence */}
      <Card className="bg-slate-900/60 border border-slate-700/50 backdrop-blur-sm rounded-sm">
        <CardHeader className="px-4 py-3 border-b border-slate-700/50"><CardTitle className="text-sm font-medium text-slate-300">Legacy / Canonical Convergence</CardTitle></CardHeader>
        <CardContent className="p-4">
          {conv === null ? (
            <p className="text-sm text-slate-400">Convergence data unavailable.</p>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${conv.clear ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                  {conv.clear ? <CheckCircle className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                  {conv.clear ? 'Clear' : `Blocked (delta: ${conv.delta})`}
                </span>
              </div>
              <div className="flex gap-6 text-sm">
                <div><span className="text-slate-400 text-xs">Legacy: </span><span className="text-slate-200">{conv.legacy.toLocaleString()}</span></div>
                <div><span className="text-slate-400 text-xs">Canonical: </span><span className="text-slate-200">{conv.canonical.toLocaleString()}</span></div>
              </div>
              {!conv.clear && <p className="text-xs text-red-300">Cutover is blocked until delta = 0.</p>}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scanner Fleet */}
      <Card className="bg-slate-900/60 border border-slate-700/50 backdrop-blur-sm rounded-sm">
        <CardHeader className="px-4 py-3 border-b border-slate-700/50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-slate-300">Scanner Fleet</CardTitle>
            <Link href="/admin/dashboard/ticketing?tab=admissions" className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1">Manage Devices <ArrowRight className="h-3 w-3" /></Link>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {fleet === null ? (
            <p className="text-sm text-slate-400">Device fleet unavailable.</p>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-4">
                {[
                  { label: 'Active', value: fleet.byStatus.active, cls: 'text-green-400' },
                  { label: 'Revoked', value: fleet.byStatus.revoked, cls: 'text-yellow-300' },
                  { label: 'Lost', value: fleet.byStatus.lost, cls: 'text-red-300' },
                ].map(({ label, value, cls }) => (
                  <div key={label} className="text-center">
                    <p className={`text-xl font-bold ${cls}`}>{value}</p>
                    <p className="text-xs text-slate-400">{label}</p>
                  </div>
                ))}
              </div>
              {fleet.oldestSyncAt && (
                <p className="text-xs text-slate-500">Oldest sync: {new Date(fleet.oldestSyncAt).toLocaleString()}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Webhook Health */}
      <Card className="bg-slate-900/60 border border-slate-700/50 backdrop-blur-sm rounded-sm">
        <CardHeader className="px-4 py-3 border-b border-slate-700/50"><CardTitle className="text-sm font-medium text-slate-300">Provider Webhook</CardTitle></CardHeader>
        <CardContent className="p-4">
          {webhook === null ? (
            <p className="text-sm text-slate-400">No ticketing provider configured.</p>
          ) : !webhook ? (
            <p className="text-sm text-slate-400">Webhook data unavailable.</p>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-200">{webhook.provider}</span>
                <Badge className={`text-xs ${webhook.status === 'connected' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>{webhook.status}</Badge>
              </div>
              {webhook.last_event_at != null && (
                <p className="text-xs text-slate-500">Last event: {new Date(webhook.last_event_at).toLocaleString()}</p>
              )}
              {webhook.error_count != null && webhook.error_count > 0 && (
                <p className="text-xs text-red-300 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> {webhook.error_count} error{webhook.error_count > 1 ? 's' : ''}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
