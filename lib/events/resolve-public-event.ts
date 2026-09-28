import "server-only"

import { isArtistEventDiscoverable, canNonOwnerViewArtistEvent } from "@/lib/artist/artist-event-visibility"
import { isEventsV2PubliclyListable } from "@/lib/discover/location-match"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

async function findRow(table: "events" | "events_v2" | "artist_events", slugOrId: string) {
  const client = createServiceRoleClient()
  const bySlug = await client.from(table).select("*").eq("slug", slugOrId).maybeSingle()
  if (bySlug.data) return bySlug.data as Record<string, any>
  if (!UUID_PATTERN.test(slugOrId)) return null
  const byId = await client.from(table).select("*").eq("id", slugOrId).maybeSingle()
  return (byId.data || null) as Record<string, any> | null
}

function normalizeV2(row: Record<string, any>): Record<string, any> {
  const settings = row.settings && typeof row.settings === "object" ? row.settings : {}
  const startAt = typeof row.start_at === "string" ? row.start_at : ""
  const endAt = typeof row.end_at === "string" ? row.end_at : ""
  return {
    ...row,
    title: row.title || "Event",
    description: typeof settings.description === "string" ? settings.description : null,
    type: typeof settings.event_type === "string" ? settings.event_type : null,
    event_type: typeof settings.event_type === "string" ? settings.event_type : null,
    event_date: startAt ? startAt.slice(0, 10) : null,
    start_time: startAt ? startAt.slice(11, 16) : null,
    end_time: endAt ? endAt.slice(11, 16) : null,
    venue_name: settings.venue_label || settings.venue_name || null,
    venue_address: settings.venue_address || null,
    venue_city: settings.venue_city || null,
    venue_state: settings.venue_state || null,
    venue_country: settings.venue_country || null,
    poster_url: settings.poster_url || settings.cover_image_url || null,
    ticket_url: settings.ticket_url || null,
    ticket_price_min: settings.ticket_price_min ?? settings.ticket_price ?? null,
    ticket_price_max: settings.ticket_price_max ?? settings.ticket_price ?? null,
    is_public: true,
    artist_id: row.created_by || null,
    user_id: row.created_by || null,
    producer_settings: settings,
    event_table: "events_v2",
  }
}

export async function resolvePublicEvent(slugOrId: string, viewerId: string | null) {
  const normalized = slugOrId.trim()
  if (!normalized) return null
  const [legacy, v2, artist] = await Promise.all([
    findRow("events", normalized),
    findRow("events_v2", normalized),
    findRow("artist_events", normalized),
  ])

  if (legacy) {
    const isOwner = viewerId === legacy.artist_id || viewerId === legacy.created_by
    if (isOwner || canNonOwnerViewArtistEvent(legacy)) return { ...legacy, event_table: "events" }
  }
  if (v2) {
    const isOwner = viewerId === v2.created_by
    const publicStatus = ["confirmed", "advancing", "onsite"].includes(v2.status)
    if (isOwner || (publicStatus && isEventsV2PubliclyListable(v2))) return normalizeV2(v2)
  }
  if (artist) {
    const isOwner = viewerId === artist.user_id
    if (isOwner ? artist.status !== "cancelled" : isArtistEventDiscoverable(artist)) {
      return { ...artist, artist_id: artist.user_id, event_table: "artist_events" }
    }
  }
  // Merged-event redirect: a losing slug resolves to the surviving event.
  const redirect = await findSlugRedirect(normalized)
  if (redirect) {
    const target = await findRow("events", redirect)
    if (target && (viewerId === target.artist_id || canNonOwnerViewArtistEvent(target))) {
      return { ...target, event_table: "events", merged_from_slug: normalized }
    }
  }
  return null
}

/** Returns the surviving event id for a merged-away slug, if any. */
export async function findSlugRedirect(slug: string): Promise<string | null> {
  const client = createServiceRoleClient()
  const { data } = await client
    .from("event_slug_redirects")
    .select("target_event_id")
    .eq("slug", slug)
    .maybeSingle()
  return (data?.target_event_id as string) ?? null
}
