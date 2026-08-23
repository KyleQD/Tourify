/**
 * P20-T03/T05/T07/T08 — curated Music Journey contract.
 *
 * Journeys are ordered editorial narratives with narration, canonical media
 * identifiers, knowledge-claim references (every factual stop cites a claim
 * or source), and learner completion state. AI-generated drafts stay in
 * review until a human approves them; educator hooks expose citations,
 * vocabulary, further reading, and shareable URLs.
 */

export interface JourneyStop {
  order: number
  placeKey: string
  title: string
  /** Narration text; `origin` marks whether a human approved it. */
  narration: string
  narrationOrigin: "human_approved" | "ai_draft"
  /** Canonical ids — tracks/media assets resolved via playback. */
  mediaIds: string[]
  /** Knowledge claims or sources backing the stop's facts. */
  claimRefs: string[]
}

export interface MusicJourney {
  key: string
  title: string
  summary: string
  stops: JourneyStop[]
  shareUrlPath: string
  educator: {
    citations: string[]
    vocabulary: Array<{ term: string; definition: string }>
    furtherReading: string[]
  }
}

export type JourneyValidation =
  | { ok: true }
  | { ok: false; error: string }

/** Structural validation. AI-drafted narrations must not be publishable. */
export function validateJourney(journey: MusicJourney): JourneyValidation {
  if (!journey.key?.trim() || !journey.title?.trim()) return { ok: false, error: "identity_required" }
  if (!Array.isArray(journey.stops) || journey.stops.length < 2) {
    return { ok: false, error: "journeys_need_two_or_more_stops" }
  }
  const seenOrders = new Set<number>()
  for (const [index, stop] of journey.stops.entries()) {
    if (stop.order !== index) return { ok: false, error: "stop_orders_must_be_sequential_from_zero" }
    if (seenOrders.has(stop.order)) return { ok: false, error: "duplicate_stop_order" }
    seenOrders.add(stop.order)
    if (!stop.placeKey?.trim() || !stop.title?.trim() || !stop.narration?.trim()) {
      return { ok: false, error: "stop_content_required" }
    }
    if (!Array.isArray(stop.claimRefs) || stop.claimRefs.length === 0) {
      return { ok: false, error: "stops_require_claim_refs" }
    }
    for (const media of stop.mediaIds ?? []) {
      if (media.includes("://") || media.includes("//")) {
        return { ok: false, error: "media_ids_canonical_only" }
      }
    }
  }
  if (!Array.isArray(journey.educator.citations) || journey.educator.citations.length === 0) {
    return { ok: false, error: "educator_citations_required" }
  }
  return { ok: true }
}

/** Publication gate (P20-T08): any AI-drafted stop blocks publishing. */
export function publicationReadiness(journey: MusicJourney): { publishable: boolean; blockingStops: number[] } {
  const blocking = journey.stops
    .filter((s) => s.narrationOrigin === "ai_draft")
    .map((s) => s.order)
  return { publishable: blocking.length === 0, blockingStops: blocking }
}

// ─── Completion state (learner-side, private by default) ────────────────

export interface JourneyProgress {
  journeyKey: string
  completedStopOrders: number[]
  startedAt: string | null
  completedAt: string | null
}

export function markStopComplete(progress: JourneyProgress, order: number, nowIso: string): JourneyProgress {
  const completed = new Set(progress.completedStopOrders)
  completed.add(order)
  const allDone = [...completed].sort().join(",") === progress.completedStopOrders.length.toString()
    ? false
    : undefined // computed below against total stops by caller
  void allDone
  return {
    ...progress,
    completedStopOrders: [...completed].sort((a, b) => a - b),
    startedAt: progress.startedAt ?? nowIso,
    completedAt: progress.completedAt,
  }
}

/**
 * Completion check needs the journey's total stop count — explicit param
 * keeps the function pure and testable.
 */
export function isJourneyComplete(progress: JourneyProgress, totalStops: number): boolean {
  return progress.completedStopOrders.length >= totalStops && totalStops > 0
}
