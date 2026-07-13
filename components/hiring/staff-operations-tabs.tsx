"use client"

import { useCallback } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { BriefcaseBusiness, ClipboardCheck, Clock, LayoutDashboard, ScrollText, ShieldCheck, Users } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { HiringEntity } from "@/types/hiring-entity"
import type { HiringDashboardStats } from "@/types/hiring-dashboard"
import { getEmployerQueryString } from "@/lib/hiring/hiring-dashboard-utils"
import { useHiringDashboardFetch } from "@/hooks/use-hiring-dashboard-fetch"
import { ApplicationReviewPanel } from "./application-review-panel"
import { HiringAuditPanel } from "./hiring-audit-panel"
import { HiringJobsPanel } from "./hiring-jobs-panel"
import { OnboardingKanban } from "./onboarding-kanban"
import { StaffOperationsKpiBar } from "./staff-operations-kpi-bar"
import { StaffOperationsOverview } from "./staff-operations-overview"
import { TeamRosterPanel } from "./team-roster-panel"
import { WorkforcePanel } from "./workforce-ui"
import { StaffSchedulingTab } from "@/components/admin/staff-scheduling-tab"

interface StaffOperationsTabsProps {
  employer: HiringEntity
  initialTab?: StaffOperationsTab
}

type StaffOperationsTab =
  | "overview"
  | "roster"
  | "applications"
  | "onboarding"
  | "jobs"
  | "audit"
  | "scheduling"

interface TabConfig {
  value: StaffOperationsTab
  label: string
  icon: LucideIcon
}

const STAFF_OPERATIONS_TABS: TabConfig[] = [
  { value: "overview", label: "Overview", icon: LayoutDashboard },
  { value: "roster", label: "Roster", icon: Users },
  { value: "scheduling", label: "Scheduling", icon: Clock },
  { value: "applications", label: "Applications", icon: ClipboardCheck },
  { value: "onboarding", label: "Onboarding", icon: ShieldCheck },
  { value: "jobs", label: "Jobs", icon: BriefcaseBusiness },
  { value: "audit", label: "Audit", icon: ScrollText },
]

const VALID_TABS = new Set<string>(STAFF_OPERATIONS_TABS.map((tab) => tab.value))

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

export function StaffOperationsTabs({ employer, initialTab = "overview" }: StaffOperationsTabsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const queryString = getEmployerQueryString(employer)
  const { data: stats, isLoading } = useHiringDashboardFetch<HiringDashboardStats>({
    url: `/api/hiring/dashboard?${queryString}`,
    initialData: EMPTY_STATS,
  })

  const tabParam = searchParams.get("tab")
  const activeTab = tabParam && VALID_TABS.has(tabParam) ? (tabParam as StaffOperationsTab) : initialTab

  const handleTabChange = useCallback(
    function handleTabChange(value: string) {
      const params = new URLSearchParams(searchParams.toString())
      params.set("tab", value)
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [pathname, router, searchParams],
  )

  return (
    <div className="space-y-6">
      <StaffOperationsKpiBar stats={stats} isLoading={isLoading} />

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <WorkforcePanel className="p-2">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-2 rounded-[1.15rem] bg-slate-900/70 p-1 sm:grid-cols-4 lg:grid-cols-7">
            {STAFF_OPERATIONS_TABS.map((tab) => {
              const Icon = tab.icon
              return (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="gap-2 rounded-xl border border-transparent text-slate-300 data-[state=active]:border-cyan-400/30 data-[state=active]:bg-cyan-400/10 data-[state=active]:text-white"
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              )
            })}
          </TabsList>
        </WorkforcePanel>

        <TabsContent value="overview">
          <StaffOperationsOverview employer={employer} stats={stats} isLoading={isLoading} />
        </TabsContent>
        <TabsContent value="roster">
          <TeamRosterPanel employer={employer} />
        </TabsContent>
        <TabsContent value="scheduling">
          <StaffSchedulingTab employer={employer} />
        </TabsContent>
        <TabsContent value="applications">
          <ApplicationReviewPanel employer={employer} />
        </TabsContent>
        <TabsContent value="onboarding">
          <OnboardingKanban employer={employer} />
        </TabsContent>
        <TabsContent value="jobs">
          <HiringJobsPanel employer={employer} />
        </TabsContent>
        <TabsContent value="audit">
          <HiringAuditPanel employer={employer} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
