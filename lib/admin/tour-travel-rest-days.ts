/**
 * ROUTE-306 — Travel/rest-day generation (pure).
 *
 * Generates suggested travel and rest-day stops between consecutive tour stops
 * when the route constraint engine detects problems (insufficient travel time,
 * excessive drive, missing rest). Suggestions are purely advisory — adoption
 * is always explicit and creates new versioned stops with correct ordinals.
 *
 * Contract:
 *  - Suggestions are derived from constraint violations (ROUTE-304 output).
 *  - Each suggestion has a stable suggestion_id, type, placement, and reason.
 *  - Adoption inserts the new stop into the stop list at the correct ordinal
 *    and reassigns all subsequent ordinals (using ROUTE-301 ordinal helpers).
 *  - Adoption is idempotent on suggestion_id (duplicate adopt → no-op).
 *  - No stop is created without explicit adopt command.
 *
 * Pure: no I/O, no `server-only`.
 */

import { assignContiguousOrdinals } from "@/lib/admin/tour-stop-ordinals"
import type { RouteConstraintViolation } from "@/lib/admin/tour-route-constraints"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TravelRestDayType = "travel" | "rest"

export interface TravelRestDaySuggestion {
  /** Stable id derived from the constraint violation and placement. */
  suggestion_id: string
  type: TravelRestDayType
  /** Name proposed for the stop. */
  proposed_name: string
  /**
   * Insert AFTER this stop id.
   * null means insert at the beginning of the list.
   */
  insert_after_stop_id: string | null
  /**
   * Ordinal the new stop would take if adopted.
   * Subsequent stops shift up.
   */
  proposed_ordinal: number
  /** Constraint violation code(s) that motivated this suggestion. */
  source_violation_codes: string[]
  /** Human-readable reason for the suggestion. */
  reason: string
  /** Estimated date for the travel/rest day (YYYY-MM-DD), if derivable. */
  suggested_date?: string | null
}

export interface TravelRestDayAdoptInput {
  /** The suggestion being adopted. */
  suggestion: TravelRestDaySuggestion
  /** All current active stops (before adoption). */
  currentStops: Array<{ id: string; ordinal: number; name: string; stop_type?: string | null }>
  /** Set of already-adopted suggestion_ids (for idempotency). */
  adoptedIds: Set<string>
  /** Actor performing the adoption (for audit). */
  actorUserId: string
}

export interface TravelRestDayAdoptResult {
  /** True when a new stop was inserted; false when already adopted. */
  inserted: boolean
  /** The new stop record to persist (id is null — not yet in DB). */
  newStop: {
    id: null
    name: string
    stop_type: TravelRestDayType
    ordinal: number
    source: "plan_write"
    adopted_from_suggestion_id: string
    created_by: string
  } | null
  /** Full reordered stop list with updated ordinals. */
  reorderedStops: Array<{ id: string; ordinal: number; name: string; stop_type?: string | null }>
}

// ---------------------------------------------------------------------------
// Suggestion generation
// ---------------------------------------------------------------------------

/**
 * Generate travel/rest-day suggestions from a set of constraint violations.
 *
 * One suggestion is produced per qualifying violation pair (fromStop, toStop):
 *  - insufficient_travel  → suggest a "travel" day between the two stops
 *  - insufficient_rest    → suggest a "rest" day at the rest stop
 *  - excessive_drive      → suggest a "travel" day to break the leg
 *  - impossible_arrival   → suggest a "travel" day before the destination
 *
 * Suggestions are deduplicated: only one suggestion per (insert_after_stop_id).
 */
export function generateTravelRestDaySuggestions(args: {
  violations: RouteConstraintViolation[]
  stops: Array<{ id: string; ordinal: number; name: string; stop_type?: string | null }>
}): TravelRestDaySuggestion[] {
  const orderedStops = [...args.stops].sort((a, b) => a.ordinal - b.ordinal)
  const stopById = new Map(orderedStops.map((s) => [s.id, s]))

  const suggestions: TravelRestDaySuggestion[] = []
  const seenInsertAfter = new Set<string | null>()

  for (const v of args.violations) {
    if (
      v.code !== "insufficient_travel" &&
      v.code !== "insufficient_rest" &&
      v.code !== "excessive_drive" &&
      v.code !== "impossible_arrival"
    ) {
      continue
    }

    const fromStop = v.fromStopId ? stopById.get(v.fromStopId) : null
    const type: TravelRestDayType = v.code === "insufficient_rest" ? "rest" : "travel"
    const insertAfterId = fromStop?.id ?? null
    const dedupeKey = insertAfterId ?? "__start__"

    if (seenInsertAfter.has(dedupeKey)) continue
    seenInsertAfter.add(dedupeKey)

    // Compute the proposed ordinal: one slot after fromStop
    const fromOrdinal = fromStop?.ordinal ?? -1
    const proposedOrdinal = fromOrdinal + 1

    const fromName = fromStop?.name ?? "start"
    const toStop = v.toStopId ? stopById.get(v.toStopId) : null
    const toName = toStop?.name ?? "next stop"

    const suggestion_id = `suggest:${type}:${dedupeKey}:${v.code}`

    suggestions.push({
      suggestion_id,
      type,
      proposed_name: type === "travel" ? `Travel: ${fromName} → ${toName}` : `Rest Day (${fromName})`,
      insert_after_stop_id: insertAfterId,
      proposed_ordinal: proposedOrdinal,
      source_violation_codes: [v.code],
      reason: v.message,
      suggested_date: null, // Date derivation requires ROUTE-303 helpers + stop times
    })
  }

  return suggestions
}

// ---------------------------------------------------------------------------
// Adoption (explicit, versioned)
// ---------------------------------------------------------------------------

/**
 * Adopt a travel/rest-day suggestion: insert a new stop at the proposed ordinal
 * and reassign all subsequent stop ordinals to be contiguous.
 *
 * Idempotent: if the suggestion_id is already in adoptedIds, returns
 * `{ inserted: false, newStop: null, reorderedStops: currentStops (re-numbered) }`.
 */
export function adoptTravelRestDaySuggestion(
  input: TravelRestDayAdoptInput,
): TravelRestDayAdoptResult {
  if (input.adoptedIds.has(input.suggestion.suggestion_id)) {
    // Already adopted — return current stops with stable ordinals (no change)
    return {
      inserted: false,
      newStop: null,
      reorderedStops: assignContiguousOrdinals(
        [...input.currentStops].sort((a, b) => a.ordinal - b.ordinal),
      ),
    }
  }

  const sorted = [...input.currentStops].sort((a, b) => a.ordinal - b.ordinal)

  // Find the insertion index
  let insertIndex = sorted.length // default: append
  if (input.suggestion.insert_after_stop_id !== null) {
    const afterIdx = sorted.findIndex((s) => s.id === input.suggestion.insert_after_stop_id)
    if (afterIdx >= 0) insertIndex = afterIdx + 1
  } else {
    insertIndex = 0 // prepend
  }

  // Build the new stop placeholder (id is null — caller must persist and get a real id)
  const newStop = {
    id: null as null,
    name: input.suggestion.proposed_name,
    stop_type: input.suggestion.type,
    ordinal: 0, // will be reassigned by assignContiguousOrdinals
    source: "plan_write" as const,
    adopted_from_suggestion_id: input.suggestion.suggestion_id,
    created_by: input.actorUserId,
  }

  // Insert into the list and reassign ordinals
  const insertable = { id: `__new__:${input.suggestion.suggestion_id}`, ordinal: 0, name: newStop.name, stop_type: newStop.stop_type }
  sorted.splice(insertIndex, 0, insertable)
  const reordered = assignContiguousOrdinals(sorted)

  // Find the final ordinal assigned to the new stop
  const newOrdinal = reordered.find((s) => s.id === insertable.id)?.ordinal ?? insertIndex
  newStop.ordinal = newOrdinal

  return {
    inserted: true,
    newStop,
    reorderedStops: reordered.map((s) => ({
      ...s,
      id: s.id === insertable.id ? `__new__:${input.suggestion.suggestion_id}` : s.id,
    })),
  }
}

// ---------------------------------------------------------------------------
// Suggestion ID helpers
// ---------------------------------------------------------------------------

/**
 * Check whether a suggestion has already been adopted.
 */
export function isSuggestionAdopted(
  suggestionId: string,
  adoptedIds: Set<string>,
): boolean {
  return adoptedIds.has(suggestionId)
}

/**
 * Summarize a suggestion set for UI display.
 */
export function summarizeSuggestions(suggestions: TravelRestDaySuggestion[]): {
  total: number
  travelDays: number
  restDays: number
  violationCodes: string[]
} {
  const allCodes = suggestions.flatMap((s) => s.source_violation_codes)
  return {
    total: suggestions.length,
    travelDays: suggestions.filter((s) => s.type === "travel").length,
    restDays: suggestions.filter((s) => s.type === "rest").length,
    violationCodes: [...new Set(allCodes)],
  }
}
