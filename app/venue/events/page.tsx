"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useCurrentVenue } from "@/app/venue/hooks/useCurrentVenue"
import { formatSafeDate, formatSafeTime } from "@/lib/events/admin-event-normalization"
import { CalendarDays, Plus, Ticket, Users } from "lucide-react"

interface VenueEventRow {
  id: string
  title: string
  status: string
  start_at: string
  end_at: string
  capacity?: number | null
  settings?: Record<string, unknown> | null
}

export default function VenueEventsPage() {
  const { venue, isLoading: venueLoading } = useCurrentVenue()
  const [events, setEvents] = useState<VenueEventRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadEvents() {
      if (!venue?.id) return
      setIsLoading(true)
      setError(null)
      try {
        const response = await fetch(`/api/venue/events?venue_id=${venue.id}`, {
          credentials: "include",
          cache: "no-store",
        })
        const payload = await response.json()
        if (!response.ok || payload.success === false) throw new Error(payload.error || "Could not load events")
        setEvents(Array.isArray(payload.data) ? payload.data : [])
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Could not load events")
        setEvents([])
      } finally {
        setIsLoading(false)
      }
    }

    void loadEvents()
  }, [venue?.id])

  if (venueLoading || isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-24 rounded-md bg-zinc-900" />
        {[0, 1, 2].map((item) => (
          <Skeleton key={item} className="h-28 rounded-md bg-zinc-900" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-12">
      <section className="flex flex-col gap-4 rounded-md border border-zinc-800 bg-zinc-900 p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <Badge className="mb-2 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/15">Venue Events</Badge>
          <h1 className="text-2xl font-semibold text-zinc-50">Events at {venue?.name || "your venue"}</h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-400">
            Confirmed shows, holds, offers, and Venue-hosted events tied to your physical location.
          </p>
        </div>
        <Button asChild className="bg-emerald-600 hover:bg-emerald-700">
          <Link href="/venue/bookings">
            <Plus className="mr-2 h-4 w-4" />
            Convert Booking
          </Link>
        </Button>
      </section>

      {error ? (
        <Card className="border-amber-500/30 bg-amber-500/10 text-amber-100">
          <CardContent className="pt-6 text-sm">{error}</CardContent>
        </Card>
      ) : null}

      {events.length === 0 ? (
        <Card className="border-zinc-800 bg-zinc-900 text-zinc-100">
          <CardContent className="space-y-4 pt-6 text-center">
            <CalendarDays className="mx-auto h-10 w-10 text-zinc-500" />
            <p className="text-sm text-zinc-400">
              No Venue events yet. Approve a booking request or create a Venue-hosted event.
            </p>
            <Button asChild variant="outline" className="border-zinc-700 bg-zinc-950">
              <Link href="/venue/bookings">Review booking requests</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <Card key={event.id} className="border-zinc-800 bg-zinc-900 text-zinc-100">
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <CardTitle className="text-base">{event.title}</CardTitle>
                    <p className="mt-1 text-sm text-zinc-400">
                      {formatSafeDate(event.start_at)} at {formatSafeTime(event.start_at)}
                    </p>
                  </div>
                  <Badge variant="outline" className="w-fit border-zinc-700 capitalize text-zinc-300">
                    {event.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3 text-sm text-zinc-400">
                <span className="inline-flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Capacity {event.capacity || "TBD"}
                </span>
                <span className="inline-flex items-center gap-2">
                  <Ticket className="h-4 w-4" />
                  {(event.settings?.event_type as string) || "event"}
                </span>
                <Button asChild size="sm" variant="ghost" className="ml-auto text-emerald-300">
                  <Link href={`/venue/events/${event.id}`}>Open event</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
