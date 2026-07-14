"use client"

import { BriefcaseBusiness, ClipboardCheck, FileText, LayoutDashboard, ScrollText, ShieldCheck, Users } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import type { HiringDashboardProps, HiringDashboardTab } from "@/types/hiring-dashboard"
import { getEmployerLabel } from "@/lib/hiring/hiring-dashboard-utils"
import { HiringApplicationsPanel } from "./hiring-applications-panel"
import { HiringAuditPanel } from "./hiring-audit-panel"
import { HiringJobsPanel } from "./hiring-jobs-panel"
import { HiringOnboardingPanel } from "./hiring-onboarding-panel"
import { HiringOverviewPanel } from "./hiring-overview-panel"
import { HiringRosterPanel } from "./hiring-roster-panel"
import { TemplateManager } from "./template-manager"

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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">Hiring & Onboarding</h1>
            <Badge variant="outline" className="capitalize">
              {employer.entityType}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Real-time hiring, onboarding, roster, and Work Mode readiness for {getEmployerLabel(employer)}.
          </p>
        </div>
      </div>

      <Tabs defaultValue={initialTab} className="space-y-6">
        <TabsList className="grid h-auto grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-7">
          {HIRING_DASHBOARD_TABS.map((tab) => {
            const Icon = tab.icon
            return (
              <TabsTrigger key={tab.value} value={tab.value} className="gap-2">
                <Icon className="h-4 w-4" />
                {tab.label}
              </TabsTrigger>
            )
          })}
        </TabsList>

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
          <TemplateManager employer={employer} />
        </TabsContent>
        <TabsContent value="audit">
          <HiringAuditPanel employer={employer} />
        </TabsContent>
      </Tabs>
    </section>
  )
}
