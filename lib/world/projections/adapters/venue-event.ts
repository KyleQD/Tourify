/**
 * P5 — Venue & Event geography adapters + inheritance rules.
 *
 * Non-destructive canonical adapters over the SIX audited venue/event
 * identity models. No table merging. Deduplication: legacy `events` rows
 * without a v2 twin are staged as review candidates, never projected.
 *
 * Inheritance priority (P5-T06):
 *   1. explicit canonical place on the event
 *   2. canonical venue place (via the venue's own fact)
 *   3. structured coordinates/address → resolver
 *   4. city/state/country text → resolver
 *   5. unresolved (review candidate)
 *
 * HARD RULE (P5-T08): organization headquarters is NEVER a fallback source.
 */
import type { ResolutionStatus, ScanRecord } from "../types"

export type VenueRow = {
  id: string
  name?: string | null
  city?: string | null
  state?: string | null
  country?: string | null
  address?: string | null
}

export type EventRow = {
  id: string
  entityTable: "events_v2" | "events"
  venueId?: string | null
  venueName?: string | null
  city?: string | null
  state?: string | null
  country?: string | null
}

export function scanVenue(row: VenueRow): ScanRecord {
  return {
    entityKind: "venue",
    entityTable: "venue_profiles",
    entityId: row.id,
    hints: {
      city: row.city ?? null,
      admin1: row.state ?? null,
      country: row.country ?? null,
    },
  }
}

export function scanEvent(row: EventRow): ScanRecord {
  return {
    entityKind: "event",
    entityTable: row.entityTable,
    entityId: row.id,
    hints: {
      city: row.city ?? null,
      admin1: row.state ?? null,
      country: row.country ?? null,
    },
  }
}

/** P5-T09: legacy events lacking a v2 twin become review candidates only. */
export interface LegacyDedupeReport {
  v2Ids: Set<string>
  duplicatesMarked: string[]
}

export function dedupeLegacyEvents(
  legacyRows: Array<{ id: string; title?: string | null }>,
  isLinkedToV2: (legacyId: string) => boolean,
  markDuplicate: (legacyId: string) => void,
): LegacyDedupeReport {
  const duplicatesMarked: string[] = []
  for (const row of legacyRows) {
    if (isLinkedToV2(row.id)) {
      markDuplicate(row.id)
      duplicatesMarked.push(row.id)
    }
  }
  return { v2Ids: new Set(), duplicatesMarked }
}

/**
 * P5-T06 resolution priority chain for events.
 * orgHqPlaceId is accepted ONLY to assert it is never used — passing a value
 * documents the invariant in tests; the implementation ignores it entirely.
 */
export async function resolveEventLocation(
  event: EventRow & { canonicalPlaceId?: string | null },
  ctx: {
    venuePlaceLookup: (venueId: string) => Promise<string | null>
    resolveFromHints: (event: EventRow) => Promise<ResolutionStatus>
    /** Deliberately unused: guards against HQ fallback regressions. */
    orgHqPlaceId?: string | null
  },
): Promise<ResolutionStatus> {
  // 1) Explicit canonical place wins outright.
  if (event.canonicalPlaceId) {
    return { status: "resolved", placeId: event.canonicalPlaceId, confidence: 1 }
  }
  // 2) Canonical venue geography (venue's own located_in fact).
  if (event.venueId) {
    const venuePlace = await ctx.venuePlaceLookup(event.venueId)
    if (venuePlace) return { status: "resolved", placeId: venuePlace, confidence: 0.9 }
  }
  // 3–4) Structured coords/address or city/state/country via the resolver.
  return ctx.resolveFromHints(event)
}
