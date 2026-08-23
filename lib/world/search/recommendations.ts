/**
 * P22-T06/T07 — recommendation primitives.
 *
 * Recommendations derive ONLY from explicit signals: the user's follows and
 * their recorded (explicit) exploration. No sensitive-location inference,
 * no passive-browsing profiling. Every recommendation carries a plain
 * "Because you…" explanation.
 */

export interface RecommendationCandidate {
  key: string
  kind: "place" | "genre" | "scene" | "journey"
  name: string
  /** Similarity tags shared with the user's known interests. */
  sharedTags: string[]
}

export interface Recommendation {
  candidate: RecommendationCandidate
  score: number
  explanation: string
}

export interface RecommendationInputs {
  followedKeys: readonly string[]
  exploredPlaceKeys: readonly string[]
  completedJourneyKeys: readonly string[]
  /** Interest tags derived from the user's own objects (follow names, etc.). */
  interestTags?: readonly string[]
}

/**
 * Rank candidates. Scoring: each shared tag with known interests adds 10;
 * explicit follows add 25; exploration adds 15; already-known keys are
 * excluded. Deterministic with id tiebreak.
 */
export function recommend(
  inputs: RecommendationInputs,
  candidates: readonly RecommendationCandidate[],
  limit = 6,
): Recommendation[] {
  const known = new Set<string>([
    ...inputs.followedKeys,
    ...inputs.exploredPlaceKeys,
    ...inputs.completedJourneyKeys,
  ])

  // Interest pool: user-supplied tags plus tags of objects they already know.
  const interestTags = new Set<string>()
  for (const tag of inputs.interestTags ?? []) interestTags.add(tag.toLowerCase())
  for (const candidate of candidates) {
    if (!known.has(candidate.key)) continue
    for (const tag of candidate.sharedTags) interestTags.add(tag.toLowerCase())
  }

  const scored = candidates
    .filter((candidate) => !known.has(candidate.key))
    .map((candidate) => {
      const shared = candidate.sharedTags.filter((t) => interestTags.has(t.toLowerCase()))
      let score = shared.length * 10
      const viaFollow = inputs.followedKeys.some((k) =>
        candidate.sharedTags.some((t) => k.includes(t.toLowerCase())),
      )
      if (viaFollow) score += 25
      const viaExploration = inputs.exploredPlaceKeys.length > 0 && shared.length > 0
      if (viaExploration) score += 15
      return { candidate, score, shared }
    })
    .filter((r) => r.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.shared.length - a.shared.length ||
        a.candidate.key.localeCompare(b.candidate.key),
    )
    .slice(0, limit)

  return scored.map(({ candidate, score, shared }) => ({
    candidate,
    score,
    explanation:
      shared.length > 0
        ? `Because you explored ${shared.slice(0, 2).join(" and ")}.`
        : "Because of your World follows.",
  }))
}
