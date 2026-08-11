import { describe, it, expect } from "vitest"
import {
  createPendingChange,
  checkApprovalAuthorization,
  approveChange,
  rejectChange,
  withdrawChange,
  summarizePendingChanges,
  type PlanSectionOwnership,
  type PendingPlanChange,
} from "@/lib/admin/plan-section-approvals"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const OWNER_POLICY: PlanSectionOwnership = {
  section: "stops",
  owner_user_id: "user-owner",
  owner_department: null,
  approval_policy: "owner_only",
  approver_ids: [],
}

const EDITOR_POLICY: PlanSectionOwnership = {
  section: "route",
  owner_user_id: "user-owner",
  owner_department: null,
  approval_policy: "any_approved_editor",
  approver_ids: ["editor-1", "editor-2"],
}

const NO_GATE_POLICY: PlanSectionOwnership = {
  section: "budget",
  owner_user_id: "user-owner",
  owner_department: null,
  approval_policy: "none",
  approver_ids: [],
}

function makeChange(overrides: Partial<PendingPlanChange> = {}): PendingPlanChange {
  return createPendingChange({
    change_id: "ch-1",
    tour_id: "tour-1",
    section: "stops",
    proposed_by: "user-proposer",
    proposed_at: "2025-08-01T10:00:00Z",
    summary: "Move stop 3 from NYC to LA",
    payload: { ordinal: 3, venue: "LA" },
    affects_published_operations: false,
    ...overrides,
  })
}

// ---------------------------------------------------------------------------
// createPendingChange
// ---------------------------------------------------------------------------

describe("createPendingChange", () => {
  it("creates a pending change", () => {
    const c = makeChange()
    expect(c.status).toBe("pending")
    expect(c.reviewed_by).toBeNull()
    expect(c.affects_published_operations).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// checkApprovalAuthorization
// ---------------------------------------------------------------------------

describe("checkApprovalAuthorization", () => {
  it("owner_only: owner is authorized", () => {
    const c = makeChange()
    const r = checkApprovalAuthorization(c, OWNER_POLICY, "user-owner")
    expect(r.authorized).toBe(true)
  })

  it("owner_only: non-owner is not authorized", () => {
    const c = makeChange()
    const r = checkApprovalAuthorization(c, OWNER_POLICY, "user-random")
    expect(r.authorized).toBe(false)
    expect(r.reason).toMatch(/owner/)
  })

  it("any_approved_editor: owner is authorized", () => {
    const c = makeChange({ section: "route" })
    expect(checkApprovalAuthorization(c, EDITOR_POLICY, "user-owner").authorized).toBe(true)
  })

  it("any_approved_editor: listed editor is authorized", () => {
    const c = makeChange({ section: "route" })
    expect(checkApprovalAuthorization(c, EDITOR_POLICY, "editor-1").authorized).toBe(true)
  })

  it("any_approved_editor: unlisted user is not authorized", () => {
    const c = makeChange({ section: "route" })
    expect(checkApprovalAuthorization(c, EDITOR_POLICY, "random-user").authorized).toBe(false)
  })

  it("none policy: any actor is authorized", () => {
    const c = makeChange({ section: "budget" })
    expect(checkApprovalAuthorization(c, NO_GATE_POLICY, "anyone").authorized).toBe(true)
  })

  it("blocks review of non-pending change", () => {
    const c: PendingPlanChange = { ...makeChange(), status: "approved" }
    expect(checkApprovalAuthorization(c, OWNER_POLICY, "user-owner").authorized).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// approveChange
// ---------------------------------------------------------------------------

describe("approveChange", () => {
  it("approves change by authorized actor", () => {
    const c = makeChange()
    const r = approveChange(c, OWNER_POLICY, "user-owner", "T")
    expect(r.ok).toBe(true)
    expect(r.change?.status).toBe("approved")
    expect(r.change?.reviewed_by).toBe("user-owner")
  })

  it("rejects approval by unauthorized actor", () => {
    const c = makeChange()
    const r = approveChange(c, OWNER_POLICY, "rando", "T")
    expect(r.ok).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// rejectChange
// ---------------------------------------------------------------------------

describe("rejectChange", () => {
  it("rejects change with reason", () => {
    const c = makeChange()
    const r = rejectChange(c, OWNER_POLICY, "user-owner", "T", "Stop conflicts with hold")
    expect(r.ok).toBe(true)
    expect(r.change?.status).toBe("rejected")
    expect(r.change?.review_reason).toBe("Stop conflicts with hold")
  })

  it("requires non-empty reason", () => {
    const c = makeChange()
    const r = rejectChange(c, OWNER_POLICY, "user-owner", "T", "  ")
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/reason/)
  })
})

// ---------------------------------------------------------------------------
// withdrawChange
// ---------------------------------------------------------------------------

describe("withdrawChange", () => {
  it("proposer can withdraw pending change", () => {
    const c = makeChange()
    const r = withdrawChange(c, "user-proposer", "T")
    expect(r.ok).toBe(true)
    expect(r.change?.status).toBe("withdrawn")
  })

  it("non-proposer cannot withdraw", () => {
    const c = makeChange()
    const r = withdrawChange(c, "user-other", "T")
    expect(r.ok).toBe(false)
  })

  it("cannot withdraw an approved change", () => {
    const c: PendingPlanChange = { ...makeChange(), status: "approved" }
    const r = withdrawChange(c, "user-proposer", "T")
    expect(r.ok).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// summarizePendingChanges
// ---------------------------------------------------------------------------

describe("summarizePendingChanges", () => {
  it("counts pending changes only", () => {
    const p1 = makeChange()
    const p2 = makeChange({ change_id: "ch-2", affects_published_operations: true })
    const p3: PendingPlanChange = { ...makeChange({ change_id: "ch-3" }), status: "approved" }
    const s = summarizePendingChanges([p1, p2, p3])
    expect(s.total_pending).toBe(2)
    expect(s.pending_affecting_published).toBe(1)
    expect(s.by_section["stops"]).toBe(2)
  })

  it("returns zero for empty list", () => {
    const s = summarizePendingChanges([])
    expect(s.total_pending).toBe(0)
  })
})
