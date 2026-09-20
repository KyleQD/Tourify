"use client"

import dynamic from "next/dynamic"
import { BriefcaseBusiness, ClipboardCheck, FileText, LayoutDashboard, ScrollText, ShieldCheck, Users, ChevronDown } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import type { HiringDashboardProps, HiringDashboardTab } from "@/types/hiring-dashboard"
import { HIRING_WORKSPACE_GROUPS, type HiringTabId } from "@/lib/admin/hiring-workspace-tabs"
import { WorkforcePanel } from "./workforce-ui"
import { WorkforceSLOBanner } from "@/components/admin/workforce/workforce-slo-banner"

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

export function HiringDashboardShell({
  employer,
  initialTab = "overview",
  initialCandidateId,
  initialMemberId,
}: HiringDashboardProps) {
  return (
    <section className="space-y-4">
      {/* WORK-603 — Workforce SLO health banner */}
      <WorkforceSLOBanner />

      <Tabs defaultValue={initialTab} className="space-y-6">
        {/* Grouped workspace navigation — replaces 7 flat tabs with 4 primary groups */}
        <WorkforcePanel className="p-2">
          <div className="flex items-center gap-1 overflow-x-auto px-2 py-1" role="tablist" aria-label="Hiring workspace sections">
            {HIRING_WORKSPACE_GROUPS.map((group) => {
              const hasSecondary = group.secondary.length > 0;

              if (hasSecondary) {
                return (
                  <DropdownMenu key={group.id}>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-xl transition-colors text-slate-300 hover:text-white hover:bg-slate-800/50 border border-transparent data-[state=active]:border-cyan-400/30 data-[state=active]:bg-cyan-400/10 data-[state=active]:text-white"
                        role="tab"
                      >
                        <group.icon className="h-4 w-4 shrink-0" />
                        {group.label}
                        <ChevronDown className="h-3 w-3" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="bg-slate-800 border-slate-700 min-w-[180px]">
                      <DropdownMenuItem
                        onClick={() => {
                          const trigger = document.querySelector(`[data-state][value="${group.primaryTab}"]`) as HTMLButtonElement
                          if (trigger) trigger.click()
                        }}
                        className="text-slate-200"
                      >
                        {group.label}
                      </DropdownMenuItem>
                      {group.secondary.map((secondary) => (
                        <DropdownMenuItem
                          key={secondary.id}
                          onClick={() => {
                            const trigger = document.querySelector(`[data-state][value="${secondary.id}"]`) as HTMLButtonElement
                            if (trigger) trigger.click()
                          }}
                          className="text-slate-200"
                        >
                          {secondary.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                );
              }

              return (
                <TabsTrigger
                  key={group.id}
                  value={group.primaryTab}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-xl border border-transparent text-slate-300 data-[state=active]:border-cyan-400/30 data-[state=active]:bg-cyan-400/10 data-[state=active]:text-white"
                >
                  <group.icon className="h-4 w-4 shrink-0" />
                  {group.label}
                </TabsTrigger>
              );
            })}
          </div>
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
          <HiringOnboardingPanel employer={employer} initialCandidateId={initialCandidateId} />
        </TabsContent>
        <TabsContent value="roster">
          <HiringRosterPanel employer={employer} initialMemberId={initialMemberId} />
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
