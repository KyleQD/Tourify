"use client"

import type { LucideIcon } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface TabDef {
  value: string
  label: string
  icon?: LucideIcon
}

interface AdminDetailTabsProps {
  tabs: TabDef[]
  activeTab: string
  onTabChange: (value: string) => void
  /** Left side of the detail header: title, breadcrumb, badges */
  headerLeft: React.ReactNode
  /** Right side of the detail header: action buttons */
  headerRight?: React.ReactNode
  children: React.ReactNode
}

export function AdminDetailTabs({
  tabs,
  activeTab,
  onTabChange,
  headerLeft,
  headerRight,
  children,
}: AdminDetailTabsProps) {
  return (
    <div className="space-y-6">
      {/* Detail page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0 flex-1">{headerLeft}</div>
        {headerRight && (
          <div className="flex items-center gap-2 shrink-0">{headerRight}</div>
        )}
      </div>

      {/* Tab shell */}
      <Tabs value={activeTab} onValueChange={onTabChange}>
        <TabsList className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/30 p-1 rounded-sm flex-wrap h-auto gap-0.5">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/10 rounded-sm text-sm text-slate-400 hover:text-white"
            >
              <span className="flex items-center gap-1.5">
                {tab.icon && <tab.icon className="h-3.5 w-3.5" />}
                {tab.label}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

        {children}
      </Tabs>
    </div>
  )
}
