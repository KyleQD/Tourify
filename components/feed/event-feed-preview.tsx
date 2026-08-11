"use client"

import Link from "next/link"
import { CalendarDays, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"

export interface EventPreviewData {
  id: string
  slug?: string | null
  title: string
  url?: string | null
  eventDate?: string | null
  venueName?: string | null
  location?: string | null
  posterUrl?: string | null
}

interface EventFeedPreviewProps {
  event: EventPreviewData
  compact?: boolean
}

export function EventFeedPreview({ event, compact = false }: EventFeedPreviewProps) {
  const href = event.url || `/events/${event.slug || event.id}`
  const meta = [event.venueName, event.location, event.eventDate].filter(Boolean).join(" · ")

  return (
    <div className={`overflow-hidden rounded-xl border border-white/10 bg-black/30 ${compact ? "mt-2" : "mt-3"}`}>
      <div className={compact ? "flex gap-3 p-3" : "grid gap-0 sm:grid-cols-[160px_1fr]"}>
        <div className={compact ? "h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-black/40" : "aspect-square bg-black/40"}>
          {event.posterUrl ? (

            <img src={event.posterUrl} alt={event.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-white/40">
              <CalendarDays className="h-6 w-6 opacity-60" />
            </div>
          )}
        </div>
        <div className={compact ? "min-w-0 flex-1" : "flex flex-col justify-between gap-3 p-4"}>
          <div>
            <div className="truncate text-sm font-semibold text-white">{event.title}</div>
            {meta ? (
              <p className="mt-1 line-clamp-2 text-xs text-white/60 flex items-start gap-1">
                <MapPin className="h-3 w-3 mt-0.5 shrink-0 opacity-70" />
                <span>{meta}</span>
              </p>
            ) : null}
          </div>
          <div className="mt-2">
            <Button asChild size="sm" className="bg-purple-600 hover:bg-purple-700">
              <Link href={href}>View event</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
