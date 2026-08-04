import { describe, it, expect } from "vitest"
import {
  transitionSectionStatus,
  assignSectionOwner,
  addSectionParticipant,
  addSectionComment,
  resolveChangeRequest,
  hasOpenChangeRequests,
  changeSectionStatus,
  changeSectionDueDate,
  canApproveSection,
  type AdvanceSectionRecord,
  type AdvanceSectionComment,
} from "../../lib/admin/advance-section-approval"

// ---------------------------------------------------------------------------
// Fixture
// ---------------------------------------------------------------------------

function baseSection(overrides: Partial<AdvanceSectionRecord> = {}): AdvanceSectionRecord {
  return {
    id: "sec-1",
    advance_id: "adv-1",
    event_id: "ev-1",
    org_id: "org-1",
    template_section_id: "ts-1",
    title: "Venue Details",
    status: "not_started",
    participants: [],
    comments: [],
    approvals: [],
    audit_events: [],
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// transitionSectionStatus
// ---------------------------------------------------------------------------

describe("transitionSectionStatus", () => {
  it("allows not_started → in_progress", () => {
    expect(transitionSectionStatus("not_started", "in_progress").ok).toBe(true)
  })
  it("allows in_progress → submitted", () => {
    expect(transitionSectionStatus("in_progress", "submitted").ok).toBe(true)
  })
  it("allows submitted → approved", () => {
    expect(transitionSectionStatus("submitted", "approved").ok).toBe(true)
  })
  it("allows approved → reopened with reason", () => {
    expect(transitionSectionStatus("approved", "reopened", { reopen_reason: "Address changed" }).ok).toBe(true)
  })
  it("blocks approved → reopened without reason", () => {
    const r = transitionSectionStatus("approved", "reopened")
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/reopen_reason/)
  })
  it("blocks invalid transition", () => {
    expect(transitionSectionStatus("not_started", "approved").ok).toBe(false)
  })
  it("allows submitted → needs_changes", () => {
    expect(transitionSectionStatus("submitted", "needs_changes").ok).toBe(true)
  })
  it("allows needs_changes → in_progress", () => {
    expect(transitionSectionStatus("needs_changes", "in_progress").ok).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// assignSectionOwner
// ---------------------------------------------------------------------------

describe("assignSectionOwner", () => {
  it("adds owner participant", () => {
    const s = assignSectionOwner(baseSection(), "user-pm", "admin-1", "2025-06-01T00:00:00Z")
    expect(s.participants).toHaveLength(1)
    expect(s.participants[0].role).toBe("owner")
    expect(s.participants[0].user_id).toBe("user-pm")
  })

  it("replaces an existing owner", () => {
    const s1 = assignSectionOwner(baseSection(), "user-pm", "admin-1")
    const s2 = assignSectionOwner(s1, "user-coord", "admin-1", "2025-06-05T00:00:00Z")
    const owners = s2.participants.filter((p) => p.role === "owner")
    expect(owners).toHaveLength(1)
    expect(owners[0].user_id).toBe("user-coord")
  })

  it("appends an audit event", () => {
    const s = assignSectionOwner(baseSection(), "user-pm", "admin-1")
    expect(s.audit_events.some((e) => e.event_type === "owner_assigned")).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// addSectionParticipant
// ---------------------------------------------------------------------------

describe("addSectionParticipant", () => {
  it("adds a contributor", () => {
    const s = addSectionParticipant(baseSection(), "user-ld", "contributor", "admin-1")
    expect(s.participants.some((p) => p.role === "contributor" && p.user_id === "user-ld")).toBe(true)
  })
  it("is idempotent — adding same user+role twice is a no-op", () => {
    const s1 = addSectionParticipant(baseSection(), "user-ld", "contributor", "admin-1")
    const s2 = addSectionParticipant(s1, "user-ld", "contributor", "admin-1")
    expect(s2.participants.filter((p) => p.role === "contributor")).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// Comments and change requests
// ---------------------------------------------------------------------------

describe("addSectionComment", () => {
  it("adds a comment", () => {
    const comments = addSectionComment([], {
      id: "c1", advance_section_id: "sec-1", author_id: "user-pm",
      type: "comment", body: "Please confirm stage dimensions.",
      now: "2025-06-10T00:00:00Z",
    })
    expect(comments).toHaveLength(1)
    expect(comments[0].type).toBe("comment")
  })
})

describe("resolveChangeRequest", () => {
  const comments: AdvanceSectionComment[] = [{
    id: "cr-1", advance_section_id: "sec-1", author_id: "user-pm",
    type: "change_request", body: "Need to update capacity.", created_at: "2025-06-01T00:00:00Z",
  }]

  it("adds a change_resolved entry", () => {
    const updated = resolveChangeRequest(comments, {
      id: "cr-2", advance_section_id: "sec-1", author_id: "user-coord",
      body: "Updated.", resolves_comment_id: "cr-1", now: "2025-06-10T00:00:00Z",
    })
    expect(updated.some((c) => c.type === "change_resolved")).toBe(true)
  })

  it("throws when referenced change_request does not exist", () => {
    expect(() =>
      resolveChangeRequest(comments, {
        id: "cr-2", advance_section_id: "sec-1", author_id: "user-coord",
        body: "Done.", resolves_comment_id: "nonexistent",
      }),
    ).toThrow()
  })
})

describe("hasOpenChangeRequests", () => {
  it("returns true when a change_request has no resolution", () => {
    const comments: AdvanceSectionComment[] = [{
      id: "cr-1", advance_section_id: "sec-1", author_id: "u1",
      type: "change_request", body: "Fix this.", created_at: "2025-06-01T00:00:00Z",
    }]
    expect(hasOpenChangeRequests(comments)).toBe(true)
  })

  it("returns false when all change_requests are resolved", () => {
    const comments: AdvanceSectionComment[] = [
      { id: "cr-1", advance_section_id: "sec-1", author_id: "u1", type: "change_request", body: "Fix.", created_at: "2025-06-01T00:00:00Z" },
      { id: "cr-2", advance_section_id: "sec-1", author_id: "u2", type: "change_resolved", body: "Fixed.", resolves_comment_id: "cr-1", created_at: "2025-06-05T00:00:00Z" },
    ]
    expect(hasOpenChangeRequests(comments)).toBe(false)
  })

  it("ignores soft-deleted change requests", () => {
    const comments: AdvanceSectionComment[] = [{
      id: "cr-1", advance_section_id: "sec-1", author_id: "u1",
      type: "change_request", body: "Fix.", created_at: "2025-06-01T00:00:00Z",
      deleted_at: "2025-06-02T00:00:00Z",
    }]
    expect(hasOpenChangeRequests(comments)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// changeSectionStatus
// ---------------------------------------------------------------------------

describe("changeSectionStatus", () => {
  it("transitions status and appends audit", () => {
    const s = changeSectionStatus(baseSection(), "in_progress", "user-coord", { now: "2025-06-01T00:00:00Z" })
    expect(s.status).toBe("in_progress")
    expect(s.audit_events.some((e) => e.event_type === "status_changed")).toBe(true)
  })

  it("records approval when transitioning to approved", () => {
    const submitted = baseSection({ status: "submitted" })
    const s = changeSectionStatus(submitted, "approved", "user-pm", { now: "2025-06-15T00:00:00Z" })
    expect(s.approvals).toHaveLength(1)
    expect(s.approvals[0].approved_by).toBe("user-pm")
    expect(s.audit_events.some((e) => e.event_type === "approved")).toBe(true)
  })

  it("requires reopen_reason when reopening", () => {
    const approved = baseSection({ status: "approved" })
    expect(() => changeSectionStatus(approved, "reopened", "user-pm")).toThrow(/reopen_reason/)
  })

  it("stores reopen_reason on section", () => {
    const approved = baseSection({ status: "approved" })
    const s = changeSectionStatus(approved, "reopened", "user-pm", { reopen_reason: "Wrong address" })
    expect(s.reopen_reason).toBe("Wrong address")
    expect(s.audit_events.some((e) => e.event_type === "reopened")).toBe(true)
  })

  it("throws on invalid transition", () => {
    expect(() => changeSectionStatus(baseSection(), "approved", "user-pm")).toThrow()
  })
})

// ---------------------------------------------------------------------------
// changeSectionDueDate
// ---------------------------------------------------------------------------

describe("changeSectionDueDate", () => {
  it("updates due_date and appends audit", () => {
    const s = changeSectionDueDate(baseSection(), "2025-08-20", "user-pm", "2025-06-01T00:00:00Z")
    expect(s.due_date).toBe("2025-08-20")
    expect(s.audit_events.some((e) => e.event_type === "due_date_changed")).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// canApproveSection
// ---------------------------------------------------------------------------

describe("canApproveSection", () => {
  it("allows approval for submitted section with no open change requests", () => {
    const s = baseSection({ status: "submitted" })
    expect(canApproveSection(s).can).toBe(true)
  })

  it("blocks approval when not submitted", () => {
    const s = baseSection({ status: "in_progress" })
    expect(canApproveSection(s).can).toBe(false)
    expect(canApproveSection(s).reason).toMatch(/submitted/)
  })

  it("blocks approval when open change requests exist", () => {
    const s = baseSection({
      status: "submitted",
      comments: [{
        id: "cr-1", advance_section_id: "sec-1", author_id: "u1",
        type: "change_request", body: "Fix it.", created_at: "2025-06-01T00:00:00Z",
      }],
    })
    expect(canApproveSection(s).can).toBe(false)
    expect(canApproveSection(s).reason).toMatch(/change request/)
  })
})
