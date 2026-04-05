"use client"

import { notFound } from "next/navigation"
import { useEffect, useState } from "react"
import EventHeader from "../../components/event-details/event-header"
import EventTabs from "../../components/event-details/event-tabs"
import { useVenueEvents } from "../../lib/hooks/use-venue-events"
import { useCurrentVenue } from "../../hooks/useCurrentVenue"

interface EventDetailsPageProps {
  params: Promise<{
    id: string
  }>
}

export default function EventDetailsPage({ params }: EventDetailsPageProps) {
  const { venue } = useCurrentVenue()
  const { events, isLoading } = useVenueEvents({ venueId: venue?.id })
  const [selectedEvent, setSelectedEvent] = useState<any>(null)
  const [eventId, setEventId] = useState<string>("")

  useEffect(() => {
    params.then(({ id }) => {
      setEventId(id)
    })
  }, [params])

  useEffect(() => {
    if (events && events.length > 0 && eventId) {
      const event = events.find((e: any) => e.id === eventId)
      if (event) setSelectedEvent(event)
      else notFound()
    }
  }, [events, eventId])

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-700 rounded w-1/3"></div>
          <div className="h-32 bg-slate-700 rounded"></div>
          <div className="h-64 bg-slate-700 rounded"></div>
        </div>
      </div>
    )
  }

  if (!selectedEvent) notFound()

  return (
    <div className="container mx-auto py-8 space-y-6">
      <EventHeader event={selectedEvent} />
      <EventTabs event={selectedEvent} />
    </div>
  )
}


