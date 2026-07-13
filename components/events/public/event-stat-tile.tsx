"use client"

import { cn } from "@/lib/utils"
import { useEventSkin } from "./event-skin-context"

interface EventStatTileProps {
  value: number | string
  label: string
  tone?: "green" | "blue" | "red" | "purple" | "neutral"
  className?: string
}

export function EventStatTile({ value, label, tone = "neutral", className }: EventStatTileProps) {
  const { tokens } = useEventSkin()
  const toneClass =
    tone === "green"
      ? tokens.statAttending
      : tone === "blue"
        ? tokens.statInterested
        : tone === "red"
          ? tokens.statNotGoing
          : tokens.inset

  return (
    <div className={cn(tokens.inset, "p-3 text-center", toneClass, className)}>
      <div className="text-2xl font-bold tracking-tight">{value}</div>
      <div className={cn("mt-0.5 text-xs font-medium uppercase tracking-wide", tokens.muted)}>
        {label}
      </div>
    </div>
  )
}
