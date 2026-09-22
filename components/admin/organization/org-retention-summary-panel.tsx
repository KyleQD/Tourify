'use client'

import Link from 'next/link'
import { ArrowRight, Archive } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { RetentionControlsPanel } from '@/components/admin/rbac/retention-controls-panel'

// ─── Domain status table ──────────────────────────────────────────────────────

const DOMAINS = [
  { label: 'Audit logs',       description: 'Admin audit trail events' },
  { label: 'Finance records',  description: 'Invoices, settlements, advances' },
  { label: 'Tickets',          description: 'Ticketing and admissions records' },
  { label: 'Contracts',        description: 'Vendor and service agreements' },
  { label: 'Personnel data',   description: 'Workforce and HR records' },
  { label: 'Incidents',        description: 'Security and live-ops incident reports' },
  { label: 'Documents',        description: 'Uploaded files and attachments' },
]

// ─── Component ───────────────────────────────────────────────────────────────

export function OrgRetentionSummaryPanel() {
  return (
    <div className="space-y-6">
      {/* ── Summary header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold text-white">Data Retention Policies</h3>
          <p className="text-sm text-slate-400 mt-1 max-w-prose">
            Retention policies define how long operational data is kept before it can be archived
            or deleted. Legal holds override all policies and prevent deletion until released.
            Manage the full retention configuration in the RBAC Retention tab.
          </p>
        </div>
        <Link
          href="/admin/dashboard/rbac?tab=retention"
          className="inline-flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 whitespace-nowrap ml-4"
        >
          Manage in Detail <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* ── Domain status table ── */}
      <Card className="bg-slate-900/60 border border-slate-700/50 backdrop-blur-sm rounded-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-700/50">
          <h4 className="text-sm font-medium text-slate-300">Domain Coverage</h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Retention status per data domain. Configure policies in the detail view.
          </p>
        </div>
        <div className="divide-y divide-slate-800/50">
          {DOMAINS.map((domain) => (
            <div key={domain.label} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm text-slate-200">{domain.label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{domain.description}</p>
              </div>
              <Badge className="bg-slate-700/40 text-slate-400 border-slate-600/30 text-xs">
                not configured
              </Badge>
            </div>
          ))}
        </div>
      </Card>

      {/* ── Retention holds panel ── */}
      <RetentionControlsPanel />
    </div>
  )
}
