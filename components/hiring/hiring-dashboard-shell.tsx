"use client"

import dynamic from "next/dynamic"
import { BriefcaseBusiness, ClipboardCheck, FileText, LayoutDashboard, ScrollText, ShieldCheck, Users } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { HiringDashboardProps, HiringDashboardTab } from "@/types/hiring-dashboard"
import { getEmployerLabel } from "@/lib/hiring/hiring-dashboard-utils"
import { WorkforceHero, WorkforcePanel } from "./workforce-ui"

const HiringOverviewPanel = dynamic(
  () => import("./hiring-overview-panel").then((mod) => ({ default: mod.HiringOverviewPanel })),
  { loading: () => <PanelLoading /> }
)
const HiringJobsPanel = dynamic(
  () => import("./hiring-jobs-panel").then((mod) => ({ default: mod.HiringJobsPanel })),
  { loading: () => <PanelLoading /> }
)
const HiringApplicationsPanel = dynamic(
  () => import("./hiring-applications-panel").then((mod) => ({ default: mod.HiringApplicationsPanel })),
  { loading: () => <PanelLoading /> }
)
const HiringOnboardingPanel = dynamic(
  () => import("./hiring-onboarding-panel").then((mod) => ({ default: mod.HiringOnboardingPanel })),
  { loading: () => <PanelLoading /> }
)
const HiringRosterPanel = dynamic(
  () => import("./hiring-roster-panel").then((mod) => ({ default: mod.HiringRosterPanel })),
  { loading: () => <PanelLoading /> }
)
const TemplateLibrary = dynamic(
  () => import("./template-library").then((mod) => ({ default: mod.TemplateLibrary })),
  { loading: () => <PanelLoading /> }
)
const HiringAuditPanel = dynamic(
  () => import("./hiring-audit-panel").then((mod) => ({ default: mod.HiringAuditPanel })),
  { loading: () => <PanelLoading /> }
)

function PanelLoading() {
  return (
    <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-slate-800/60 bg-slate-950/40 text-sm text-slate-400">
      Loading panel…
    </div>
  )
}

interface TabConfig {
  value: HiringDashboardTab
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const HIRING_DASHBOARD_TABS: TabConfig[] = [
  { value: "overview", label: "Overview", icon: LayoutDashboard },
  { value: "jobs", label: "Jobs", icon: BriefcaseBusiness },
  { value: "applications", label: "Applications", icon: ClipboardCheck },
  { value: "onboarding", label: "Onboarding", icon: ShieldCheck },
  { value: "roster", label: "Roster", icon: Users },
  { value: "templates", label: "Templates", icon: FileText },
  { value: "audit", label: "Audit", icon: ScrollText },
]

export function HiringDashboardShell({ employer, initialTab = "overview" }: HiringDashboardProps) {
  return (
    <section className="space-y-6">
      <WorkforceHero
        title="Hiring & Onboarding"
        description={`Real-time hiring, onboarding, roster, and Work Mode readiness for ${getEmployerLabel(employer)}.`}
        badge={employer.entityType}
      />

      <Tabs defaultValue={initialTab} className="space-y-6">
        <WorkforcePanel className="p-2">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-2 rounded-[1.15rem] bg-slate-900/70 p-1 md:grid-cols-4 xl:grid-cols-7">
            {HIRING_DASHBOARD_TABS.map((tab) => {
              const Icon = tab.icon
              return (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="gap-2 rounded-xl border border-transparent text-slate-300 data-[state=active]:border-cyan-400/30 data-[state=active]:bg-cyan-400/10 data-[state=active]:text-white"
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </TabsTrigger>
              )
            })}
          </TabsList>
        </WorkforcePanel>

        <TabsContent value="overview">
          <HiringOverviewPanel employer={employer} />
        </TabsContent>
        <TabsContent value="jobs">
          <HiringJobsPanel employer={employer} />
        </TabsContent>
        <TabsContent value="applications">
          <HiringApplicationsPanel employer={employer} />
        </TabsContent>
        <TabsContent value="onboarding">
          <HiringOnboardingPanel employer={employer} />
        </TabsContent>
        <TabsContent value="roster">
          <HiringRosterPanel employer={employer} />
        </TabsContent>
        <TabsContent value="templates">
          <TemplateLibrary employer={employer} />
        </TabsContent>
        <TabsContent value="audit">
          <HiringAuditPanel employer={employer} />
        </TabsContent>
      </Tabs>
    </section>
  )
}
