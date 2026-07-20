"use client"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  AlertTriangle,
  BriefcaseBusiness,
  CalendarDays,
  ClipboardList,
  FileText,
  Target,
} from "lucide-react"
import { VENUE_CARD, VENUE_SECTION_LABEL } from "@/components/dashboard/venue-tokens"

export interface VenueAttentionChip {
  id: string
  label: string
  count: number
  tone: "neutral" | "warning" | "critical" | "ok"
  href: string
}

interface VenueAttentionStripProps {
  chips: VenueAttentionChip[]
}

const toneStyles: Record<VenueAttentionChip["tone"], string> = {
  neutral: "border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800",
  warning: "border-amber-500/40 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20",
  critical: "border-red-500/40 bg-red-500/10 text-red-200 hover:bg-red-500/20",
  ok: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20",
}

const chipIcons: Record<string, typeof Target> = {
  bookings: ClipboardList,
  events: CalendarDays,
  hiring: BriefcaseBusiness,
  documents: FileText,
  actions: Target,
}

export function VenueAttentionStrip({ chips }: VenueAttentionStripProps) {
  const visible = chips.filter((chip) => chip.count > 0 || chip.tone === "ok")
  if (visible.length === 0) return null

  return (
    <section aria-label="Needs attention" className={cn(VENUE_CARD, "mb-6 flex flex-wrap items-center gap-2 px-4 py-3")}>
      <div className={cn(VENUE_SECTION_LABEL, "mr-2 flex items-center gap-1.5")}>
        <AlertTriangle className="h-3.5 w-3.5 text-amber-400/80" />
        Attention
      </div>
      {visible.map((chip) => {
        const Icon = chipIcons[chip.id] || Target
        return (
          <a
            key={chip.id}
            href={chip.href}
            className={cn(
              "inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-all duration-200",
              toneStyles[chip.tone],
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{chip.label}</span>
            <Badge variant="secondary" className="border-0 bg-black/40 text-current">
              {chip.count}
            </Badge>
          </a>
        )
      })}
    </section>
  )
}
