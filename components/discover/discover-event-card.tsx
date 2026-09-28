"use client"

import { motion } from "framer-motion"
import { Calendar, MapPin, Ticket } from "lucide-react"
import { SurfaceCard } from "@/components/surface/surface-primitives"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"
import { formatTicketPriceLabel } from "@/lib/discover/ticket-price"
import type { DiscoverEvent } from "@/lib/discover/types"

export function DiscoverEventCard({
  event,
  onOpen,
}: {
  event: DiscoverEvent
  onOpen: () => void
}) {
  const locationLabel = [event.venue_name, event.venue_city, event.venue_state]
    .filter(Boolean)
    .join(" · ")
  const priceLabel = formatTicketPriceLabel({
    ticketPriceMin: event.ticket_price_min,
    ticketPriceMax: event.ticket_price_max,
  })

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
      className="w-[280px] flex-shrink-0"
    >
      <SurfaceCard
        role="button"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={(eventKey) => {
          if (eventKey.key === "Enter" || eventKey.key === " ") {
            eventKey.preventDefault()
            onOpen()
          }
        }}
        className="h-full cursor-pointer overflow-hidden border-white/10 bg-slate-900/50 transition hover:border-white/25"
      >
        <div className="relative aspect-[3/4] overflow-hidden bg-gradient-to-br from-slate-800 to-slate-950">
          {event.poster_url ? (

            <img
              src={event.poster_url}
              alt={event.title}
              className="h-full w-full object-cover transition duration-300 hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full w-full items-end bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.25),_transparent_55%)] p-4">
              <Calendar className="h-8 w-8 text-slate-400" />
            </div>
          )}
        </div>
        <div className="space-y-2 p-4">
          <p className="line-clamp-2 font-semibold text-slate-100">{event.title}</p>
          <p className="flex items-center gap-1.5 text-xs text-slate-400">
            <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
            {formatSafeDate(event.event_date || null) || "Date TBA"}
          </p>
          {locationLabel ? (
            <p className="flex items-start gap-1.5 text-xs text-slate-400">
              <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
              <span className="line-clamp-2">{locationLabel}</span>
            </p>
          ) : null}
          <p className="flex items-center gap-1.5 text-xs text-slate-300">
            <Ticket className="h-3.5 w-3.5 flex-shrink-0" />
            {priceLabel}
          </p>
        </div>
      </SurfaceCard>
    </motion.div>
  )
}
