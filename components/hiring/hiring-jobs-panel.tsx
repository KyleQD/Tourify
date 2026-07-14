"use client"

import { useState } from "react"
import { BriefcaseBusiness, Plus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { HiringEntity } from "@/types/hiring-entity"
import type { HiringJobListItem } from "@/types/hiring-dashboard"
import { formatDashboardDate, getEmployerQueryString, normalizeStatusLabel } from "@/lib/hiring/hiring-dashboard-utils"
import { useHiringDashboardFetch } from "@/hooks/use-hiring-dashboard-fetch"
import { AdminJobPostingWizard } from "./admin-job-posting-wizard"
import { WorkforceEmptyState, WorkforcePanel } from "./workforce-ui"

interface HiringJobsPanelProps {
  employer: HiringEntity
}

export function HiringJobsPanel({ employer }: HiringJobsPanelProps) {
  const queryString = getEmployerQueryString(employer)
  const [isWizardOpen, setIsWizardOpen] = useState(false)
  const { data: jobs, isLoading, error, refetch } = useHiringDashboardFetch<HiringJobListItem[]>({
    url: `/api/hiring/job-postings?${queryString}`,
    initialData: [],
  })

  return (
    <WorkforcePanel>
      <AdminJobPostingWizard
        employer={employer}
        open={isWizardOpen}
        onOpenChange={setIsWizardOpen}
        onCreated={() => void refetch()}
      />
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-white">Job postings</CardTitle>
          <CardDescription>Create and manage real job postings for this hiring account.</CardDescription>
        </div>
        <Button
          className="rounded-xl bg-gradient-to-r from-cyan-400 to-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20 hover:from-cyan-300 hover:to-cyan-400"
          onClick={() => setIsWizardOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          New job
        </Button>
      </CardHeader>
      <CardContent>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {isLoading ? <p className="text-sm text-muted-foreground">Loading jobs…</p> : null}
        {!isLoading && jobs.length === 0 ? (
          <WorkforceEmptyState
            icon={BriefcaseBusiness}
            title="No job postings yet"
            description="Create the first scoped role to begin collecting applications for this workforce account."
            action={
              <Button
                className="rounded-xl bg-gradient-to-r from-cyan-400 to-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20 hover:from-cyan-300 hover:to-cyan-400"
                onClick={() => setIsWizardOpen(true)}
              >
                Create job posting
              </Button>
            }
          />
        ) : null}
        {jobs.length > 0 ? (
          <div className="overflow-hidden rounded-[1.15rem] border border-slate-700/60">
            {jobs.map((job) => (
              <div key={job.id} className="flex flex-col gap-3 border-b border-slate-800/80 bg-slate-900/35 p-4 last:border-0 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium text-white">{job.title}</h3>
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
                <Button className="rounded-xl" variant="outline" size="sm" asChild>
                  <a href={`/admin/dashboard/jobs/${job.id}?${queryString}`}>Manage</a>
                </Button>
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </WorkforcePanel>
  )
}
