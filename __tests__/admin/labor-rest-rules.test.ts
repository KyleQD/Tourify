/**
 * WORK-406 — Labor/rest rule profile tests.
 */

import { describe, it, expect } from "vitest"
import {
  IATSE_LOCAL_PROFILE,
  EU_WORKING_TIME_PROFILE,
  BASIC_PROFILE,
  checkTurnaround,
  checkMealBreaks,
  checkConsecutiveDays,
  checkShiftOverlap,
  checkTravelWorkConflict,
  checkLaborRules,
  type ShiftWindow,
  type LaborRuleProfile,
} from "@/lib/admin/labor-rest-rules"

const PERSON = "p1"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function shift(
  id: string,
  startUtc: string,
  endUtc: string,
  opts: { localDate?: string; travel?: boolean; person?: string } = {},
): ShiftWindow {
  return {
    shift_id: id,
    person_id: opts.person ?? PERSON,
    start_utc: startUtc,
    end_utc: endUtc,
    local_date: opts.localDate ?? startUtc.slice(0, 10),
    is_travel_leg: opts.travel ?? false,
  }
}

// ---------------------------------------------------------------------------
// Profile documentation
// ---------------------------------------------------------------------------

describe("WORK-406 — profiles document assumptions", () => {
  it("IATSE profile has documented assumptions", () => {
    expect(IATSE_LOCAL_PROFILE.assumptions.length).toBeGreaterThan(0)
    expect(IATSE_LOCAL_PROFILE.min_turnaround_hours).toBe(10)
    expect(IATSE_LOCAL_PROFILE.max_consecutive_work_days).toBe(6)
    expect(IATSE_LOCAL_PROFILE.travel_counts_as_work_day).toBe(false)
  })

  it("EU Working Time profile has 11h turnaround", () => {
    expect(EU_WORKING_TIME_PROFILE.min_turnaround_hours).toBe(11)
    expect(EU_WORKING_TIME_PROFILE.travel_counts_as_work_day).toBe(true)
  })

  it("Basic profile is jurisdiction-free with documented advisory nature", () => {
    expect(BASIC_PROFILE.jurisdiction).toContain("None")
    expect(BASIC_PROFILE.assumptions.some((a) => a.toLowerCase().includes("advisory"))).toBe(true)
  })

  it("all built-in profiles have non-empty name, id, and at least one assumption", () => {
    for (const p of [IATSE_LOCAL_PROFILE, EU_WORKING_TIME_PROFILE, BASIC_PROFILE]) {
      expect(p.profile_id).toBeTruthy()
      expect(p.name).toBeTruthy()
      expect(p.assumptions.length).toBeGreaterThan(0)
    }
  })
})

// ---------------------------------------------------------------------------
// Turnaround
// ---------------------------------------------------------------------------

describe("WORK-406 — turnaround check", () => {
  it("no violation when gap >= min_turnaround_hours", () => {
    const shifts = [
      shift("s1", "2026-10-01T08:00:00Z", "2026-10-01T20:00:00Z"),
      shift("s2", "2026-10-02T08:00:00Z", "2026-10-02T18:00:00Z"), // 12h gap
    ]
    expect(checkTurnaround(shifts, IATSE_LOCAL_PROFILE)).toHaveLength(0)
  })

  it("violation when gap < min_turnaround_hours", () => {
    const shifts = [
      shift("s1", "2026-10-01T08:00:00Z", "2026-10-01T22:00:00Z"),
      shift("s2", "2026-10-02T04:00:00Z", "2026-10-02T14:00:00Z"), // only 6h gap
    ]
    const v = checkTurnaround(shifts, IATSE_LOCAL_PROFILE)
    expect(v).toHaveLength(1)
    expect(v[0].violation_type).toBe("turnaround")
    expect(v[0].severity).toBe("error")
    expect(v[0].shift_ids).toContain("s1")
    expect(v[0].shift_ids).toContain("s2")
    expect(v[0].detail).toMatch(/6\.0h/)
  })

  it("flags shorter gap violation", () => {
    const shifts = [
      shift("s1", "2026-10-01T08:00:00Z", "2026-10-02T02:00:00Z"),
      shift("s2", "2026-10-02T07:00:00Z", "2026-10-02T18:00:00Z"), // 5h gap
    ]
    const v = checkTurnaround(shifts, IATSE_LOCAL_PROFILE)
    expect(v[0].violation_type).toBe("turnaround")
  })

  it("orders shifts before comparing (out-of-order input)", () => {
    const shifts = [
      shift("s2", "2026-10-02T04:00:00Z", "2026-10-02T14:00:00Z"),
      shift("s1", "2026-10-01T08:00:00Z", "2026-10-01T22:00:00Z"),
    ]
    const v = checkTurnaround(shifts, IATSE_LOCAL_PROFILE)
    expect(v).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// Meal breaks
// ---------------------------------------------------------------------------

describe("WORK-406 — meal break check", () => {
  it("no violation when shift <= max_consecutive_work_hours", () => {
    const shifts = [shift("s1", "2026-10-01T09:00:00Z", "2026-10-01T14:00:00Z")] // 5h
    expect(checkMealBreaks(shifts, IATSE_LOCAL_PROFILE)).toHaveLength(0)
  })

  it("warning when shift > max_consecutive_work_hours", () => {
    const shifts = [shift("s1", "2026-10-01T08:00:00Z", "2026-10-01T16:00:00Z")] // 8h > 6h
    const v = checkMealBreaks(shifts, IATSE_LOCAL_PROFILE)
    expect(v).toHaveLength(1)
    expect(v[0].violation_type).toBe("meal_break_required")
    expect(v[0].severity).toBe("warning")
    expect(v[0].detail).toMatch(/8\.0h/)
  })

  it("travel legs are not subject to meal break rules", () => {
    const shifts = [shift("s1", "2026-10-01T06:00:00Z", "2026-10-01T18:00:00Z", { travel: true })]
    expect(checkMealBreaks(shifts, IATSE_LOCAL_PROFILE)).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// Consecutive days
// ---------------------------------------------------------------------------

describe("WORK-406 — consecutive days check", () => {
  it("no violation within limit", () => {
    const shifts = Array.from({ length: 5 }, (_, i) => {
      const d = `2026-10-0${i + 1}`
      return shift(`s${i}`, `${d}T08:00:00Z`, `${d}T18:00:00Z`, { localDate: d })
    })
    expect(checkConsecutiveDays(shifts, IATSE_LOCAL_PROFILE)).toHaveLength(0)
  })

  it("violation when consecutive days exceed limit", () => {
    // 7 consecutive days, IATSE limit is 6
    const shifts = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(Date.parse("2026-10-01") + i * 86_400_000).toISOString().slice(0, 10)
      return shift(`s${i}`, `${d}T08:00:00Z`, `${d}T18:00:00Z`, { localDate: d })
    })
    const v = checkConsecutiveDays(shifts, IATSE_LOCAL_PROFILE)
    expect(v.length).toBeGreaterThan(0)
    expect(v[0].violation_type).toBe("consecutive_days")
    expect(v[0].severity).toBe("warning")
  })

  it("travel days not counted when travel_counts_as_work_day=false", () => {
    const shifts = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(Date.parse("2026-10-01") + i * 86_400_000).toISOString().slice(0, 10)
      const isTravel = i === 3
      return shift(`s${i}`, `${d}T08:00:00Z`, `${d}T18:00:00Z`, { localDate: d, travel: isTravel })
    })
    // IATSE: travel not counted → only 6 work days, at the limit but not over
    const v = checkConsecutiveDays(shifts, IATSE_LOCAL_PROFILE)
    expect(v).toHaveLength(0)
  })

  it("travel days counted when travel_counts_as_work_day=true", () => {
    const shifts = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(Date.parse("2026-10-01") + i * 86_400_000).toISOString().slice(0, 10)
      return shift(`s${i}`, `${d}T08:00:00Z`, `${d}T18:00:00Z`, { localDate: d, travel: i === 3 })
    })
    const v = checkConsecutiveDays(shifts, EU_WORKING_TIME_PROFILE)
    expect(v.length).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// Shift overlap
// ---------------------------------------------------------------------------

describe("WORK-406 — shift overlap check", () => {
  it("no violation when shifts are sequential", () => {
    const shifts = [
      shift("s1", "2026-10-01T08:00:00Z", "2026-10-01T14:00:00Z"),
      shift("s2", "2026-10-01T14:00:00Z", "2026-10-01T20:00:00Z"),
    ]
    expect(checkShiftOverlap(shifts, BASIC_PROFILE)).toHaveLength(0)
  })

  it("error when two shifts overlap", () => {
    const shifts = [
      shift("s1", "2026-10-01T08:00:00Z", "2026-10-01T16:00:00Z"),
      shift("s2", "2026-10-01T14:00:00Z", "2026-10-01T22:00:00Z"), // 2h overlap
    ]
    const v = checkShiftOverlap(shifts, BASIC_PROFILE)
    expect(v).toHaveLength(1)
    expect(v[0].violation_type).toBe("shift_overlap")
    expect(v[0].severity).toBe("error")
    expect(v[0].shift_ids).toEqual(expect.arrayContaining(["s1", "s2"]))
  })

  it("overlap for one person does not affect another person", () => {
    const shifts = [
      shift("s1", "2026-10-01T08:00:00Z", "2026-10-01T16:00:00Z", { person: "p1" }),
      shift("s2", "2026-10-01T14:00:00Z", "2026-10-01T22:00:00Z", { person: "p1" }),
      shift("s3", "2026-10-01T08:00:00Z", "2026-10-01T16:00:00Z", { person: "p2" }),
      shift("s4", "2026-10-01T14:00:00Z", "2026-10-01T22:00:00Z", { person: "p2" }),
    ]
    const v = checkShiftOverlap(shifts, BASIC_PROFILE)
    const personIds = new Set(v.map((x) => x.person_id))
    expect(personIds.has("p1")).toBe(true)
    expect(personIds.has("p2")).toBe(true)
    expect(v).toHaveLength(2)
  })
})

// ---------------------------------------------------------------------------
// Travel-work conflict
// ---------------------------------------------------------------------------

describe("WORK-406 — travel-work conflict check", () => {
  it("no violation when buffer meets minimum", () => {
    const shifts = [
      shift("t1", "2026-10-01T06:00:00Z", "2026-10-01T14:00:00Z", { travel: true }),
      shift("s1", "2026-10-02T00:00:00Z", "2026-10-02T10:00:00Z"),  // 10h buffer ≥ 8h IATSE
    ]
    expect(checkTravelWorkConflict(shifts, IATSE_LOCAL_PROFILE)).toHaveLength(0)
  })

  it("warning when travel arrival is too close to work call", () => {
    const shifts = [
      shift("t1", "2026-10-01T06:00:00Z", "2026-10-01T20:00:00Z", { travel: true }),
      shift("s1", "2026-10-02T00:00:00Z", "2026-10-02T10:00:00Z"),  // only 4h buffer < 8h
    ]
    const v = checkTravelWorkConflict(shifts, IATSE_LOCAL_PROFILE)
    expect(v).toHaveLength(1)
    expect(v[0].violation_type).toBe("travel_work_conflict")
    expect(v[0].severity).toBe("warning")
    expect(v[0].shift_ids).toContain("t1")
    expect(v[0].shift_ids).toContain("s1")
  })

  it("EU profile (min_travel_buffer=0) never generates travel-work violations", () => {
    const shifts = [
      shift("t1", "2026-10-01T06:00:00Z", "2026-10-01T22:00:00Z", { travel: true }),
      shift("s1", "2026-10-01T22:01:00Z", "2026-10-02T08:00:00Z"),  // immediate
    ]
    expect(checkTravelWorkConflict(shifts, EU_WORKING_TIME_PROFILE)).toHaveLength(0)
  })

  it("work-then-travel does not trigger travel-work conflict (only travel-then-work)", () => {
    const shifts = [
      shift("s1", "2026-10-01T08:00:00Z", "2026-10-01T18:00:00Z"),
      shift("t1", "2026-10-01T19:00:00Z", "2026-10-02T05:00:00Z", { travel: true }),
    ]
    expect(checkTravelWorkConflict(shifts, IATSE_LOCAL_PROFILE)).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// Full check
// ---------------------------------------------------------------------------

describe("WORK-406 — full labor rule check", () => {
  it("passes=true when no error violations", () => {
    const shifts = [
      shift("s1", "2026-10-01T08:00:00Z", "2026-10-01T16:00:00Z"),
      shift("s2", "2026-10-02T08:00:00Z", "2026-10-02T16:00:00Z"),
    ]
    const result = checkLaborRules({ person_id: PERSON, shifts, profile: IATSE_LOCAL_PROFILE })
    expect(result.passes).toBe(true)
    expect(result.profile_id).toBe("iatse-local")
  })

  it("passes=false when error violations exist", () => {
    const shifts = [
      shift("s1", "2026-10-01T08:00:00Z", "2026-10-01T22:00:00Z"),
      shift("s2", "2026-10-02T04:00:00Z", "2026-10-02T18:00:00Z"), // 6h gap < 10h
    ]
    const result = checkLaborRules({ person_id: PERSON, shifts, profile: IATSE_LOCAL_PROFILE })
    expect(result.passes).toBe(false)
    expect(result.error_count).toBeGreaterThan(0)
  })

  it("only includes shifts for the specified person_id", () => {
    const shifts = [
      shift("s1", "2026-10-01T08:00:00Z", "2026-10-01T22:00:00Z", { person: "p2" }),
      shift("s2", "2026-10-02T04:00:00Z", "2026-10-02T18:00:00Z", { person: "p2" }),
      shift("s3", "2026-10-01T08:00:00Z", "2026-10-01T16:00:00Z", { person: PERSON }),
    ]
    const result = checkLaborRules({ person_id: PERSON, shifts, profile: IATSE_LOCAL_PROFILE })
    expect(result.passes).toBe(true)
    expect(result.violations.every((v) => v.person_id === PERSON)).toBe(true)
  })
})
