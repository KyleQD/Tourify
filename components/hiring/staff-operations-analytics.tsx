"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { CalendarCheck, ShieldCheck, Users, Workflow } from "lucide-react"

import { AdminErrorCard } from "@/app/admin/dashboard/components/admin-error-card"
import { AdminPageSkeleton } from "@/app/admin/dashboard/components/admin-page-skeleton"
import { Progress } from "@/components/ui/progress"
import { useActingContext } from "@/hooks/use-acting-context"
import type { HiringEntity } from "@/types/hiring-entity"
import type { StaffOperationsSummary } from "@/types/staff-operations"
import { WorkforceEmptyState, WorkforceMetricCard, WorkforcePanel } from "./workforce-ui"

export function StaffOperationsAnalytics({ employer }: { employer: HiringEntity }) {
  const { actingHeaders, actingContextKey, isActingReady } = useActingContext()
  const [summary, setSummary] = useState<StaffOperationsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!isActingReady) return
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/admin/staff-operations/summary", {
        credentials: "include",
        cache: "no-store",
        headers: { ...actingHeaders, "Cache-Control": "no-cache" },
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : "Unable to load workforce analytics")
      setSummary(payload as StaffOperationsSummary)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load workforce analytics")
    } finally {
      setLoading(false)
    }
  }, [actingHeaders, isActingReady])

  useEffect(() => { void load() }, [actingContextKey, load])

  const coverageRate = useMemo(() => {
    if (!summary) return 0
    const total = summary.coverage.filledShifts + summary.coverage.openShifts
    return total === 0 ? 0 : Math.round((summary.coverage.filledShifts / total) * 100)
  }, [summary])

  if (loading && !summary) return <AdminPageSkeleton />
  if (error && !summary) return <AdminErrorCard title="Analytics unavailable" message={error} onRetry={() => void load()} />
  if (!summary) return null

  const hasOperationalData = summary.metrics.activeStaff > 0 || summary.metrics.shiftsNextSevenDays > 0 || summary.metrics.openConflicts > 0

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <WorkforceMetricCard label="Active staff" value={summary.metrics.activeStaff} description={employer.displayName} icon={Users} accent="cyan" />
        <WorkforceMetricCard label="Scheduled shifts" value={summary.metrics.shiftsNextSevenDays} description="Next seven days" icon={CalendarCheck} accent="purple" />
        <WorkforceMetricCard label="Coverage rate" value={`${coverageRate}%`} description="Filled upcoming shifts" icon={ShieldCheck} accent="green" />
        <WorkforceMetricCard label="Action backlog" value={summary.topTasks.length} description={`${summary.metrics.openConflicts} conflicts`} icon={Workflow} accent="amber" />
      </div>

      {!hasOperationalData ? (
        <WorkforcePanel className="p-5">
          <WorkforceEmptyState icon={CalendarCheck} title="No operational history yet" description="Analytics will populate from real staff, schedules, requests, and conflict records." />
        </WorkforcePanel>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <WorkforcePanel className="p-5">
            <h2 className="text-base font-semibold text-white">Schedule coverage</h2>
            <p className="mt-1 text-xs text-slate-400">Filled versus open shifts in the next seven days.</p>
            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between text-sm"><span className="text-slate-300">Coverage</span><span className="font-semibold text-white">{coverageRate}%</span></div>
              <Progress value={coverageRate} />
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="rounded-sm border border-emerald-500/20 bg-emerald-500/5 p-3"><p className="text-2xl font-semibold text-emerald-300">{summary.coverage.filledShifts}</p><p className="text-xs text-slate-400">Filled shifts</p></div>
                <div className="rounded-sm border border-amber-500/20 bg-amber-500/5 p-3"><p className="text-2xl font-semibold text-amber-300">{summary.coverage.openShifts}</p><p className="text-xs text-slate-400">Open shifts</p></div>
              </div>
            </div>
          </WorkforcePanel>

          <WorkforcePanel className="p-5">
            <h2 className="text-base font-semibold text-white">Team readiness</h2>
            <p className="mt-1 text-xs text-slate-400">Current approved workforce status.</p>
            <div className="mt-6 space-y-3">
              {[
                ["Active", summary.team.active, "text-emerald-300"],
                ["On leave", summary.team.onLeave, "text-blue-300"],
                ["Pending approval", summary.team.pending, "text-amber-300"],
                ["Open conflicts", summary.coverage.openConflicts, "text-red-300"],
              ].map(([label, value, tone]) => (
                <div key={String(label)} className="flex items-center justify-between rounded-sm border border-slate-700/50 bg-slate-900/50 px-3 py-2.5"><span className="text-sm text-slate-300">{label}</span><span className={`text-sm font-semibold ${tone}`}>{value}</span></div>
              ))}
            </div>
          </WorkforcePanel>
        </div>
      )}
    </div>
  )
}
