import {
  canNonOwnerViewArtistEvent,
  getArtistEventVisibility,
} from "@/lib/artist/artist-event-visibility"

export interface EventSharePreview {
  id: string
  slug: string | null
  title: string
  url: string
  eventDate: string | null
  venueName: string | null
  location: string | null
  posterUrl: string | null
}

export function buildEventSharePreview(event: {
  id: string
  slug?: string | null
  title?: string | null
  name?: string | null
  event_date?: string | null
  venue_name?: string | null
  city?: string | null
  state?: string | null
  country?: string | null
  poster_url?: string | null
}): EventSharePreview {
  const title = String(event.title || event.name || "Untitled event").trim() || "Untitled event"
  const slug = event.slug ? String(event.slug) : null
  const location = [event.city, event.state, event.country].filter(Boolean).join(", ") || null
  const posterUrl =
    typeof event.poster_url === "string" &&
    (/^https?:\/\//i.test(event.poster_url.trim()) || event.poster_url.trim().startsWith("/"))
      ? event.poster_url.trim()
      : null

  return {
    id: event.id,
    slug,
    title,
    url: `/events/${slug || event.id}`,
    eventDate: event.event_date ? String(event.event_date).slice(0, 10) : null,
    venueName: event.venue_name || null,
    location,
    posterUrl,
  }
}

/** Whether a non-owner may share this event (published + not private). Owners can share any status. */
export function canShareArtistEvent({
  event,
  viewerId,
}: {
  event: {
    status?: string | null
    artist_id?: string | null
    created_by?: string | null
    producer_settings?: { visibility?: string } | null
    visibility?: string | null
    is_public?: boolean | null
  } | null
  viewerId?: string | null
}): boolean {
  if (!event) return false
  const isOwner = Boolean(
    viewerId && (event.artist_id === viewerId || event.created_by === viewerId),
  )
  if (isOwner) return true
  return canNonOwnerViewArtistEvent(event)
}

export function getEventShareVisibilityLabel(event: {
  producer_settings?: { visibility?: string } | null
  visibility?: string | null
  is_public?: boolean | null
}) {
  return getArtistEventVisibility(event)
}
