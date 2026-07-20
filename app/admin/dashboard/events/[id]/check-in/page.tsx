"use client"

import { DoorCheckIn } from "@/components/ticketing/door-check-in"
import { useParams } from "next/navigation"

export default function CheckInPage() {
  const params = useParams()
  const eventId = params.id as string

  return (
    <DoorCheckIn
      eventId={eventId}
      backHref={`/admin/dashboard/events/${eventId}`}
      backLabel="Back to hub"
    />
  )
}
