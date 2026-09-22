"use client"

import { use, useEffect, useState } from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { DoorCheckIn } from "@/components/ticketing/door-check-in"
import { useCurrentVenue } from "@/app/venue/hooks/useCurrentVenue"
import { useVenueEvents } from "@/app/venue/lib/hooks/use-venue-events"
import { VenuePageSkeleton } from "@/components/dashboard/venue-page-skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"

interface VenueEventCheckInPageProps {
  params: Promise<{ id: string }>
}

export default function VenueEventCheckInPage({ params }: VenueEventCheckInPageProps) {
  const { id } = use(params)
  const { venue, isLoading: isVenueLoading } = useCurrentVenue()
  const { events, isLoading: isEventsLoading } = useVenueEvents({ venueId: venue?.id })
  const [ready, setReady] = useState(false)

  const event = events.find((row) => row.id === id)

  useEffect(() => {
    if (!isVenueLoading && !isEventsLoading) setReady(true)
  }, [isVenueLoading, isEventsLoading])

  if (!ready || isVenueLoading || isEventsLoading) return <VenuePageSkeleton />

  if (!venue) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Card className="max-w-md border-zinc-800 bg-zinc-900 text-zinc-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertCircle className="h-5 w-5 text-amber-400" />
              Venue required
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-zinc-400">
            <p>Load a venue profile before running door check-in.</p>
            <Button asChild>
              <Link href="/venue/settings">Open settings</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!event) notFound()

  return (
    <DoorCheckIn
      eventId={id}
      backHref={`/venue/events/${id}`}
      backLabel="Back to event"
    />
  )
}
