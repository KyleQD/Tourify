"use client"

import * as React from "react"

import { SelectTrigger } from "@/components/ui/select"
import { TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

interface AdminSurfaceTabsListProps extends React.ComponentPropsWithoutRef<typeof TabsList> {}

export function AdminSurfaceTabsList({ className, ...props }: AdminSurfaceTabsListProps) {
  return (
    <TabsList
      className={cn("surface-tabs border border-slate-700/30 bg-slate-800/60 backdrop-blur-sm", className)}
      {...props}
    />
  )
}

interface AdminSurfaceTabsTriggerProps extends React.ComponentPropsWithoutRef<typeof TabsTrigger> {}

export function AdminSurfaceTabsTrigger({ className, ...props }: AdminSurfaceTabsTriggerProps) {
  return (
    <TabsTrigger
      className={cn(
        "rounded-xl text-xs data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/10",
        className
      )}
      {...props}
    />
  )
}

const AdminSurfaceSelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectTrigger>,
  React.ComponentPropsWithoutRef<typeof SelectTrigger>
>(({ className, ...props }, ref) => {
  return (
    <SelectTrigger
      ref={ref}
      className={cn("surface-entry border-slate-700/50 bg-slate-800/50 text-white", className)}
      {...props}
    />
  )
})

AdminSurfaceSelectTrigger.displayName = "AdminSurfaceSelectTrigger"

export { AdminSurfaceSelectTrigger }
