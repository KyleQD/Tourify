/**
 * P22-T08 — search analytics with query minimization.
 *
 * Zero-result and ambiguous-query counters help improve recall, but raw
 * queries can carry sensitive intent. Only normalized intent tokens and
 * coarse outcome buckets are recorded — never the raw string.
 */

export type SearchOutcome = "results" | "zero_results" | "ambiguous_place" | "compound_parsed"

export interface StoredSearchEvent {
  /** Normalized intent tokens (lowercased, deduped) — not the raw query. */
  intentTokens: string[]
  scopePlaceKey: string | null
  requestedKinds: string[]
  resultCountBucket: "0" | "1-5" | "6-20" | "20+"
  outcome: SearchOutcome
  occurredAt: string
}

const FORBIDDEN_KEY_FRAGMENTS = ["ip", "coord", "location", "email", "user_id", "session"]

function bucketFor(count: number): StoredSearchEvent["resultCountBucket"] {
  if (count <= 0) return "0"
  if (count <= 5) return "1-5"
  if (count <= 20) return "6-20"
  return "20+"
}

/**
 * Sanitize a search event down to storable shape. Rejects events carrying
 * hostile keys (same defense as playback telemetry).
 */
export function sanitizeSearchAnalytics(
  input: {
    intentTokens?: unknown
    scopePlaceKey?: unknown
    requestedKinds?: unknown
    resultCount?: unknown
    outcome?: unknown
  },
  nowIso: string,
): StoredSearchEvent | null {
  const outcomes: SearchOutcome[] = ["results", "zero_results", "ambiguous_place", "compound_parsed"]
  const outcome = typeof input.outcome === "string" && outcomes.includes(input.outcome as SearchOutcome)
    ? (input.outcome as SearchOutcome)
    : null
  if (!outcome) return null

  for (const key of Object.keys(input)) {
    if (FORBIDDEN_KEY_FRAGMENTS.some((f) => key.toLowerCase().includes(f))) return null
  }

  const tokens = Array.isArray(input.intentTokens)
    ? [...new Set(
        input.intentTokens
          .filter((t): t is string => typeof t === "string")
          .map((t) => t.toLowerCase().trim())
          .filter((t) => t.length > 1 && t.length <= 40),
      )]
    : null
  if (!tokens || tokens.length === 0 || tokens.length > 12) return null

  const rawCount = input.resultCount
  const count = typeof rawCount === "number" && Number.isFinite(rawCount) && rawCount >= 0
    ? Math.floor(rawCount)
    : null
  if (count === null) return null

  const kinds = Array.isArray(input.requestedKinds)
    ? input.requestedKinds.filter((k): k is string => typeof k === "string").slice(0, 4)
    : []

  const scope = typeof input.scopePlaceKey === "string" &&
    input.scopePlaceKey.length > 0 &&
    !input.scopePlaceKey.includes("://")
    ? input.scopePlaceKey
    : null

  return {
    intentTokens: tokens,
    scopePlaceKey: scope,
    requestedKinds: kinds,
    resultCountBucket: bucketFor(count),
    outcome,
    occurredAt: nowIso,
  }
}
