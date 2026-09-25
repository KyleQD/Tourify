import * as React from "react"
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Circle,
  CircleDot,
  Clock3,
  WifiOff,
} from "lucide-react"

import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

import type {
  LogisticsReadinessState,
  LogisticsSourceHealth,
  LogisticsSourceStatus,
} from "./types"

const READINESS_CONFIG: Record<
  LogisticsReadinessState,
  { label: string; icon: typeof Circle; className: string }
> = {
  not_started: {
    label: "Not started",
    icon: Circle,
    className: "border-slate-600/70 bg-slate-800/60 text-slate-300",
  },
  in_progress: {
    label: "In progress",
    icon: CircleDot,
    className: "border-blue-500/40 bg-blue-500/10 text-blue-200",
  },
  blocked: {
    label: "Blocked",
    icon: Ban,
    className: "border-red-500/40 bg-red-500/10 text-red-200",
  },
  ready: {
    label: "Ready",
    icon: CheckCircle2,
    className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
  },
}

const SOURCE_CONFIG: Record<
  LogisticsSourceStatus,
  { label: string; icon: typeof CheckCircle2; className: string }
> = {
  ready: {
    label: "Ready",
    icon: CheckCircle2,
    className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
  },
  degraded: {
    label: "Degraded",
    icon: AlertTriangle,
    className: "border-amber-500/40 bg-amber-500/10 text-amber-100",
  },
  unavailable: {
    label: "Unavailable",
    icon: WifiOff,
    className: "border-red-500/40 bg-red-500/10 text-red-200",
  },
}

export interface LogisticsReadinessIndicatorProps {
  state: LogisticsReadinessState
  reason?: React.ReactNode
  value?: number
  className?: string
}

export function LogisticsReadinessIndicator({
  state,
  reason,
  value,
  className,
}: LogisticsReadinessIndicatorProps) {
  const config = READINESS_CONFIG[state]
  const Icon = config.icon
  const boundedValue = value === undefined ? undefined : Math.min(100, Math.max(0, value))

  return (
    <div
      aria-label={`Readiness: ${config.label}`}
      className={cn("min-w-0 space-y-2", className)}
      data-readiness={state}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
            config.className,
          )}
        >
          <Icon aria-hidden="true" className="h-3.5 w-3.5" />
          {config.label}
        </span>
        {boundedValue !== undefined ? (
          <span className="text-xs tabular-nums text-slate-400">{boundedValue}%</span>
        ) : null}
      </div>
      {boundedValue !== undefined ? (
        <Progress
          aria-label={`${config.label} readiness`}
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={boundedValue}
          className="h-1.5 bg-slate-800"
          value={boundedValue}
        />
      ) : null}
      {reason ? <p className="text-xs leading-5 text-slate-400">{reason}</p> : null}
    </div>
  )
}

export interface LogisticsSourceHealthIndicatorProps extends LogisticsSourceHealth {
  className?: string
}

export function LogisticsSourceHealthIndicator({
  domain,
  status,
  generatedAt,
  warning,
  className,
}: LogisticsSourceHealthIndicatorProps) {
  const config = SOURCE_CONFIG[status]
  const Icon = config.icon

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-2 rounded-lg border border-slate-700/70 bg-slate-950/40 p-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
      data-source-status={status}
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-slate-100">{domain}</p>
        {warning ? <p className="mt-1 text-xs leading-5 text-slate-400">{warning}</p> : null}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {generatedAt ? (
          <span className="inline-flex items-center gap-1 text-xs text-slate-500">
            <Clock3 aria-hidden="true" className="h-3.5 w-3.5" />
            {generatedAt}
          </span>
        ) : null}
        <span
          aria-label={`${domain} source: ${config.label}`}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
            config.className,
          )}
        >
          <Icon aria-hidden="true" className="h-3.5 w-3.5" />
          {config.label}
        </span>
      </div>
    </div>
  )
}

export interface LogisticsSourceHealthSummaryProps {
  sources: LogisticsSourceHealth[]
  title?: string
  className?: string
}

export function LogisticsSourceHealthSummary({
  sources,
  title = "Data source health",
  className,
}: LogisticsSourceHealthSummaryProps) {
  const titleId = React.useId()
  const impairedCount = sources.filter((source) => source.status !== "ready").length

  return (
    <section
      aria-labelledby={titleId}
      aria-live="polite"
      className={cn("rounded-xl border border-slate-700/70 bg-slate-900/40 p-4", className)}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 id={titleId} className="text-sm font-semibold text-slate-100">
          {title}
        </h2>
        <p className="text-xs text-slate-400">
          {impairedCount === 0
            ? "All sources available"
            : `${impairedCount} ${impairedCount === 1 ? "source needs" : "sources need"} attention`}
        </p>
      </div>
      {sources.length > 0 ? (
        <ul className="grid gap-2 lg:grid-cols-2">
          {sources.map((source) => (
            <li key={`${source.domain}:${source.status}`}>
              <LogisticsSourceHealthIndicator {...source} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-400">Source health has not been reported.</p>
      )}
    </section>
  )
}
