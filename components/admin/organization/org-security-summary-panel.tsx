'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, Shield, AlertTriangle, ArrowRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

// ─── Types ───────────────────────────────────────────────────────────────────

type PanelState = 'idle' | 'loading' | 'ready' | 'unavailable' | 'error'

interface SecuritySummary {
  success: boolean
  orgId: string
  memberCount: number | null
  roleCount: number | null
  grantCount: number | null
  expiringGrantCount: number | null
  openReviewCount: number | null
  deniedLast24h: number | null
  denialUnavailable: boolean
  freshAt: string
}

// ─── Stat card ───────────────────────────────────────────────────────────────

interface StatCardProps {
  value: number | string | null
  label: string
  href: string
  action: string
  badge?: React.ReactNode
}

function StatCard({ value, label, href, action, badge }: StatCardProps) {
  return (
    <Card className="bg-slate-900/60 border border-slate-700/50 backdrop-blur-sm rounded-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="text-2xl font-bold text-white">
            {value ?? '—'}
          </div>
          {badge}
        </div>
        <div className="text-sm text-slate-400 mt-1">{label}</div>
        <Link
          href={href}
          className="text-xs text-purple-400 hover:text-purple-300 mt-1 inline-flex items-center gap-1"
        >
          {action} <ArrowRight className="h-3 w-3" />
        </Link>
      </CardContent>
    </Card>
  )
}

// ─── Panel ───────────────────────────────────────────────────────────────────

export function OrgSecuritySummaryPanel() {
  const [panelState, setPanelState] = useState<PanelState>('idle')
  const [data, setData] = useState<SecuritySummary | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setPanelState('loading')

    fetch('/api/admin/organization/security-summary')
      .then(async (res) => {
        if (cancelled) return
        if (res.status === 403 || res.status === 401) {
          setPanelState('unavailable')
          return
        }
        const json = await res.json()
        if (!res.ok || !json.success) {
          setErrorMsg(json.error ?? 'Failed to load security summary.')
          setPanelState('error')
          return
        }
        setData(json as SecuritySummary)
        setPanelState('ready')
      })
      .catch((err) => {
        if (cancelled) return
        setErrorMsg(err instanceof Error ? err.message : 'Network error.')
        setPanelState('error')
      })

    return () => {
      cancelled = true
    }
  }, [])

  // ─── Loading ───────────────────────────────────────────────────────────────
  if (panelState === 'idle' || panelState === 'loading') {
    return (
      <div className="flex items-center gap-2 py-8 text-slate-400 text-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading security summary…
      </div>
    )
  }

  // ─── Unavailable (capability denied) ──────────────────────────────────────
  if (panelState === 'unavailable') {
    return (
      <div className="flex items-center gap-2 py-8 text-slate-400 text-sm">
        <Shield className="h-4 w-4" />
        Security summary requires <code className="text-slate-300">audit.view</code> or{' '}
        <code className="text-slate-300">org.roles.manage</code>.
      </div>
    )
  }

  // ─── Error ────────────────────────────────────────────────────────────────
  if (panelState === 'error') {
    return (
      <div className="flex items-center gap-2 py-8 text-red-400 text-sm">
        <AlertTriangle className="h-4 w-4" />
        {errorMsg ?? 'Error loading security summary.'}
      </div>
    )
  }

  // ─── Ready ────────────────────────────────────────────────────────────────
  if (!data) return null

  const freshLabel = new Date(data.freshAt).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

  const expiringBadge =
    data.expiringGrantCount != null && data.expiringGrantCount > 0 ? (
      <Badge variant="destructive" className="text-xs px-1.5 py-0.5">
        {data.expiringGrantCount} expiring
      </Badge>
    ) : undefined

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex items-center gap-2">
        <Shield className="h-4 w-4 text-purple-400" />
        <span className="text-sm font-medium text-white">Security & Access Health</span>
        <span className="text-xs text-slate-500 ml-auto">as of {freshLabel}</span>
      </div>

      {/* ── Stat grid ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard
          value={data.memberCount}
          label="Active members"
          href="/admin/dashboard/rbac?tab=membership"
          action="Manage Members"
        />
        <StatCard
          value={data.roleCount}
          label="Custom roles"
          href="/admin/dashboard/rbac?tab=roles"
          action="Manage Roles"
        />
        <StatCard
          value={data.grantCount}
          label="Entity grants"
          href="/admin/dashboard/rbac?tab=grants"
          action="View Grants"
          badge={expiringBadge}
        />
        <StatCard
          value={data.openReviewCount}
          label="Open access reviews"
          href="/admin/dashboard/rbac?tab=review"
          action="Review"
        />
        <StatCard
          value={data.denialUnavailable ? 'Unavailable' : data.deniedLast24h}
          label="Auth denials (24h)"
          href="/admin/dashboard/settings/audit"
          action="View Audit Log"
        />
        {/* ── Audit log deep-link card ── */}
        <Card className="bg-slate-900/60 border border-slate-700/50 backdrop-blur-sm rounded-sm">
          <CardContent className="p-4">
            <div className="text-sm font-medium text-white mt-1">Full audit log</div>
            <div className="text-sm text-slate-400 mt-1">All org security events</div>
            <Link
              href="/admin/dashboard/settings/audit"
              className="text-xs text-purple-400 hover:text-purple-300 mt-1 inline-flex items-center gap-1"
            >
              View Full Log <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
