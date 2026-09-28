"use client"

import { useCallback, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { BarChart3, CalendarPlus, Clock, LayoutDashboard, MessageSquare, Users } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import type { HiringEntity } from "@/types/hiring-entity"
import { StaffOperationsOverview } from "./staff-operations-overview"
import { StaffOperationsAnalytics } from "./staff-operations-analytics"
import { StaffOperationsChannelsDialog } from "./staff-operations-channels-dialog"
import { TeamRosterPanel } from "./team-roster-panel"
import { WorkforceHero, WorkforcePanel } from "./workforce-ui"
import { StaffSchedulingTab } from "@/components/admin/staff-scheduling-tab"
import { WorkforceSLOBanner } from "@/components/admin/workforce/workforce-slo-banner"
import { SchedulingConflictsPanel } from "@/components/admin/workforce/scheduling-conflicts-panel"
import { AttendanceCorrectionPanel } from "@/components/admin/workforce/attendance-correction-panel"

interface StaffOperationsTabsProps {
  employer: HiringEntity
  initialTab?: StaffOperationsTab
}

type StaffOperationsTab =
  | "overview"
  | "scheduling"
  | "team"
  | "analytics"

interface TabConfig {
  value: StaffOperationsTab
  label: string
  icon: LucideIcon
}

const STAFF_OPERATIONS_TABS: TabConfig[] = [
  { value: "overview", label: "Overview", icon: LayoutDashboard },
  { value: "scheduling", label: "Scheduling", icon: Clock },
  { value: "team", label: "Team", icon: Users },
  { value: "analytics", label: "Analytics", icon: BarChart3 },
]

const VALID_TABS = new Set<string>(STAFF_OPERATIONS_TABS.map((tab) => tab.value))

export function StaffOperationsTabs({ employer, initialTab = "overview" }: StaffOperationsTabsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [channelsOpen, setChannelsOpen] = useState(false)

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

  const openCreateShift = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", "scheduling")
    params.set("view", "create")
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }, [pathname, router, searchParams])

  return (
    <div className="space-y-4">
      <WorkforceHero
        eyebrow="Staff Operations"
        title="Crew command center"
        description={`Prioritize workforce tasks, cover shifts, coordinate ${employer.displayName}, and keep the active team moving.`}
        badge={employer.displayName}
        actions={
          <>
            <Button type="button" onClick={openCreateShift} className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
              <CalendarPlus className="mr-2 h-4 w-4" />
              Create shift
            </Button>
            <Button type="button" variant="outline" onClick={() => setChannelsOpen(true)} className="border-slate-600 text-slate-200">
              <MessageSquare className="mr-2 h-4 w-4" />
              Message teams
            </Button>
          </>
        }
      />

      {/* WORK-603 — Workforce SLO health banner */}
      <WorkforceSLOBanner />

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <WorkforcePanel className="p-2">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-2 rounded-[1.15rem] bg-slate-900/70 p-1 sm:grid-cols-4">
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
          <StaffOperationsOverview employer={employer} onOpenChannels={() => setChannelsOpen(true)} />
        </TabsContent>
        <TabsContent value="scheduling">
          <div className="space-y-4">
            {/* WORK-408 / WORK-410 — Scheduling conflict review */}
            <SchedulingConflictsPanel />
            {/* WORK-601 — Attendance and correction ledger */}
            <AttendanceCorrectionPanel />
            <StaffSchedulingTab employer={employer} />
          </div>
        </TabsContent>
        <TabsContent value="team">
          <TeamRosterPanel employer={employer} />
        </TabsContent>
        <TabsContent value="analytics">
          <StaffOperationsAnalytics employer={employer} />
        </TabsContent>
      </Tabs>

      <StaffOperationsChannelsDialog
        open={channelsOpen}
        onOpenChange={setChannelsOpen}
        employer={employer}
      />
    </div>
  )
}
