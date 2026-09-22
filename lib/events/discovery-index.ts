/**
 * lib/events/discovery-index.ts
 *
 * Builders that project native event rows into the search-optimized
 * event_discovery_index table, plus the idempotent upsert. Pure mapping
 * is exported for tests; database access lives at the bottom and is
 * server-only (service role).
 */

import "server-only"

import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { normalizeTitleKey } from "./providers/schemas"

export interface DiscoveryIndexRow {
  event_id: string
  source_table: "events" | "events_v2" | "artist_events"
  source_id: string
  title: string
  normalized_title: string
  description_excerpt: string | null
  start_at: string | null
  end_at: string | null
  timezone: string | null
  status: string
  visibility: string
  /** WKT or null — POINT(longitude latitude). */
  location_wkt: string | null
  venue_id: string | null
  venue_name: string | null
  city: string | null
  state_code: string | null
  country_code: string | null
  postal_code: string | null
  artist_ids: string[]
  category_keys: string[]
  genre_keys: string[]
  event_type_keys: string[]
  is_free: boolean | null
  price_min: number | null
  price_max: number | null
  currency: string | null
  popularity_score: number
  quality_score: number
  source_authority_score: number
}

/** POINT(longitude latitude) — the one place WKT is built. */
export function toPointWkt(latitude: number | null | undefined, longitude: number | null | undefined): string | null {
  if (latitude == null || longitude == null) return null
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null
  return `POINT(${longitude} ${latitude})`
}

function excerpt(text: unknown, max = 280): string | null {
  if (typeof text !== "string" || !text.trim()) return null
  const clean = text.replace(/\s+/g, " ").trim()
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean
}

function jsonbStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((v): v is string => typeof v === "string" && v.length > 0)
}

/** Project a row from public.events (artist pipeline). */
export function buildFromEvents(row: Record<string, any>): DiscoveryIndexRow {
  const title = row.name || row.title || "Untitled Event"
  const startAt = combineDateTime(row.event_date, row.start_time, null)
  const endAt = combineDateTime(row.event_date, row.end_time ?? row.doors_open, null)
  const priceMin = num(row.ticket_price_min)
  const priceMax = num(row.ticket_price_max)
  return {
    event_id: row.id,
    source_table: "events",
    source_id: row.id,
    title,
    normalized_title: normalizeTitleKey(title),
    description_excerpt: excerpt(row.description),
    start_at: startAt,
    end_at: endAt,
    timezone: null,
    status: row.status === "cancelled" ? "cancelled" : "published",
    visibility: "public",
    location_wkt: toPointWkt(row.latitude, row.longitude),
    venue_id: row.venue_id ?? null,
    venue_name: row.venue_name ?? row.location ?? null,
    city: row.city ?? null,
    state_code: row.state ?? null,
    country_code: row.country ?? null,
    postal_code: null,
    artist_ids: row.artist_id ? [row.artist_id] : [],
    category_keys: jsonbStringArray(row.tags),
    genre_keys: jsonbStringArray(row.genre_tags),
    event_type_keys: row.event_type ? [String(row.event_type)] : row.type ? [String(row.type)] : [],
    is_free: priceMin === 0 && (priceMax === 0 || priceMax === null) ? true : priceMin == null ? null : false,
    price_min: priceMin,
    price_max: priceMax,
    currency: "USD",
    popularity_score: 0,
    quality_score: computeQualityScore({
      hasDescription: Boolean(row.description),
      hasVenue: Boolean(row.venue_name || row.location),
      hasGeo: row.latitude != null && row.longitude != null,
      hasPrice: priceMin != null,
      hasImage: Boolean(row.poster_url),
    }),
    source_authority_score: 2, // native operational data
  }
}

/** Project a row from public.events_v2 (settings jsonb mapping mirrors resolve-public-event). */
export function buildFromEventsV2(row: Record<string, any>): DiscoveryIndexRow {
  const settings = row.settings && typeof row.settings === "object" ? row.settings : {}
  const title = row.title || "Untitled Event"
  const priceMin = num(settings.ticket_price_min ?? settings.ticket_price)
  const priceMax = num(settings.ticket_price_max ?? settings.ticket_price)
  const lat = num(settings.latitude)
  const lng = num(settings.longitude)
  return {
    event_id: row.id,
    source_table: "events_v2",
    source_id: row.id,
    title,
    normalized_title: normalizeTitleKey(title),
    description_excerpt: excerpt(settings.description),
    start_at: typeof row.start_at === "string" ? row.start_at : null,
    end_at: typeof row.end_at === "string" ? row.end_at : null,
    timezone: row.timezone ?? null,
    status: "published",
    visibility: "public",
    location_wkt: toPointWkt(lat, lng),
    venue_id: row.venue_id ?? null,
    venue_name: settings.venue_label || settings.venue_name || null,
    city: settings.venue_city || null,
    state_code: settings.venue_state || null,
    country_code: settings.venue_country || null,
    postal_code: null,
    artist_ids: row.created_by ? [row.created_by] : [],
    category_keys: [],
    genre_keys: jsonbStringArray(settings.genre_tags),
    event_type_keys: settings.event_type ? [String(settings.event_type)] : [],
    is_free: priceMin === 0 ? true : priceMin == null ? null : false,
    price_min: priceMin,
    price_max: priceMax,
    currency: "USD",
    popularity_score: 0,
    quality_score: computeQualityScore({
      hasDescription: Boolean(settings.description),
      hasVenue: Boolean(settings.venue_label || settings.venue_name),
      hasGeo: lat != null && lng != null,
      hasPrice: priceMin != null,
      hasImage: Boolean(settings.poster_url || settings.cover_image_url),
    }),
    source_authority_score: 2,
  }
}

/** Project a row from public.artist_events (legacy). */
export function buildFromArtistEvents(row: Record<string, any>): DiscoveryIndexRow {
  const coords = row.venue_coordinates && typeof row.venue_coordinates === "object" ? row.venue_coordinates : {}
  const lat = num(coords.lat ?? coords.latitude)
  const lng = num(coords.lng ?? coords.lon ?? coords.longitude)
  const title = row.title || "Untitled Event"
  const priceMin = num(row.ticket_price_min)
  const priceMax = num(row.ticket_price_max)
  return {
    event_id: row.id,
    source_table: "artist_events",
    source_id: row.id,
    title,
    normalized_title: normalizeTitleKey(title),
    description_excerpt: excerpt(row.description),
    start_at: combineDateTime(row.event_date, row.start_time, null),
    end_at: combineDateTime(row.event_date, row.end_time, null),
    timezone: null,
    status: "published",
    visibility: "public",
    location_wkt: toPointWkt(lat, lng),
    venue_id: null,
    venue_name: row.venue_name ?? null,
    city: row.venue_city ?? null,
    state_code: row.venue_state ?? null,
    country_code: row.venue_country ?? null,
    postal_code: null,
    artist_ids: row.user_id ? [row.user_id] : [],
    category_keys: [],
    genre_keys: [],
    event_type_keys: row.type ? [String(row.type)] : [],
    is_free: priceMin === 0 ? true : priceMin == null ? null : false,
    price_min: priceMin,
    price_max: priceMax,
    currency: "USD",
    popularity_score: 0,
    quality_score: computeQualityScore({
      hasDescription: Boolean(row.description),
      hasVenue: Boolean(row.venue_name),
      hasGeo: lat != null && lng != null,
      hasPrice: priceMin != null,
      hasImage: Boolean(row.poster_url),
    }),
    source_authority_score: 1.5, // legacy store ranks below current native tables
  }
}

export function computeQualityScore(signals: {
  hasDescription: boolean
  hasVenue: boolean
  hasGeo: boolean
  hasPrice: boolean
  hasImage: boolean
}): number {
  let score = 0
  if (signals.hasDescription) score += 0.25
  if (signals.hasVenue) score += 0.2
  if (signals.hasGeo) score += 0.25
  if (signals.hasPrice) score += 0.15
  if (signals.hasImage) score += 0.15
  return Math.round(score * 1000) / 1000
}

function num(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value) : value
  return typeof n === "number" && Number.isFinite(n) ? n : null
}

function combineDateTime(date: unknown, time: unknown, _timezone: string | null): string | null {
  if (typeof date !== "string" || !date) return null
  const t = typeof time === "string" && time ? time : "00:00:00"
  // Without a timezone we store the naive wall-clock as UTC; timezone-aware
  // conversion happens for provider/native rows that carry one.
  return `${date}T${t.length === 5 ? `${t}:00` : t}Z`
}

// ---------------------------------------------------------------------------
// Database access (service role; idempotent upserts keyed by source identity)
// ---------------------------------------------------------------------------

/** Upsert one projected row. Idempotent via (source_table, source_id). */
export async function upsertDiscoveryRow(row: DiscoveryIndexRow): Promise<void> {
  const client = createServiceRoleClient()
  const { location_wkt, ...rest } = row
  const { error } = await client
    .from("event_discovery_index")
    .upsert(
      {
        ...rest,
        // PostGIS geography from WKT; null stays null. search_document is
        // maintained by the trg_event_discovery_tsv trigger.
        location: location_wkt,
        indexed_at: new Date().toISOString(),
      },
      { onConflict: "source_table,source_id" },
    )
  if (error) throw error
}

/**
 * Backfill native sources in batches. Returns counts per source table.
 * Safe to re-run; upserts are idempotent.
 */
export async function backfillNativeEvents(batchSize = 500): Promise<{
  events: number
  events_v2: number
  artist_events: number
}> {
  const client = createServiceRoleClient()
  const counts = { events: 0, events_v2: 0, artist_events: 0 }

  const run = async (
    table: "events" | "events_v2" | "artist_events",
    statusFilter: (q: any) => any,
    build: (row: Record<string, any>) => DiscoveryIndexRow,
  ) => {
    let offset = 0
    for (;;) {
      let query = client.from(table).select("*").range(offset, offset + batchSize - 1)
      query = statusFilter(query)
      const { data, error } = await query
      if (error) throw error
      if (!data || data.length === 0) break
      for (const row of data) {
        try {
          await upsertDiscoveryRow(build(row))
          counts[table] += 1
        } catch {
          // Skip malformed rows; reported via sync-run telemetry upstream.
        }
      }
      if (data.length < batchSize) break
      offset += batchSize
    }
  }

  await run("events", (q) => q.eq("status", "published"), buildFromEvents)
  await run("events_v2", (q) => q.in("status", ["confirmed", "advancing", "onsite"]), buildFromEventsV2)
  await run("artist_events", (q) => q.eq("status", "published").eq("is_public", true), buildFromArtistEvents)

  return counts
}
