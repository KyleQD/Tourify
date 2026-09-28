/**
 * WORK-412 — Schedule publication tests.
 */

import { describe, it, expect } from "vitest"
import {
  diffScheduleSnapshots,
  projectScheduleForRecipient,
  buildSchedulePublication,
  applyDeliveryOutcome,
  applyAcknowledgement,
  type ScheduleSnapshot,
  type PublishedShift,
  type ScheduleRecipient,
} from "@/lib/admin/schedule-publication"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function shift(id: string, personId: string | null, overrides: Partial<PublishedShift> = {}): PublishedShift {
  return {
    shift_id: id,
    role_label: "Stage Hand",
    department: "Stage",
    start_local: "2026-10-15T09:00:00",
    end_local: "2026-10-15T17:00:00",
    timezone: "America/Chicago",
    day_type: "show",
    person_id: personId,
    person_name: personId ? `Person ${personId}` : null,
    ...overrides,
  }
}

function snapshot(version: number, shifts: PublishedShift[]): ScheduleSnapshot {
  return {
    tour_id: "tour-1",
    version,
    snapshot_at: "2026-10-15T10:00:00",
    shifts,
    published_by: "admin",
  }
}

const RECIPIENT: ScheduleRecipient = {
  person_id: "p1",
  person_name: "Person p1",
  ack_deadline: "2026-10-20T12:00:00",
}

const NOW = "2026-10-15T10:00:00"

// ---------------------------------------------------------------------------
// diffScheduleSnapshots
// ---------------------------------------------------------------------------

describe("WORK-412 — diffScheduleSnapshots", () => {
  it("marks all shifts as added when no previous snapshot", () => {
    const curr = snapshot(1, [shift("s1", "p1"), shift("s2", "p2")])
    const diffs = diffScheduleSnapshots(null, curr)
    expect(diffs.every((d) => d.action === "added")).toBe(true)
    expect(diffs).toHaveLength(2)
  })

  it("marks unchanged shifts correctly", () => {
    const prev = snapshot(1, [shift("s1", "p1")])
    const curr = snapshot(2, [shift("s1", "p1")])
    const diffs = diffScheduleSnapshots(prev, curr)
    expect(diffs[0].action).toBe("unchanged")
  })

  it("detects time change as updated", () => {
    const prev = snapshot(1, [shift("s1", "p1", { start_local: "2026-10-15T09:00:00" })])
    const curr = snapshot(2, [shift("s1", "p1", { start_local: "2026-10-15T10:00:00" })])
    const diffs = diffScheduleSnapshots(prev, curr)
    expect(diffs[0].action).toBe("updated")
    expect(diffs[0].change_summary).toMatch(/time:/)
  })

  it("detects person change as updated", () => {
    const prev = snapshot(1, [shift("s1", "p1")])
    const curr = snapshot(2, [shift("s1", "p2")]) // different person
    const diffs = diffScheduleSnapshots(prev, curr)
    expect(diffs[0].action).toBe("updated")
    expect(diffs[0].change_summary).toMatch(/person changed/)
  })

  it("marks removed shifts for shifts in previous not in current", () => {
    const prev = snapshot(1, [shift("s1", "p1"), shift("s2", "p2")])
    const curr = snapshot(2, [shift("s1", "p1")]) // s2 removed
    const diffs = diffScheduleSnapshots(prev, curr)
    const removed = diffs.find((d) => d.shift_id === "s2")!
    expect(removed.action).toBe("removed")
    expect(removed.previous!.shift_id).toBe("s2")
  })

  it("handles mix of added, updated, removed, unchanged", () => {
    const prev = snapshot(1, [shift("s1", "p1"), shift("s2", "p2")])
    const curr = snapshot(2, [
      shift("s1", "p1", { start_local: "2026-10-15T11:00:00" }), // updated
      shift("s3", "p3"), // added
      // s2 removed
    ])
    const diffs = diffScheduleSnapshots(prev, curr)
    expect(diffs.find((d) => d.shift_id === "s1")!.action).toBe("updated")
    expect(diffs.find((d) => d.shift_id === "s3")!.action).toBe("added")
    expect(diffs.find((d) => d.shift_id === "s2")!.action).toBe("removed")
  })
})

// ---------------------------------------------------------------------------
// projectScheduleForRecipient
// ---------------------------------------------------------------------------

describe("WORK-412 — projectScheduleForRecipient", () => {
  it("projects only this person's shifts", () => {
    const snap = snapshot(1, [shift("s1", "p1"), shift("s2", "p2"), shift("s3", "p1")])
    const diffs = diffScheduleSnapshots(null, snap)
    const view = projectScheduleForRecipient({ recipient: RECIPIENT, snapshot: snap, diffs })
    expect(view.my_shifts).toHaveLength(2)
    expect(view.my_shifts.every((s) => s.person_id === "p1")).toBe(true)
  })

  it("counts changes requiring acknowledgement", () => {
    const prev = snapshot(1, [shift("s1", "p1")])
    const curr = snapshot(2, [
      shift("s1", "p1", { start_local: "2026-10-15T11:00:00" }), // updated
      shift("s2", "p1"), // added
    ])
    const diffs = diffScheduleSnapshots(prev, curr)
    const view = projectScheduleForRecipient({ recipient: RECIPIENT, snapshot: curr, diffs })
    expect(view.changes_requiring_ack).toBe(2)
  })

  it("generates deterministic ack_token", () => {
    const snap = snapshot(3, [shift("s1", "p1")])
    const diffs = diffScheduleSnapshots(null, snap)
    const view = projectScheduleForRecipient({ recipient: RECIPIENT, snapshot: snap, diffs })
    expect(view.ack_token).toBe("ack:p1:v3")
  })

  it("includes ack_deadline from recipient", () => {
    const snap = snapshot(1, [shift("s1", "p1")])
    const diffs = diffScheduleSnapshots(null, snap)
    const view = projectScheduleForRecipient({ recipient: RECIPIENT, snapshot: snap, diffs })
    expect(view.ack_deadline).toBe("2026-10-20T12:00:00")
  })

  it("includes removed shifts in my_diffs when they were assigned to this person", () => {
    const prev = snapshot(1, [shift("s1", "p1")])
    const curr = snapshot(2, []) // s1 removed
    const diffs = diffScheduleSnapshots(prev, curr)
    const view = projectScheduleForRecipient({ recipient: RECIPIENT, snapshot: curr, diffs })
    expect(view.my_diffs.find((d) => d.shift_id === "s1")!.action).toBe("removed")
    expect(view.changes_requiring_ack).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// buildSchedulePublication / delivery lifecycle
// ---------------------------------------------------------------------------

describe("WORK-412 — buildSchedulePublication", () => {
  it("creates publication in publishing status with pending deliveries", () => {
    const snap = snapshot(1, [shift("s1", "p1")])
    const result = buildSchedulePublication({
      publication_id: "pub-1",
      tour_id: "tour-1",
      snapshot: snap,
      recipients: [RECIPIENT],
      created_by: "admin",
      created_at: NOW,
    })
    expect(result.publication.status).toBe("publishing")
    expect(result.deliveries).toHaveLength(1)
    expect(result.deliveries[0].status).toBe("pending")
    expect(result.all_delivered).toBe(false)
  })
})

describe("WORK-412 — applyDeliveryOutcome", () => {
  it("marks delivery as delivered", () => {
    const snap = snapshot(1, [shift("s1", "p1")])
    const initial = buildSchedulePublication({
      publication_id: "pub-1",
      tour_id: "tour-1",
      snapshot: snap,
      recipients: [RECIPIENT],
      created_by: "admin",
      created_at: NOW,
    })
    const updated = applyDeliveryOutcome(initial, "p1", "delivered", NOW)
    expect(updated.deliveries[0].status).toBe("delivered")
    expect(updated.all_delivered).toBe(true)
    expect(updated.publication.status).toBe("published")
  })

  it("marks delivery as failed and sets has_retriable_failures", () => {
    const snap = snapshot(1, [shift("s1", "p1")])
    const initial = buildSchedulePublication({
      publication_id: "pub-1",
      tour_id: "tour-1",
      snapshot: snap,
      recipients: [RECIPIENT],
      created_by: "admin",
      created_at: NOW,
      max_attempts: 3,
    })
    const updated = applyDeliveryOutcome(initial, "p1", "failed", NOW, "Network error")
    expect(updated.deliveries[0].status).toBe("failed")
    expect(updated.deliveries[0].failure_reason).toBe("Network error")
    expect(updated.has_retriable_failures).toBe(true)
    expect(updated.publication.status).toBe("retrying")
  })
})

describe("WORK-412 — applyAcknowledgement", () => {
  it("records acknowledgement with valid token", () => {
    const snap = snapshot(1, [shift("s1", "p1")])
    const initial = buildSchedulePublication({
      publication_id: "pub-1",
      tour_id: "tour-1",
      snapshot: snap,
      recipients: [RECIPIENT],
      created_by: "admin",
      created_at: NOW,
    })
    // First deliver, then ack
    const delivered = applyDeliveryOutcome(initial, "p1", "delivered", NOW)
    const ackToken = delivered.deliveries[0].ack_token
    const acked = applyAcknowledgement(delivered, "p1", ackToken, NOW)
    expect("error" in acked).toBe(false)
    if ("error" in acked) return
    expect(acked.deliveries[0].status).toBe("acknowledged")
    expect(acked.deliveries[0].acknowledged_at).toBe(NOW)
  })

  it("rejects acknowledgement with invalid token", () => {
    const snap = snapshot(1, [shift("s1", "p1")])
    const initial = buildSchedulePublication({
      publication_id: "pub-1",
      tour_id: "tour-1",
      snapshot: snap,
      recipients: [RECIPIENT],
      created_by: "admin",
      created_at: NOW,
    })
    const result = applyAcknowledgement(initial, "p1", "wrong-token", NOW)
    expect("error" in result).toBe(true)
    if (!("error" in result)) return
    expect(result.error).toMatch(/Invalid/)
  })

  it("rejects double acknowledgement", () => {
    const snap = snapshot(1, [shift("s1", "p1")])
    const initial = buildSchedulePublication({
      publication_id: "pub-1",
      tour_id: "tour-1",
      snapshot: snap,
      recipients: [RECIPIENT],
      created_by: "admin",
      created_at: NOW,
    })
    const delivered = applyDeliveryOutcome(initial, "p1", "delivered", NOW)
    const token = delivered.deliveries[0].ack_token
    const acked = applyAcknowledgement(delivered, "p1", token, NOW)
    if ("error" in acked) return
    const double = applyAcknowledgement(acked, "p1", token, NOW)
    expect("error" in double).toBe(true)
  })

  it("returns error for unknown person_id", () => {
    const snap = snapshot(1, [shift("s1", "p1")])
    const initial = buildSchedulePublication({
      publication_id: "pub-1",
      tour_id: "tour-1",
      snapshot: snap,
      recipients: [RECIPIENT],
      created_by: "admin",
      created_at: NOW,
    })
    const result = applyAcknowledgement(initial, "p-unknown", "any", NOW)
    expect("error" in result).toBe(true)
  })
})
