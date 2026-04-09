"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, ShieldCheck, Users, FileCheck, AlertTriangle } from 'lucide-react'

interface OverviewPayload {
  staffing: {
    total_staff: number
    active_staff: number
    pending_applications: number
    onboarding_in_progress: number
  }
  compliance: {
    agreements_pending: number
    documents_pending_verification: number
    credentials_expiring_30_days: number
  }
  roles: {
    active_assignments: number
    unique_roles: number
  }
}

interface EmployeeManagementOverviewProps {
  venueId: string
  rolesHref?: string
}

export function EmployeeManagementOverview({
  venueId,
  rolesHref = '/admin/dashboard/rbac',
}: EmployeeManagementOverviewProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<OverviewPayload | null>(null)

  useEffect(() => {
    if (!venueId) return
    let cancelled = false

    async function loadOverview() {
      try {
        setIsLoading(true)
        setError(null)
        const response = await fetch(
          `/api/staffing/employee-overview?venue_id=${encodeURIComponent(venueId)}`,
          { cache: 'no-store' }
        )
        const payload = await response.json()
        if (!response.ok || !payload?.success) throw new Error(payload?.error || 'Failed to load overview')
        if (!cancelled) setData(payload.data)
      } catch (fetchError: any) {
        if (!cancelled) setError(fetchError?.message || 'Failed to load overview')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    loadOverview()
    return () => {
      cancelled = true
    }
  }, [venueId])

  if (!venueId) return null

  return (
    <Card className="border-slate-700 bg-slate-900/70">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-white">
          <Users className="h-5 w-5 text-cyan-400" />
          Employee management overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center gap-2 text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading staffing and compliance data...
          </div>
        ) : error ? (
          <div className="flex items-start gap-2 text-sm text-amber-300">
            <AlertTriangle className="mt-0.5 h-4 w-4" />
            <span>{error}</span>
          </div>
        ) : data ? (
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-3">
              <p className="text-xs uppercase text-slate-400">Staffing</p>
              <p className="mt-2 text-xl font-semibold text-white">{data.staffing.total_staff}</p>
              <p className="text-xs text-slate-400">
                {data.staffing.active_staff} active · {data.staffing.pending_applications} pending apps
              </p>
              <Badge className="mt-2 border-cyan-600/30 bg-cyan-900/30 text-cyan-200">
                {data.staffing.onboarding_in_progress} onboarding
              </Badge>
            </div>

            <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-3">
              <p className="text-xs uppercase text-slate-400">Compliance</p>
              <p className="mt-2 text-xl font-semibold text-white">
                {data.compliance.documents_pending_verification}
              </p>
              <p className="text-xs text-slate-400">documents pending verification</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge variant="secondary" className="bg-slate-700 text-slate-100">
                  {data.compliance.agreements_pending} agreements pending
                </Badge>
                <Badge variant="secondary" className="bg-slate-700 text-slate-100">
                  {data.compliance.credentials_expiring_30_days} expiring soon
                </Badge>
              </div>
            </div>

            <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-3">
              <p className="text-xs uppercase text-slate-400">Roles</p>
              <p className="mt-2 text-xl font-semibold text-white">{data.roles.active_assignments}</p>
              <p className="text-xs text-slate-400">active role assignments</p>
              <div className="mt-2 flex items-center justify-between">
                <Badge className="border-emerald-600/30 bg-emerald-900/30 text-emerald-200">
                  {data.roles.unique_roles} unique roles
                </Badge>
                <Button asChild variant="ghost" size="sm" className="text-slate-200 hover:bg-slate-700">
                  <Link href={rolesHref}>
                    <ShieldCheck className="mr-1 h-4 w-4" />
                    Manage roles
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-slate-400">No overview data available.</div>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          <Badge variant="outline" className="border-slate-600 text-slate-300">
            <FileCheck className="mr-1 h-3.5 w-3.5" />
            Integrated with onboarding + agreements + credentials
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}
