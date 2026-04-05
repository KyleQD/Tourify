"use client"

import type { PublicArtistEventDTO } from "@/lib/public-artist/public-artist-types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CalendarDays, Ticket } from "lucide-react"
import Link from "next/link"
import { paBtnRound, paCard, paInset, paRow } from "@/components/public-artist/public-artist-ui"

export function PublicArtistEventsSection({
  artistUserId,
  artistName,
  creatorType,
  isAvailableForHire,
  upcomingEvents,
  onBookThisArtist
}: {
  artistUserId: string
  artistName: string
  creatorType: string | null
  isAvailableForHire: boolean
  upcomingEvents: PublicArtistEventDTO[]
  onBookThisArtist: () => void
}) {
  return (
    <>
      <Card className={paCard}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight text-white">
            <CalendarDays className="h-4 w-4 opacity-90" />
            Bookings & Events
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {upcomingEvents.length === 0 ? (
            <div className={`${paInset} flex flex-col gap-3 p-5`}>
              <div className="text-sm text-white/70">No upcoming public events yet.</div>
              <Button asChild variant="secondary" className={`${paBtnRound} w-fit px-5`}>
                <Link href="/artist/events">Add your first event</Link>
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {upcomingEvents.slice(0, 6).map(e => (
                <div
                  key={e.id}
                  className={`${paRow} flex items-start justify-between gap-4 p-3.5`}
                >
                  <div className="min-w-0">
                    <div className="text-white font-medium truncate">{e.venueName || "Venue TBA"}</div>
                    <div className="text-white/60 text-xs mt-1">
                      {e.location ? e.location : ""}
                      {e.eventDate ? ` • ${e.eventDate}` : ""}
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
                    <Button variant="secondary" disabled className={`${paBtnRound} shrink-0 px-4`}>
                      Tickets
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="mt-5">
            <Button className={`${paBtnRound} w-full py-6 text-base`} onClick={onBookThisArtist}>
              {isAvailableForHire ? `Hire This ${creatorType || "Creator"}` : `Contact ${artistName} for Opportunities`}
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  )
}

