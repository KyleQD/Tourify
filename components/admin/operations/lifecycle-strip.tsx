"use client"

import { cn } from "@/lib/utils"

const EVENT_STAGES = ["draft", "scheduled", "advancing", "live", "wrap"] as const
const TOUR_STAGES = ["planning", "active", "on_hold", "completed"] as const

function normalizeEventStage(status?: string | null) {
  const value = (status || "draft").toLowerCase()
  if (value === "draft" || value === "planning" || value === "inquiry" || value === "hold" || value === "offer")
    return "draft"
  if (value === "confirmed" || value === "scheduled" || value === "published") return "scheduled"
  if (value === "advancing" || value === "in_progress") return "advancing"
  if (value === "live" || value === "ongoing" || value === "onsite") return "live"
  if (value === "completed" || value === "cancelled" || value === "postponed" || value === "settled") return "wrap"
  return "scheduled"
}

function normalizeTourStage(status?: string | null) {
  const value = (status || "planning").toLowerCase()
  if (value === "planning" || value === "draft") return "planning"
  if (value === "active" || value === "published") return "active"
  if (value === "on_hold" || value === "paused") return "on_hold"
  if (value === "completed" || value === "cancelled" || value === "archived") return "completed"
  return "planning"
}

export function LifecycleStrip({
  kind,
  status,
  className,
}: {
  kind: "event" | "tour"
  status?: string | null
  className?: string
}) {
  const stages = (kind === "event" ? EVENT_STAGES : TOUR_STAGES) as readonly string[]
  const active = kind === "event" ? normalizeEventStage(status) : normalizeTourStage(status)
  const activeIndex = stages.indexOf(active)

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {stages.map((stage, index) => {
        const isActive = stage === active
        const isPast = index < activeIndex
        return (
          <div key={stage} className="flex items-center gap-1.5">
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]",
                isActive
                  ? "border border-cyan-400/40 bg-cyan-400/15 text-cyan-100"
                  : isPast
                    ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                    : "border border-slate-700/60 bg-slate-900/50 text-slate-500"
              )}
            >
              {stage.replace("_", " ")}
            </span>
            {index < stages.length - 1 ? <span className="h-px w-3 bg-slate-700/80" /> : null}
          </div>
        )
      })}
    </div>
  )
}
