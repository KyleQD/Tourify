"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"

export function LogisticsProgressWidget({
  percentage,
  completed,
  items,
  href,
  className,
}: {
  percentage: number
  completed: number
  items: number
  href?: string
  className?: string
}) {
  const pct = Math.max(0, Math.min(100, percentage || 0))
  const barColor = pct === 100 ? "bg-emerald-500" : pct > 0 ? "bg-cyan-500" : "bg-slate-600"
  const label = items > 0 ? `${completed}/${items} tasks` : "No logistics tasks yet"

  const body = (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-400">Logistics</span>
        <span className="font-medium text-white">{pct}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-slate-700">
        <div className={cn("h-1.5 rounded-full transition-all duration-300", barColor)} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex items-center justify-between text-[11px] text-slate-500">
        <span>{label}</span>
        {href ? <span className="text-cyan-300/80">Open</span> : null}
      </div>
    </div>
  )

  if (!href) return body
  return (
    <Link href={href} className="block rounded-lg border border-slate-800/80 bg-slate-950/40 p-2.5 transition hover:border-cyan-500/30">
      {body}
    </Link>
  )
}
