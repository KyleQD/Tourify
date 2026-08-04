"use client"

import type { LucideIcon } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { WorkforceHero, WorkforcePanel } from "@/components/hiring/workforce-ui"
import { cn } from "@/lib/utils"

export interface OperationsTab {
  value: string
  label: string
  icon: LucideIcon
}

interface OperationsCommandShellProps {
  eyebrow?: string
  title: string
  description: string
  badge?: string
  actions?: React.ReactNode
  tabs: OperationsTab[]
  activeTab: string
  onTabChange: (value: string) => void
  children: React.ReactNode
  metrics?: React.ReactNode
  className?: string
  tabColsClassName?: string
  /** When false, skips WorkforceHero but keeps actions toolbar + tabs. Default true. */
  showHero?: boolean
}

export function OperationsCommandShell({
  eyebrow = "Operations",
  title,
  description,
  badge,
  actions,
  tabs,
  activeTab,
  onTabChange,
  children,
  metrics,
  className,
  tabColsClassName,
  showHero = true,
}: OperationsCommandShellProps) {
  const cols =
    tabColsClassName ||
    (tabs.length <= 4
      ? "md:grid-cols-4"
      : tabs.length <= 7
        ? "md:grid-cols-4 xl:grid-cols-7"
        : "md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-7")

  return (
    <section className={cn("space-y-6", className)}>
      {showHero ? (
        <WorkforceHero
          eyebrow={eyebrow}
          title={title}
          description={description}
          badge={badge}
          actions={actions}
        />
      ) : actions ? (
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          {actions}
        </div>
      ) : null}

      {metrics ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{metrics}</div> : null}

      <Tabs value={activeTab} onValueChange={onTabChange} className="space-y-6">
        <WorkforcePanel className="p-2">
          <TabsList
            className={cn(
              "grid h-auto w-full grid-cols-2 gap-2 rounded-[1.15rem] bg-slate-900/70 p-1",
              cols
            )}
          >
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="gap-2 rounded-xl border border-transparent text-slate-300 data-[state=active]:border-cyan-400/30 data-[state=active]:bg-cyan-400/10 data-[state=active]:text-white"
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{tab.label}</span>
                </TabsTrigger>
              )
            })}
          </TabsList>
        </WorkforcePanel>

        {children}
      </Tabs>
    </section>
  )
}

export function OperationsPanelLoading() {
  return (
    <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-slate-800/60 bg-slate-950/40 text-sm text-slate-400">
      Loading panel…
    </div>
  )
}

export function OperationsTabPanel({
  value,
  children,
  className,
}: {
  value: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <TabsContent value={value} className={cn("space-y-6 outline-none", className)}>
      {children}
    </TabsContent>
  )
}
