"use client"

import { ScrollText } from "lucide-react"
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { HiringEntity } from "@/types/hiring-entity"
import type { HiringAuditActivity } from "@/types/hiring-dashboard"
import { formatDashboardDate, getEmployerQueryString } from "@/lib/hiring/hiring-dashboard-utils"
import { useHiringDashboardFetch } from "@/hooks/use-hiring-dashboard-fetch"
import { WorkforceEmptyState, WorkforcePanel } from "./workforce-ui"

interface HiringAuditPanelProps {
  employer: HiringEntity
}

export function HiringAuditPanel({ employer }: HiringAuditPanelProps) {
  const queryString = getEmployerQueryString(employer)
  const { data: auditEvents, isLoading, error } = useHiringDashboardFetch<HiringAuditActivity[]>({
    url: `/api/hiring/dashboard?${queryString}&view=audit`,
    initialData: [],
  })

  return (
    <WorkforcePanel>
      <CardHeader>
        <CardTitle className="text-white">Hiring audit</CardTitle>
        <CardDescription>Immutable hiring and onboarding actions for this account.</CardDescription>
      </CardHeader>
      <CardContent>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {isLoading ? <p className="text-sm text-muted-foreground">Loading audit events…</p> : null}
        {!isLoading && auditEvents.length === 0 ? (
          <WorkforceEmptyState
            icon={ScrollText}
            title="No audit events yet"
            description="Hiring decisions, onboarding events, and roster changes will appear here as the account becomes active."
          />
        ) : null}
        {auditEvents.length > 0 ? (
          <div className="overflow-hidden rounded-[1.15rem] border border-slate-700/60">
            {auditEvents.map((event) => (
              <div key={event.id} className="border-b border-slate-800/80 bg-slate-900/35 p-4 last:border-0">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <p className="font-medium text-white">{event.action}</p>
                  <p className="text-xs text-muted-foreground">{formatDashboardDate(event.createdAt)}</p>
                </div>
                {event.description ? <p className="mt-1 text-sm text-muted-foreground">{event.description}</p> : null}
                <p className="mt-1 text-xs text-muted-foreground">
                  {[event.actorName, event.subjectName].filter(Boolean).join(" → ") || "System event"}
                </p>
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </WorkforcePanel>
  )
}
