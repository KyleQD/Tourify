/**
 * WORK-410 — Conflict resolution tests.
 */

import { describe, it, expect } from "vitest"
import {
  overrideConflict,
  markConflictRemediated,
  conflictFromLaborViolation,
  conflictFromAvailabilityConflict,
  conflictFromCredentialGap,
  summarizeConflicts,
  type WorkforceConflict,
} from "@/lib/admin/workforce-conflict-resolution"
import type { LaborViolation } from "@/lib/admin/labor-rest-rules"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function conflict(overrides: Partial<WorkforceConflict> = {}): WorkforceConflict {
  return {
    conflict_id: "c-1",
    source: "labor_rule",
    severity: "error",
    status: "open",
    title: "Labor violation: turnaround",
    evidence: {
      description: "Only 6h rest between shifts (minimum 10h).",
      shift_ids: ["s1", "s2"],
      assignment_ids: [],
      person_ids: ["p-1"],
      rule_text: "Turnaround is measured from actual end of last call",
    },
    remediations: [
      { action: "extend_rest", description: "Add rest period.", target_id: "s1" },
    ],
    detected_at: "2026-10-15T10:00:00",
    override: null,
    ...overrides,
  }
}

const ACTOR = "admin"
const NOW = "2026-10-15T12:00:00"

// ---------------------------------------------------------------------------
// overrideConflict
// ---------------------------------------------------------------------------

describe("WORK-410 — overrideConflict", () => {
  it("overrides an open conflict with reason", () => {
    const c = conflict()
    const result = overrideConflict(c, ACTOR, NOW, "Accepted by tour manager")
    expect(result.status).toBe("ok")
    expect(result.conflict!.status).toBe("overridden")
    expect(result.conflict!.override!.actor).toBe(ACTOR)
    expect(result.conflict!.override!.reason).toBe("Accepted by tour manager")
    expect(result.conflict!.override!.at).toBe(NOW)
  })

  it("rejects override without reason", () => {
    const c = conflict()
    const result = overrideConflict(c, ACTOR, NOW, "")
    expect(result.status).toBe("validation_error")
    expect(result.error).toMatch(/reason/)
  })

  it("rejects override of already-overridden conflict", () => {
    const c = conflict({ status: "overridden", override: { actor: ACTOR, reason: "ok", at: NOW } })
    const result = overrideConflict(c, ACTOR, NOW, "Another reason")
    expect(result.status).toBe("already_resolved")
  })

  it("rejects override of remediated conflict", () => {
    const c = conflict({ status: "remediated" })
    const result = overrideConflict(c, ACTOR, NOW, "Irrelevant")
    expect(result.status).toBe("already_resolved")
  })
})

// ---------------------------------------------------------------------------
// markConflictRemediated
// ---------------------------------------------------------------------------

describe("WORK-410 — markConflictRemediated", () => {
  it("marks an open conflict as remediated", () => {
    const c = conflict()
    const result = markConflictRemediated(c, ACTOR, NOW)
    expect(result.status).toBe("ok")
    expect(result.conflict!.status).toBe("remediated")
  })

  it("returns already_resolved for already-remediated conflict", () => {
    const c = conflict({ status: "remediated" })
    const result = markConflictRemediated(c, ACTOR, NOW)
    expect(result.status).toBe("already_resolved")
  })
})

// ---------------------------------------------------------------------------
// conflictFromLaborViolation
// ---------------------------------------------------------------------------

describe("WORK-410 — conflictFromLaborViolation", () => {
  it("creates conflict from turnaround violation", () => {
    const violation: LaborViolation = {
      violation_type: "turnaround",
      severity: "error",
      person_id: "p-1",
      shift_ids: ["s1", "s2"],
      detail: "Only 6.0h rest between shifts (minimum 10h).",
      assumption: "Turnaround is measured from actual end of last call",
    }
    const c = conflictFromLaborViolation(violation, "c-labor-1", NOW)
    expect(c.source).toBe("labor_rule")
    expect(c.severity).toBe("error")
    expect(c.evidence.shift_ids).toContain("s1")
    expect(c.evidence.person_ids).toContain("p-1")
    expect(c.evidence.rule_text).toBe(violation.assumption)
    expect(c.remediations.length).toBeGreaterThan(0)
    expect(c.status).toBe("open")
  })

  it("creates conflict from shift_overlap violation with remove_shift remediation", () => {
    const violation: LaborViolation = {
      violation_type: "shift_overlap",
      severity: "error",
      person_id: "p-1",
      shift_ids: ["s1", "s2"],
      detail: "Shift s1 overlaps s2.",
      assumption: "Assignments must not overlap",
    }
    const c = conflictFromLaborViolation(violation, "c-overlap-1", NOW)
    expect(c.remediations[0].action).toBe("remove_shift")
  })
})

// ---------------------------------------------------------------------------
// conflictFromAvailabilityConflict
// ---------------------------------------------------------------------------

describe("WORK-410 — conflictFromAvailabilityConflict", () => {
  it("creates error-severity conflict for time_off_approved", () => {
    const c = conflictFromAvailabilityConflict({
      conflict_id: "c-avail-1",
      person_id: "p-1",
      shift_id: "s1",
      conflict_type: "time_off_approved",
      detail: "Person p-1 has approved time off on this date.",
      detected_at: NOW,
    })
    expect(c.severity).toBe("error")
    expect(c.source).toBe("availability")
    expect(c.remediations[0].action).toBe("replace_person")
  })

  it("creates warning-severity conflict for time_off_pending", () => {
    const c = conflictFromAvailabilityConflict({
      conflict_id: "c-avail-2",
      person_id: "p-1",
      shift_id: "s1",
      conflict_type: "time_off_pending",
      detail: "Person p-1 has pending time off on this date.",
      detected_at: NOW,
    })
    expect(c.severity).toBe("warning")
  })
})

// ---------------------------------------------------------------------------
// conflictFromCredentialGap
// ---------------------------------------------------------------------------

describe("WORK-410 — conflictFromCredentialGap", () => {
  it("creates error-severity conflict for blocking credential gap", () => {
    const c = conflictFromCredentialGap({
      conflict_id: "c-cred-1",
      person_id: "p-1",
      shift_id: "s1",
      credential_type: "forklift_operator",
      gap_code: "missing",
      detail: "Required credential 'forklift_operator' is missing.",
      is_blocking: true,
      detected_at: NOW,
    })
    expect(c.severity).toBe("error")
    expect(c.source).toBe("credential_gap")
    expect(c.remediations[0].action).toBe("update_credential")
    expect(c.title).toMatch(/forklift_operator/)
  })

  it("creates warning-severity conflict for non-blocking credential gap", () => {
    const c = conflictFromCredentialGap({
      conflict_id: "c-cred-2",
      person_id: "p-1",
      shift_id: "s1",
      credential_type: "first_aid",
      gap_code: "unverified",
      detail: "Credential 'first_aid' is unverified.",
      is_blocking: false,
      detected_at: NOW,
    })
    expect(c.severity).toBe("warning")
  })
})

// ---------------------------------------------------------------------------
// summarizeConflicts
// ---------------------------------------------------------------------------

describe("WORK-410 — summarizeConflicts", () => {
  it("counts by status and severity correctly", () => {
    const conflicts = [
      conflict({ conflict_id: "c1", severity: "error", status: "open" }),
      conflict({ conflict_id: "c2", severity: "warning", status: "open" }),
      conflict({ conflict_id: "c3", severity: "error", status: "overridden", override: { actor: ACTOR, reason: "ok", at: NOW } }),
      conflict({ conflict_id: "c4", severity: "error", status: "remediated" }),
    ]
    const summary = summarizeConflicts(conflicts)
    expect(summary.total).toBe(4)
    expect(summary.open).toBe(2)
    expect(summary.overridden).toBe(1)
    expect(summary.remediated).toBe(1)
    expect(summary.error_count).toBe(1)   // only open errors
    expect(summary.warning_count).toBe(1)
    expect(summary.by_source.labor_rule).toBe(4)
  })

  it("can_publish=true when no open errors", () => {
    const conflicts = [
      conflict({ conflict_id: "c1", severity: "error", status: "overridden", override: { actor: ACTOR, reason: "ok", at: NOW } }),
      conflict({ conflict_id: "c2", severity: "warning", status: "open" }),
    ]
    const summary = summarizeConflicts(conflicts)
    expect(summary.can_publish).toBe(true)
  })

  it("can_publish=false when open errors exist", () => {
    const conflicts = [
      conflict({ conflict_id: "c1", severity: "error", status: "open" }),
    ]
    const summary = summarizeConflicts(conflicts)
    expect(summary.can_publish).toBe(false)
  })

  it("empty list produces zero counts and can_publish=true", () => {
    const summary = summarizeConflicts([])
    expect(summary.total).toBe(0)
    expect(summary.can_publish).toBe(true)
  })
})
