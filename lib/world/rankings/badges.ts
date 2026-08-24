/**
 * P17-T07/T08/T09 — achievement badges derived from ranking snapshots.
 *
 * Badges are scoped (place/scope), dated (window-bound), and expiring
 * (valid only through their evidence window). Artist-facing explanations
 * describe what was earned and why — never fraud-detection internals.
 */
import type { RankingSnapshot } from "./formula"

export const RANKING_BADGE_DEFINITIONS = [
  "top_100",
  "top_25",
  "top_10",
  "number_one",
  "genre_leader",
  "rising_artist",
  "local_favorite",
  "touring_momentum",
  "festival_favorite",
] as const

export type RankingBadgeKind = (typeof RANKING_BADGE_DEFINITIONS)[number]

export interface BadgeDefinition {
  kind: RankingBadgeKind
  display: string
  /** Snapshot category the badge reads from. */
  category: "overall" | "genre" | "rising" | "live"
  /** Minimum rank required (1 = #1). */
  maxRank: number
}

export const BADGE_DEFINITIONS: Readonly<Record<RankingBadgeKind, BadgeDefinition>> = Object.freeze({
  top_100: { kind: "top_100", display: "Top 100", category: "overall", maxRank: 100 },
  top_25: { kind: "top_25", display: "Top 25", category: "overall", maxRank: 25 },
  top_10: { kind: "top_10", display: "Top 10", category: "overall", maxRank: 10 },
  number_one: { kind: "number_one", display: "#1", category: "overall", maxRank: 1 },
  genre_leader: { kind: "genre_leader", display: "Genre Leader", category: "genre", maxRank: 1 },
  rising_artist: { kind: "rising_artist", display: "Rising Artist", category: "rising", maxRank: 25 },
  local_favorite: { kind: "local_favorite", display: "Local Favorite", category: "overall", maxRank: 50 },
  touring_momentum: { kind: "touring_momentum", display: "Touring Momentum", category: "live", maxRank: 50 },
  festival_favorite: { kind: "festival_favorite", display: "Festival Favorite", category: "live", maxRank: 25 },
})

export interface EarnedBadge {
  badgeKind: RankingBadgeKind
  display: string
  subjectId: string
  scope: string
  scopeKey: string
  /** Badge validity equals its evidence window (dated + expiring). */
  validFrom: string
  validUntil: string
  earnedAt: string
  /** Artist-facing reason. No fraud internals, no raw component math. */
  explanation: string
}

/**
 * Grace period after window close during which the last computed snapshot
 * is still authoritative (recompute jobs replace snapshots, typically well
 * inside this bound). Badges expire once window end + grace has passed.
 */
export const BADGE_WINDOW_GRACE_MS = 48 * 3600_000

/**
 * Evaluate every badge definition against a snapshot for one subject.
 * Expired windows (window end + grace in the past relative to `nowMs`)
 * earn nothing; future-dated snapshots are ignored.
 */
export function evaluateBadges(
  snapshots: readonly RankingSnapshot[],
  subjectId: string,
  nowMs: number,
): EarnedBadge[] {
  const earned: EarnedBadge[] = []
  for (const snapshot of snapshots) {
    if (Date.parse(snapshot.explainability.lastComputedAt) > nowMs) continue // future-dated: ignore
    const entry = snapshot.entries.find((e) => e.subjectId === subjectId)
    if (!entry) continue
    // Expiry: earnable while window end + grace is still current.
    const windowEnd = Date.parse(entry.evidenceWindow.end)
    if (Number.isFinite(windowEnd) && windowEnd + BADGE_WINDOW_GRACE_MS < nowMs) continue

    for (const definition of Object.values(BADGE_DEFINITIONS)) {
      if (snapshot.category !== definition.category && !(definition.kind === "local_favorite" && snapshot.category === "overall")) continue
      if (entry.rank > definition.maxRank) continue
      // Rising/live categories require the matching snapshot category;
      // genre leaders come from per-genre snapshots by construction.
      const explanation = explanationFor(definition, entry.rank, snapshot.scope, snapshot.window)
      earned.push({
        badgeKind: definition.kind,
        display: definition.display,
        subjectId,
        scope: snapshot.scope,
        scopeKey: snapshot.scopeKey,
        validFrom: entry.evidenceWindow.start || snapshot.explainability.lastComputedAt,
        validUntil: entry.evidenceWindow.end || snapshot.explainability.lastComputedAt,
        earnedAt: snapshot.explainability.lastComputedAt,
        explanation,
      })
    }
  }
  return earned.sort((a, b) => a.badgeKind.localeCompare(b.badgeKind))
}

function explanationFor(
  definition: BadgeDefinition,
  rank: number,
  scope: string,
  window: string,
): string {
  const where = `${scope} chart`
  switch (definition.kind) {
    case "number_one":
      return `You reached #1 on the ${where} (${window}).`
    case "genre_leader":
      return `You lead this genre's ${where} for the ${window} window.`
    case "rising_artist":
      return `Listeners are discovering you fast — you placed #${rank} among rising artists (${window}).`
    case "touring_momentum":
      return `Your live activity placed you at #${rank} on the ${where} for ${window}.`
    case "festival_favorite":
      return `Festival and event engagement put you at #${rank} (${window}).`
    default:
      return `You ranked #${rank} on the ${where} for the ${window} window.`
  }
}
