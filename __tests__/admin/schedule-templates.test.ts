/**
 * WORK-407 — Schedule template tests.
 */

import { describe, it, expect } from "vitest"
import {
  parseLocalTime,
  buildLocalDatetime,
  addMinutesToLocalDatetime,
  localTimesOverlap,
  previewScheduleTemplate,
  applyScheduleTemplate,
  type ScheduleTemplate,
  type ExistingShiftRecord,
  type MilestoneMap,
} from "@/lib/admin/schedule-templates"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTemplate(overrides: Partial<ScheduleTemplate> = {}): ScheduleTemplate {
  return {
    template_id: "tmpl-1",
    org_id: "org-1",
    name: "Standard Show Day",
    status: "published",
    version: 1,
    shifts: [
      {
        slot_id: "slot-load-in",
        role_label: "Load In – Stage",
        department: "Stage",
        column_type: "show",
        anchor_type: "milestone_offset",
        milestone_name: "doors",
        milestone_offset_minutes: -180, // 3h before doors
        duration_minutes: 120,
        headcount_required: 4,
        is_required: true,
        skill_tags: ["rigging"],
        estimated_rate_per_hour: 50,
        rate_currency: "USD",
      },
      {
        slot_id: "slot-show",
        role_label: "Show Call",
        department: "Stage",
        column_type: "show",
        anchor_type: "milestone_offset",
        milestone_name: "doors",
        milestone_offset_minutes: 0,
        duration_minutes: 180,
        headcount_required: 6,
        is_required: true,
        skill_tags: [],
        estimated_rate_per_hour: 55,
        rate_currency: "USD",
      },
      {
        slot_id: "slot-catering",
        role_label: "Catering Setup",
        department: "Catering",
        column_type: "other",
        anchor_type: "fixed_local_time",
        fixed_local_time: "10:00",
        duration_minutes: 90,
        headcount_required: 2,
        is_required: false,
        estimated_rate_per_hour: 30,
        rate_currency: "USD",
      },
    ],
    created_by: "admin",
    created_at: "2026-01-01T00:00:00",
    updated_by: "admin",
    updated_at: "2026-01-01T00:00:00",
    ...overrides,
  }
}

const DATE = "2026-10-15"
const MILESTONES: MilestoneMap = {
  doors: "2026-10-15T19:00:00",
}

// ---------------------------------------------------------------------------
// Helper unit tests
// ---------------------------------------------------------------------------

describe("WORK-407 — parseLocalTime", () => {
  it("parses valid HH:MM", () => {
    expect(parseLocalTime("09:30")).toBe(9 * 60 + 30)
    expect(parseLocalTime("00:00")).toBe(0)
    expect(parseLocalTime("23:59")).toBe(23 * 60 + 59)
  })

  it("returns null for malformed input", () => {
    expect(parseLocalTime("25:00")).toBeNull()
    expect(parseLocalTime("abc")).toBeNull()
    expect(parseLocalTime("9:5")).toBeNull() // minutes must be 2 digits
  })
})

describe("WORK-407 — buildLocalDatetime", () => {
  it("builds ISO datetime from date and minutes-since-midnight", () => {
    expect(buildLocalDatetime("2026-10-15", 9 * 60 + 30)).toBe("2026-10-15T09:30:00")
    expect(buildLocalDatetime("2026-10-15", 0)).toBe("2026-10-15T00:00:00")
    expect(buildLocalDatetime("2026-10-15", 23 * 60 + 59)).toBe("2026-10-15T23:59:00")
  })
})

describe("WORK-407 — addMinutesToLocalDatetime", () => {
  it("adds positive minutes", () => {
    const result = addMinutesToLocalDatetime("2026-10-15T19:00:00", 30)
    expect(result).toBe("2026-10-15T19:30:00")
  })

  it("subtracts minutes (negative offset)", () => {
    const result = addMinutesToLocalDatetime("2026-10-15T19:00:00", -180)
    expect(result).toBe("2026-10-15T16:00:00")
  })
})

describe("WORK-407 — localTimesOverlap", () => {
  it("detects overlap", () => {
    expect(localTimesOverlap("10:00", "14:00", "12:00", "16:00")).toBe(true)
  })

  it("no overlap when sequential", () => {
    expect(localTimesOverlap("10:00", "14:00", "14:00", "18:00")).toBe(false)
  })

  it("no overlap when completely separate", () => {
    expect(localTimesOverlap("10:00", "11:00", "12:00", "13:00")).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// previewScheduleTemplate
// ---------------------------------------------------------------------------

describe("WORK-407 — previewScheduleTemplate: resolved shifts", () => {
  it("resolves milestone-offset shifts to correct times", () => {
    const preview = previewScheduleTemplate({
      template: makeTemplate(),
      date: DATE,
      milestones: MILESTONES,
      existingShifts: [],
    })
    const loadIn = preview.shifts.find((s) => s.slot_id === "slot-load-in")!
    expect(loadIn.status).toBe("new")
    expect(loadIn.start_local).toBe("2026-10-15T16:00:00")  // doors (19:00) - 180min
    expect(loadIn.end_local).toBe("2026-10-15T18:00:00")    // +120min
  })

  it("resolves fixed_local_time shifts", () => {
    const preview = previewScheduleTemplate({
      template: makeTemplate(),
      date: DATE,
      milestones: MILESTONES,
      existingShifts: [],
    })
    const catering = preview.shifts.find((s) => s.slot_id === "slot-catering")!
    expect(catering.status).toBe("new")
    expect(catering.start_local).toBe("2026-10-15T10:00:00")
    expect(catering.end_local).toBe("2026-10-15T11:30:00")
  })

  it("can_apply=true when no conflicts and all required slots resolved", () => {
    const preview = previewScheduleTemplate({
      template: makeTemplate(),
      date: DATE,
      milestones: MILESTONES,
      existingShifts: [],
    })
    expect(preview.can_apply).toBe(true)
    expect(preview.unresolved_required_count).toBe(0)
    expect(preview.hard_conflict_count).toBe(0)
  })
})

describe("WORK-407 — previewScheduleTemplate: unresolved milestone", () => {
  it("marks required slot as unresolved_role when milestone missing", () => {
    const preview = previewScheduleTemplate({
      template: makeTemplate(),
      date: DATE,
      milestones: {}, // no milestones provided
      existingShifts: [],
    })
    const loadIn = preview.shifts.find((s) => s.slot_id === "slot-load-in")!
    expect(loadIn.status).toBe("unresolved_role")
    expect(loadIn.start_local).toBeNull()
    expect(loadIn.unresolved_reason).toMatch(/doors/)
    expect(preview.unresolved_required_count).toBe(2) // slot-load-in and slot-show
    expect(preview.can_apply).toBe(false)
  })
})

describe("WORK-407 — previewScheduleTemplate: conflicts", () => {
  it("flags soft conflict with unlocked existing shift", () => {
    const existing: ExistingShiftRecord[] = [
      {
        shift_id: "ex-1",
        role_label: "Other Stage",
        department: "Stage",
        start_local: "2026-10-15T15:30:00",
        end_local: "2026-10-15T17:00:00",
        is_locked: false,
      },
    ]
    const preview = previewScheduleTemplate({
      template: makeTemplate(),
      date: DATE,
      milestones: MILESTONES,
      existingShifts: existing,
    })
    const loadIn = preview.shifts.find((s) => s.slot_id === "slot-load-in")!
    expect(loadIn.status).toBe("conflict")
    expect(loadIn.conflict_shift_ids).toContain("ex-1")
    expect(preview.soft_conflict_count).toBe(1)
    expect(preview.hard_conflict_count).toBe(0)
    expect(preview.can_apply).toBe(true) // soft conflict doesn't block application
  })

  it("flags hard conflict with locked existing shift and blocks apply", () => {
    const existing: ExistingShiftRecord[] = [
      {
        shift_id: "locked-1",
        role_label: "Locked Stage",
        department: "Stage",
        start_local: "2026-10-15T16:30:00",
        end_local: "2026-10-15T17:30:00",
        is_locked: true,
      },
    ]
    const preview = previewScheduleTemplate({
      template: makeTemplate(),
      date: DATE,
      milestones: MILESTONES,
      existingShifts: existing,
    })
    const loadIn = preview.shifts.find((s) => s.slot_id === "slot-load-in")!
    expect(loadIn.status).toBe("locked_conflict")
    expect(preview.hard_conflict_count).toBe(1)
    expect(preview.can_apply).toBe(false)
  })
})

describe("WORK-407 — previewScheduleTemplate: estimated cost", () => {
  it("computes estimated cost per shift (rate × hours × headcount)", () => {
    const preview = previewScheduleTemplate({
      template: makeTemplate(),
      date: DATE,
      milestones: MILESTONES,
      existingShifts: [],
    })
    const loadIn = preview.shifts.find((s) => s.slot_id === "slot-load-in")!
    // 2h * $50/h * 4 people = $400
    expect(loadIn.estimated_cost).toBe(400)
    expect(loadIn.rate_currency).toBe("USD")
  })

  it("computes total estimated cost for all shifts", () => {
    const preview = previewScheduleTemplate({
      template: makeTemplate(),
      date: DATE,
      milestones: MILESTONES,
      existingShifts: [],
    })
    // load-in: 2h * $50 * 4 = 400
    // show: 3h * $55 * 6 = 990
    // catering: 1.5h * $30 * 2 = 90
    expect(preview.estimated_total_cost).toBe(400 + 990 + 90)
    expect(preview.currency).toBe("USD")
  })

  it("estimated_total_cost is null when any slot has unknown rate", () => {
    const tmpl = makeTemplate()
    tmpl.shifts[0].estimated_rate_per_hour = undefined
    const preview = previewScheduleTemplate({
      template: tmpl,
      date: DATE,
      milestones: MILESTONES,
      existingShifts: [],
    })
    expect(preview.estimated_total_cost).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// applyScheduleTemplate
// ---------------------------------------------------------------------------

describe("WORK-407 — applyScheduleTemplate", () => {
  it("creates all shifts when no conflicts", () => {
    const result = applyScheduleTemplate({
      template: makeTemplate(),
      date: DATE,
      milestones: MILESTONES,
      existingShifts: [],
    })
    expect(result.created_count).toBe(3)
    expect(result.skipped_count).toBe(0)
    expect(result.complete).toBe(true)
    expect(result.items.every((i) => i.result === "created")).toBe(true)
  })

  it("skips locked conflict shifts", () => {
    const existing: ExistingShiftRecord[] = [
      {
        shift_id: "locked-1",
        role_label: "Existing",
        department: "Stage",
        start_local: "2026-10-15T16:30:00",
        end_local: "2026-10-15T17:30:00",
        is_locked: true,
      },
    ]
    const result = applyScheduleTemplate({
      template: makeTemplate(),
      date: DATE,
      milestones: MILESTONES,
      existingShifts: existing,
    })
    const loadIn = result.items.find((i) => i.slot_id === "slot-load-in")!
    expect(loadIn.result).toBe("skipped_locked")
    expect(result.complete).toBe(false) // required slot was skipped
  })

  it("skips soft conflict by default", () => {
    const existing: ExistingShiftRecord[] = [
      {
        shift_id: "soft-1",
        role_label: "Other",
        department: "Stage",
        start_local: "2026-10-15T15:30:00",
        end_local: "2026-10-15T17:00:00",
        is_locked: false,
      },
    ]
    const result = applyScheduleTemplate({
      template: makeTemplate(),
      date: DATE,
      milestones: MILESTONES,
      existingShifts: existing,
    })
    const loadIn = result.items.find((i) => i.slot_id === "slot-load-in")!
    expect(loadIn.result).toBe("skipped_conflict")
  })

  it("creates soft-conflict shifts when override_soft_conflicts=true", () => {
    const existing: ExistingShiftRecord[] = [
      {
        shift_id: "soft-1",
        role_label: "Other",
        department: "Stage",
        start_local: "2026-10-15T15:30:00",
        end_local: "2026-10-15T17:00:00",
        is_locked: false,
      },
    ]
    const result = applyScheduleTemplate({
      template: makeTemplate(),
      date: DATE,
      milestones: MILESTONES,
      existingShifts: existing,
      override_soft_conflicts: true,
    })
    const loadIn = result.items.find((i) => i.slot_id === "slot-load-in")!
    expect(loadIn.result).toBe("created")
  })

  it("marks unresolved (missing milestone) slots as skipped_unresolved", () => {
    const result = applyScheduleTemplate({
      template: makeTemplate(),
      date: DATE,
      milestones: {},
      existingShifts: [],
    })
    const loadIn = result.items.find((i) => i.slot_id === "slot-load-in")!
    expect(loadIn.result).toBe("skipped_unresolved")
    expect(loadIn.detail).toMatch(/doors/)
    expect(result.complete).toBe(false)
  })

  it("complete=true only when all required slots are created", () => {
    const result = applyScheduleTemplate({
      template: makeTemplate(),
      date: DATE,
      milestones: MILESTONES,
      existingShifts: [],
    })
    expect(result.complete).toBe(true)
    // required slots: slot-load-in, slot-show (catering is not required)
    const requiredItems = result.items.filter((i) => ["slot-load-in", "slot-show"].includes(i.slot_id))
    expect(requiredItems.every((i) => i.result === "created")).toBe(true)
  })
})
