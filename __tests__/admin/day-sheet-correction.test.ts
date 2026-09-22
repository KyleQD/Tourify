import { describe, it, expect } from "vitest"
import {
  assessCorrectionImpact,
  createCorrection,
  approveCorrection,
  applyCorrection,
  invalidateAcknowledgements,
  summarizeCorrection,
  type DaySheetCorrection,
} from "../../lib/admin/day-sheet-correction"
import { buildDaySheetPublication } from "../../lib/admin/day-sheet-publication"
import type { DaySheet } from "../../lib/admin/day-sheet-composer"
import type { DaySheetAcknowledgement, ProjectedDaySheet } from "../../lib/admin/day-sheet-publication"

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function emptyDaySheet(): DaySheet {
  return {
    event_id: "ev-1", event_date: "2025-09-15", event_title: "Test",
    ros_items: [], travel_segments: [], calls: [], meals: [],
    contacts: [], map_refs: [], emergency_contacts: [],
    assembled_at: "2025-09-01T00:00:00Z",
  }
}

function proj(userId: string): ProjectedDaySheet {
  return { recipient_user_id: userId, audience_role: "crew", day_sheet: emptyDaySheet(), content_hash: "h1" }
}

function ack(userId: string, publicationId = "pub-1"): DaySheetAcknowledgement {
  return { user_id: userId, publication_id: publicationId, status: "pending", ack_token: `tok-${userId}` }
}

function basePub() {
  return buildDaySheetPublication({
    id: "pub-1", org_id: "org-1", event_id: "ev-1",
    projections: [proj("user-a"), proj("user-b")],
    acknowledgements: [ack("user-a"), ack("user-b")],
    deliveries: [],
    published_by: "user-pm",
    now: "2025-09-01T00:00:00Z",
  })
}

function baseCorrection(overrides: Partial<DaySheetCorrection> = {}): DaySheetCorrection {
  return createCorrection({
    id: "cor-1", org_id: "org-1", event_id: "ev-1",
    publication_id: "pub-1",
    changed_domains: ["ros_item"],
    summary: "Show time moved from 20:00 to 20:30",
    all_recipient_ids: ["user-a", "user-b"],
    authored_by: "user-pm",
    now: "2025-09-10T00:00:00Z",
    ...overrides,
  })
}

// ---------------------------------------------------------------------------
// assessCorrectionImpact
// ---------------------------------------------------------------------------

describe("assessCorrectionImpact", () => {
  it("critical for ros_item domain", () => {
    const impact = assessCorrectionImpact(["ros_item"], ["u1"])
    expect(impact.severity).toBe("critical")
    expect(impact.requires_reack).toBe(true)
  })

  it("critical for travel domain", () => {
    const impact = assessCorrectionImpact(["travel"], ["u1"])
    expect(impact.severity).toBe("critical")
  })

  it("critical for emergency domain", () => {
    expect(assessCorrectionImpact(["emergency"], ["u1"]).severity).toBe("critical")
  })

  it("moderate for lodging domain", () => {
    const impact = assessCorrectionImpact(["lodging"], ["u1"])
    expect(impact.severity).toBe("moderate")
    expect(impact.requires_reack).toBe(false)
  })

  it("informational for weather domain", () => {
    const impact = assessCorrectionImpact(["weather"], ["u1"])
    expect(impact.severity).toBe("informational")
    expect(impact.requires_reack).toBe(false)
  })

  it("critical wins over moderate in mixed domains", () => {
    const impact = assessCorrectionImpact(["lodging", "ros_item"], ["u1"])
    expect(impact.severity).toBe("critical")
  })

  it("includes all affected user IDs", () => {
    const impact = assessCorrectionImpact(["travel"], ["u1", "u2", "u3"])
    expect(impact.affected_user_ids).toEqual(["u1", "u2", "u3"])
  })
})

// ---------------------------------------------------------------------------
// createCorrection
// ---------------------------------------------------------------------------

describe("createCorrection", () => {
  it("creates a draft correction", () => {
    const c = baseCorrection()
    expect(c.status).toBe("draft")
    expect(c.severity).toBe("critical")   // ros_item is critical
    expect(c.requires_reack).toBe(true)
    expect(c.reack_required_user_ids).toEqual(["user-a", "user-b"])
  })

  it("does not require reack for informational correction", () => {
    const c = createCorrection({
      id: "c2", org_id: "org-1", event_id: "ev-1", publication_id: "pub-1",
      changed_domains: ["weather"],
      summary: "Weather update",
      all_recipient_ids: ["u1"],
      authored_by: "user-pm",
    })
    expect(c.requires_reack).toBe(false)
    expect(c.reack_required_user_ids).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// approveCorrection
// ---------------------------------------------------------------------------

describe("approveCorrection", () => {
  it("approves a draft correction", () => {
    const approved = approveCorrection(baseCorrection(), "user-director", "2025-09-11T00:00:00Z")
    expect(approved.status).toBe("approved")
    expect(approved.approved_by).toBe("user-director")
    expect(approved.approved_at).toBe("2025-09-11T00:00:00Z")
  })

  it("throws when approving a non-draft", () => {
    const approved = approveCorrection(baseCorrection(), "user-director")
    expect(() => approveCorrection(approved, "user-director")).toThrow(/approved/)
  })
})

// ---------------------------------------------------------------------------
// applyCorrection
// ---------------------------------------------------------------------------

describe("applyCorrection", () => {
  it("supersedes publication and marks correction applied", () => {
    const pub = basePub()
    const approved = approveCorrection(baseCorrection(), "user-director")
    const { correction, superseded_publication } = applyCorrection(approved, pub, "2025-09-11T00:00:00Z")

    expect(correction.status).toBe("superseded_publication")
    expect(superseded_publication.status).toBe("superseded")
    expect(superseded_publication.updated_at).toBe("2025-09-11T00:00:00Z")
  })

  it("throws when correction not approved", () => {
    const pub = basePub()
    expect(() => applyCorrection(baseCorrection(), pub)).toThrow(/approved/)
  })

  it("throws on publication_id mismatch", () => {
    const pub = basePub()
    const wrong = createCorrection({
      id: "c2", org_id: "org-1", event_id: "ev-1",
      publication_id: "pub-999",
      changed_domains: ["ros_item"],
      summary: "Wrong pub",
      all_recipient_ids: [],
      authored_by: "u",
    })
    const approved = approveCorrection(wrong, "u")
    expect(() => applyCorrection(approved, pub)).toThrow(/mismatch/)
  })
})

// ---------------------------------------------------------------------------
// invalidateAcknowledgements
// ---------------------------------------------------------------------------

describe("invalidateAcknowledgements", () => {
  it("resets acks for reack recipients with new token", () => {
    const acks: DaySheetAcknowledgement[] = [
      ack("user-a"), ack("user-b"),
    ]
    const tokens = new Map([["user-a", "new-tok-a"]])
    const updated = invalidateAcknowledgements(acks, ["user-a"], "pub-2", tokens, "2025-09-15T23:59:00Z")

    const a = updated.find((x) => x.user_id === "user-a")!
    expect(a.status).toBe("pending")
    expect(a.ack_token).toBe("new-tok-a")
    expect(a.publication_id).toBe("pub-2")
    expect(a.ack_deadline).toBe("2025-09-15T23:59:00Z")

    // user-b not in reack list — unchanged
    const b = updated.find((x) => x.user_id === "user-b")!
    expect(b.ack_token).toBe("tok-user-b")
  })

  it("leaves non-reack recipients untouched", () => {
    const acks: DaySheetAcknowledgement[] = [ack("user-c")]
    const updated = invalidateAcknowledgements(acks, ["user-a"], "pub-2", new Map())
    expect(updated[0].ack_token).toBe("tok-user-c")
  })
})

// ---------------------------------------------------------------------------
// summarizeCorrection
// ---------------------------------------------------------------------------

describe("summarizeCorrection", () => {
  it("summarizes correctly", () => {
    const s = summarizeCorrection(baseCorrection())
    expect(s.severity).toBe("critical")
    expect(s.requires_reack).toBe(true)
    expect(s.reack_count).toBe(2)
    expect(s.changed_domains).toContain("ros_item")
  })
})
