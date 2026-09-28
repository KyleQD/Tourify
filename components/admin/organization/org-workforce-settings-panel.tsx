'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { UserCheck, RefreshCw, ArrowRight, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface WorkforceData {
  onboardingTemplate: {
    id: string
    name: string
    version: number
    status: string
    updated_at: string
    item_count?: number | null
  } | null
  conversionPipeline: {
    pendingCount: number
    failedCount: number
    lastUpdatedAt: string | null
  } | null
  credentialAlerts: { expiringCount: number } | null
  freshAt: string
}

type PanelState = 'loading' | 'ready' | 'error'

export function OrgWorkforceSettingsPanel() {
  const [state, setState] = useState<PanelState>('loading')
  const [data, setData] = useState<WorkforceData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setState('loading')
    setError(null)
    try {
      const res = await fetch('/api/admin/organization/workforce-settings', { credentials: 'include' })
      if (!res.ok) throw new Error(`Workforce settings unavailable (${res.status})`)
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
        <CardContent className="p-4"><div className="flex items-center gap-2 text-slate-400 text-sm"><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Loading workforce settings…</div></CardContent>
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

  const template = data?.onboardingTemplate
  const pipeline = data?.conversionPipeline
  const credentialsData = data?.credentialAlerts ?? null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-white">Workforce Governance</h3>
        <Button variant="ghost" size="sm" className="text-slate-400 text-xs" onClick={() => void load()}><RefreshCw className="h-3 w-3 mr-1" /> Refresh</Button>
      </div>

      {/* Onboarding Template */}
      <Card className="bg-slate-900/60 border border-slate-700/50 backdrop-blur-sm rounded-sm">
        <CardHeader className="px-4 py-3 border-b border-slate-700/50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-slate-300">Active Onboarding Template</CardTitle>
            <Link href="/admin/dashboard/hiring" className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1">Manage Templates <ArrowRight className="h-3 w-3" /></Link>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {template === null ? (
            <p className="text-sm text-slate-400">No active template configured.</p>
          ) : template ? (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <p className="text-sm text-white font-medium">{template.name}</p>
                <Badge className={`text-xs ${template.status === 'active' ? 'bg-green-500/20 text-green-300' : 'bg-slate-600/30 text-slate-400'}`}>{template.status}</Badge>
                <span className="text-xs text-slate-500">v{template.version}</span>
              </div>
              <p className="text-xs text-slate-500">Updated {new Date(template.updated_at).toLocaleDateString()}{template.item_count != null ? ` · ${template.item_count} items` : ''}</p>
            </div>
          ) : (
            <p className="text-xs text-slate-500">Template data unavailable.</p>
          )}
        </CardContent>
      </Card>

      {/* Credential Alerts */}
      <Card className="bg-slate-900/60 border border-slate-700/50 backdrop-blur-sm rounded-sm">
        <CardHeader className="px-4 py-3 border-b border-slate-700/50">
          <CardTitle className="text-sm font-medium text-slate-300">Credential Expiry</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {credentialsData === null ? (
            <p className="text-sm text-slate-400">Credential data unavailable.</p>
          ) : (
            <div className="flex items-center gap-3">
              {credentialsData.expiringCount > 0 && <AlertTriangle className="h-4 w-4 text-yellow-400 shrink-0" />}
              <p className="text-sm text-slate-200">
                <span className={`font-semibold ${credentialsData.expiringCount > 0 ? 'text-yellow-300' : 'text-green-400'}`}>
                  {credentialsData.expiringCount}
                </span>
                {' '}credentials expiring within 30 days
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Conversion Pipeline */}
      <Card className="bg-slate-900/60 border border-slate-700/50 backdrop-blur-sm rounded-sm">
        <CardHeader className="px-4 py-3 border-b border-slate-700/50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-slate-300">Identity Conversion Pipeline</CardTitle>
            <Link href="/admin/dashboard/hiring" className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1">Review <ArrowRight className="h-3 w-3" /></Link>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {pipeline === null || pipeline === undefined ? (
            <p className="text-sm text-slate-400">Conversion pipeline unavailable.</p>
          ) : (
            <div className="flex gap-6">
              <div>
                <p className="text-2xl font-bold text-white">{pipeline.pendingCount}</p>
                <p className="text-xs text-slate-400">Pending</p>
              </div>
              <div>
                <p className={`text-2xl font-bold ${pipeline.failedCount > 0 ? 'text-red-300' : 'text-white'}`}>{pipeline.failedCount}</p>
                <p className="text-xs text-slate-400">Failed</p>
              </div>
              {pipeline.lastUpdatedAt != null && (
                <div>
                  <p className="text-sm text-slate-300">{new Date(pipeline.lastUpdatedAt).toLocaleDateString()}</p>
                  <p className="text-xs text-slate-400">Last activity</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
