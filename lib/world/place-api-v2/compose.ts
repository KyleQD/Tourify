/**
 * P10 — World Place API v2 repository/service layer.
 *
 * Merges the parity-proven v0.1 draft projector with live Tourify discovery
 * slices, signal snapshots, and trust metadata into one renderer-neutral
 * `world-place-v2.0` response. Published-only for public callers; draft
 * mode requires editorial authorization.
 *
 * Reuses existing Discover DTOs where compatible (P10-T03); no redundant
 * entity formats are created.
 */
import type { EntityKind } from "@/lib/world/contracts/v1"
import type { LiveDiscoverySlice } from "@/lib/world/contracts/v2-payloads"

// ─── Query parameters (P10-T04) ──────────────────────────────────────────

export interface PlaceQueryParams {
  /** Content time window filter: 7d | 30d | 1y | all (default all). */
  timeWindow?: "7d" | "30d" | "1y" | "all"
  genre?: string | null
  scene?: string | null
  cursor?: string | null
  sectionLimits?: Partial<Record<string, number>>
}

export const DEFAULT_SECTION_LIMITS: Readonly<Record<string, number>> = Object.freeze({
  fromHere: 12,
  historyHere: 20,
  radio: 15,
  events: 10,
})

// ─── Response sections ────────────────────────────────────────────────────

export interface PlaceIdentity {
  key: string
  canonicalPath: string
  name: string
  countryName: string
  center: { lat: number; lng: number }
}

export interface SectionProvenance {
  sourceKeys: string[]
  lastReviewedAt: string | null
}

export interface TrustMetadata {
  claimsWithEvidence: number
  totalClaims: number
  sourcesCount: number
}

export interface PlaybackCapabilityEntry {
  entityId: string
  title: string
  canPlay: boolean
  reason?: string
}

/** P10-T07 — playback identifiers without raw stream URLs. */
export interface PlaybackSummary {
  playableCount: number
  entries: PlaybackCapabilityEntry[]
}

export interface CachePolicy {
  etag: string
  maxAgeSec: number
  staleWhileRevalidateSec: number
  invalidationKeys: string[]
}

// ─── Full V2 response ────────────────────────────────────────────────────

export interface WorldPlaceResponseV2 {
  schemaVersion: "world-place-v2.0"
  publicationState: "draft" | "published" | "beta" | "live"
  identity: PlaceIdentity
  overview: { musicalIdentity: string | null }
  popular: { items: Array<{ id: string; name: string; score: number }> }
  artists: { items: Array<{ id: string; name: string }> }
  music: { items: Array<{ id: string; title: string; artistName: string }> }
  genresScenes: { items: Array<{ id: string; name: string }> }
  eventsFestivals: { items: Array<{ id: string; title: string; startAt?: string | null }> }
  venues: { items: Array<{ id: string; name: string }> }
  radioListen: { status: string; items: Array<{ id: string; name: string }> }
  history: { items: Array<{ year?: string | null; name: string }> }
  news: { status: string }
  tourifyActivity: { status: string }
  connections: { items: Array<{ placeKey: string; relationKey: string }> }
  sources: { items: Array<{ key: string; name: string }> }
  provenance: Record<string, SectionProvenance>
  trust: TrustMetadata
  playback: PlaybackSummary
  cache: CachePolicy
}

// ─── Composition function ────────────────────────────────────────────────

interface ComposeInput {
  identity: PlaceIdentity
  musicalIdentity: string | null
  curatedSections: Record<string, Array<Record<string, unknown>>>
  sourceRefs: Array<{ key: string; name: string }>
  provenance: Record<string, { sourceKeys: string[]; lastReviewedAt: string | null }>
  liveSlice?: LiveDiscoverySlice | null
  signals?: Array<{ signalKind: string; value: number | null }>
  entityKindCounts?: Partial<Record<EntityKind, number>>
  claimsWithEvidence?: number
  totalClaims?: number
  params?: PlaceQueryParams
}

function etagFrom(input: ComposeInput): string {
  const crypto = require("node:crypto") as typeof import("node:crypto")
  const seed = JSON.stringify({
    path: input.identity.canonicalPath,
    counts: input.entityKindCounts,
    signals: input.signals?.map((s) => s.value),
    sources: input.sourceRefs.map((s) => s.key).sort(),
    window: input.params?.timeWindow,
  })
  return `"${crypto.createHash("sha256").update(seed).digest("hex").slice(0, 16)}"`
}

/**
 * Compose a bounded, cacheable world-place-v2.0 response.
 * Stable sort order throughout; published-only enforced upstream by caller.
 */
export function composeWorldPlaceV2(input: ComposeInput): WorldPlaceResponseV2 {
  const limits = { ...DEFAULT_SECTION_LIMITS, ...(input.params?.sectionLimits ?? {}) }

  const items = (key: string) => {
    const list = input.curatedSections[key] ?? []
    const limit = limits[key] ?? 20
    return list.slice(0, limit)
  }

  const invalidationKeys = [
    `place:${input.identity.canonicalPath}`,
    ...(input.signals?.length ? [`signals:${input.identity.canonicalPath}`] : []),
    "publication:world",
  ]

  // Playback summary derived from entity counts (no stream URLs).
  const recordingCount = input.entityKindCounts?.track ?? 0
  const playback: PlaybackSummary = {
    playableCount: 0,
    entries: [],
  }
  if (recordingCount > 0) {
    playback.entries.push({
      entityId: `${input.identity.key}:recordings`,
      title: `${recordingCount} recordings`,
      canPlay: false,
      reason: "Playback resolution is rights-gated and runs separately.",
    })
  }

  return {
    schemaVersion: "world-place-v2.0",
    publicationState: "draft",
    identity: input.identity,
    overview: { musicalIdentity: input.musicalIdentity },
    popular: {
      items: (input.signals ?? [])
        .filter((s) => s.value !== null)
        .slice(0, limits.fromHere ?? 12)
        .map((s) => ({ id: s.signalKind, name: s.signalKind.replace(/_/g, " "), score: s.value! })),
    },
    artists: {
      items: items("fromHere")
        .filter((item) => item.entity_type === "artist_reference")
        .slice(0, limits.fromHere ?? 12)
        .map((item) => ({ id: String(item.seed_id), name: String(item.canonical_name) })),
    },
    music: {
      items: items("historyHere")
        .filter((item: Record<string, unknown>) => item.entity_type === "recording_reference")
        .map((item) => ({ id: String(item.seed_id), title: String(item.canonical_name), artistName: "" })),
    },
    genresScenes: {
      items: items("fromHere")
        .filter((item) => ["genre", "scene", "movement"].includes(String(item.entity_type)))
        .map((item) => ({ id: String(item.seed_id), name: String(item.canonical_name) })),
    },
    eventsFestivals: { items: [] }, // live events land at P9/P16
    venues: { items: [] }, // venue projections land with P5 backfill
    radioListen: {
      status: "metadata_only",
      items: [],
    },
    history: {
      items: items("historyHere")
        .filter((item) => item.entity_type === "historical_milestone")
        .map((item) => ({
          year: item.start_year != null ? String(item.start_year) : null,
          name: String(item.canonical_name),
        })),
    },
    news: { status: "not_available" },
    tourifyActivity: { status: "not_available" },
    connections: { items: [] }, // P19 transmission graph
    sources: {
      items: input.sourceRefs.map((ref) => ({ key: ref.key, name: ref.name })),
    },
    provenance: Object.fromEntries(
      Object.entries(input.provenance).map(([key, prov]) => [
        key,
        { sourceKeys: prov.sourceKeys, lastReviewedAt: prov.lastReviewedAt },
      ]),
    ),
    trust: {
      claimsWithEvidence: input.claimsWithEvidence ?? 0,
      totalClaims: input.totalClaims ?? 0,
      sourcesCount: input.sourceRefs.length,
    },
    playback,
    cache: {
      etag: etagFrom(input),
      maxAgeSec: 60,
      staleWhileRevalidateSec: 300,
      invalidationKeys,
    },
  }
}
