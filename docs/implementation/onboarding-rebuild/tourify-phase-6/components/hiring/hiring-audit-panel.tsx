"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { HiringEntity } from "@/types/hiring-entity"
import type { HiringAuditActivity } from "@/types/hiring-dashboard"
import { formatDashboardDate, getEmployerQueryString } from "@/lib/hiring/hiring-dashboard-utils"
import { useHiringDashboardFetch } from "@/hooks/use-hiring-dashboard-fetch"

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
    <Card>
      <CardHeader>
        <CardTitle>Hiring audit</CardTitle>
        <CardDescription>Immutable hiring and onboarding actions for this account.</CardDescription>
      </CardHeader>
      <CardContent>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {isLoading ? <p className="text-sm text-muted-foreground">Loading audit events…</p> : null}
        {!isLoading && auditEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No audit events exist for this hiring account yet.</p>
        ) : null}
        {auditEvents.length > 0 ? (
          <div className="divide-y rounded-lg border">
            {auditEvents.map((event) => (
              <div key={event.id} className="p-4">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <p className="font-medium">{event.action}</p>
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
    </Card>
  )
}
