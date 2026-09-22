/**
 * lib/events/event-matcher.ts
 *
 * Canonical identity matching (Phase 5 core).
 *
 * Confidence ladder:
 *   1. Exact source identity — handled by the ingest path before this runs.
 *   2. Deterministic high-confidence: same normalized title + same start
 *      day + same venue (normalized) or same geo cell.
 *   3. Fuzzy candidates are emitted for review, never auto-merged.
 *
 * Never auto-merge (returns a review candidate instead):
 *   - multiple same-day performances at the venue (matinee/evening)
 *   - festival passes vs single-day events
 *   - livestream vs in-person variants
 *   - different venues
 */

import "server-only"

import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { normalizeTitleKey } from "./providers/schemas"
import type { NormalizedExternalEvent } from "./types"

export const AUTO_MERGE_THRESHOLD = 0.92
export const REVIEW_THRESHOLD = 0.6

export interface MatchResult {
  eventId: string | null
  confidence: number
  reasons: string[]
  /** True when a likely duplicate exists but must go to human review. */
  needsReview: boolean
  reviewCandidateEventId?: string | null
}

function normalizeVenueKey(name: string | null | undefined): string {
  return normalizeTitleKey(name ?? "").replace(/\b(the|at|in|of)\b/g, "").replace(/\s+/g, " ").trim()
}

export function scoreMatch(
  incoming: { normalizedTitle: string; localDate: string | null; venueName: string | null; startTime: string | null },
  candidate: { normalizedTitle: string; eventDate: string | null; venueName: string | null; startTime: string | null },
): { confidence: number; reasons: string[] } {
  let confidence = 0
  const reasons: string[] = []

  if (incoming.normalizedTitle && incoming.normalizedTitle === candidate.normalizedTitle) {
    confidence += 0.5
    reasons.push("exact_normalized_title")
  }
  if (incoming.localDate && candidate.eventDate && incoming.localDate === candidate.eventDate) {
    confidence += 0.25
    reasons.push("same_local_date")
  }
  const inVenue = normalizeVenueKey(incoming.venueName)
  const candVenue = normalizeVenueKey(candidate.venueName)
  if (inVenue && candVenue && inVenue === candVenue) {
    confidence += 0.2
    reasons.push("same_venue")
  }
  if (incoming.startTime && candidate.startTime && incoming.startTime.slice(0, 5) === candidate.startTime.slice(0, 5)) {
    confidence += 0.05
    reasons.push("same_start_time")
  }

  return { confidence, reasons }
}

/** Disqualifiers that forbid auto-merge regardless of score. */
export function hasMergeDisqualifier(
  incoming: { normalizedTitle: string; startTime: string | null },
  candidate: { normalizedTitle: string; startTime: string | null },
  sameVenue: boolean,
): string | null {
  if (!sameVenue) return "different_venues"
  const festival = /festival|pass|weekend/i
  if (festival.test(incoming.normalizedTitle) !== festival.test(candidate.normalizedTitle)) {
    return "festival_vs_single_day"
  }
  const livestream = /livestream|live stream|virtual|online/i
  if (livestream.test(incoming.normalizedTitle) !== livestream.test(candidate.normalizedTitle)) {
    return "livestream_vs_in_person"
  }
  if (incoming.startTime && candidate.startTime && incoming.startTime.slice(0, 5) !== candidate.startTime.slice(0, 5)) {
    return "possible_matinee_evening_split"
  }
  return null
}

/**
 * Match an incoming normalized event against canonical rows.
 * Returns the best auto-match above threshold, or flags a review candidate.
 */
export async function matchCanonicalEvent(event: NormalizedExternalEvent): Promise<MatchResult> {
  const client = createServiceRoleClient()
  const eventDate = event.localDate ?? event.startAt?.slice(0, 10) ?? null
  if (!eventDate) return { eventId: null, confidence: 0, reasons: ["no_date"], needsReview: false }

  // Candidate pool: same-day published events with the same normalized title.
  const { data: candidates } = await client
    .from("events")
    .select("id, name, title, event_date, start_time, venue_name")
    .eq("event_date", eventDate)
    .in("status", ["published", "cancelled"])
    .limit(200)

  const incomingTitle = event.normalizedTitle
  let best: { id: string; confidence: number; reasons: string[]; disqualified: string | null } | null = null

  for (const row of candidates ?? []) {
    const candidateTitle = normalizeTitleKey((row.name || row.title || "") as string)
    if (candidateTitle !== incomingTitle) continue

    const { confidence, reasons } = scoreMatch(
      {
        normalizedTitle: incomingTitle,
        localDate: eventDate,
        venueName: event.venue?.name ?? null,
        startTime: event.localTime ?? event.startAt?.slice(11, 19) ?? null,
      },
      {
        normalizedTitle: candidateTitle,
        eventDate: row.event_date as string,
        venueName: (row.venue_name as string) ?? null,
        startTime: (row.start_time as string) ?? null,
      },
    )

    const sameVenue =
      normalizeVenueKey(event.venue?.name) !== "" &&
      normalizeVenueKey(event.venue?.name) === normalizeVenueKey(row.venue_name as string)
    const disqualified = hasMergeDisqualifier(
      {
        normalizedTitle: incomingTitle,
        startTime: event.localTime ?? event.startAt?.slice(11, 19) ?? null,
      },
      { normalizedTitle: candidateTitle, startTime: (row.start_time as string) ?? null },
      sameVenue,
    )

    if (!best || confidence > best.confidence) {
      best = { id: row.id as string, confidence, reasons, disqualified }
    }
  }

  if (!best) return { eventId: null, confidence: 0, reasons: [], needsReview: false }

  if (best.disqualified) {
    return {
      eventId: null,
      confidence: best.confidence,
      reasons: [...best.reasons, `disqualified:${best.disqualified}`],
      needsReview: best.confidence >= REVIEW_THRESHOLD,
      reviewCandidateEventId: best.id,
    }
  }

  if (best.confidence >= AUTO_MERGE_THRESHOLD) {
    return { eventId: best.id, confidence: best.confidence, reasons: best.reasons, needsReview: false }
  }
  if (best.confidence >= REVIEW_THRESHOLD) {
    return {
      eventId: null,
      confidence: best.confidence,
      reasons: best.reasons,
      needsReview: true,
      reviewCandidateEventId: best.id,
    }
  }
  return { eventId: null, confidence: best.confidence, reasons: best.reasons, needsReview: false }
}
