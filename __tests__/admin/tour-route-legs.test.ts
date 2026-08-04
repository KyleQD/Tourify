/**
 * ROUTE-301 — Normalized route leg tests.
 *
 * Acceptance criteria:
 *   - Legs regenerate deterministically from stop ordering.
 *   - Approved overrides survive regeneration (override fields preserved).
 *   - Linked bookings survive regeneration (transport_booking_id preserved).
 *   - Constraints prevent orphan legs (duplicate ordinals throw; orphan
 *     detection helper returns orphaned keys; single-stop tour → zero legs).
 *   - Stale legs (removed stop pair) are not present in the merged result.
 *   - Override approval is required (missing approvedBy throws).
 *   - resolveEffectiveLegValues: override values take precedence over provider;
 *     provider values used when no override; none when neither present.
 *   - summarizeRouteLegSet counts are accurate.
 */

import { describe, expect, it } from "vitest"

import {
  applyRouteLegOverride,
  clearRouteLegOverride,
  detectOrphanLegs,
  generateRouteLegPairs,
  mergeRouteLegSet,
  resolveEffectiveLegValues,
  summarizeRouteLegSet,
  TourRouteLegError,
  type TourRouteLeg,
  type TourRouteLegStop,
} from "@/lib/admin/tour-route-legs"

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const STOPS: TourRouteLegStop[] = [
  { id: "stop-a", ordinal: 0, name: "Chicago" },
  { id: "stop-b", ordinal: 1, name: "Detroit" },
  { id: "stop-c", ordinal: 2, name: "Cleveland" },
  { id: "stop-d", ordinal: 3, name: "Pittsburgh" },
]

const TOUR_CTX = {
  tourVersionId: "tv-1",
  tourId: "tour-1",
  orgId: "org-1",
}

function makeLeg(overrides: Partial<TourRouteLeg> = {}): TourRouteLeg {
  return {
    id: "leg-existing",
    ...TOUR_CTX,
    from_stop_id: "stop-a",
    to_stop_id: "stop-b",
    from_ordinal: 0,
    to_ordinal: 1,
    transport_mode: "drive",
    distance_km: 480,
    duration_minutes: 300,
    buffer_minutes: 0,
    provider: "osrm",
    provider_version: "v1",
    calculated_at: "2026-07-20T10:00:00Z",
    override: null,
    transport_booking_id: null,
    has_conflict: false,
    conflict_codes: [],
    source: "auto",
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// generateRouteLegPairs
// ---------------------------------------------------------------------------

describe("ROUTE-301 generateRouteLegPairs", () => {
  it("produces N-1 pairs for N stops in ordinal order", () => {
    const pairs = generateRouteLegPairs({ stops: STOPS })
    expect(pairs).toHaveLength(3)
    expect(pairs[0].fromStop.name).toBe("Chicago")
    expect(pairs[0].toStop.name).toBe("Detroit")
    expect(pairs[2].fromStop.name).toBe("Cleveland")
    expect(pairs[2].toStop.name).toBe("Pittsburgh")
  })

  it("single stop → zero pairs", () => {
    const pairs = generateRouteLegPairs({ stops: [STOPS[0]] })
    expect(pairs).toHaveLength(0)
  })

  it("zero stops → zero pairs", () => {
    expect(generateRouteLegPairs({ stops: [] })).toHaveLength(0)
  })

  it("sorts stops by ordinal before pairing (out-of-order input)", () => {
    const disordered = [STOPS[2], STOPS[0], STOPS[3], STOPS[1]]
    const pairs = generateRouteLegPairs({ stops: disordered })
    expect(pairs).toHaveLength(3)
    expect(pairs[0].fromStop.id).toBe("stop-a")
    expect(pairs[0].toStop.id).toBe("stop-b")
  })

  it("throws TourRouteLegError on duplicate ordinals", () => {
    const dupes: TourRouteLegStop[] = [
      { id: "s1", ordinal: 0, name: "A" },
      { id: "s2", ordinal: 0, name: "B" }, // duplicate
    ]
    expect(() => generateRouteLegPairs({ stops: dupes })).toThrow(TourRouteLegError)
  })

  it("non-consecutive ordinals produce correct pair sequence (gap after detach)", () => {
    const withGap: TourRouteLegStop[] = [
      { id: "s1", ordinal: 0, name: "A" },
      { id: "s2", ordinal: 2, name: "C" }, // ordinal 1 removed/detached
    ]
    const pairs = generateRouteLegPairs({ stops: withGap })
    expect(pairs).toHaveLength(1)
    expect(pairs[0].fromStop.id).toBe("s1")
    expect(pairs[0].toStop.id).toBe("s2")
  })
})

// ---------------------------------------------------------------------------
// mergeRouteLegSet — determinism and override/booking preservation
// ---------------------------------------------------------------------------

describe("ROUTE-301 mergeRouteLegSet — deterministic regeneration", () => {
  it("produces legs matching the stop pairs in ordinal order", () => {
    const pairs = generateRouteLegPairs({ stops: STOPS })
    const legs = mergeRouteLegSet({ ...TOUR_CTX, generatedPairs: pairs, existingLegs: [] })

    expect(legs).toHaveLength(3)
    expect(legs[0].from_stop_id).toBe("stop-a")
    expect(legs[0].to_stop_id).toBe("stop-b")
    expect(legs[2].from_stop_id).toBe("stop-c")
    expect(legs[2].to_stop_id).toBe("stop-d")
  })

  it("new legs have id=null (not yet persisted)", () => {
    const pairs = generateRouteLegPairs({ stops: STOPS })
    const legs = mergeRouteLegSet({ ...TOUR_CTX, generatedPairs: pairs, existingLegs: [] })
    expect(legs.every((l) => l.id === null)).toBe(true)
  })

  it("existing leg id is reused on re-generation for the same pair", () => {
    const existing = makeLeg({ id: "leg-existing", from_stop_id: "stop-a", to_stop_id: "stop-b" })
    const pairs = generateRouteLegPairs({ stops: STOPS.slice(0, 2) })
    const legs = mergeRouteLegSet({ ...TOUR_CTX, generatedPairs: pairs, existingLegs: [existing] })
    expect(legs[0].id).toBe("leg-existing")
  })

  it("regeneration with same stops is deterministic (same result twice)", () => {
    const pairs = generateRouteLegPairs({ stops: STOPS })
    const first = mergeRouteLegSet({ ...TOUR_CTX, generatedPairs: pairs, existingLegs: [] })
    const second = mergeRouteLegSet({ ...TOUR_CTX, generatedPairs: pairs, existingLegs: [] })
    expect(JSON.stringify(first)).toBe(JSON.stringify(second))
  })
})

describe("ROUTE-301 mergeRouteLegSet — approved override preservation", () => {
  it("approved override fields are carried into the regenerated leg", () => {
    const existing = makeLeg({
      override: {
        distance_km: 999,
        duration_minutes: 600,
        reason: "Bridge closed",
        approvedBy: "user-admin",
        approvedAt: "2026-07-20T09:00:00Z",
      },
    })
    const pairs = generateRouteLegPairs({ stops: STOPS.slice(0, 2) })
    const legs = mergeRouteLegSet({ ...TOUR_CTX, generatedPairs: pairs, existingLegs: [existing] })

    expect(legs[0].override?.approvedBy).toBe("user-admin")
    expect(legs[0].override?.distance_km).toBe(999)
    expect(legs[0].override?.reason).toBe("Bridge closed")
  })

  it("unapproved (null approvedBy) override is NOT preserved on regeneration", () => {
    const existing = makeLeg({ override: { reason: "Draft override" } }) // no approvedBy
    const pairs = generateRouteLegPairs({ stops: STOPS.slice(0, 2) })
    const legs = mergeRouteLegSet({ ...TOUR_CTX, generatedPairs: pairs, existingLegs: [existing] })
    expect(legs[0].override).toBeNull()
  })
})

describe("ROUTE-301 mergeRouteLegSet — linked booking preservation", () => {
  it("transport_booking_id is carried into the regenerated leg", () => {
    const existing = makeLeg({ transport_booking_id: "booking-xyz" })
    const pairs = generateRouteLegPairs({ stops: STOPS.slice(0, 2) })
    const legs = mergeRouteLegSet({ ...TOUR_CTX, generatedPairs: pairs, existingLegs: [existing] })
    expect(legs[0].transport_booking_id).toBe("booking-xyz")
  })

  it("new leg (no existing) has null transport_booking_id", () => {
    const pairs = generateRouteLegPairs({ stops: STOPS.slice(0, 2) })
    const legs = mergeRouteLegSet({ ...TOUR_CTX, generatedPairs: pairs, existingLegs: [] })
    expect(legs[0].transport_booking_id).toBeNull()
  })
})

describe("ROUTE-301 mergeRouteLegSet — stale leg removal", () => {
  it("stale leg (stop-pair no longer in active sequence) is absent from merged result", () => {
    // Active stops are only A→B; old C→D pair should be absent
    const stale = makeLeg({
      id: "stale-leg",
      from_stop_id: "stop-c",
      to_stop_id: "stop-d",
      from_ordinal: 2,
      to_ordinal: 3,
    })
    const twoStopPairs = generateRouteLegPairs({ stops: STOPS.slice(0, 2) })
    const legs = mergeRouteLegSet({ ...TOUR_CTX, generatedPairs: twoStopPairs, existingLegs: [stale] })
    expect(legs.every((l) => l.from_stop_id !== "stop-c")).toBe(true)
    expect(legs).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// Orphan detection
// ---------------------------------------------------------------------------

describe("ROUTE-301 detectOrphanLegs", () => {
  it("no orphans when all stop ids are active", () => {
    const pairs = generateRouteLegPairs({ stops: STOPS })
    const legs = mergeRouteLegSet({ ...TOUR_CTX, generatedPairs: pairs, existingLegs: [] })
    const activeIds = new Set(STOPS.map((s) => s.id))
    expect(detectOrphanLegs({ legs, activeStopIds: activeIds })).toHaveLength(0)
  })

  it("detects orphan when a stop id is not in the active set", () => {
    const leg = makeLeg({ from_stop_id: "removed-stop", to_stop_id: "stop-b" })
    const activeIds = new Set(["stop-b", "stop-c"])
    const orphans = detectOrphanLegs({ legs: [leg], activeStopIds: activeIds })
    expect(orphans).toHaveLength(1)
    expect(orphans[0]).toBe("removed-stop:stop-b")
  })

  it("both endpoints must be active — one missing triggers orphan", () => {
    const leg = makeLeg({ from_stop_id: "stop-a", to_stop_id: "missing-stop" })
    const activeIds = new Set(["stop-a"])
    expect(detectOrphanLegs({ legs: [leg], activeStopIds: activeIds })).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// Override helpers
// ---------------------------------------------------------------------------

describe("ROUTE-301 applyRouteLegOverride / clearRouteLegOverride", () => {
  it("applies approved override and marks approvedBy", () => {
    const leg = makeLeg()
    const updated = applyRouteLegOverride(leg, {
      distance_km: 700,
      duration_minutes: 420,
      reason: "Route closure",
      approvedBy: "mgr-1",
      approvedAt: "2026-07-20T12:00:00Z",
    })
    expect(updated.override?.approvedBy).toBe("mgr-1")
    expect(updated.override?.distance_km).toBe(700)
    expect(updated.override?.reason).toBe("Route closure")
  })

  it("throws when approvedBy is missing", () => {
    const leg = makeLeg()
    expect(() =>
      applyRouteLegOverride(leg, {
        reason: "Test",
        approvedBy: "",
        approvedAt: "2026-07-20T12:00:00Z",
      }),
    ).toThrow(TourRouteLegError)
  })

  it("throws when reason is missing", () => {
    const leg = makeLeg()
    expect(() =>
      applyRouteLegOverride(leg, {
        reason: "",
        approvedBy: "mgr-1",
        approvedAt: "2026-07-20T12:00:00Z",
      }),
    ).toThrow(TourRouteLegError)
  })

  it("clearRouteLegOverride removes override object", () => {
    const leg = makeLeg({
      override: { approvedBy: "mgr-1", reason: "Old reason" },
    })
    const cleared = clearRouteLegOverride(leg)
    expect(cleared.override).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// resolveEffectiveLegValues
// ---------------------------------------------------------------------------

describe("ROUTE-301 resolveEffectiveLegValues", () => {
  it("approved override takes precedence over provider values", () => {
    const leg = makeLeg({
      distance_km: 500,
      duration_minutes: 300,
      override: {
        distance_km: 700,
        duration_minutes: 420,
        reason: "Detour",
        approvedBy: "mgr-1",
        approvedAt: "2026-07-20T12:00:00Z",
      },
    })
    const result = resolveEffectiveLegValues(leg)
    expect(result.source).toBe("override")
    expect(result.distance_km).toBe(700)
    expect(result.duration_minutes).toBe(420)
  })

  it("provider values used when no approved override", () => {
    const leg = makeLeg({ distance_km: 480, duration_minutes: 300, override: null })
    const result = resolveEffectiveLegValues(leg)
    expect(result.source).toBe("provider")
    expect(result.distance_km).toBe(480)
  })

  it("source=none when neither override nor provider values present", () => {
    const leg = makeLeg({ distance_km: null, duration_minutes: null, override: null })
    const result = resolveEffectiveLegValues(leg)
    expect(result.source).toBe("none")
    expect(result.distance_km).toBeNull()
    expect(result.duration_minutes).toBeNull()
  })

  it("unapproved override (no approvedBy) does not take precedence", () => {
    const leg = makeLeg({
      distance_km: 480,
      override: { distance_km: 999, reason: "Draft" }, // no approvedBy
    })
    const result = resolveEffectiveLegValues(leg)
    expect(result.source).toBe("provider")
    expect(result.distance_km).toBe(480)
  })
})

// ---------------------------------------------------------------------------
// summarizeRouteLegSet
// ---------------------------------------------------------------------------

describe("ROUTE-301 summarizeRouteLegSet", () => {
  it("counts are accurate across a mixed leg set", () => {
    const legs: TourRouteLeg[] = [
      makeLeg({ id: null, from_stop_id: "s1", to_stop_id: "s2", from_ordinal: 0, to_ordinal: 1 }),
      makeLeg({ id: "leg-2", from_stop_id: "s2", to_stop_id: "s3", from_ordinal: 1, to_ordinal: 2, override: { approvedBy: "u1", reason: "r" } }),
      makeLeg({ id: "leg-3", from_stop_id: "s3", to_stop_id: "s4", from_ordinal: 2, to_ordinal: 3, transport_booking_id: "bk-1", has_conflict: true, conflict_codes: ["same_day"] }),
    ]
    const summary = summarizeRouteLegSet(legs)
    expect(summary.total).toBe(3)
    expect(summary.newLegs).toBe(1)
    expect(summary.existingLegs).toBe(2)
    expect(summary.withOverride).toBe(1)
    expect(summary.withBooking).toBe(1)
    expect(summary.withConflict).toBe(1)
  })

  it("empty set returns all zeros", () => {
    const summary = summarizeRouteLegSet([])
    expect(summary.total).toBe(0)
    expect(summary.newLegs).toBe(0)
  })
})
