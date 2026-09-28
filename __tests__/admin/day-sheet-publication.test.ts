import { describe, it, expect } from "vitest"
import {
  applyDaySheetAcknowledgement,
  applyDeliveryOutcome,
  computeRecipientDiffs,
  buildDaySheetPublication,
  supersedePublication,
  summarizePublication,
  type DaySheetAcknowledgement,
  type DaySheetDelivery,
  type ProjectedDaySheet,
  type DaySheetPublication,
} from "../../lib/admin/day-sheet-publication"
import type { DaySheet } from "../../lib/admin/day-sheet-composer"

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function emptyDaySheet(): DaySheet {
  return {
    event_id: "ev-1",
    event_date: "2025-09-15",
    event_title: "Test Event",
    ros_items: [],
    travel_segments: [],
    calls: [],
    meals: [],
    contacts: [],
    map_refs: [],
    emergency_contacts: [],
    assembled_at: "2025-09-01T00:00:00Z",
  }
}

function projection(userId: string, hash: string): ProjectedDaySheet {
  return {
    recipient_user_id: userId,
    audience_role: "crew",
    day_sheet: emptyDaySheet(),
    content_hash: hash,
  }
}

function ack(userId: string, overrides: Partial<DaySheetAcknowledgement> = {}): DaySheetAcknowledgement {
  return {
    user_id: userId,
    publication_id: "pub-1",
    status: "pending",
    ack_token: "tok-abc",
    ack_deadline: "2025-09-14T23:59:00Z",
    ...overrides,
  }
}

function delivery(userId: string, overrides: Partial<DaySheetDelivery> = {}): DaySheetDelivery {
  return {
    id: `del-${userId}`,
    publication_id: "pub-1",
    recipient_user_id: userId,
    status: "pending",
    retry_count: 0,
    ...overrides,
  }
}

function basePub(overrides: Partial<DaySheetPublication> = {}): DaySheetPublication {
  return buildDaySheetPublication({
    id: "pub-1",
    org_id: "org-1",
    event_id: "ev-1",
    projections: [projection("user-a", "h1"), projection("user-b", "h2")],
    acknowledgements: [ack("user-a"), ack("user-b")],
    deliveries: [delivery("user-a"), delivery("user-b")],
    published_by: "user-pm",
    now: "2025-09-01T00:00:00Z",
    ...overrides,
  })
}

// ---------------------------------------------------------------------------
// applyDaySheetAcknowledgement
// ---------------------------------------------------------------------------

describe("applyDaySheetAcknowledgement", () => {
  it("marks acknowledged with correct token", () => {
    const updated = applyDaySheetAcknowledgement(ack("user-a"), "tok-abc", "2025-09-14T10:00:00Z")
    expect(updated.status).toBe("acknowledged")
    expect(updated.acknowledged_at).toBe("2025-09-14T10:00:00Z")
  })

  it("is idempotent — calling twice returns same record", () => {
    const once = applyDaySheetAcknowledgement(ack("user-a"), "tok-abc", "2025-09-14T10:00:00Z")
    const twice = applyDaySheetAcknowledgement(once, "tok-abc", "2025-09-14T11:00:00Z")
    expect(twice.acknowledged_at).toBe("2025-09-14T10:00:00Z")
  })

  it("throws on wrong token", () => {
    expect(() => applyDaySheetAcknowledgement(ack("user-a"), "wrong-token")).toThrow(/mismatch/)
  })
})

// ---------------------------------------------------------------------------
// applyDeliveryOutcome
// ---------------------------------------------------------------------------

describe("applyDeliveryOutcome", () => {
  it("marks sent with timestamp", () => {
    const d = applyDeliveryOutcome(delivery("user-a"), "sent", { sent_at: "2025-09-01T09:00:00Z" })
    expect(d.status).toBe("sent")
    expect(d.sent_at).toBe("2025-09-01T09:00:00Z")
  })

  it("increments retry_count on failure", () => {
    const d = applyDeliveryOutcome(delivery("user-a"), "failed", { error: "SMTP timeout" })
    expect(d.status).toBe("failed")
    expect(d.retry_count).toBe(1)
    const d2 = applyDeliveryOutcome(d, "failed")
    expect(d2.retry_count).toBe(2)
  })

  it("clears error on successful delivery", () => {
    const failed = applyDeliveryOutcome(delivery("user-a"), "failed", { error: "timeout" })
    const delivered = applyDeliveryOutcome(failed, "delivered")
    expect(delivered.error).toBeUndefined()
    expect(delivered.status).toBe("delivered")
  })
})

// ---------------------------------------------------------------------------
// computeRecipientDiffs
// ---------------------------------------------------------------------------

describe("computeRecipientDiffs", () => {
  it("marks unchanged when hash identical", () => {
    const prev = [projection("user-a", "hash-1")]
    const curr = [projection("user-a", "hash-1")]
    const diffs = computeRecipientDiffs(prev, curr)
    expect(diffs[0].has_changes).toBe(false)
  })

  it("marks changed when hash differs", () => {
    const prev = [projection("user-a", "hash-1")]
    const curr = [projection("user-a", "hash-2")]
    const diffs = computeRecipientDiffs(prev, curr)
    expect(diffs[0].has_changes).toBe(true)
    expect(diffs[0].previous_hash).toBe("hash-1")
    expect(diffs[0].current_hash).toBe("hash-2")
  })

  it("marks new recipient as changed (no previous)", () => {
    const diffs = computeRecipientDiffs([], [projection("user-a", "hash-1")])
    expect(diffs[0].has_changes).toBe(true)
    expect(diffs[0].previous_hash).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// buildDaySheetPublication
// ---------------------------------------------------------------------------

describe("buildDaySheetPublication", () => {
  it("builds a v1 publication", () => {
    const pub = basePub()
    expect(pub.version_number).toBe(1)
    expect(pub.status).toBe("published")
    expect(pub.projections).toHaveLength(2)
    expect(pub.published_by).toBe("user-pm")
    expect(pub.published_at).toBe("2025-09-01T00:00:00Z")
  })

  it("increments version number from previous", () => {
    const pub = buildDaySheetPublication({
      id: "pub-2", org_id: "org-1", event_id: "ev-1",
      projections: [], acknowledgements: [], deliveries: [],
      previous_publication_id: "pub-1",
      previous_version_number: 1,
      published_by: "user-pm",
      now: "2025-09-10T00:00:00Z",
    })
    expect(pub.version_number).toBe(2)
    expect(pub.previous_publication_id).toBe("pub-1")
  })
})

// ---------------------------------------------------------------------------
// supersedePublication
// ---------------------------------------------------------------------------

describe("supersedePublication", () => {
  it("marks publication as superseded", () => {
    const pub = basePub()
    const superseded = supersedePublication(pub, "2025-09-10T00:00:00Z")
    expect(superseded.status).toBe("superseded")
  })
  it("is idempotent", () => {
    const pub = basePub()
    const s1 = supersedePublication(pub, "2025-09-10T00:00:00Z")
    const s2 = supersedePublication(s1, "2025-09-11T00:00:00Z")
    expect(s2.updated_at).toBe(s1.updated_at)
  })
})

// ---------------------------------------------------------------------------
// summarizePublication
// ---------------------------------------------------------------------------

describe("summarizePublication", () => {
  it("counts acks and deliveries correctly", () => {
    const pub = basePub()
    const summary = summarizePublication(pub)
    expect(summary.recipient_count).toBe(2)
    expect(summary.ack_pending).toBe(2)
    expect(summary.ack_complete).toBe(0)
    expect(summary.delivery_failed).toBe(0)
    expect(summary.can_supersede).toBe(true)
  })

  it("updates ack counts after acknowledgements applied", () => {
    const pub = basePub()
    pub.acknowledgements[0] = applyDaySheetAcknowledgement(pub.acknowledgements[0], "tok-abc")
    const summary = summarizePublication(pub)
    expect(summary.ack_pending).toBe(1)
    expect(summary.ack_complete).toBe(1)
  })

  it("reports can_supersede=false for superseded publication", () => {
    const pub = supersedePublication(basePub())
    expect(summarizePublication(pub).can_supersede).toBe(false)
  })
})
