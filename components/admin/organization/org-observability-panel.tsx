'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Activity, RefreshCw, ArrowRight, ExternalLink, CheckCircle, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// ─── Types ──────────────────────────────────────────────────────────────────

interface ExportJob {
  id: string
  exportType: string
  status: string
  createdAt: string
  completedAt: string | null
  errorMessage: string | null
}

interface DataQualityAlert {
  id: string
  issueType: string
  domain: string
  description: string
  status: string
  detectedAt: string
}

interface FeatureFlagDefinition {
  key: string
  description?: string
  owner?: string
  expires_at?: string | null
  default_on?: boolean | null
}

// Deployment readiness gates
const DEPLOYMENT_GATES = [
  { id: 'tenant_isolation', label: 'Tenant isolation', desc: 'All operational records have non-null org_id', status: 'unknown' as const },
  { id: 'rls_cross_org',    label: 'RLS cross-org denial tests', desc: 'Security isolation verified', status: 'unknown' as const },
  { id: 'canonical_sources', label: 'Canonical sources documented', desc: 'ADR-004 canonical data registry', status: 'unknown' as const },
  { id: 'transactional_writes', label: 'Multi-table writes transactional', desc: 'PUB-101 atomic outbox pattern', status: 'unknown' as const },
  { id: 'e2e_paths',        label: 'Critical E2E paths defined', desc: 'REL-610 integration test coverage', status: 'unknown' as const },
]

// ─── Component ───────────────────────────────────────────────────────────────

export function OrgObservabilityPanel() {
  const [jobs, setJobs] = useState<ExportJob[]>([])
  const [jobsState, setJobsState] = useState<'loading' | 'ready' | 'error'>('loading')

  const [alerts, setAlerts] = useState<DataQualityAlert[]>([])
  const [alertsState, setAlertsState] = useState<'loading' | 'ready' | 'error'>('loading')

  const [flags, setFlags] = useState<{ definitions: FeatureFlagDefinition[]; unavailable?: boolean }>({ definitions: [] })
  const [flagsState, setFlagsState] = useState<'loading' | 'ready' | 'error'>('loading')

  const loadJobs = async () => {
    setJobsState('loading')
    try {
      const res = await fetch('/api/admin/exports/jobs?limit=5', { credentials: 'include' })
      if (!res.ok) throw new Error()
      const json = await res.json()
      const rawJobs = (json.jobs ?? []) as Array<Record<string, unknown>>
      setJobs(rawJobs.map((j) => ({
        id: j.id as string,
        exportType: j.exportType as string ?? j.export_type as string ?? '',
        status: j.status as string,
        createdAt: j.createdAt as string ?? j.created_at as string,
        completedAt: (j.completedAt as string | null) ?? (j.completed_at as string | null),
        errorMessage: (j.errorMessage as string | null) ?? (j.error_message as string | null),
      })))
      setJobsState('ready')
    } catch {
      setJobsState('error')
    }
  }

  const loadAlerts = async () => {
    setAlertsState('loading')
    try {
      const res = await fetch('/api/admin/analytics/data-quality?status=open&limit=10', { credentials: 'include' })
      if (!res.ok) throw new Error()
      const json = await res.json()
      const rawAlerts = (json.alerts ?? []) as Array<Record<string, unknown>>
      setAlerts(rawAlerts.map((a) => ({
        id: a.id as string,
        issueType: a.issueType as string ?? a.issue_type as string ?? '',
        domain: a.domain as string,
        description: a.description as string,
        status: a.status as string,
        detectedAt: a.detectedAt as string ?? a.detected_at as string,
      })))
      setAlertsState('ready')
    } catch {
      setAlertsState('error')
    }
  }

  const loadFlags = async () => {
    setFlagsState('loading')
    try {
      const res = await fetch('/api/admin/features', { credentials: 'include' })
      if (res.status === 503) { setFlags({ definitions: [], unavailable: true }); setFlagsState('ready'); return }
      if (!res.ok) throw new Error()
      const json = await res.json()
      setFlags({ definitions: json.definitions ?? [] })
      setFlagsState('ready')
    } catch {
      setFlagsState('error')
    }
  }

  useEffect(() => {
    void loadJobs()
    void loadAlerts()
    void loadFlags()
  }, [])

  const now = new Date()
  const expiredFlags = flags.definitions.filter((f) => f.expires_at && new Date(f.expires_at) < now)

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-white">Observability</h3>

      {/* Export Jobs */}
      <Card className="bg-slate-900/60 border border-slate-700/50 backdrop-blur-sm rounded-sm">
        <CardHeader className="px-4 py-3 border-b border-slate-700/50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-slate-300">Recent Export Jobs</CardTitle>
            <Link href="/admin/dashboard/analytics" className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1">View All <ExternalLink className="h-3 w-3" /></Link>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {jobsState === 'loading' && <div className="flex items-center gap-2 text-slate-400 text-sm"><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Loading…</div>}
          {jobsState === 'error' && <p className="text-sm text-slate-400">Export jobs unavailable.</p>}
          {jobsState === 'ready' && jobs.length === 0 && <p className="text-sm text-slate-400">No recent export jobs.</p>}
          {jobsState === 'ready' && jobs.length > 0 && (
            <div className="space-y-2">
              {jobs.map((job) => (
                <div key={job.id} className="flex items-center justify-between border-b border-slate-800/40 pb-2 last:border-b-0">
                  <div>
                    <p className="text-xs text-slate-200">{job.exportType}</p>
                    <p className="text-xs text-slate-500">{new Date(job.createdAt).toLocaleString()}</p>
                  </div>
                  <Badge className={`text-xs ${job.status === 'completed' || job.status === 'success' ? 'bg-green-500/20 text-green-300' : job.status === 'failed' ? 'bg-red-500/20 text-red-300' : 'bg-slate-600/30 text-slate-400'}`}>{job.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Quality Alerts */}
      <Card className="bg-slate-900/60 border border-slate-700/50 backdrop-blur-sm rounded-sm">
        <CardHeader className="px-4 py-3 border-b border-slate-700/50">
          <CardTitle className="text-sm font-medium text-slate-300">Data Quality</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {alertsState === 'loading' && <div className="flex items-center gap-2 text-slate-400 text-sm"><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Loading…</div>}
          {alertsState === 'error' && <p className="text-sm text-slate-400">Data quality unavailable.</p>}
          {alertsState === 'ready' && alerts.length === 0 && (
            <div className="flex items-center gap-2 text-green-400 text-sm"><CheckCircle className="h-4 w-4" /> All Clear — no open data quality alerts.</div>
          )}
          {alertsState === 'ready' && alerts.length > 0 && (
            <div className="space-y-2">
              {alerts.slice(0, 5).map((alert) => (
                <div key={alert.id} className="flex items-start gap-2 border-b border-slate-800/40 pb-2 last:border-b-0">
                  <AlertTriangle className="h-3.5 w-3.5 text-yellow-400 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs text-slate-200">{alert.description}</p>
                    <p className="text-xs text-slate-500">{alert.domain} · {new Date(alert.detectedAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Feature Flags */}
      <Card className="bg-slate-900/60 border border-slate-700/50 backdrop-blur-sm rounded-sm">
        <CardHeader className="px-4 py-3 border-b border-slate-700/50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-slate-300">
              Feature Flags
              {expiredFlags.length > 0 && <Badge className="ml-2 bg-yellow-500/20 text-yellow-300 text-xs">{expiredFlags.length} expired</Badge>}
            </CardTitle>
            <Link href="/admin/dashboard/features" className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1">Manage Flags <ArrowRight className="h-3 w-3" /></Link>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {flagsState === 'loading' && <div className="flex items-center gap-2 text-slate-400 text-sm"><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Loading…</div>}
          {flagsState === 'error' && <p className="text-sm text-slate-400">Feature flags unavailable.</p>}
          {flagsState === 'ready' && flags.unavailable && <p className="text-sm text-slate-400">Feature flag store unavailable.</p>}
          {flagsState === 'ready' && !flags.unavailable && flags.definitions.length === 0 && <p className="text-sm text-slate-400">No feature flags defined.</p>}
          {flagsState === 'ready' && !flags.unavailable && flags.definitions.length > 0 && (
            <div className="space-y-1.5">
              {flags.definitions.slice(0, 8).map((f) => {
                const expired = f.expires_at && new Date(f.expires_at) < now
                return (
                  <div key={f.key} className="flex items-center justify-between border-b border-slate-800/40 pb-1.5 last:border-b-0">
                    <span className="text-xs font-mono text-slate-300 truncate max-w-[60%]">{f.key}</span>
                    {expired && <Badge className="text-xs bg-yellow-500/20 text-yellow-300">expired</Badge>}
                  </div>
                )
              })}
              {flags.definitions.length > 8 && <p className="text-xs text-slate-500">+{flags.definitions.length - 8} more flags</p>}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Deployment Readiness */}
      <Card className="bg-slate-900/60 border border-slate-700/50 backdrop-blur-sm rounded-sm">
        <CardHeader className="px-4 py-3 border-b border-slate-700/50">
          <CardTitle className="text-sm font-medium text-slate-300">Deployment Readiness Gates</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="space-y-2">
            {DEPLOYMENT_GATES.map((gate) => (
              <div key={gate.id} className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-slate-500 mt-1.5 shrink-0" />
                <div>
                  <p className="text-xs text-slate-200">{gate.label}</p>
                  <p className="text-xs text-slate-500">{gate.desc}</p>
                </div>
                <Badge className="ml-auto shrink-0 text-xs bg-slate-600/30 text-slate-400">unknown</Badge>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-3">
            Gate status requires direct Supabase inspection.{' '}
            <Link href="/admin/dashboard" className="text-purple-400 hover:text-purple-300">View dashboard</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
