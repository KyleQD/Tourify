import * as React from "react"
import Link from "next/link"
import { AlertCircle, AlertTriangle, ArrowRight, CircleAlert, Info } from "lucide-react"

import { cn } from "@/lib/utils"

import type { LogisticsAttentionSeverity } from "./types"

const SEVERITY_CONFIG: Record<
  LogisticsAttentionSeverity,
  { label: string; icon: typeof AlertCircle; className: string; accent: string }
> = {
  critical: {
    label: "Critical",
    icon: CircleAlert,
    className: "border-red-500/40 bg-red-500/10 text-red-200",
    accent: "border-l-red-500",
  },
  high: {
    label: "High",
    icon: AlertTriangle,
    className: "border-orange-500/40 bg-orange-500/10 text-orange-200",
    accent: "border-l-orange-500",
  },
  medium: {
    label: "Medium",
    icon: AlertCircle,
    className: "border-amber-500/40 bg-amber-500/10 text-amber-100",
    accent: "border-l-amber-500",
  },
  low: {
    label: "Low",
    icon: Info,
    className: "border-blue-500/40 bg-blue-500/10 text-blue-200",
    accent: "border-l-blue-500",
  },
}

export interface LogisticsAttentionRowProps {
  title: string
  severity: LogisticsAttentionSeverity
  domain: string
  context: string
  reason?: React.ReactNode
  owner?: string
  due?: string
  freshness?: string
  action?: { label: string; href: string }
  className?: string
}

export function LogisticsAttentionRow({
  title,
  severity,
  domain,
  context,
  reason,
  owner = "Unassigned",
  due,
  freshness,
  action,
  className,
}: LogisticsAttentionRowProps) {
  const titleId = React.useId()
  const config = SEVERITY_CONFIG[severity]
  const Icon = config.icon

  return (
    <article
      aria-labelledby={titleId}
      className={cn(
        "rounded-lg border border-l-4 border-slate-700/70 bg-slate-900/50 p-4",
        config.accent,
        className,
      )}
      data-severity={severity}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
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
            <span className="rounded-full border border-slate-700/70 bg-slate-950/50 px-2.5 py-1 text-xs font-medium text-slate-300">
              {domain}
            </span>
          </div>
          <h3 id={titleId} className="mt-3 text-base font-semibold text-slate-50">
            {title}
          </h3>
          <p className="mt-1 text-sm text-slate-300">{context}</p>
          {reason ? <p className="mt-2 text-sm leading-6 text-slate-400">{reason}</p> : null}
        </div>

        <div className="grid shrink-0 grid-cols-2 gap-x-5 gap-y-3 text-xs sm:grid-cols-3 lg:max-w-md">
          <AttentionMetadata label="Owner" value={owner} />
          {due ? <AttentionMetadata label="Due" value={due} /> : null}
          {freshness ? <AttentionMetadata label="Updated" value={freshness} /> : null}
        </div>
      </div>
      {action ? (
        <div className="mt-4 border-t border-slate-800 pt-2">
          <Link
            className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-blue-300 underline-offset-4 hover:text-blue-200 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 md:min-h-9"
            href={action.href}
          >
            {action.label}
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
      ) : null}
    </article>
  )
}

function AttentionMetadata({ label, value }: { label: string; value: string }) {
  return (
    <dl className="min-w-0">
      <dt className="font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 break-words text-slate-200">{value}</dd>
    </dl>
  )
}
