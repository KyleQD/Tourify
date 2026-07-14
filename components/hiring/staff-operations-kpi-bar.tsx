"use client"

import { BriefcaseBusiness, ClipboardCheck, ShieldCheck, TrendingUp, Users } from "lucide-react"
import type { HiringDashboardStats } from "@/types/hiring-dashboard"
import { getProgressPercent } from "@/lib/hiring/hiring-dashboard-utils"
import { WorkforceMetricCard } from "./workforce-ui"

interface StaffOperationsKpiBarProps {
  stats: HiringDashboardStats
  isLoading?: boolean
}

export function StaffOperationsKpiBar({ stats, isLoading = false }: StaffOperationsKpiBarProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <WorkforceMetricCard
        label="Active Staff"
        value={stats.rosterActive}
        description={`${stats.rosterTotal} on roster`}
        icon={Users}
        accent="cyan"
        isLoading={isLoading}
      />
      <WorkforceMetricCard
        label="Open Jobs"
        value={stats.publishedJobs}
        description={`${stats.totalJobs} total postings`}
        icon={BriefcaseBusiness}
        accent="purple"
        isLoading={isLoading}
      />
      <WorkforceMetricCard
        label="Pending Apps"
        value={stats.pendingApplications}
        description={`${stats.totalApplications} received`}
        icon={ClipboardCheck}
        accent="amber"
        isLoading={isLoading}
      />
      <WorkforceMetricCard
        label="Onboarding"
        value={stats.onboardingInProgress}
        description={`${stats.onboardingCompleted} completed`}
        icon={ShieldCheck}
        accent="blue"
        isLoading={isLoading}
      />
      <WorkforceMetricCard
        label="Onboarding Progress"
        value={`${getProgressPercent(stats.averageOnboardingProgress)}%`}
        description="Average completion"
        icon={TrendingUp}
        accent="green"
        isLoading={isLoading}
      />
    </div>
  )
}
