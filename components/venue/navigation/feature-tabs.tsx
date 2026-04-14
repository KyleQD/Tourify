"use client"

import type React from "react"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { venueDashboardTabListClass } from "@/app/venue/lib/dashboard-ui"

interface FeatureTabsProps {
  tabs: {
    id: string
    label: string
    icon?: React.ReactNode
    badge?: string | number
  }[]
  defaultTab?: string
  className?: string
  onChange?: (value: string) => void
}

export function FeatureTabs({ tabs, defaultTab, className, onChange }: FeatureTabsProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get("tab")

  // Use the tab from URL or default
  const [activeTab, setActiveTab] = useState(tabParam || defaultTab || tabs[0]?.id || "")

  const handleTabChange = (value: string) => {
    setActiveTab(value)

    // Update URL with the tab
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", value)
    router.push(`?${params.toString()}`, { scroll: false })

    if (onChange) {
      onChange(value)
    }
  }

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className={cn("w-full min-w-0", className)}>
      <TabsList className={venueDashboardTabListClass}>
        {tabs.map((tab) => (
          <TabsTrigger key={tab.id} value={tab.id} className="flex shrink-0 items-center gap-2">
            {tab.icon}
            <span>{tab.label}</span>
            {typeof tab.badge === "number" && (
              <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                {tab.badge}
              </span>
            )}
            {typeof tab.badge === "string" && (
              <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                {tab.badge}
              </span>
            )}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
