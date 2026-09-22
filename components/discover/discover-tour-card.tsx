"use client"

import { motion } from "framer-motion"
import { CalendarRange, MapPin, Route } from "lucide-react"
import { SurfaceCard } from "@/components/surface/surface-primitives"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"
import type { DiscoverTour } from "@/lib/discover/types"

function formatTourDateRange(tour: DiscoverTour) {
  const start = formatSafeDate(tour.start_date || tour.next_event_date || null)
  const end = formatSafeDate(tour.end_date || null)
  if (start && end && start !== end) return `${start} – ${end}`
  if (start) return start
  if (tour.next_event_date) return `Next stop ${formatSafeDate(tour.next_event_date)}`
  return "Dates TBA"
}

export function DiscoverTourCard({
  tour,
  onOpen,
}: {
  tour: DiscoverTour
  onOpen: () => void
}) {
  const cities = (tour.cities || []).slice(0, 3).join(" · ")
  const artists = (tour.artist_names || []).slice(0, 2).join(", ")

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
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault()
            onOpen()
          }
        }}
        className="h-full cursor-pointer overflow-hidden border-white/10 bg-slate-900/50 transition hover:border-white/25"
      >
        <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-slate-800 to-slate-950">
          {tour.cover_url ? (

            <img
              src={tour.cover_url}
              alt={tour.name}
              className="h-full w-full object-cover transition duration-300 hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full w-full items-end bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.25),_transparent_55%)] p-4">
              <Route className="h-8 w-8 text-slate-400" />
            </div>
          )}
        </div>
        <div className="space-y-2 p-4">
          <p className="line-clamp-2 font-semibold text-slate-100">{tour.name}</p>
          {artists ? <p className="truncate text-xs text-slate-400">{artists}</p> : null}
          <p className="flex items-center gap-1.5 text-xs text-slate-400">
            <CalendarRange className="h-3.5 w-3.5 flex-shrink-0" />
            {formatTourDateRange(tour)}
          </p>
          <p className="flex items-center gap-1.5 text-xs text-slate-300">
            <Route className="h-3.5 w-3.5 flex-shrink-0" />
            {tour.event_count} {tour.event_count === 1 ? "stop" : "stops"}
          </p>
          {cities ? (
            <p className="flex items-start gap-1.5 text-xs text-slate-500">
              <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
              <span className="line-clamp-2">{cities}</span>
            </p>
          ) : null}
        </div>
      </SurfaceCard>
    </motion.div>
  )
}
