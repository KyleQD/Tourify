"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { HiringEntity } from "@/types/hiring-entity"
import type { HiringApplicationListItem } from "@/types/hiring-dashboard"
import { formatDashboardDate, getEmployerQueryString, normalizeStatusLabel } from "@/lib/hiring/hiring-dashboard-utils"
import { useHiringDashboardFetch } from "@/hooks/use-hiring-dashboard-fetch"

interface HiringApplicationsPanelProps {
  employer: HiringEntity
}

export function HiringApplicationsPanel({ employer }: HiringApplicationsPanelProps) {
  const queryString = getEmployerQueryString(employer)
  const { data: applications, isLoading, error } = useHiringDashboardFetch<HiringApplicationListItem[]>({
    url: `/api/hiring/applications?${queryString}`,
    initialData: [],
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Applications</CardTitle>
        <CardDescription>Review applicants and approve them into the onboarding bridge.</CardDescription>
      </CardHeader>
      <CardContent>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {isLoading ? <p className="text-sm text-muted-foreground">Loading applications…</p> : null}
        {!isLoading && applications.length === 0 ? (
          <p className="text-sm text-muted-foreground">No applications have been submitted for this account yet.</p>
        ) : null}
        {applications.length > 0 ? (
          <div className="divide-y rounded-lg border">
            {applications.map((application) => (
              <div key={application.id} className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium">{application.applicantName}</h3>
                    <Badge variant="outline">{normalizeStatusLabel(application.status)}</Badge>
                    {typeof application.isEligible === "boolean" ? (
                      <Badge variant={application.isEligible ? "secondary" : "destructive"}>
                        {application.isEligible ? "Eligible" : "Blocked"}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {application.applicantEmail || "No email"} • {application.jobTitle || "Unknown job"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Applied {formatDashboardDate(application.appliedAt)}
                    {application.onboardingStage ? ` • Onboarding: ${normalizeStatusLabel(application.onboardingStage)}` : ""}
                  </p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <a href={`/admin/dashboard/applications/${application.id}?${queryString}`}>Review</a>
                </Button>
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
