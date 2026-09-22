'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Zap, RefreshCw, ArrowRight, ChevronDown, ChevronRight as ChevronRightIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AdminEmptyState } from '@/app/admin/dashboard/components/admin-empty-state'

// ─── Types ──────────────────────────────────────────────────────────────────

type PanelState = 'idle' | 'loading' | 'ready' | 'error'

// ─── Capability domain groups ─────────────────────────────────────────────────

const DOMAIN_ORDER = [
  'org',
  'audit',
  'tour',
  'event',
  'routing',
  'advance',
  'logistics',
  'workforce',
  'hiring',
  'vendor',
  'contract',
  'finance',
  'ticketing',
  'site_map',
  'communications',
  'content',
] as const

const DOMAIN_LABELS: Record<string, string> = {
  org:            'Organization',
  audit:          'Audit',
  tour:           'Tours',
  event:          'Events',
  routing:        'Routing',
  advance:        'Advance',
  logistics:      'Logistics',
  workforce:      'Workforce',
  hiring:         'Hiring',
  vendor:         'Vendors',
  contract:       'Contracts',
  finance:        'Finance',
  ticketing:      'Ticketing',
  site_map:       'Site Map',
  communications: 'Communications',
  content:        'Content',
}

// All 42 capability strings, grouped by domain prefix
const ALL_CAPABILITIES = [
  'org.roles.manage',
  'org.settings.manage',
  'audit.view',
  'tour.view',
  'tour.manage',
  'tour.publish',
  'tour.archive',
  'tour.delete',
  'event.view',
  'event.manage',
  'event.publish',
  'event.live_ops',
  'routing.manage',
  'advance.manage',
  'logistics.view',
  'logistics.manage',
  'logistics.sensitive',
  'workforce.view',
  'workforce.manage',
  'workforce.publish',
  'hiring.manage',
  'vendor.view',
  'vendor.manage',
  'vendor.sensitive',
  'contract.view',
  'contract.manage',
  'contract.sign',
  'finance.view',
  'finance.manage',
  'finance.approve',
  'finance.pay',
  'ticketing.view',
  'ticketing.manage',
  'ticketing.scan',
  'ticketing.refund',
  'site_map.view',
  'site_map.edit',
  'site_map.share',
  'communications.send',
  'communications.broadcast',
  'content.view',
  'content.manage',
] as const

function getDomain(cap: string): string {
  const dot = cap.indexOf('.')
  return dot > -1 ? cap.slice(0, dot) : cap
}

// Grouped: domain → capability strings
const GROUPED = DOMAIN_ORDER.reduce<Record<string, string[]>>((acc, domain) => {
  acc[domain] = ALL_CAPABILITIES.filter((c) => getDomain(c) === domain)
  return acc
}, {})

// ─── Component ───────────────────────────────────────────────────────────────

export function OrgCapabilitiesPanel() {
  const [state, setState] = useState<PanelState>('idle')
  const [grantedSet, setGrantedSet] = useState<Set<string>>(new Set())
  const [membershipRole, setMembershipRole] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set(DOMAIN_ORDER))

  const load = async () => {
    setState('loading')
    setError(null)
    try {
      const res = await fetch('/api/admin/effective-capabilities', { credentials: 'include' })
      if (!res.ok) throw new Error(`Failed to load capabilities (${res.status})`)
      const data = await res.json()
      const caps: string[] = data.capabilities ?? []
      setGrantedSet(new Set(caps))
      setMembershipRole(data.membershipRole ?? null)
      setState('ready')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load capabilities')
      setState('error')
    }
  }

  useEffect(() => { void load() }, [])

  const toggleDomain = (domain: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(domain)) next.delete(domain)
      else next.add(domain)
      return next
    })
  }

  if (state === 'loading') {
    return (
      <Card className="bg-slate-900/60 border border-slate-700/50 backdrop-blur-sm rounded-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-busy="true" />
            Loading capabilities…
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
          <h3 className="text-base font-semibold text-white">Capability Surface</h3>
          <p className="text-sm text-slate-400 mt-0.5">
            Your resolved capabilities for this organization.
            {membershipRole && (
              <span className="ml-2 text-slate-500">Role: <span className="text-slate-300">{membershipRole}</span></span>
            )}
          </p>
        </div>
        <Link
          href="/admin/dashboard/rbac?tab=roles"
          className="inline-flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300"
        >
          Manage Roles <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* ── Capability groups ── */}
      <div className="space-y-2">
        {DOMAIN_ORDER.map((domain) => {
          const caps = GROUPED[domain] ?? []
          const grantedCount = caps.filter((c) => grantedSet.has(c)).length
          const isExpanded = expanded.has(domain)

          return (
            <Card key={domain} className="bg-slate-900/60 border border-slate-700/50 backdrop-blur-sm rounded-sm overflow-hidden">
              {/* Domain header row */}
              <button
                onClick={() => toggleDomain(domain)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-800/40 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  {isExpanded
                    ? <ChevronDown className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                    : <ChevronRightIcon className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                  }
                  <span className="text-sm font-medium text-white">
                    {DOMAIN_LABELS[domain] ?? domain}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">
                    {grantedCount}/{caps.length}
                  </span>
                  <Badge
                    className={
                      grantedCount > 0
                        ? 'bg-green-500/20 text-green-300 border-green-500/30 text-xs'
                        : 'bg-slate-700/40 text-slate-500 border-slate-600/30 text-xs'
                    }
                  >
                    {grantedCount > 0 ? `${grantedCount} granted` : 'none'}
                  </Badge>
                </div>
              </button>

              {/* Capability rows */}
              {isExpanded && (
                <div className="border-t border-slate-700/40">
                  {caps.map((cap) => {
                    const granted = grantedSet.has(cap)
                    return (
                      <div
                        key={cap}
                        className="flex items-center justify-between px-4 py-2 border-b border-slate-800/50 last:border-b-0"
                      >
                        <span className="text-xs font-mono text-slate-300">{cap}</span>
                        <Badge
                          className={
                            granted
                              ? 'bg-green-500/15 text-green-400 border-green-500/20 text-xs'
                              : 'bg-slate-700/30 text-slate-500 border-slate-600/20 text-xs'
                          }
                        >
                          {granted ? 'enabled' : 'not granted'}
                        </Badge>
                      </div>
                    )
                  })}
                </div>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
