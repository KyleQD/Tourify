/**
 * P9-T01/T02 — World signal catalog. FROZEN.
 *
 * Windows: six defined, three exposed initially (7d/30d/1y/all-time).
 * Kinds: nine frozen signal types with explicit input sources.
 *
 * PRIVACY STRUCTURAL GUARANTEE (P9-T04): RawActivityEvent deliberately has
 * NO fields for IP addresses or precise listener coordinates. There is no
 * way to aggregate what the type cannot carry.
 */

export const SIGNAL_WINDOWS = ["24h", "7d", "30d", "90d", "1y", "all_time"] as const
export type SignalWindow = (typeof SIGNAL_WINDOWS)[number]

/** Publicly exposed windows until rollout phases authorize more. */
export const EXPOSED_WINDOWS: readonly SignalWindow[] = ["7d", "30d", "1y", "all_time"]

export const WINDOW_MS: Record<SignalWindow, number | null> = {
  "24h": 24 * 3600_000,
  "7d": 7 * 24 * 3600_000,
  "30d": 30 * 24 * 3600_000,
  "90d": 90 * 24 * 3600_000,
  "1y": 365 * 24 * 3600_000,
  all_time: null,
}

export const SIGNAL_KINDS = [
  "artist_popularity",
  "track_popularity",
  "genre_popularity",
  "scene_momentum",
  "event_heat",
  "venue_activity",
  "news_velocity",
  "radio_activity",
  "tourify_activity",
] as const

export type SignalKind = (typeof SIGNAL_KINDS)[number]

/**
 * Coarse location key used for grouping. Deliberately NOT a coordinate —
 * it is a pre-aggregated place bucket (e.g. a geo_places.id or a
 * geohash-of-precision-4 string). The projector resolves entity→place; this
 * module never sees raw lat/lng.
 */
export interface RawActivityEvent {
  /** Stable anonymous contributor id (hashed upstream, never an email/IP). */
  contributorHash: string
  occurredAt: string // ISO timestamp
  /** Coarse geographic bucket resolved by the projector layer. */
  placeBucket: string
  signalKind: SignalKind
  /** Optional engagement weight (e.g. play vs save vs share). */
  weight?: number
}

// ─── P9-T03 privacy thresholds ───────────────────────────────────────────

export const PRIVACY_FLOOR = {
  /** Minimum unique contributors before any public aggregate is exposed. */
  minUniqueContributors: 3,
  /** Max contribution per unique user within a window (anti-manipulation). */
  maxEventsPerContributor: 5,
} as const

/** Sample-size bucket for explainability (never the exact count). */
export function sampleSizeBucket(uniqueContributors: number): "<3" | "3-10" | "11-100" | "100+" {
  if (uniqueContributors < 3) return "<3"
  if (uniqueContributors <= 10) return "3-10"
  if (uniqueContributors <= 100) return "11-100"
  return "100+"
}

// ─── P9-T05 decay ────────────────────────────────────────────────────────

/** Exponential decay with configurable half-life (ms). */
export function timeDecay(occurredAtMs: number, nowMs: number, halfLifeMs: number): number {
  const age = Math.max(0, nowMs - occurredAtMs)
  return Math.pow(0.5, age / halfLifeMs)
}
