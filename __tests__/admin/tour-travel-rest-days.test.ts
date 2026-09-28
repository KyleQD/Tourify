/**
 * ROUTE-306 — Travel/rest-day generation tests.
 *
 * Acceptance criteria:
 *   - Suggestions generated from constraint violations (insufficient_travel,
 *     insufficient_rest, excessive_drive, impossible_arrival).
 *   - One suggestion per (insert_after_stop_id) — deduplicated.
 *   - Non-qualifying violations (same_day_overlap, missing_location etc.) do not
 *     produce suggestions.
 *   - Adoption inserts stop at correct ordinal; subsequent ordinals shift up.
 *   - Adoption is idempotent on suggestion_id.
 *   - Adoption at beginning of list (insert_after_stop_id=null) prepends.
 *   - Reordered stops always have contiguous 0..n ordinals after adoption.
 *   - summarizeSuggestions returns accurate counts.
 *   - isSuggestionAdopted reflects Set membership correctly.
 */

import { describe, expect, it } from "vitest"

import {
  adoptTravelRestDaySuggestion,
  generateTravelRestDaySuggestions,
  isSuggestionAdopted,
  summarizeSuggestions,
  type TravelRestDaySuggestion,
} from "@/lib/admin/tour-travel-rest-days"
import type { RouteConstraintViolation } from "@/lib/admin/tour-route-constraints"

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const STOPS = [
  { id: "s1", ordinal: 0, name: "Chicago", stop_type: "show" },
  { id: "s2", ordinal: 1, name: "Detroit", stop_type: "show" },
  { id: "s3", ordinal: 2, name: "Cleveland", stop_type: "show" },
]

function makeViolation(overrides: Partial<RouteConstraintViolation> = {}): RouteConstraintViolation {
  return {
    code: "insufficient_travel",
    severity: "error",
    legId: "leg-1",
    fromStopId: "s1",
    toStopId: "s2",
    message: "Not enough travel time between Chicago and Detroit.",
    evidence: {},
    remediationHint: "Add a travel day.",
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// generateTravelRestDaySuggestions
// ---------------------------------------------------------------------------

describe("ROUTE-306 generateTravelRestDaySuggestions", () => {
  it("produces a travel-day suggestion for insufficient_travel", () => {
    const suggestions = generateTravelRestDaySuggestions({
      violations: [makeViolation({ code: "insufficient_travel", fromStopId: "s1", toStopId: "s2" })],
      stops: STOPS,
    })
    expect(suggestions).toHaveLength(1)
    expect(suggestions[0].type).toBe("travel")
    expect(suggestions[0].insert_after_stop_id).toBe("s1")
    expect(suggestions[0].source_violation_codes).toContain("insufficient_travel")
  })

  it("produces a travel-day suggestion for excessive_drive", () => {
    const suggestions = generateTravelRestDaySuggestions({
      violations: [makeViolation({ code: "excessive_drive", fromStopId: "s2", toStopId: "s3" })],
      stops: STOPS,
    })
    expect(suggestions[0].type).toBe("travel")
  })

  it("produces a rest-day suggestion for insufficient_rest", () => {
    const suggestions = generateTravelRestDaySuggestions({
      violations: [makeViolation({ code: "insufficient_rest", fromStopId: "s1", toStopId: "s2" })],
      stops: STOPS,
    })
    expect(suggestions[0].type).toBe("rest")
  })

  it("produces a travel-day suggestion for impossible_arrival", () => {
    const suggestions = generateTravelRestDaySuggestions({
      violations: [makeViolation({ code: "impossible_arrival", fromStopId: "s2", toStopId: "s3" })],
      stops: STOPS,
    })
    expect(suggestions[0].type).toBe("travel")
  })

  it("non-qualifying violations do not produce suggestions", () => {
    const violations: RouteConstraintViolation[] = [
      makeViolation({ code: "same_day_overlap" }),
      makeViolation({ code: "missing_location" }),
      makeViolation({ code: "curfew_conflict" }),
      makeViolation({ code: "border_ferry_risk" }),
    ]
    const suggestions = generateTravelRestDaySuggestions({ violations, stops: STOPS })
    expect(suggestions).toHaveLength(0)
  })

  it("deduplicates suggestions for the same insert_after_stop_id", () => {
    const violations: RouteConstraintViolation[] = [
      makeViolation({ code: "insufficient_travel", fromStopId: "s1", toStopId: "s2" }),
      makeViolation({ code: "excessive_drive", fromStopId: "s1", toStopId: "s2" }),
    ]
    const suggestions = generateTravelRestDaySuggestions({ violations, stops: STOPS })
    expect(suggestions).toHaveLength(1) // deduplicated by insert_after_stop_id
  })

  it("produces distinct suggestions for different insert_after_stop_ids", () => {
    const violations: RouteConstraintViolation[] = [
      makeViolation({ code: "insufficient_travel", fromStopId: "s1", toStopId: "s2" }),
      makeViolation({ code: "excessive_drive", fromStopId: "s2", toStopId: "s3" }),
    ]
    const suggestions = generateTravelRestDaySuggestions({ violations, stops: STOPS })
    expect(suggestions).toHaveLength(2)
    expect(new Set(suggestions.map((s) => s.insert_after_stop_id)).size).toBe(2)
  })

  it("proposed_name is descriptive (includes from→to for travel, stop name for rest)", () => {
    const [suggestion] = generateTravelRestDaySuggestions({
      violations: [makeViolation({ code: "insufficient_travel", fromStopId: "s1", toStopId: "s2" })],
      stops: STOPS,
    })
    expect(suggestion.proposed_name).toContain("Chicago")
    expect(suggestion.proposed_name).toContain("Detroit")
  })

  it("each suggestion has a stable suggestion_id string", () => {
    const violations = [makeViolation({ code: "insufficient_travel", fromStopId: "s1", toStopId: "s2" })]
    const s1 = generateTravelRestDaySuggestions({ violations, stops: STOPS })
    const s2 = generateTravelRestDaySuggestions({ violations, stops: STOPS })
    expect(s1[0].suggestion_id).toBe(s2[0].suggestion_id)
  })

  it("returns empty array when violations list is empty", () => {
    expect(generateTravelRestDaySuggestions({ violations: [], stops: STOPS })).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// adoptTravelRestDaySuggestion — correct ordinal insertion
// ---------------------------------------------------------------------------

describe("ROUTE-306 adoptTravelRestDaySuggestion — ordinal insertion", () => {
  function makeSuggestion(overrides: Partial<TravelRestDaySuggestion> = {}): TravelRestDaySuggestion {
    return {
      suggestion_id: "suggest:travel:s1:insufficient_travel",
      type: "travel",
      proposed_name: "Travel: Chicago → Detroit",
      insert_after_stop_id: "s1",
      proposed_ordinal: 1,
      source_violation_codes: ["insufficient_travel"],
      reason: "Insufficient travel time",
      suggested_date: null,
      ...overrides,
    }
  }

  it("inserts new stop at ordinal 1 when insert_after is ordinal-0 stop", () => {
    const result = adoptTravelRestDaySuggestion({
      suggestion: makeSuggestion({ insert_after_stop_id: "s1" }),
      currentStops: STOPS,
      adoptedIds: new Set(),
      actorUserId: "user-1",
    })
    expect(result.inserted).toBe(true)
    expect(result.newStop?.ordinal).toBe(1)
    expect(result.newStop?.stop_type).toBe("travel")
    expect(result.newStop?.id).toBeNull()
  })

  it("reordered stops are contiguous 0..n-1", () => {
    const result = adoptTravelRestDaySuggestion({
      suggestion: makeSuggestion({ insert_after_stop_id: "s1" }),
      currentStops: STOPS,
      adoptedIds: new Set(),
      actorUserId: "user-1",
    })
    const ordinals = result.reorderedStops.map((s) => s.ordinal).sort((a, b) => a - b)
    expect(ordinals).toEqual([0, 1, 2, 3])
  })

  it("subsequent stops shift up by one after insertion", () => {
    const result = adoptTravelRestDaySuggestion({
      suggestion: makeSuggestion({ insert_after_stop_id: "s1" }),
      currentStops: STOPS,
      adoptedIds: new Set(),
      actorUserId: "user-1",
    })
    // s2 was ordinal 1, should now be ordinal 2
    const s2 = result.reorderedStops.find((s) => s.id === "s2")
    expect(s2?.ordinal).toBe(2)
    // s3 was ordinal 2, should now be ordinal 3
    const s3 = result.reorderedStops.find((s) => s.id === "s3")
    expect(s3?.ordinal).toBe(3)
  })

  it("prepends when insert_after_stop_id is null", () => {
    const result = adoptTravelRestDaySuggestion({
      suggestion: makeSuggestion({ insert_after_stop_id: null, proposed_ordinal: 0 }),
      currentStops: STOPS,
      adoptedIds: new Set(),
      actorUserId: "user-1",
    })
    expect(result.inserted).toBe(true)
    expect(result.newStop?.ordinal).toBe(0)
    // Original ordinal-0 stop should now be ordinal 1
    const s1 = result.reorderedStops.find((s) => s.id === "s1")
    expect(s1?.ordinal).toBe(1)
  })

  it("appends when insert_after_stop_id is not found in current stops", () => {
    const result = adoptTravelRestDaySuggestion({
      suggestion: makeSuggestion({ insert_after_stop_id: "nonexistent-stop" }),
      currentStops: STOPS,
      adoptedIds: new Set(),
      actorUserId: "user-1",
    })
    expect(result.inserted).toBe(true)
    // New stop should be at the end
    expect(result.newStop?.ordinal).toBe(STOPS.length)
  })

  it("records the adopted_from_suggestion_id on the new stop", () => {
    const suggestion = makeSuggestion()
    const result = adoptTravelRestDaySuggestion({
      suggestion,
      currentStops: STOPS,
      adoptedIds: new Set(),
      actorUserId: "user-1",
    })
    expect(result.newStop?.adopted_from_suggestion_id).toBe(suggestion.suggestion_id)
    expect(result.newStop?.created_by).toBe("user-1")
  })
})

// ---------------------------------------------------------------------------
// adoptTravelRestDaySuggestion — idempotency
// ---------------------------------------------------------------------------

describe("ROUTE-306 adoptTravelRestDaySuggestion — idempotency", () => {
  const SUGGESTION: TravelRestDaySuggestion = {
    suggestion_id: "suggest:travel:s1:insufficient_travel",
    type: "travel",
    proposed_name: "Travel: Chicago → Detroit",
    insert_after_stop_id: "s1",
    proposed_ordinal: 1,
    source_violation_codes: ["insufficient_travel"],
    reason: "Not enough time",
    suggested_date: null,
  }

  it("returns inserted=false when suggestion_id already adopted", () => {
    const adopted = new Set(["suggest:travel:s1:insufficient_travel"])
    const result = adoptTravelRestDaySuggestion({
      suggestion: SUGGESTION,
      currentStops: STOPS,
      adoptedIds: adopted,
      actorUserId: "user-1",
    })
    expect(result.inserted).toBe(false)
    expect(result.newStop).toBeNull()
  })

  it("reorderedStops still has contiguous ordinals on idempotent call", () => {
    const adopted = new Set(["suggest:travel:s1:insufficient_travel"])
    const result = adoptTravelRestDaySuggestion({
      suggestion: SUGGESTION,
      currentStops: STOPS,
      adoptedIds: adopted,
      actorUserId: "user-1",
    })
    const ordinals = result.reorderedStops.map((s) => s.ordinal).sort((a, b) => a - b)
    expect(ordinals).toEqual([0, 1, 2])
  })
})

// ---------------------------------------------------------------------------
// summarizeSuggestions
// ---------------------------------------------------------------------------

describe("ROUTE-306 summarizeSuggestions", () => {
  it("counts travel and rest days correctly", () => {
    const suggestions: TravelRestDaySuggestion[] = [
      { suggestion_id: "a", type: "travel", proposed_name: "T1", insert_after_stop_id: "s1", proposed_ordinal: 1, source_violation_codes: ["insufficient_travel"], reason: "r" },
      { suggestion_id: "b", type: "rest", proposed_name: "R1", insert_after_stop_id: "s2", proposed_ordinal: 2, source_violation_codes: ["insufficient_rest"], reason: "r" },
      { suggestion_id: "c", type: "travel", proposed_name: "T2", insert_after_stop_id: "s3", proposed_ordinal: 3, source_violation_codes: ["excessive_drive"], reason: "r" },
    ]
    const summary = summarizeSuggestions(suggestions)
    expect(summary.total).toBe(3)
    expect(summary.travelDays).toBe(2)
    expect(summary.restDays).toBe(1)
    expect(summary.violationCodes).toContain("insufficient_travel")
    expect(summary.violationCodes).toContain("insufficient_rest")
    expect(summary.violationCodes).toContain("excessive_drive")
  })

  it("returns zeros for empty list", () => {
    const summary = summarizeSuggestions([])
    expect(summary.total).toBe(0)
    expect(summary.travelDays).toBe(0)
    expect(summary.restDays).toBe(0)
  })

  it("deduplicates violation codes in the summary", () => {
    const suggestions: TravelRestDaySuggestion[] = [
      { suggestion_id: "a", type: "travel", proposed_name: "T1", insert_after_stop_id: "s1", proposed_ordinal: 1, source_violation_codes: ["excessive_drive", "insufficient_travel"], reason: "r" },
      { suggestion_id: "b", type: "travel", proposed_name: "T2", insert_after_stop_id: "s2", proposed_ordinal: 2, source_violation_codes: ["excessive_drive"], reason: "r" },
    ]
    const summary = summarizeSuggestions(suggestions)
    expect(summary.violationCodes).toHaveLength(2) // deduplicated
  })
})

// ---------------------------------------------------------------------------
// isSuggestionAdopted
// ---------------------------------------------------------------------------

describe("ROUTE-306 isSuggestionAdopted", () => {
  it("returns true when id is in the adopted set", () => {
    const set = new Set(["id-1", "id-2"])
    expect(isSuggestionAdopted("id-1", set)).toBe(true)
  })

  it("returns false when id is not in the adopted set", () => {
    expect(isSuggestionAdopted("id-3", new Set(["id-1"]))).toBe(false)
  })
})
