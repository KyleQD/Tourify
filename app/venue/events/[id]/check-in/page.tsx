"use client"

import { use } from "react"
import { DoorCheckIn } from "@/components/ticketing/door-check-in"

interface VenueEventCheckInPageProps {
  params: Promise<{ id: string }>
}

export default function VenueEventCheckInPage({ params }: VenueEventCheckInPageProps) {
  const { id } = use(params)

  return (
    <DoorCheckIn
      eventId={id}
      backHref={`/venue/events/${id}`}
      backLabel="Back to event"
    />
  )
}
