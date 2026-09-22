/**
 * WORK-404 — Availability and time-off tests.
 */

import { describe, it, expect } from "vitest"
import {
  TIME_OFF_TRANSITIONS,
  transitionTimeOff,
  dateRangesOverlap,
  expandRecurrence,
  checkAvailabilityConflicts,
  checkBulkAvailability,
  type AvailabilityInterval,
  type TimeOffRequest,
  type RecurrenceRule,
} from "@/lib/admin/workforce-availability"

const NOW = "2026-09-20T00:00:00.000Z"
const ACTOR = "mgr-1"
const PERSON = "p1"
const ORG = "org-1"

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeInterval(overrides: Partial<AvailabilityInterval> = {}): AvailabilityInterval {
  return {
    interval_id: "iv1",
    org_id: ORG,
    person_id: PERSON,
    type: "available",
    start_date: "2026-09-01",
    end_date: "2026-09-30",
    start_time: null,
    end_time: null,
    iana_zone: "America/New_York",
    recurrence: { frequency: "none", until_date: null, days_of_week: [] },
    source: "self_entered",
    notes: null,
    created_by: ACTOR,
    created_at: NOW,
    ...overrides,
  }
}

function makeTimeOff(overrides: Partial<TimeOffRequest> = {}): TimeOffRequest {
  return {
    request_id: "tor1",
    org_id: ORG,
    person_id: PERSON,
    category: "vacation",
    start_date: "2026-09-10",
    end_date: "2026-09-12",
    iana_zone: "America/New_York",
    status: "pending",
    reason: null,
    reviewed_by: null,
    reviewed_at: null,
    created_by: PERSON,
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Time-off lifecycle
// ---------------------------------------------------------------------------

describe("WORK-404 — time-off status transitions", () => {
  it("documents all transitions", () => {
    expect(TIME_OFF_TRANSITIONS["pending"]).toContain("approved")
    expect(TIME_OFF_TRANSITIONS["pending"]).toContain("denied")
    expect(TIME_OFF_TRANSITIONS["pending"]).toContain("cancelled")
    expect(TIME_OFF_TRANSITIONS["approved"]).toContain("cancelled")
    expect(TIME_OFF_TRANSITIONS["denied"]).toContain("pending")
    expect(TIME_OFF_TRANSITIONS["cancelled"]).toHaveLength(0)
  })

  it("pending → approved stamps reviewer and timestamp", () => {
    const r = transitionTimeOff(makeTimeOff(), "approved", ACTOR, NOW)
    expect(r.ok).toBe(true)
    expect(r.request.status).toBe("approved")
    expect(r.request.reviewed_by).toBe(ACTOR)
    expect(r.request.reviewed_at).toBe(NOW)
  })

  it("pending → denied succeeds", () => {
    const r = transitionTimeOff(makeTimeOff(), "denied", ACTOR, NOW)
    expect(r.ok).toBe(true)
    expect(r.request.status).toBe("denied")
  })

  it("denied → pending (re-submit) succeeds", () => {
    const denied = makeTimeOff({ status: "denied" })
    const r = transitionTimeOff(denied, "pending", ACTOR, NOW)
    expect(r.ok).toBe(true)
    expect(r.request.status).toBe("pending")
  })

  it("cancelled is terminal", () => {
    const r = transitionTimeOff(makeTimeOff({ status: "cancelled" }), "pending", ACTOR, NOW)
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/cancelled.*pending/i)
  })

  it("does not mutate the original request", () => {
    const req = makeTimeOff()
    transitionTimeOff(req, "approved", ACTOR, NOW)
    expect(req.status).toBe("pending")
  })
})

// ---------------------------------------------------------------------------
// Date range overlap helper
// ---------------------------------------------------------------------------

describe("WORK-404 — date range overlap", () => {
  it("overlapping ranges return true", () => {
    expect(dateRangesOverlap("2026-09-01", "2026-09-10", "2026-09-05", "2026-09-15")).toBe(true)
  })

  it("adjacent but non-overlapping ranges return false", () => {
    expect(dateRangesOverlap("2026-09-01", "2026-09-05", "2026-09-06", "2026-09-10")).toBe(false)
  })

  it("touching on single day returns true", () => {
    expect(dateRangesOverlap("2026-09-01", "2026-09-05", "2026-09-05", "2026-09-10")).toBe(true)
  })

  it("fully contained range returns true", () => {
    expect(dateRangesOverlap("2026-09-01", "2026-09-30", "2026-09-10", "2026-09-15")).toBe(true)
  })

  it("non-overlapping ranges return false", () => {
    expect(dateRangesOverlap("2026-09-01", "2026-09-05", "2026-09-10", "2026-09-15")).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Recurrence expansion
// ---------------------------------------------------------------------------

describe("WORK-404 — recurrence expansion", () => {
  const noRecur: RecurrenceRule = { frequency: "none", until_date: null, days_of_week: [] }
  const weekly: RecurrenceRule   = { frequency: "weekly",   until_date: null, days_of_week: [] }
  const biweekly: RecurrenceRule = { frequency: "biweekly", until_date: null, days_of_week: [] }

  it("none frequency returns dates within the base interval overlapping the window", () => {
    const dates = expandRecurrence(noRecur, "2026-09-01", "2026-09-05", "2026-09-03", "2026-09-10")
    expect(dates).toContain("2026-09-03")
    expect(dates).toContain("2026-09-04")
    expect(dates).toContain("2026-09-05")
    expect(dates).not.toContain("2026-09-06")
  })

  it("none frequency with null end_date returns dates up to window end", () => {
    const dates = expandRecurrence(noRecur, "2026-09-01", null, "2026-09-01", "2026-09-03")
    expect(dates).toEqual(["2026-09-01", "2026-09-02", "2026-09-03"])
  })

  it("weekly recurrence hits the same day each week", () => {
    // base start Mon 2026-09-07, window through 2026-09-28
    const dates = expandRecurrence(weekly, "2026-09-07", null, "2026-09-07", "2026-09-28")
    expect(dates).toContain("2026-09-07")
    expect(dates).toContain("2026-09-14")
    expect(dates).toContain("2026-09-21")
    expect(dates).toContain("2026-09-28")
  })

  it("biweekly recurrence skips alternate weeks", () => {
    const dates = expandRecurrence(biweekly, "2026-09-07", null, "2026-09-07", "2026-09-28")
    expect(dates).toContain("2026-09-07")
    expect(dates).not.toContain("2026-09-14")
    expect(dates).toContain("2026-09-21")
  })

  it("until_date limits recurrence", () => {
    const rule: RecurrenceRule = { frequency: "weekly", until_date: "2026-09-14", days_of_week: [] }
    const dates = expandRecurrence(rule, "2026-09-07", null, "2026-09-07", "2026-09-28")
    expect(dates).toContain("2026-09-07")
    expect(dates).toContain("2026-09-14")
    expect(dates).not.toContain("2026-09-21")
  })

  it("days_of_week filter restricts weekly recurrence to specific days", () => {
    // frequency weekly but only Mon (1) and Wed (3)
    const rule: RecurrenceRule = { frequency: "weekly", until_date: null, days_of_week: [1, 3] }
    const dates = expandRecurrence(rule, "2026-09-07", null, "2026-09-07", "2026-09-13")
    // 2026-09-07 = Mon, 2026-09-09 = Wed, 2026-09-08 = Tue excluded
    expect(dates).toContain("2026-09-07")
    expect(dates).toContain("2026-09-09")
    expect(dates).not.toContain("2026-09-08")
    expect(dates).not.toContain("2026-09-10")
  })
})

// ---------------------------------------------------------------------------
// Availability conflict engine
// ---------------------------------------------------------------------------

describe("WORK-404 — availability conflict engine", () => {
  it("no conflict when person has positive availability and no time-off", () => {
    const result = checkAvailabilityConflicts({
      person_id: PERSON,
      dates: ["2026-09-15"],
      availability_intervals: [makeInterval()],
      time_off_requests: [],
    })
    expect(result.is_schedulable).toBe(true)
    expect(result.conflicts).toHaveLength(0)
    expect(result.blocking_conflicts).toBe(0)
  })

  it("approved time-off blocks scheduling (is_blocking=true)", () => {
    const result = checkAvailabilityConflicts({
      person_id: PERSON,
      dates: ["2026-09-10"],
      availability_intervals: [makeInterval()],
      time_off_requests: [makeTimeOff({ status: "approved", start_date: "2026-09-10", end_date: "2026-09-12" })],
    })
    expect(result.is_schedulable).toBe(false)
    expect(result.blocking_conflicts).toBe(1)
    const c = result.conflicts[0]
    expect(c.conflict_type).toBe("time_off_approved")
    expect(c.is_blocking).toBe(true)
  })

  it("pending time-off is a warning only (is_blocking=false)", () => {
    const result = checkAvailabilityConflicts({
      person_id: PERSON,
      dates: ["2026-09-10"],
      availability_intervals: [makeInterval()],
      time_off_requests: [makeTimeOff({ status: "pending" })],
    })
    expect(result.is_schedulable).toBe(true)
    expect(result.warning_conflicts).toBe(1)
    expect(result.conflicts[0].conflict_type).toBe("time_off_pending")
    expect(result.conflicts[0].is_blocking).toBe(false)
  })

  it("marked_unavailable interval blocks scheduling", () => {
    const unavailableInterval = makeInterval({
      interval_id: "iv-u",
      type: "unavailable",
      start_date: "2026-09-14",
      end_date: "2026-09-16",
    })
    const result = checkAvailabilityConflicts({
      person_id: PERSON,
      dates: ["2026-09-15"],
      availability_intervals: [makeInterval(), unavailableInterval],
      time_off_requests: [],
    })
    expect(result.is_schedulable).toBe(false)
    expect(result.conflicts[0].conflict_type).toBe("marked_unavailable")
  })

  it("outside_availability blocks when require_positive_availability=true", () => {
    // No interval covering 2026-10-05
    const result = checkAvailabilityConflicts({
      person_id: PERSON,
      dates: ["2026-10-05"],
      availability_intervals: [makeInterval({ end_date: "2026-09-30" })],
      time_off_requests: [],
      require_positive_availability: true,
    })
    expect(result.is_schedulable).toBe(false)
    expect(result.conflicts[0].conflict_type).toBe("outside_availability")
  })

  it("outside_availability is NOT flagged when require_positive_availability=false", () => {
    const result = checkAvailabilityConflicts({
      person_id: PERSON,
      dates: ["2026-10-05"],
      availability_intervals: [],
      time_off_requests: [],
      require_positive_availability: false,
    })
    expect(result.is_schedulable).toBe(true)
    expect(result.conflicts).toHaveLength(0)
  })

  it("reports correct dates_checked", () => {
    const result = checkAvailabilityConflicts({
      person_id: PERSON,
      dates: ["2026-09-01", "2026-09-02", "2026-09-03"],
      availability_intervals: [makeInterval()],
      time_off_requests: [],
    })
    expect(result.dates_checked).toBe(3)
  })

  it("only time-off for the same person_id is considered", () => {
    const result = checkAvailabilityConflicts({
      person_id: PERSON,
      dates: ["2026-09-10"],
      availability_intervals: [makeInterval()],
      time_off_requests: [
        makeTimeOff({ person_id: "other-person", status: "approved" }),
      ],
    })
    expect(result.is_schedulable).toBe(true)
    expect(result.conflicts).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// Bulk availability check
// ---------------------------------------------------------------------------

describe("WORK-404 — bulk availability check", () => {
  it("summarises schedulable, blocked, warning-only counts", () => {
    const bulk = checkBulkAvailability([
      // schedulable with no warnings
      {
        person_id: "p1",
        dates: ["2026-09-15"],
        availability_intervals: [makeInterval({ person_id: "p1" })],
        time_off_requests: [],
      },
      // blocked by approved time-off
      {
        person_id: "p2",
        dates: ["2026-09-10"],
        availability_intervals: [makeInterval({ person_id: "p2", interval_id: "iv2" })],
        time_off_requests: [makeTimeOff({ person_id: "p2", status: "approved" })],
      },
      // schedulable with pending time-off warning
      {
        person_id: "p3",
        dates: ["2026-09-10"],
        availability_intervals: [makeInterval({ person_id: "p3", interval_id: "iv3" })],
        time_off_requests: [makeTimeOff({ person_id: "p3", status: "pending" })],
      },
    ])

    expect(bulk.schedulable_count).toBe(1)   // p1
    expect(bulk.blocked_count).toBe(1)       // p2
    expect(bulk.warning_only_count).toBe(1)  // p3
    expect(bulk.results).toHaveLength(3)
  })
})
