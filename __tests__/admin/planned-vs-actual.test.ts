import { describe, it, expect } from "vitest"
import {
  createActualRecord,
  markActualStart,
  markActualEnd,
  markSkipped,
  reportDelay,
  computeTimelineVariance,
  computeVarianceNotification,
  summarizeActuals,
  type ActualRecord,
  type PlannedTimes,
} from "@/lib/admin/planned-vs-actual"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRecord(overrides: Partial<ActualRecord> = {}): ActualRecord {
  return {
    ...createActualRecord({ ros_item_id: "item-1", event_id: "event-1", operator_id: "op-1", now: "2025-08-02T18:00:00Z" }),
    ...overrides,
  }
}

const PLANNED: PlannedTimes = {
  planned_start_utc: "2025-08-02T20:00:00Z",
  planned_end_utc: "2025-08-02T20:30:00Z",
}

// ---------------------------------------------------------------------------
// createActualRecord
// ---------------------------------------------------------------------------

describe("createActualRecord", () => {
  it("creates a not_started record with null times", () => {
    const r = makeRecord()
    expect(r.status).toBe("not_started")
    expect(r.actual_start_utc).toBeNull()
    expect(r.actual_end_utc).toBeNull()
    expect(r.total_delay_minutes).toBe(0)
    expect(r.delay_entries).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// markActualStart
// ---------------------------------------------------------------------------

describe("markActualStart", () => {
  it("transitions to in_progress with actual start", () => {
    const r = makeRecord()
    const res = markActualStart(r, "2025-08-02T20:05:00Z", "op-1", "2025-08-02T20:05:00Z")
    expect(res.ok).toBe(true)
    expect(res.record?.status).toBe("in_progress")
    expect(res.record?.actual_start_utc).toBe("2025-08-02T20:05:00Z")
  })

  it("cannot start a completed record", () => {
    const r = makeRecord({ status: "completed" })
    const res = markActualStart(r, "T", "op", "T")
    expect(res.ok).toBe(false)
    expect(res.error).toMatch(/completed/)
  })

  it("cannot start a skipped record", () => {
    const r = makeRecord({ status: "skipped" })
    const res = markActualStart(r, "T", "op", "T")
    expect(res.ok).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// markActualEnd
// ---------------------------------------------------------------------------

describe("markActualEnd", () => {
  it("marks end when in_progress", () => {
    const r = makeRecord({ status: "in_progress", actual_start_utc: "2025-08-02T20:05:00Z" })
    const res = markActualEnd(r, "2025-08-02T20:35:00Z", "op-1", "2025-08-02T20:35:00Z")
    expect(res.ok).toBe(true)
    expect(res.record?.status).toBe("completed")
    expect(res.record?.actual_end_utc).toBe("2025-08-02T20:35:00Z")
  })

  it("cannot end a not_started record", () => {
    const r = makeRecord()
    const res = markActualEnd(r, "T", "op", "T")
    expect(res.ok).toBe(false)
    expect(res.error).toMatch(/started/)
  })

  it("cannot end a skipped record", () => {
    const r = makeRecord({ status: "skipped" })
    const res = markActualEnd(r, "T", "op", "T")
    expect(res.ok).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// markSkipped
// ---------------------------------------------------------------------------

describe("markSkipped", () => {
  it("skips a not_started item", () => {
    const r = makeRecord()
    const res = markSkipped(r, "op-1", "T")
    expect(res.ok).toBe(true)
    expect(res.record?.status).toBe("skipped")
  })

  it("cannot skip a completed item", () => {
    const r = makeRecord({ status: "completed" })
    const res = markSkipped(r, "op", "T")
    expect(res.ok).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// reportDelay
// ---------------------------------------------------------------------------

describe("reportDelay", () => {
  it("adds a delay entry and accumulates total", () => {
    const r = makeRecord()
    const res = reportDelay(r, { delay_id: "d-1", minutes: 10, reason: "Traffic", reported_by: "op-1", reported_at: "T" })
    expect(res.ok).toBe(true)
    expect(res.record?.total_delay_minutes).toBe(10)
    expect(res.record?.delay_entries).toHaveLength(1)
    // Add another
    const res2 = reportDelay(res.record!, { delay_id: "d-2", minutes: 5, reason: "Customs", reported_by: "op-1", reported_at: "T2" })
    expect(res2.record?.total_delay_minutes).toBe(15)
  })

  it("rejects zero or negative delay", () => {
    const r = makeRecord()
    expect(reportDelay(r, { delay_id: "d", minutes: 0, reason: "x", reported_by: "op", reported_at: "T" }).ok).toBe(false)
    expect(reportDelay(r, { delay_id: "d", minutes: -5, reason: "x", reported_by: "op", reported_at: "T" }).ok).toBe(false)
  })

  it("rejects empty reason", () => {
    const r = makeRecord()
    const res = reportDelay(r, { delay_id: "d", minutes: 5, reason: "   ", reported_by: "op", reported_at: "T" })
    expect(res.ok).toBe(false)
    expect(res.error).toMatch(/reason/)
  })
})

// ---------------------------------------------------------------------------
// computeTimelineVariance — planned NOT mutated
// ---------------------------------------------------------------------------

describe("computeTimelineVariance", () => {
  it("computes zero variance when on time", () => {
    const r: ActualRecord = {
      ...makeRecord(),
      actual_start_utc: "2025-08-02T20:00:00Z",
      actual_end_utc: "2025-08-02T20:30:00Z",
      status: "completed",
    }
    const v = computeTimelineVariance(PLANNED, r)
    expect(v.start_variance_minutes).toBe(0)
    expect(v.end_variance_minutes).toBe(0)
    expect(v.is_late_start).toBe(false)
    expect(v.is_late_end).toBe(false)
    expect(v.is_significant).toBe(false)
  })

  it("detects late start (+5 min)", () => {
    const r: ActualRecord = {
      ...makeRecord(),
      actual_start_utc: "2025-08-02T20:05:00Z",
      status: "in_progress",
    }
    const v = computeTimelineVariance(PLANNED, r)
    expect(v.start_variance_minutes).toBe(5)
    expect(v.is_late_start).toBe(true)
    expect(v.is_significant).toBe(false) // < 15 min
  })

  it("marks significant when variance >= 15 min", () => {
    const r: ActualRecord = {
      ...makeRecord(),
      actual_start_utc: "2025-08-02T20:20:00Z",
      status: "in_progress",
    }
    const v = computeTimelineVariance(PLANNED, r)
    expect(v.start_variance_minutes).toBe(20)
    expect(v.is_significant).toBe(true)
  })

  it("returns null for unmeasured times", () => {
    const v = computeTimelineVariance(PLANNED, makeRecord())
    expect(v.start_variance_minutes).toBeNull()
    expect(v.end_variance_minutes).toBeNull()
  })

  it("total_delay_minutes is reflected in is_significant", () => {
    const r: ActualRecord = {
      ...makeRecord(),
      total_delay_minutes: 20,
    }
    const v = computeTimelineVariance(PLANNED, r)
    expect(v.is_significant).toBe(true)
  })

  it("planned record is unchanged after computation", () => {
    const plannedBefore = { ...PLANNED }
    const r = makeRecord()
    computeTimelineVariance(PLANNED, r)
    expect(PLANNED).toEqual(plannedBefore)
  })
})

// ---------------------------------------------------------------------------
// computeVarianceNotification
// ---------------------------------------------------------------------------

describe("computeVarianceNotification", () => {
  it("no notification when on time", () => {
    const v = computeTimelineVariance(PLANNED, makeRecord())
    const n = computeVarianceNotification(v)
    expect(n.should_notify).toBe(false)
    expect(n.reasons).toHaveLength(0)
  })

  it("notifies on late_start", () => {
    const r: ActualRecord = { ...makeRecord(), actual_start_utc: "2025-08-02T20:05:00Z", status: "in_progress" }
    const v = computeTimelineVariance(PLANNED, r)
    const n = computeVarianceNotification(v)
    expect(n.reasons).toContain("late_start")
  })

  it("notifies on significant_delay", () => {
    const r: ActualRecord = { ...makeRecord(), total_delay_minutes: 20 }
    const v = computeTimelineVariance(PLANNED, r)
    const n = computeVarianceNotification(v)
    expect(n.reasons).toContain("significant_delay")
  })

  it("notifies on late_end", () => {
    const r: ActualRecord = {
      ...makeRecord(),
      actual_start_utc: "2025-08-02T20:00:00Z",
      actual_end_utc: "2025-08-02T20:45:00Z",
      status: "completed",
    }
    const v = computeTimelineVariance(PLANNED, r)
    const n = computeVarianceNotification(v)
    expect(n.reasons).toContain("late_end")
    expect(n.should_notify).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// summarizeActuals
// ---------------------------------------------------------------------------

describe("summarizeActuals", () => {
  it("returns zeroes for empty list", () => {
    const s = summarizeActuals([], {})
    expect(s.total_items).toBe(0)
    expect(s.delayed_item_count).toBe(0)
  })

  it("counts by status", () => {
    const r1 = makeRecord()
    const r2: ActualRecord = { ...makeRecord(), ros_item_id: "item-2", status: "completed" }
    const r3: ActualRecord = { ...makeRecord(), ros_item_id: "item-3", status: "in_progress" }
    const r4: ActualRecord = { ...makeRecord(), ros_item_id: "item-4", status: "skipped" }
    const s = summarizeActuals([r1, r2, r3, r4], {})
    expect(s.not_started_count).toBe(1)
    expect(s.completed_count).toBe(1)
    expect(s.in_progress_count).toBe(1)
    expect(s.skipped_count).toBe(1)
    expect(s.total_items).toBe(4)
  })

  it("tracks max_delay_minutes", () => {
    const r1: ActualRecord = { ...makeRecord(), total_delay_minutes: 10 }
    const r2: ActualRecord = { ...makeRecord(), ros_item_id: "item-2", total_delay_minutes: 25 }
    const s = summarizeActuals([r1, r2], {})
    expect(s.max_delay_minutes).toBe(25)
    expect(s.delayed_item_count).toBe(2)
  })

  it("counts significant variances using planned map", () => {
    const r: ActualRecord = {
      ...makeRecord(),
      actual_start_utc: "2025-08-02T20:20:00Z",
      status: "in_progress",
    }
    const s = summarizeActuals([r], { "item-1": PLANNED })
    expect(s.significant_variance_count).toBe(1)
  })
})
