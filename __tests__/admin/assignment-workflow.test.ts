/**
 * WORK-409 — Assignment workflow tests.
 */

import { describe, it, expect } from "vitest"
import {
  ASSIGNMENT_TRANSITIONS,
  transitionAssignment,
  offerAssignment,
  checkReminderEligibility,
  markReminderSent,
  requestReplacement,
  summarizeAssignments,
  type ShiftAssignment,
} from "@/lib/admin/assignment-workflow"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function assignment(overrides: Partial<ShiftAssignment> = {}): ShiftAssignment {
  return {
    assignment_id: "asgn-1",
    shift_id: "shift-1",
    person_id: "p-1",
    org_id: "org-1",
    tour_id: "tour-1",
    status: "draft",
    reason: null,
    response_deadline: null,
    last_reminder_sent_at: null,
    replacement_requested: false,
    last_actor: "admin",
    created_by: "admin",
    created_at: "2026-10-01T00:00:00",
    updated_by: "admin",
    updated_at: "2026-10-01T00:00:00",
    ...overrides,
  }
}

const NOW = "2026-10-15T12:00:00"
const FUTURE = "2026-10-20T12:00:00"
const PAST = "2026-10-10T12:00:00"
const ACTOR = "manager"

// ---------------------------------------------------------------------------
// Transition table
// ---------------------------------------------------------------------------

describe("WORK-409 — ASSIGNMENT_TRANSITIONS lifecycle", () => {
  it("draft allows: offered, cancelled", () => {
    expect(ASSIGNMENT_TRANSITIONS["draft"]).toContain("offered")
    expect(ASSIGNMENT_TRANSITIONS["draft"]).toContain("cancelled")
  })

  it("offered allows: accepted, declined, cancelled", () => {
    expect(ASSIGNMENT_TRANSITIONS["offered"]).toContain("accepted")
    expect(ASSIGNMENT_TRANSITIONS["offered"]).toContain("declined")
    expect(ASSIGNMENT_TRANSITIONS["offered"]).toContain("cancelled")
  })

  it("confirmed allows: released, cancelled", () => {
    expect(ASSIGNMENT_TRANSITIONS["confirmed"]).toContain("released")
    expect(ASSIGNMENT_TRANSITIONS["confirmed"]).toContain("cancelled")
  })

  it("cancelled is terminal", () => {
    expect(ASSIGNMENT_TRANSITIONS["cancelled"]).toHaveLength(0)
  })

  it("declined and released allow re-draft", () => {
    expect(ASSIGNMENT_TRANSITIONS["declined"]).toContain("draft")
    expect(ASSIGNMENT_TRANSITIONS["released"]).toContain("draft")
  })
})

// ---------------------------------------------------------------------------
// transitionAssignment
// ---------------------------------------------------------------------------

describe("WORK-409 — transitionAssignment: valid transitions", () => {
  it("transitions draft → offered and emits audit event", () => {
    const a = assignment({ status: "draft" })
    const result = transitionAssignment(a, "offered", ACTOR, NOW, {
      response_deadline: FUTURE,
    })
    expect(result.status).toBe("ok")
    expect(result.assignment!.status).toBe("offered")
    expect(result.assignment!.response_deadline).toBe(FUTURE)
    expect(result.audit!.action).toBe("offered")
    expect(result.audit!.actor).toBe(ACTOR)
  })

  it("transitions offered → accepted", () => {
    const a = assignment({ status: "offered" })
    const result = transitionAssignment(a, "accepted", ACTOR, NOW)
    expect(result.status).toBe("ok")
    expect(result.assignment!.status).toBe("accepted")
    expect(result.audit!.action).toBe("accepted")
  })

  it("transitions accepted → confirmed", () => {
    const a = assignment({ status: "accepted" })
    const result = transitionAssignment(a, "confirmed", ACTOR, NOW)
    expect(result.status).toBe("ok")
    expect(result.assignment!.status).toBe("confirmed")
  })
})

describe("WORK-409 — transitionAssignment: invalid transitions", () => {
  it("returns invalid_transition for illegal state change", () => {
    const a = assignment({ status: "draft" })
    const result = transitionAssignment(a, "confirmed", ACTOR, NOW)
    expect(result.status).toBe("invalid_transition")
    expect(result.audit).toBeNull()
    expect(result.error).toMatch(/draft.*confirmed/)
  })

  it("cancelled → anything returns invalid_transition", () => {
    const a = assignment({ status: "cancelled" })
    const result = transitionAssignment(a, "offered", ACTOR, NOW)
    expect(result.status).toBe("invalid_transition")
  })
})

describe("WORK-409 — transitionAssignment: reason requirement", () => {
  it("declined requires a reason", () => {
    const a = assignment({ status: "offered" })
    const result = transitionAssignment(a, "declined", ACTOR, NOW)
    expect(result.status).toBe("validation_error")
    expect(result.error).toMatch(/reason/)
  })

  it("released requires a reason", () => {
    const a = assignment({ status: "confirmed" })
    const result = transitionAssignment(a, "released", ACTOR, NOW)
    expect(result.status).toBe("validation_error")
    expect(result.error).toMatch(/reason/)
  })

  it("declined with reason succeeds", () => {
    const a = assignment({ status: "offered" })
    const result = transitionAssignment(a, "declined", ACTOR, NOW, { reason: "Schedule conflict" })
    expect(result.status).toBe("ok")
    expect(result.assignment!.reason).toBe("Schedule conflict")
    expect(result.audit!.reason).toBe("Schedule conflict")
  })
})

// ---------------------------------------------------------------------------
// offerAssignment
// ---------------------------------------------------------------------------

describe("WORK-409 — offerAssignment", () => {
  it("sets offered status and response_deadline", () => {
    const a = assignment({ status: "draft" })
    const result = offerAssignment(a, ACTOR, NOW, FUTURE)
    expect(result.status).toBe("ok")
    expect(result.assignment!.status).toBe("offered")
    expect(result.assignment!.response_deadline).toBe(FUTURE)
  })
})

// ---------------------------------------------------------------------------
// Reminder eligibility
// ---------------------------------------------------------------------------

describe("WORK-409 — checkReminderEligibility", () => {
  it("eligible when offered, deadline in future, no prior reminder", () => {
    const a = assignment({ status: "offered", response_deadline: FUTURE })
    const el = checkReminderEligibility(a, NOW)
    expect(el.eligible).toBe(true)
  })

  it("ineligible when not offered", () => {
    const a = assignment({ status: "confirmed" })
    const el = checkReminderEligibility(a, NOW)
    expect(el.eligible).toBe(false)
    expect(el.reason).toMatch(/not.*offered/i)
  })

  it("ineligible when deadline has passed", () => {
    const a = assignment({ status: "offered", response_deadline: PAST })
    const el = checkReminderEligibility(a, NOW)
    expect(el.eligible).toBe(false)
    expect(el.reason).toMatch(/passed/)
  })

  it("ineligible when last reminder too recent", () => {
    const a = assignment({
      status: "offered",
      response_deadline: FUTURE,
      last_reminder_sent_at: "2026-10-15T06:00:00", // 6h ago
    })
    const el = checkReminderEligibility(a, NOW, 24)
    expect(el.eligible).toBe(false)
    expect(el.reason).toMatch(/6\.0h/)
  })

  it("eligible when last reminder is old enough", () => {
    const a = assignment({
      status: "offered",
      response_deadline: FUTURE,
      last_reminder_sent_at: "2026-10-13T12:00:00", // 48h ago
    })
    const el = checkReminderEligibility(a, NOW, 24)
    expect(el.eligible).toBe(true)
  })
})

describe("WORK-409 — markReminderSent", () => {
  it("sets last_reminder_sent_at and emits audit", () => {
    const a = assignment({ status: "offered" })
    const { assignment: updated, audit } = markReminderSent(a, ACTOR, NOW)
    expect(updated.last_reminder_sent_at).toBe(NOW)
    expect(audit.action).toBe("reminder_sent")
    expect(audit.actor).toBe(ACTOR)
  })
})

// ---------------------------------------------------------------------------
// Replacement workflow
// ---------------------------------------------------------------------------

describe("WORK-409 — requestReplacement", () => {
  it("creates replacement request for declined assignment", () => {
    const a = assignment({ status: "declined", reason: "Conflict" })
    const result = requestReplacement(a, ACTOR, NOW)
    expect("error" in result).toBe(false)
    if ("error" in result) return
    expect(result.assignment.replacement_requested).toBe(true)
    expect(result.replacement.shift_id).toBe("shift-1")
    expect(result.replacement.reason).toBe("Conflict")
    expect(result.audit.action).toBe("replacement_requested")
  })

  it("creates replacement request for released assignment", () => {
    const a = assignment({ status: "released", reason: "Medical leave" })
    const result = requestReplacement(a, ACTOR, NOW)
    expect("error" in result).toBe(false)
    if ("error" in result) return
    expect(result.replacement.reason).toBe("Medical leave")
  })

  it("returns error when assignment is not declined or released", () => {
    const a = assignment({ status: "confirmed" })
    const result = requestReplacement(a, ACTOR, NOW)
    expect("error" in result).toBe(true)
    if (!("error" in result)) return
    expect(result.error).toMatch(/declined.*released/i)
  })

  it("returns error when replacement already requested", () => {
    const a = assignment({ status: "declined", replacement_requested: true })
    const result = requestReplacement(a, ACTOR, NOW)
    expect("error" in result).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

describe("WORK-409 — summarizeAssignments", () => {
  it("counts by status correctly", () => {
    const assignments = [
      assignment({ status: "draft" }),
      assignment({ assignment_id: "a2", status: "offered", response_deadline: FUTURE }),
      assignment({ assignment_id: "a3", status: "confirmed" }),
      assignment({ assignment_id: "a4", status: "declined", replacement_requested: false }),
    ]
    const summary = summarizeAssignments(assignments, NOW)
    expect(summary.total).toBe(4)
    expect(summary.by_status.draft).toBe(1)
    expect(summary.by_status.offered).toBe(1)
    expect(summary.by_status.confirmed).toBe(1)
    expect(summary.by_status.declined).toBe(1)
    expect(summary.needs_replacement).toBe(1)
    expect(summary.overdue_response).toBe(0)
  })

  it("flags overdue_response when offered deadline has passed", () => {
    const assignments = [
      assignment({ assignment_id: "a1", status: "offered", response_deadline: PAST }),
      assignment({ assignment_id: "a2", status: "offered", response_deadline: FUTURE }),
    ]
    const summary = summarizeAssignments(assignments, NOW)
    expect(summary.overdue_response).toBe(1)
  })

  it("needs_replacement = 0 when replacement already requested", () => {
    const assignments = [
      assignment({ assignment_id: "a1", status: "declined", replacement_requested: true }),
    ]
    const summary = summarizeAssignments(assignments, NOW)
    expect(summary.needs_replacement).toBe(0)
  })
})
