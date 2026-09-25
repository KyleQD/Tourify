import * as React from "react"
import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { AlertTriangle, ArrowUpRight, WifiOff } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export type LogisticsSummaryAvailability = "available" | "degraded" | "unavailable"
export type LogisticsSummaryTone = "neutral" | "info" | "positive" | "attention" | "critical"

const TONE_CLASSES: Record<LogisticsSummaryTone, string> = {
  neutral: "border-slate-700/70 bg-slate-900/50",
  info: "border-blue-500/30 bg-blue-500/5",
  positive: "border-emerald-500/30 bg-emerald-500/5",
  attention: "border-amber-500/30 bg-amber-500/5",
  critical: "border-red-500/30 bg-red-500/5",
}

export interface LogisticsSummaryStatProps {
  label: string
  value?: string | number
  description?: React.ReactNode
  icon?: LucideIcon
  tone?: LogisticsSummaryTone
  availability?: LogisticsSummaryAvailability
  action?: { label: string; href: string }
  className?: string
}

export function LogisticsSummaryStat({
  label,
  value,
  description,
  icon: Icon,
  tone = "neutral",
  availability = "available",
  action,
  className,
}: LogisticsSummaryStatProps) {
  const displayValue = availability === "unavailable" ? "Unavailable" : (value ?? "—")
  const StatusIcon = availability === "unavailable" ? WifiOff : AlertTriangle

  return (
    <Card
      className={cn("h-full", TONE_CLASSES[tone], className)}
      data-availability={availability}
    >
      <CardContent className="flex h-full flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <dl className="min-w-0">
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</dt>
            <dd
              className={cn(
                "mt-1 text-2xl font-semibold tabular-nums text-slate-50",
                availability === "unavailable" && "text-base text-red-200",
              )}
            >
              {displayValue}
            </dd>
          </dl>
          {Icon ? (
            <span className="rounded-lg border border-slate-700/70 bg-slate-950/50 p-2 text-slate-300">
              <Icon aria-hidden="true" className="h-4 w-4" />
            </span>
          ) : null}
        </div>
        {availability !== "available" ? (
          <p
            className={cn(
              "inline-flex items-center gap-1.5 text-xs font-medium",
              availability === "degraded" ? "text-amber-200" : "text-red-200",
            )}
          >
            <StatusIcon aria-hidden="true" className="h-3.5 w-3.5" />
            {availability === "degraded" ? "Partial data" : "Source unavailable"}
          </p>
        ) : null}
        {description ? <p className="text-xs leading-5 text-slate-400">{description}</p> : null}
        {action ? (
          <Link
            className="mt-auto inline-flex min-h-11 items-center gap-1 self-start text-sm font-medium text-blue-300 underline-offset-4 hover:text-blue-200 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 md:min-h-9"
            href={action.href}
          >
            {action.label}
            <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
          </Link>
        ) : null}
      </CardContent>
    </Card>
  )
}
