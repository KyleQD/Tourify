"use client"

import Link from "next/link"
import {
  Activity,
  BriefcaseBusiness,
  ClipboardCheck,
  Download,
  ShieldCheck,
  ShieldHalf,
  UserPlus,
  Users,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import type { HiringEntity } from "@/types/hiring-entity"
import type { HiringDashboardStats } from "@/types/hiring-dashboard"
import {
  formatDashboardDate,
  getEmployerQueryString,
  getProgressPercent,
} from "@/lib/hiring/hiring-dashboard-utils"
import { cn } from "@/lib/utils"
import { WorkforceEmptyState, WorkforcePanel } from "./workforce-ui"

interface StaffOperationsOverviewProps {
  employer: HiringEntity
  stats: HiringDashboardStats
  isLoading?: boolean
}

interface FunnelStage {
  label: string
  value: number
  icon: LucideIcon
  accent: string
}

interface QuickAction {
  label: string
  description: string
  href: string
  icon: LucideIcon
  external?: boolean
}

export function StaffOperationsOverview({ employer, stats, isLoading = false }: StaffOperationsOverviewProps) {
  const queryString = getEmployerQueryString(employer)

  const funnel: FunnelStage[] = [
    { label: "Applications received", value: stats.totalApplications, icon: ClipboardCheck, accent: "bg-blue-500" },
    { label: "Pending review", value: stats.pendingApplications, icon: Activity, accent: "bg-amber-500" },
    { label: "Approved", value: stats.approvedApplications, icon: ShieldCheck, accent: "bg-purple-500" },
    { label: "In onboarding", value: stats.onboardingInProgress, icon: ShieldHalf, accent: "bg-cyan-500" },
    { label: "Active staff", value: stats.rosterActive, icon: Users, accent: "bg-emerald-500" },
  ]
  const funnelMax = Math.max(...funnel.map((stage) => stage.value), 1)

  const quickActions: QuickAction[] = [
    {
      label: "New Job Posting",
      description: "Open a role to start hiring",
      href: `/admin/dashboard/jobs/new?${queryString}`,
      icon: BriefcaseBusiness,
    },
    {
      label: "Invite Candidate",
      description: "Send an onboarding invite",
      href: `/admin/dashboard/candidates?${queryString}`,
      icon: UserPlus,
    },
    {
      label: "Export Roster",
      description: "Download active staff CSV",
      href: `/api/hiring/roster/export?${queryString}`,
      icon: Download,
      external: true,
    },
    {
      label: "Manage Roles",
      description: "Permissions and access",
      href: "/admin/dashboard/rbac",
      icon: ShieldHalf,
    },
  ]

  const recentActivity = stats.recentActivity.slice(0, 5)
  const onboardingProgress = getProgressPercent(stats.averageOnboardingProgress)

  return (
    <div className="space-y-6">
      <WorkforcePanel className="p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-white">Quick actions</h3>
            <p className="text-xs text-slate-400">Jump into the most common workforce tasks.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {quickActions.map((action) => {
            const Icon = action.icon
            return (
              <Button
                key={action.label}
                asChild
                variant="outline"
                className="h-auto justify-start gap-3 border-slate-700/60 bg-slate-900/50 p-3 text-left hover:border-cyan-400/40 hover:bg-slate-900/80"
              >
                <Link
                  href={action.href}
                  {...(action.external ? { target: "_blank", rel: "noreferrer" } : {})}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-300">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-white">{action.label}</span>
                    <span className="block truncate text-xs font-normal text-slate-400">{action.description}</span>
                  </span>
                </Link>
              </Button>
            )
          })}
        </div>
      </WorkforcePanel>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <WorkforcePanel className="p-5">
          <div className="mb-5">
            <h3 className="text-base font-semibold text-white">Hiring pipeline</h3>
            <p className="text-xs text-slate-400">From application to an active member of the crew.</p>
          </div>
          <div className="space-y-4">
            {funnel.map((stage) => {
              const Icon = stage.icon
              const widthPercent = Math.max(Math.round((stage.value / funnelMax) * 100), stage.value > 0 ? 6 : 2)
              return (
                <div key={stage.label} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-slate-300">
                      <Icon className="h-4 w-4 text-slate-400" />
                      {stage.label}
                    </span>
                    <span className="font-semibold text-white tabular-nums">{isLoading ? "..." : stage.value}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-800/70">
                    <div
                      className={cn("h-full rounded-full transition-all", stage.accent)}
                      style={{ width: `${widthPercent}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <OnboardingStat label="In progress" value={stats.onboardingInProgress} />
            <OnboardingStat label="Completed" value={stats.onboardingCompleted} />
            <OnboardingStat label="Avg completion" value={`${onboardingProgress}%`} />
          </div>
          <div className="mt-4 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Average onboarding completion</span>
              <span>{onboardingProgress}%</span>
            </div>
            <Progress value={onboardingProgress} />
          </div>
        </WorkforcePanel>

        <WorkforcePanel className="p-5">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-white">Recent activity</h3>
            <p className="text-xs text-slate-400">Latest hiring and onboarding events.</p>
          </div>
          {recentActivity.length === 0 ? (
            <WorkforceEmptyState
              icon={Activity}
              title="No activity yet"
              description="Hiring and onboarding events for this account will appear here."
              className="min-h-[200px]"
            />
          ) : (
            <ol className="space-y-4">
              {recentActivity.map((activity) => (
                <li key={activity.id} className="relative border-l border-slate-700/60 pl-4">
                  <span className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-cyan-400" />
                  <p className="text-sm font-medium text-white">{activity.action}</p>
                  {activity.description ? (
                    <p className="mt-0.5 text-xs leading-5 text-slate-400">{activity.description}</p>
                  ) : null}
                  <p className="mt-1 text-[11px] uppercase tracking-wide text-slate-500">
                    {formatDashboardDate(activity.createdAt)}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </WorkforcePanel>
      </div>
    </div>
  )
}

function OnboardingStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-slate-700/60 bg-slate-900/55 p-3">
      <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-semibold text-white">{value}</p>
    </div>
  )
}
