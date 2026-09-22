/**
 * WORK-411 — Labor cost forecast tests.
 */

import { describe, it, expect } from "vitest"
import {
  computeLaborCostForecast,
  type RateCard,
  type ShiftCostInput,
} from "@/lib/admin/labor-cost-forecast"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function card(personId: string, overrides: Partial<RateCard> = {}): RateCard {
  return {
    person_id: personId,
    role_label: "Stage Hand",
    department: "Stage",
    employment_category: "employee",
    base_rate_per_hour: 50,
    currency: "USD",
    overtime_multiplier: 1.5,
    per_diem_daily: 75,
    travel_day_rate: null,
    ...overrides,
  }
}

function shiftInput(
  shiftId: string,
  personId: string,
  date: string,
  estimatedHours: number,
  overrides: Partial<ShiftCostInput> = {},
): ShiftCostInput {
  return {
    shift_id: shiftId,
    person_id: personId,
    date,
    estimated_hours: estimatedHours,
    actual_hours: null,
    flags: [],
    includes_per_diem: false,
    ...overrides,
  }
}

const PERSON_DEPTS = new Map([["p1", "Stage"], ["p2", "Catering"]])

// ---------------------------------------------------------------------------
// Basic cost computation
// ---------------------------------------------------------------------------

describe("WORK-411 — computeLaborCostForecast: basic cost", () => {
  it("computes estimated labor for a single shift", () => {
    const shifts = [shiftInput("s1", "p1", "2026-10-15", 8)]
    const result = computeLaborCostForecast({
      tour_id: "tour-1",
      rate_cards: [card("p1")],
      shifts,
      confirmed_shift_ids: new Set(),
      person_departments: PERSON_DEPTS,
    })
    // 8h * $50 = $400
    expect(result.line_items[0].estimated_labor).toBe(400)
    expect(result.estimated_total).toBe(400)
    expect(result.currency).toBe("USD")
  })

  it("includes per diem when includes_per_diem=true", () => {
    const shifts = [shiftInput("s1", "p1", "2026-10-15", 8, { includes_per_diem: true })]
    const result = computeLaborCostForecast({
      tour_id: "tour-1",
      rate_cards: [card("p1")],
      shifts,
      confirmed_shift_ids: new Set(),
      person_departments: PERSON_DEPTS,
    })
    // 8h * $50 + $75 per diem = $475
    expect(result.line_items[0].estimated_per_diem).toBe(75)
    expect(result.estimated_total).toBe(475)
  })

  it("uses overtime multiplier for overtime-flagged shifts", () => {
    const shifts = [shiftInput("s1", "p1", "2026-10-15", 4, { flags: ["overtime"] })]
    const result = computeLaborCostForecast({
      tour_id: "tour-1",
      rate_cards: [card("p1")],
      shifts,
      confirmed_shift_ids: new Set(),
      person_departments: PERSON_DEPTS,
    })
    // 4h * ($50 * 1.5) = $300
    expect(result.line_items[0].estimated_labor).toBe(300)
  })

  it("uses travel_day_rate flat amount for travel_day-flagged shifts", () => {
    const shifts = [shiftInput("s1", "p1", "2026-10-15", 10, { flags: ["travel_day"] })]
    const result = computeLaborCostForecast({
      tour_id: "tour-1",
      rate_cards: [card("p1", { travel_day_rate: 600 })],
      shifts,
      confirmed_shift_ids: new Set(),
      person_departments: PERSON_DEPTS,
    })
    // Flat travel day rate $600 (ignores hourly)
    expect(result.line_items[0].estimated_labor).toBe(600)
  })
})

// ---------------------------------------------------------------------------
// Committed vs actual
// ---------------------------------------------------------------------------

describe("WORK-411 — computeLaborCostForecast: committed and actual", () => {
  it("committed is populated for confirmed shifts only", () => {
    const shifts = [
      shiftInput("s1", "p1", "2026-10-15", 8),
      shiftInput("s2", "p1", "2026-10-16", 8),
    ]
    const result = computeLaborCostForecast({
      tour_id: "tour-1",
      rate_cards: [card("p1")],
      shifts,
      confirmed_shift_ids: new Set(["s1"]),
      person_departments: PERSON_DEPTS,
    })
    const s1 = result.line_items.find((li) => li.shift_id === "s1")!
    const s2 = result.line_items.find((li) => li.shift_id === "s2")!
    expect(s1.committed).toBe(400)
    expect(s2.committed).toBeNull()
  })

  it("actual is populated when actual_hours provided", () => {
    const shifts = [shiftInput("s1", "p1", "2026-10-15", 8, { actual_hours: 9 })]
    const result = computeLaborCostForecast({
      tour_id: "tour-1",
      rate_cards: [card("p1")],
      shifts,
      confirmed_shift_ids: new Set(),
      person_departments: PERSON_DEPTS,
    })
    // 9h * $50 = $450
    expect(result.line_items[0].actual).toBe(450)
    expect(result.actual_total).toBe(450)
  })

  it("actual_total is null when no actuals recorded", () => {
    const shifts = [shiftInput("s1", "p1", "2026-10-15", 8)]
    const result = computeLaborCostForecast({
      tour_id: "tour-1",
      rate_cards: [card("p1")],
      shifts,
      confirmed_shift_ids: new Set(),
      person_departments: PERSON_DEPTS,
    })
    expect(result.actual_total).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Unknown rates
// ---------------------------------------------------------------------------

describe("WORK-411 — computeLaborCostForecast: unknown rates", () => {
  it("estimated_total is null when any person has no rate card", () => {
    const shifts = [
      shiftInput("s1", "p1", "2026-10-15", 8),
      shiftInput("s2", "p2", "2026-10-15", 8), // no card for p2
    ]
    const result = computeLaborCostForecast({
      tour_id: "tour-1",
      rate_cards: [card("p1")],
      shifts,
      confirmed_shift_ids: new Set(),
      person_departments: PERSON_DEPTS,
    })
    expect(result.estimated_total).toBeNull()
    const s2Item = result.line_items.find((li) => li.shift_id === "s2")!
    expect(s2Item.estimated_labor).toBeNull()
  })

  it("line item has null cost when base_rate_per_hour is null", () => {
    const shifts = [shiftInput("s1", "p1", "2026-10-15", 8)]
    const result = computeLaborCostForecast({
      tour_id: "tour-1",
      rate_cards: [card("p1", { base_rate_per_hour: null })],
      shifts,
      confirmed_shift_ids: new Set(),
      person_departments: PERSON_DEPTS,
    })
    expect(result.line_items[0].estimated_labor).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------

describe("WORK-411 — computeLaborCostForecast: aggregation", () => {
  it("by_person sums estimated and committed correctly", () => {
    const shifts = [
      shiftInput("s1", "p1", "2026-10-15", 8),
      shiftInput("s2", "p1", "2026-10-16", 4),
    ]
    const result = computeLaborCostForecast({
      tour_id: "tour-1",
      rate_cards: [card("p1")],
      shifts,
      confirmed_shift_ids: new Set(["s1"]),
      person_departments: PERSON_DEPTS,
    })
    const p1 = result.by_person.find((p) => p.person_id === "p1")!
    expect(p1.estimated).toBe(600)  // 8h + 4h = 12h * $50
    expect(p1.committed).toBe(400)  // only s1 is confirmed
  })

  it("by_department contains headcount and estimated_hours without rate info", () => {
    const shifts = [
      shiftInput("s1", "p1", "2026-10-15", 8),
      shiftInput("s2", "p2", "2026-10-15", 6),
    ]
    const result = computeLaborCostForecast({
      tour_id: "tour-1",
      rate_cards: [card("p1"), card("p2", { department: "Catering" })],
      shifts,
      confirmed_shift_ids: new Set(),
      person_departments: new Map([["p1", "Stage"], ["p2", "Catering"]]),
    })
    const stage = result.by_department.find((d) => d.department === "Stage")!
    expect(stage.headcount).toBe(1)
    expect(stage.estimated_hours).toBe(8)
    // No rate info in by_department
    expect(Object.keys(stage)).not.toContain("estimated_labor")
  })

  it("multi-day forecast sums total correctly", () => {
    const shifts = [
      shiftInput("s1", "p1", "2026-10-15", 8),
      shiftInput("s2", "p1", "2026-10-16", 8),
      shiftInput("s3", "p1", "2026-10-17", 8),
    ]
    const result = computeLaborCostForecast({
      tour_id: "tour-1",
      rate_cards: [card("p1")],
      shifts,
      confirmed_shift_ids: new Set(),
      person_departments: PERSON_DEPTS,
    })
    expect(result.estimated_total).toBe(1200) // 3 * 8h * $50
  })
})
