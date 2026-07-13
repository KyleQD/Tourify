"use client"

import { motion } from "framer-motion"
import { Calendar, Clock, Eye, EyeOff, Heart, MapPin, Music, Users } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { paHeroAspect, paShell } from "@/components/public-artist/public-artist-ui"
import { formatEventTime } from "@/lib/events/format-event-time"
import { cn } from "@/lib/utils"
import { useEventSkin } from "./event-skin-context"
import type { AttendanceData, AttendanceStatus, EventData } from "./types"
import { EventRsvpActions } from "./event-rsvp-actions"

interface EventHeroProps {
  event: EventData
  attendance: AttendanceData | null
  isSignedIn: boolean
  isUpdatingAttendance: boolean
  onAttendanceUpdate: (status: AttendanceStatus) => void
  onShare: () => void
}

export function EventHero({
  event,
  attendance,
  isSignedIn,
  isUpdatingAttendance,
  onAttendanceUpdate,
  onShare,
}: EventHeroProps) {
  const { tokens } = useEventSkin()
  const venueLabel = event.linkedVenue?.venue_name || event.venue_name
  const cityState = [event.venue_city, event.venue_state].filter(Boolean).join(", ")

  return (
    <div className={paShell}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55 }}
        className={tokens.heroFrame}
      >
        <div className={paHeroAspect}>
          {event.poster_url ? (
            <Image src={event.poster_url} alt={event.title} fill priority className="object-cover" />
          ) : (
            <div className={tokens.heroFallback} />
          )}
          <div className={tokens.heroScrim} />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(168,85,247,0.18),transparent_55%)]" />

          <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Badge className={tokens.badge}>{event.type}</Badge>
                  <Badge variant="outline" className={tokens.badge}>
                    {event.status.replace("_", " ")}
                  </Badge>
                  {event.is_public ? (
                    <Badge variant="outline" className={tokens.badge}>
                      <Eye className="mr-1 h-3 w-3" />
                      Public Event
                    </Badge>
                  ) : (
                    <Badge variant="outline" className={tokens.badge}>
                      <EyeOff className="mr-1 h-3 w-3" />
                      Private Event
                    </Badge>
                  )}
                </div>

                <div className="mb-4 flex items-start gap-4">
                  <div className="relative hidden shrink-0 sm:block">
                    <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-white/20 bg-gradient-to-br from-purple-600 to-pink-600 shadow-2xl md:h-24 md:w-24">
                      <Music className="h-10 w-10 text-white md:h-12 md:w-12" />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <h1
                      className={cn(
                        "text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl",
                        tokens.title
                      )}
                    >
                      {event.title}
                    </h1>
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-white/85 sm:text-base">
                      <span className="inline-flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(event.event_date), "EEEE, MMMM d, yyyy")}
                      </span>
                      {event.start_time && formatEventTime(event.start_time) && (
                        <span className="inline-flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          {formatEventTime(event.start_time)}
                        </span>
                      )}
                      {venueLabel && (
                        <span className="inline-flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          {event.linkedVenue?.profile_path ? (
                            <Link
                              href={event.linkedVenue.profile_path}
                              className="underline-offset-4 transition-colors hover:underline"
                            >
                              {venueLabel}
                              {cityState ? `, ${cityState}` : ""}
                            </Link>
                          ) : (
                            <span>
                              {venueLabel}
                              {cityState ? `, ${cityState}` : ""}
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-sm text-white/80">
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="h-4 w-4" />
                    {attendance?.attending || 0} attending
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Heart className="h-4 w-4" />
                    {attendance?.interested || 0} interested
                  </span>
                  {event.capacity ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Users className="h-4 w-4" />
                      {event.capacity} capacity
                    </span>
                  ) : null}
                </div>
              </div>

              <EventRsvpActions
                event={event}
                attendance={attendance}
                isSignedIn={isSignedIn}
                isUpdating={isUpdatingAttendance}
                onUpdate={onAttendanceUpdate}
                onShare={onShare}
              />
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
