"use client"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, Library, ListMusic, Music2, Search, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Section skeleton ─────────────────────────────────────────────────────────

export function TrackListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-1" aria-label="Loading tracks" aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-2.5">
          <Skeleton className="h-10 w-10 rounded-lg bg-white/5" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-2/5 bg-white/5" />
            <Skeleton className="h-3 w-1/4 bg-white/5" />
          </div>
          <Skeleton className="h-3 w-8 bg-white/5" />
        </div>
      ))}
    </div>
  )
}

export function CardGridSkeleton({ cards = 6 }: { cards?: number }) {
  return (
    <div
      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3"
      aria-label="Loading"
      aria-busy="true"
    >
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="aspect-square w-full rounded-xl bg-white/5" />
          <Skeleton className="h-3.5 w-3/4 bg-white/5" />
          <Skeleton className="h-3 w-1/2 bg-white/5" />
        </div>
      ))}
    </div>
  )
}

export function HomeSkeleton() {
  return (
    <div className="space-y-10" aria-busy="true" aria-label="Loading music home">
      <div className="space-y-3">
        <Skeleton className="h-5 w-40 bg-white/5" />
        <CardGridSkeleton cards={6} />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-5 w-48 bg-white/5" />
        <TrackListSkeleton rows={5} />
      </div>
    </div>
  )
}

// ─── Section error ────────────────────────────────────────────────────────────

export function SectionError({
  title = "Something went wrong",
  message = "This section couldn't load. Your music and the player are unaffected.",
  onRetry,
  className,
}: {
  title?: string
  message?: string
  onRetry?: () => void
  className?: string
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center gap-3 rounded-2xl border border-red-700/20 bg-red-900/10 px-6 py-10 text-center",
        className
      )}
    >
      <AlertCircle className="h-6 w-6 text-red-400" />
      <div>
        <p className="text-sm font-medium text-red-200">{title}</p>
        <p className="mt-1 text-xs text-red-300/70">{message}</p>
      </div>
      {onRetry && (
        <Button
          size="sm"
          variant="ghost"
          onClick={onRetry}
          className="text-red-200 hover:text-white border border-red-700/30 h-8"
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Try again
        </Button>
      )}
    </div>
  )
}

// ─── Empty states ─────────────────────────────────────────────────────────────

const EMPTY_ICONS = {
  library: Library,
  playlist: ListMusic,
  music: Music2,
  search: Search,
} as const

export function SectionEmpty({
  icon = "music",
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className,
}: {
  icon?: keyof typeof EMPTY_ICONS
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  secondaryActionLabel?: string
  onSecondaryAction?: () => void
  className?: string
}) {
  const Icon = EMPTY_ICONS[icon]
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-4 rounded-2xl border border-white/8 bg-white/[0.03] px-6 py-14 text-center",
        className
      )}
    >
      <div className="h-16 w-16 rounded-2xl bg-white/5 flex items-center justify-center">
        <Icon className="h-8 w-8 text-slate-600" />
      </div>
      <div>
        <p className="font-medium text-white">{title}</p>
        {description && (
          <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">{description}</p>
        )}
      </div>
      {(actionLabel || secondaryActionLabel) && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {actionLabel && onAction && (
            <Button
              size="sm"
              onClick={onAction}
              className="bg-purple-600 hover:bg-purple-500 text-white rounded-full px-5"
            >
              {actionLabel}
            </Button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onSecondaryAction}
              className="text-slate-400 hover:text-white rounded-full px-5 border border-white/10"
            >
              {secondaryActionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Section heading ──────────────────────────────────────────────────────────

export function SectionHeading({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div>
        <h2 className="text-base font-semibold text-white">{title}</h2>
        {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
      </div>
      {action}
    </div>
  )
}
