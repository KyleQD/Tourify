/**
 * lib/events/search-service.ts
 *
 * Discovery search API service. Executes against the discovery index via
 * the event_discovery_nearby / event_discovery_upcoming RPCs. Never passes
 * arbitrary user parameters to providers — this is a database-only path.
 */

import "server-only"

import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { decodeCursor, encodeCursor, type DiscoveryCursor } from "./cursors"
import { isValidLatLng, milesToMeters, resolveDatePreset, type DatePreset } from "./location"

export type DiscoverySort = "nearby" | "soonest" | "recommended" | "popular" | "recently_added"

export interface DiscoverySearchInput {
  query?: string | null
  latitude?: number | null
  longitude?: number | null
  radiusMiles?: number | null
  datePreset?: DatePreset | null
  startDate?: string | null
  endDate?: string | null
  categories?: string[] | null
  genres?: string[] | null
  isFree?: boolean | null
  sort?: DiscoverySort
  cursor?: string | null
  limit?: number
  timezone?: string
}

export interface DiscoveryResultItem {
  eventId: string
  title: string
  startAt: string | null
  endAt: string | null
  timezone: string | null
  status: string
  venueName: string | null
  city: string | null
  stateCode: string | null
  countryCode: string | null
  distanceMeters: number | null
  isFree: boolean | null
  priceMin: number | null
  priceMax: number | null
  currency: string | null
  categoryKeys: string[]
  genreKeys: string[]
  qualityScore: number
}

export interface DiscoverySearchResult {
  items: DiscoveryResultItem[]
  nextCursor: string | null
  usedLocation: boolean
  sort: DiscoverySort
}

const MAX_LIMIT = 50

/**
 * Execute a discovery search. Location priority is resolved by the caller
 * (explicit search location > browser permission > saved preference);
 * this function simply uses coordinates when present and valid.
 */
export async function searchDiscovery(input: DiscoverySearchInput): Promise<DiscoverySearchResult> {
  const client = createServiceRoleClient()
  const limit = Math.min(Math.max(input.limit ?? 25, 1), MAX_LIMIT)
  const sort: DiscoverySort = input.sort ?? (isValidLatLng({ latitude: input.latitude, longitude: input.longitude }) ? "nearby" : "soonest")

  // Date boundaries: preset wins over explicit range when both supplied.
  let startAfter: string | null = input.startDate ?? null
  let startBefore: string | null = input.endDate ?? null
  if (input.datePreset) {
    const bounds = resolveDatePreset(input.datePreset, new Date(), input.timezone ?? "UTC")
    startAfter = bounds.start
    startBefore = bounds.end
  }

  const decoded = decodeCursor(input.cursor)
  const hasGeo = isValidLatLng({ latitude: input.latitude, longitude: input.longitude })
  const useNearby = sort === "nearby" && hasGeo

  const common = {
    p_start_after: startAfter,
    p_start_before: startBefore,
    p_category_keys: input.categories?.length ? input.categories : null,
    p_genre_keys: input.genres?.length ? input.genres : null,
    p_is_free: input.isFree ?? null,
    p_query_text: input.query?.trim() || null,
    p_limit: limit + 1, // fetch one extra to compute nextCursor
  }

  let rows: any[] = []
  if (useNearby) {
    const nearbyCursor = decoded?.kind === "nearby" ? decoded : null
    const { data, error } = await client.rpc("event_discovery_nearby", {
      ...common,
      p_latitude: input.latitude,
      p_longitude: input.longitude,
      p_radius_meters: milesToMeters(input.radiusMiles ?? 25),
      p_cursor_distance: nearbyCursor?.distanceMeters ?? null,
      p_cursor_start_at: nearbyCursor?.startAt ?? null,
      p_cursor_event_id: nearbyCursor?.eventId ?? null,
    })
    if (error) throw error
    rows = data ?? []
  } else {
    const upcomingCursor = decoded?.kind === "upcoming" ? decoded : null
    const { data, error } = await client.rpc("event_discovery_upcoming", {
      ...common,
      p_cursor_start_at: upcomingCursor?.startAt ?? null,
      p_cursor_event_id: upcomingCursor?.eventId ?? null,
    })
    if (error) throw error
    rows = data ?? []
  }

  const hasMore = rows.length > limit
  const page = hasMore ? rows.slice(0, limit) : rows

  const items: DiscoveryResultItem[] = page.map((row) => ({
    eventId: row.event_id,
    title: row.title,
    startAt: row.start_at,
    endAt: row.end_at,
    timezone: row.timezone,
    status: row.status,
    venueName: row.venue_name,
    city: row.city,
    stateCode: row.state_code,
    countryCode: row.country_code,
    distanceMeters: row.distance_meters,
    isFree: row.is_free,
    priceMin: row.price_min,
    priceMax: row.price_max,
    currency: row.currency,
    categoryKeys: row.category_keys ?? [],
    genreKeys: row.genre_keys ?? [],
    qualityScore: row.quality_score ?? 0,
  }))

  let nextCursor: string | null = null
  if (hasMore && page.length > 0) {
    const last = page[page.length - 1]
    const cursor: DiscoveryCursor = useNearby
      ? {
          kind: "nearby",
          distanceMeters: last.distance_meters ?? 0,
          startAt: last.start_at ?? null,
          eventId: last.event_id,
        }
      : { kind: "upcoming", startAt: last.start_at ?? null, eventId: last.event_id }
    nextCursor = encodeCursor(cursor)
  }

  return { items, nextCursor, usedLocation: useNearby, sort }
}
