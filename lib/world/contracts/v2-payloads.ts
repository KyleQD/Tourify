/**
 * Versioned World payload contracts (P2-T08).
 *
 * WorldPlaceResponseV2 merges the parity-proven v0.1 draft shape with live
 * Tourify discovery slices (P10+). Viewport payloads, search results,
 * signals, rankings, and editorial candidates are versioned here BEFORE any
 * projector/API implementation lands (freeze-first rule).
 */
import type { EntityKind } from "./v1"

export const WORLD_PLACE_RESPONSE_V2 = "world-place-v2.0"
export const WORLD_VIEWPORT_PAYLOAD_V1 = "world-viewport-v1.0"
export const WORLD_SEARCH_RESULT_V1 = "world-search-v1.0"
export const WORLD_SIGNAL_V1 = "world-signal-v1.0"
export const WORLD_RANKING_V1 = "world-ranking-v1.0"
export const WORLD_EDITORIAL_CANDIDATE_V1 = "world-editorial-candidate-v1.0"

/** Live slice of a place response — merged alongside curated history. */
export interface LiveDiscoverySlice {
  artists: Array<{ id: string; name: string; imageUrl?: string | null }>
  venues: Array<{ id: string; name: string; city?: string | null }>
  events: Array<{
    id: string
    title: string
    startsAt: string
    venueName?: string | null
  }>
  music: Array<{ id: string; title: string; artistName: string }>
}

export interface ProvenanceRef {
  sourceKey: string
  externalId?: string | null
  retrievedAt?: string | null
}

/**
 * V2 keeps every v0.1 section additive and adds `live` + `trust`. Renderers
 * must treat absent sections as "not available" rather than erroring.
 */
export interface WorldPlaceResponseV2 {
  schemaVersion: typeof WORLD_PLACE_RESPONSE_V2
  publicationState: "draft" | "published" | "beta" | "live"
  place: {
    key: string
    canonicalPath: string
    name: string
    countryName: string
    center: { lat: number; lng: number }
  }
  overview: { musicalIdentity: string | null }
  sections: Record<string, { status: string; items?: unknown[] }>
  relationships: unknown[]
  provenance: { sourceRefs: ProvenanceRef[] }
  /** Live Tourify discovery merge (empty until P9/P10 land). */
  live?: LiveDiscoverySlice
  /** Trust metadata: counts that explain coverage without exposing internals. */
  trust?: {
    claimsWithEvidence: number
    totalClaims: number
    sourcesCount: number
  }
}

/** One aggregated marker inside a viewport tile (P13 contract, frozen now). */
export interface ViewportPlaceSummary {
  placeKey: string
  center: { lat: number; lng: number }
  weight: number
  /** Children present only when zoomed past the cluster threshold. */
  children?: Array<{ kind: EntityKind; count: number }>
}

export interface WorldViewportPayload {
  schemaVersion: typeof WORLD_VIEWPORT_PAYLOAD_V1
  zoom: number
  bounds: { north: number; south: number; east: number; west: number }
  places: ViewportPlaceSummary[]
}

export interface WorldSearchResultItem {
  kind: EntityKind
  slug: string
  name: string
  snippet?: string | null
  placeKey?: string | null
}

export interface WorldSearchResult {
  schemaVersion: typeof WORLD_SEARCH_RESULT_V1
  query: string
  items: WorldSearchResultItem[]
}

export interface WorldSignal {
  schemaVersion: typeof WORLD_SIGNAL_V1
  placeKey: string
  signalKind:
    | "plays_total"
    | "plays_recent"
    | "events_upcoming"
    | "releases_recent"
    | "active_artists"
  value: number
  windowStart: string
  windowEnd: string
  /** Aggregate-only: never carries listener identities or coordinates. */
}

export interface WorldRankingEntry {
  rank: number
  subjectKind: EntityKind
  subjectId: string
  subjectName: string
  score: number
  windowStart: string
  windowEnd: string
}

export interface WorldRanking {
  schemaVersion: typeof WORLD_RANKING_V1
  placeKey: string
  rankingKind: string
  entries: WorldRankingEntry[]
}

export interface WorldEditorialCandidate {
  schemaVersion: typeof WORLD_EDITORIAL_CANDIDATE_V1
  candidateId: string
  entityKind: EntityKind
  sourceKey: string
  externalRecordId: string
  matchStatus: "unmatched" | "matched" | "ambiguous" | "new_candidate" | "rejected"
  reviewStatus: "candidate" | "needs_review" | "approved" | "rejected"
}
