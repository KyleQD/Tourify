"use client"

import Link from "next/link"
import type { PublicArtistEventDTO, PublicArtistViewerDTO } from "@/lib/public-artist/public-artist-types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CalendarDays, ExternalLink, Ticket } from "lucide-react"
import { paBtnRound, paCard, paRow } from "@/components/public-artist/public-artist-ui"

export function PublicArtistEventsSection({
  viewer,
  artistName,
  creatorType,
  isAvailableForHire,
  upcomingEvents,
  onBookThisArtist,
}: {
  viewer: PublicArtistViewerDTO
  artistName: string
  creatorType: string | null
  isAvailableForHire: boolean
  upcomingEvents: PublicArtistEventDTO[]
  onBookThisArtist: () => void
}) {
  const isEmpty = upcomingEvents.length === 0

  // Public URL always uses visitor empty rules — no setup CTAs here
  if (isEmpty) return null

  return (
    <Card className={paCard}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight text-white">
          <CalendarDays className="h-4 w-4 opacity-90" />
          Bookings & Events
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-col gap-2.5">
          {upcomingEvents.slice(0, 6).map(e => {
            const eventHref = `/events/${e.slug || e.id}`
            return (
              <div
                key={e.id}
                className={`${paRow} flex items-start justify-between gap-4 p-3.5`}
              >
                <div className="min-w-0">
                  <Link
                    href={eventHref}
                    className="text-white font-medium truncate hover:underline inline-flex items-center gap-1.5"
                  >
                    {e.title || e.venueName || "Upcoming show"}
                    <ExternalLink className="h-3.5 w-3.5 opacity-70 shrink-0" />
                  </Link>
                  <div className="text-white/60 text-xs mt-1">
                    {e.venueName && e.title ? e.venueName : ""}
                    {e.venueName && e.title && e.location ? " • " : ""}
                    {e.location ? e.location : ""}
                    {e.eventDate ? `${e.venueName || e.location ? " • " : ""}${e.eventDate}` : ""}
                  </div>
                </div>

                {e.ticketUrl ? (
                  <Button asChild variant="secondary" className={`${paBtnRound} shrink-0 px-4`}>
                    <a href={e.ticketUrl} target="_blank" rel="noreferrer">
                      <Ticket className="mr-2 h-4 w-4" />
                      Tickets
                    </a>
                  </Button>
                ) : (
                  <Button asChild variant="secondary" className={`${paBtnRound} shrink-0 px-4`}>
                    <Link href={eventHref}>View</Link>
                  </Button>
                )}
              </div>
            )
          })}
        </div>

        {!viewer.isOwner ? (
          <div className="mt-5">
            <Button className={`${paBtnRound} w-full py-6 text-base`} onClick={onBookThisArtist}>
              {isAvailableForHire ? `Hire This ${creatorType || "Creator"}` : `Contact ${artistName} for Opportunities`}
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
