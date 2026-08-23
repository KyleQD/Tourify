/**
 * P17-T01 — ranking vocabulary (frozen).
 */

export const RANKING_SCOPES = ["city", "region", "country", "global"] as const
export type RankingScope = (typeof RANKING_SCOPES)[number]

export const RANKING_CATEGORIES = ["overall", "genre", "scene", "rising", "live"] as const
export type RankingCategory = (typeof RANKING_CATEGORIES)[number]

export const RANKING_WINDOWS = ["7d", "30d", "90d", "1y", "all_time"] as const
export type RankingWindow = (typeof RANKING_WINDOWS)[number]

/** Signal kinds eligible to feed rankings (subset of the P9 catalog). */
export const RANKABLE_SIGNAL_KINDS = [
  "artist_popularity",
  "track_popularity",
  "genre_popularity",
  "scene_momentum",
  "event_heat",
  "venue_activity",
] as const
export type RankableSignalKind = (typeof RANKABLE_SIGNAL_KINDS)[number]

export function isRankableSignalKind(value: string): value is RankableSignalKind {
  return (RANKABLE_SIGNAL_KINDS as readonly string[]).includes(value)
}
