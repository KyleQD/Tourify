import * as React from "react"
import { ClipboardCheck } from "lucide-react"

import { EmptyState } from "@/components/ui/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export interface LogisticsCommandCenterLoadingProps {
  label?: string
  className?: string
}

export function LogisticsCommandCenterLoading({
  label = "Loading logistics command center",
  className,
}: LogisticsCommandCenterLoadingProps) {
  return (
    <section
      aria-label={label}
      aria-live="polite"
      aria-busy="true"
      className={cn("space-y-5", className)}
      role="status"
    >
      <span className="sr-only">{label}</span>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton className="h-32 w-full" key={index} />
        ))}
      </div>
      <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/30 p-4">
        <Skeleton className="h-5 w-48" />
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton className="h-28 w-full" key={index} />
        ))}
      </div>
    </section>
  )
}

export interface LogisticsCommandCenterEmptyProps {
  title: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  className?: string
}

export function LogisticsCommandCenterEmpty({
  title,
  description,
  action,
  className,
}: LogisticsCommandCenterEmptyProps) {
  return (
    <EmptyState
      action={action}
      className={cn("min-h-72 border-slate-700/70 bg-slate-900/30", className)}
      description={description}
      icon={<ClipboardCheck className="h-6 w-6" />}
      title={title}
    />
  )
}
