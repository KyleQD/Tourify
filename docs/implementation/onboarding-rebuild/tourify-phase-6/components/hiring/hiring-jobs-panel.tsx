"use client"

import { Plus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { HiringEntity } from "@/types/hiring-entity"
import type { HiringJobListItem } from "@/types/hiring-dashboard"
import { formatDashboardDate, getEmployerQueryString, normalizeStatusLabel } from "@/lib/hiring/hiring-dashboard-utils"
import { useHiringDashboardFetch } from "@/hooks/use-hiring-dashboard-fetch"

interface HiringJobsPanelProps {
  employer: HiringEntity
}

export function HiringJobsPanel({ employer }: HiringJobsPanelProps) {
  const queryString = getEmployerQueryString(employer)
  const { data: jobs, isLoading, error } = useHiringDashboardFetch<HiringJobListItem[]>({
    url: `/api/hiring/job-postings?${queryString}`,
    initialData: [],
  })

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Job postings</CardTitle>
          <CardDescription>Create and manage real job postings for this hiring account.</CardDescription>
        </div>
        <Button asChild>
          <a href={`/admin/dashboard/jobs/new?${queryString}`}>
            <Plus className="mr-2 h-4 w-4" />
            New job
          </a>
        </Button>
      </CardHeader>
      <CardContent>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {isLoading ? <p className="text-sm text-muted-foreground">Loading jobs…</p> : null}
        {!isLoading && jobs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No job postings exist for this hiring account yet.</p>
        ) : null}
        {jobs.length > 0 ? (
          <div className="divide-y rounded-lg border">
            {jobs.map((job) => (
              <div key={job.id} className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium">{job.title}</h3>
                    <Badge variant="outline">{normalizeStatusLabel(job.status)}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {[job.department, job.position].filter(Boolean).join(" • ") || "No department set"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Created {formatDashboardDate(job.createdAt)}
                    {job.publishedAt ? ` • Published ${formatDashboardDate(job.publishedAt)}` : ""}
                  </p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <a href={`/admin/dashboard/jobs/${job.id}?${queryString}`}>Manage</a>
                </Button>
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
