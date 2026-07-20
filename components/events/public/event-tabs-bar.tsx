"use client"

import { Calendar, Image as ImageIcon, MessageCircle, Settings, Users } from "lucide-react"
import { TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { useEventSkin } from "./event-skin-context"
import type { EventPageTab } from "./types"

const TABS: Array<{ value: EventPageTab; label: string; icon: typeof Calendar }> = [
  { value: "overview", label: "Overview", icon: Calendar },
  { value: "posts", label: "Posts", icon: MessageCircle },
  { value: "attendance", label: "Attendance", icon: Users },
  { value: "details", label: "Details", icon: Settings },
  { value: "media", label: "Media", icon: ImageIcon },
]

interface EventTabsBarProps {
  tabs?: EventPageTab[]
}

export function EventTabsBar({ tabs }: EventTabsBarProps) {
  const { tokens } = useEventSkin()
  const visibleTabs = tabs?.length
    ? TABS.filter((tab) => tabs.includes(tab.value))
    : TABS

  return (
    <div className="sticky top-2 z-20 -mx-1 px-1 pb-1">
      <div className={cn(tokens.stickyTabs, "p-1")}>
        <TabsList
          className="grid h-auto w-full rounded-xl border-0 bg-transparent p-0"
          style={{ gridTemplateColumns: `repeat(${visibleTabs.length}, minmax(0, 1fr))` }}
        >
          {visibleTabs.map(({ value, label, icon: Icon }) => (
            <TabsTrigger
              key={value}
              value={value}
              className={cn(
                "rounded-xl text-current/65 data-[state=active]:shadow-none",
                tokens.tabActive
              )}
            >
              <Icon className="mr-1.5 h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">{label}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
    </div>
  )
}
