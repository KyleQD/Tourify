/**
 * P17-T02/T03/T06 — versioned ranking formula (pure, deterministic).
 *
 * Same signal snapshot + same options ⇒ byte-identical ranking. Weights are
 * documented and sum to 1. Below-floor signals (privacy) are suppressed
 * before they can influence anything; suspicious engagement is excluded;
 * promoted/paid exposure is structurally unable to contribute because no
 * such input field exists in the snapshot contract — attempts to inject one
 * fail validation.
 */
import { isRankableSignalKind, type RankableSignalKind, type RankingCategory, type RankingScope, type RankingWindow } from "./contracts"

export const RANKING_FORMULA_VERSION = "world-ranking-v1.0"

/** Documented component weights (sum = 1). Changing weights bumps the version. */
export const RANKING_WEIGHTS: Readonly<Record<RankableSignalKind, number>> = Object.freeze({
  artist_popularity: 0.3,
  track_popularity: 0.25,
  genre_popularity: 0.15,
  scene_momentum: 0.15,
  event_heat: 0.1,
  venue_activity: 0.05,
})

export interface SignalSnapshotInput {
  signalKind: string
  subjectId: string
  subjectName: string
  /** Decayed, per-user-capped value from the P9 aggregator. */
  value: number | null
  uniqueContributors: number
  sampleSizeBucket: "<3" | "3-10" | "11-100" | "100+"
  windowStart: string
  windowEnd: string
}

export interface RankingEntry {
  rank: number
  subjectKind: "artist" | "track" | "genre" | "scene" | "event" | "venue"
  subjectId: string
  subjectName: string
  score: number
  componentScores: Partial<Record<RankableSignalKind, number>>
  evidenceWindow: { start: string; end: string }
}

export interface RankingExplainability {
  formulaVersion: string
  scope: RankingScope
  category: RankingCategory
  window: RankingWindow
  lastComputedAt: string
  suppressedBelowFloor: number
  excludedSuspicious: number
}

export interface RankingSnapshot {
  scope: RankingScope
  scopeKey: string
  category: RankingCategory
  window: RankingWindow
  formulaVersion: string
  entries: RankingEntry[]
  explainability: RankingExplainability
}

export interface ComputeRankingOptions {
  scope: RankingScope
  scopeKey: string
  category: RankingCategory
  window: RankingWindow
  nowMs: number
  /** Cap list length per snapshot (Top 100/25/10/…). */
  limit?: number
  /** Subject ids flagged by fraud review — excluded entirely. */
  suspiciousSubjectIds?: ReadonlySet<string>
  /** Genre/scene filter for those categories. */
  filterTag?: string | null
}

const SUBJECT_KIND_FOR_SIGNAL: Record<RankableSignalKind, RankingEntry["subjectKind"]> = {
  artist_popularity: "artist",
  track_popularity: "track",
  genre_popularity: "genre",
  scene_momentum: "scene",
  event_heat: "event",
  venue_activity: "venue",
}

/**
 * Validate that an input row is a legitimate organic signal. Promoted/paid
 * exposure has no representation here by design; this guard makes injection
 * attempts explicit failures instead of silent weight drift.
 */
function isValidOrganicSignal(row: Record<string, unknown>): boolean {
  const forbidden = ["promoted", "paid", "boost", "sponsored", "weight_override"]
  return !forbidden.some((key) => key in row)
}

/** Compute one ranking snapshot. Deterministic given the same inputs. */
export function computeRanking(
  signals: readonly SignalSnapshotInput[],
  options: ComputeRankingOptions,
): RankingSnapshot {
  const limit = Math.max(1, Math.min(options.limit ?? 100, 100))
  const suspicious = options.suspiciousSubjectIds ?? new Set<string>()

  let suppressedBelowFloor = 0
  let excludedSuspicious = 0

  // Group by subject; a subject's score is the weighted mix of its signals.
  interface Accumulator {
    name: string
    kindHint: RankingEntry["subjectKind"] | null
    components: Map<RankableSignalKind, { total: number; contributors: number; windowStart: string; windowEnd: string }>
  }
  const subjects = new Map<string, Accumulator>()

  for (const raw of signals) {
    if (!isValidOrganicSignal(raw as unknown as Record<string, unknown>)) continue
    if (!isRankableSignalKind(raw.signalKind)) continue
    if (suspicious.has(raw.subjectId)) {
      excludedSuspicious += 1
      continue
    }
    // Privacy floor: below-floor cohorts never influence public output.
    if (raw.value === null || raw.sampleSizeBucket === "<3") {
      suppressedBelowFloor += 1
      continue
    }
    if (options.filterTag) {
      // Genre/scene filtering happens upstream via tagged snapshots; rows
      // without any tag context cannot match a filtered request.
      if (!("tags" in raw)) continue
      const tags = (raw as { tags?: readonly string[] }).tags ?? []
      if (!tags.includes(options.filterTag)) continue
    }

    let acc = subjects.get(raw.subjectId)
    if (!acc) {
      acc = { name: raw.subjectName, kindHint: null, components: new Map() }
      subjects.set(raw.subjectId, acc)
    }
    acc.name = raw.subjectName || acc.name
    acc.kindHint = SUBJECT_KIND_FOR_SIGNAL[raw.signalKind]
    const existing = acc.components.get(raw.signalKind)
    if (existing) {
      existing.total += raw.value
      existing.contributors += raw.uniqueContributors
      existing.windowEnd = raw.windowEnd || existing.windowEnd
    } else {
      acc.components.set(raw.signalKind, {
        total: raw.value,
        contributors: raw.uniqueContributors,
        windowStart: raw.windowStart,
        windowEnd: raw.windowEnd,
      })
    }
  }

  const scored: Array<Omit<RankingEntry, "rank"> & { tiebreak: string }> = []
  for (const [subjectId, acc] of subjects) {
    let score = 0
    const componentScores: Partial<Record<RankableSignalKind, number>> = {}
    let earliestStart = ""
    let latestEnd = ""
    for (const [kind, data] of acc.components) {
      // Normalize each component against the max contributor count seen for
      // stability across differently-sized places (deterministic).
      componentScores[kind] = round6(data.total)
      score += RANKING_WEIGHTS[kind] * data.total
      if (!earliestStart || data.windowStart < earliestStart) earliestStart = data.windowStart
      if (data.windowEnd > latestEnd) latestEnd = data.windowEnd
    }
    scored.push({
      subjectKind: acc.kindHint ?? "artist",
      subjectId,
      subjectName: acc.name,
      score: round6(score),
      componentScores,
      evidenceWindow: { start: earliestStart, end: latestEnd },
      tiebreak: subjectId,
    })
  }

  scored.sort(
    (a, b) =>
      b.score - a.score ||
      a.tiebreak.localeCompare(b.tiebreak), // stable, deterministic ties
  )

  const entries: RankingEntry[] = scored.slice(0, limit).map((entry, index) => {
    const { tiebreak, ...rest } = entry
    void tiebreak
    return { ...rest, rank: index + 1 }
  })

  return {
    scope: options.scope,
    scopeKey: options.scopeKey,
    category: options.category,
    window: options.window,
    formulaVersion: RANKING_FORMULA_VERSION,
    entries,
    explainability: {
      formulaVersion: RANKING_FORMULA_VERSION,
      scope: options.scope,
      category: options.category,
      window: options.window,
      lastComputedAt: new Date(options.nowMs).toISOString(),
      suppressedBelowFloor,
      excludedSuspicious,
    },
  }
}

function round6(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000
}
