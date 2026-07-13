import type { EventLinkedVenue } from "@/lib/events/get-public-event-page"
import type { AttendanceStatus, EventData } from "./types"

export function buildVenueAddressLine(event: EventData, venue?: EventLinkedVenue | null) {
  const parts = [
    venue?.address || event.venue_address,
    [venue?.city || event.venue_city, venue?.state || event.venue_state].filter(Boolean).join(", "),
    venue?.country || event.venue_country,
  ].filter((part) => typeof part === "string" && part.trim().length > 0)
  return parts.join(" · ") || null
}

export function buildEventSignupUrl(event: EventData, intent?: AttendanceStatus) {
  const path = `/events/${event.slug || event.id}`
  const params = new URLSearchParams()
  params.set("redirectTo", path)
  if (intent) params.set("intent", intent)
  return `/signup?${params.toString()}`
}

export function getAttendanceProfile(record: {
  user?: { id: string; username: string; full_name: string; avatar_url?: string; is_verified: boolean } | null
  profiles?: { id: string; username: string; full_name: string; avatar_url?: string; is_verified: boolean } | null
}) {
  return record.user || record.profiles || null
}
