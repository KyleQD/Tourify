"use client"

import Link from "next/link"
import { BriefcaseBusiness } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import type { HiringEntity } from "@/types/hiring-entity"
import type { HiringDashboardStats } from "@/types/hiring-dashboard"
import { getEmployerQueryString, formatDashboardDate, getProgressPercent } from "@/lib/hiring/hiring-dashboard-utils"
import { useHiringDashboardFetch } from "@/hooks/use-hiring-dashboard-fetch"
import { WorkforceEmptyState, WorkforcePanel } from "./workforce-ui"

interface HiringOverviewPanelProps {
  employer: HiringEntity
}

const EMPTY_STATS: HiringDashboardStats = {
  totalJobs: 0,
  publishedJobs: 0,
  totalApplications: 0,
  pendingApplications: 0,
  approvedApplications: 0,
  rejectedApplications: 0,
  onboardingTotal: 0,
  onboardingInProgress: 0,
  onboardingCompleted: 0,
  rosterTotal: 0,
  rosterActive: 0,
  averageOnboardingProgress: 0,
  recentActivity: [],
}

export function HiringOverviewPanel({ employer }: HiringOverviewPanelProps) {
  const queryString = getEmployerQueryString(employer)
  const { data: stats, isLoading, error } = useHiringDashboardFetch<HiringDashboardStats>({
    url: `/api/hiring/dashboard?${queryString}`,
    initialData: EMPTY_STATS,
  })

  if (error) {
    return (
      <WorkforcePanel className="border-destructive/30 p-6">
        <CardHeader>
          <CardTitle>Unable to load hiring overview</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
      </WorkforcePanel>
    )
  }

  return (
    <div className="space-y-6">
      {!isLoading && stats.totalJobs === 0 ? (
        <WorkforceEmptyState
          icon={BriefcaseBusiness}
          title="No jobs yet"
          description="Create a job posting to start intake, onboarding, and rostering for this account."
          action={
            <Button asChild size="sm" className="bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0">
              <Link href={`/admin/dashboard/jobs/new?${queryString}`}>Create job</Link>
            </Button>
          }
        />
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <WorkforcePanel>
          <CardHeader>
            <CardTitle className="text-white">Onboarding health</CardTitle>
            <CardDescription>Progress is calculated from real candidate records for this hiring account.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Average completion</span>
                <span>{getProgressPercent(stats.averageOnboardingProgress)}%</span>
              </div>
              <Progress value={getProgressPercent(stats.averageOnboardingProgress)} />
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <MiniMetric label="In progress" value={stats.onboardingInProgress} />
              <MiniMetric label="Completed" value={stats.onboardingCompleted} />
              <MiniMetric label="Approved apps" value={stats.approvedApplications} />
            </div>
          </CardContent>
        </WorkforcePanel>

        <WorkforcePanel>
          <CardHeader>
            <CardTitle className="text-white">Recent activity</CardTitle>
            <CardDescription>Latest hiring audit events.</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No hiring activity has been recorded for this account yet.
              </p>
            ) : (
              <div className="space-y-4">
                {stats.recentActivity.slice(0, 6).map((activity) => (
                  <div key={activity.id} className="border-b pb-3 last:border-0 last:pb-0">
                    <p className="text-sm font-medium">{activity.action}</p>
                    {activity.description ? (
                      <p className="text-sm text-muted-foreground">{activity.description}</p>
                    ) : null}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDashboardDate(activity.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </WorkforcePanel>
      </div>
    </div>
  )
}

function MiniMetric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4 shadow-[0_20px_70px_rgba(0,0,0,0.18)] backdrop-blur-xl">
      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-semibold text-white">{value}</p>
    </div>
  )
}
