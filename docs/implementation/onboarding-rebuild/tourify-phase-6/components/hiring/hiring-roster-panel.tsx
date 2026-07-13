"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { HiringEntity } from "@/types/hiring-entity"
import type { HiringRosterMemberListItem } from "@/types/hiring-dashboard"
import { formatDashboardDate, getEmployerQueryString, normalizeStatusLabel } from "@/lib/hiring/hiring-dashboard-utils"
import { useHiringDashboardFetch } from "@/hooks/use-hiring-dashboard-fetch"

interface HiringRosterPanelProps {
  employer: HiringEntity
}

export function HiringRosterPanel({ employer }: HiringRosterPanelProps) {
  const queryString = getEmployerQueryString(employer)
  const { data: roster, isLoading, error } = useHiringDashboardFetch<HiringRosterMemberListItem[]>({
    url: `/api/hiring/roster?${queryString}`,
    initialData: [],
  })

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Roster</CardTitle>
          <CardDescription>Workers created from completed onboarding and Work Mode assignments.</CardDescription>
        </div>
        <Button variant="outline" asChild>
          <a href={`/admin/dashboard/staff/export?${queryString}`}>Export roster</a>
        </Button>
      </CardHeader>
      <CardContent>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {isLoading ? <p className="text-sm text-muted-foreground">Loading roster…</p> : null}
        {!isLoading && roster.length === 0 ? (
          <p className="text-sm text-muted-foreground">No roster members have been created for this account yet.</p>
        ) : null}
        {roster.length > 0 ? (
          <div className="overflow-hidden rounded-lg border">
            <div className="grid grid-cols-12 border-b bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground">
              <div className="col-span-4">Worker</div>
              <div className="col-span-3">Role</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-3">Started</div>
            </div>
            {roster.map((member) => (
              <div key={member.id} className="grid grid-cols-12 gap-2 border-b px-4 py-3 text-sm last:border-0">
                <div className="col-span-4">
                  <p className="font-medium">{member.name}</p>
                  <p className="text-xs text-muted-foreground">{member.email || "No email"}</p>
                </div>
                <div className="col-span-3 text-muted-foreground">
                  {[member.department, member.position].filter(Boolean).join(" • ") || "No role"}
                </div>
                <div className="col-span-2">
                  <Badge variant="outline">{normalizeStatusLabel(member.status)}</Badge>
                </div>
                <div className="col-span-3 text-muted-foreground">{formatDashboardDate(member.startedAt)}</div>
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
