import type { GeoMatchMethod } from "./types"

/**
 * Confidence policy (GEO_RESOLVER_CONTRACT_V0_1 section 5).
 * A wrong canonical place is worse than an unresolved string.
 */
export const CONFIDENCE = {
  EXTERNAL_ID: 0.98,
  HIERARCHY_EXACT_WITH_COUNTRY: 0.94,
  HIERARCHY_EXACT_WITHOUT_COUNTRY: 0.9,
  ALIAS_EXACT_STRONG_CONTEXT: 0.88,
  COORDINATES_VALIDATED: 0.82,
  TEXT_EXACT: 0.7,
  FUZZY_CANDIDATE_CAP: 0.84,
} as const

export const ACCEPT_FLOOR = 0.8
export const REVIEW_CEILING = 0.84
export const UNRESOLVED_FLOOR = 0.65

/**
 * Persistence requires review for anything below the accept floor, and
 * fuzzy/text candidates are never persisted automatically regardless of
 * score. Place-match confidence is not cultural-fact confidence; ingestion
 * callers must apply their own cultural review rules on top of this.
 */
export function needsReview(confidence: number, matchMethod: GeoMatchMethod): boolean {
  if (matchMethod === "fuzzy_candidate") return true
  if (matchMethod === "text_exact") return true
  if (matchMethod === "unresolved") return true
  return confidence < ACCEPT_FLOOR || confidence > 1
}
