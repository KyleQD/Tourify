import { describe, it, expect } from "vitest"
import {
  createEmergencyBroadcast,
  sendBroadcast,
  applyBroadcastDelivery,
  acknowledgeBroadcast,
  triggerEscalation,
  cancelBroadcast,
  supersedeBroadcast,
  summarizeBroadcast,
  type EmergencyBroadcast,
} from "@/lib/admin/pub-emergency-broadcast"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeBroadcast(overrides: Partial<Parameters<typeof createEmergencyBroadcast>[0]> = {}): EmergencyBroadcast {
  return createEmergencyBroadcast({
    broadcast_id: "bc-1",
    org_id: "org-1",
    severity: "emergency",
    subject: "Immediate evacuation",
    body: "All crew leave stage immediately",
    channels: ["in_app", "push"],
    recipients: [
      { recipient_id: "w-1", channels: ["in_app"] },
      { recipient_id: "w-2", channels: ["push"] },
    ],
    actor_id: "user-1",
    now: "2025-08-02T21:00:00Z",
    ...overrides,
  })
}

// ---------------------------------------------------------------------------
// createEmergencyBroadcast
// ---------------------------------------------------------------------------

describe("createEmergencyBroadcast", () => {
  it("creates a draft broadcast", () => {
    const b = makeBroadcast()
    expect(b.status).toBe("draft")
    expect(b.recipients).toHaveLength(2)
    expect(b.recipients.every((r) => r.delivery_status === "pending")).toBe(true)
    expect(b.audit[0].event_type).toBe("created")
  })
})

// ---------------------------------------------------------------------------
// sendBroadcast
// ---------------------------------------------------------------------------

describe("sendBroadcast", () => {
  it("sends a draft broadcast", () => {
    const b = makeBroadcast()
    const r = sendBroadcast(b, "user-1", "T")
    expect(r.ok).toBe(true)
    expect(r.broadcast?.status).toBe("sent")
  })

  it("cannot send non-draft broadcast", () => {
    const b = makeBroadcast()
    const sent = sendBroadcast(b, "u", "T").broadcast!
    const r = sendBroadcast(sent, "u", "T2")
    expect(r.ok).toBe(false)
  })

  it("cannot send with no recipients", () => {
    const b = makeBroadcast({ recipients: [] })
    expect(sendBroadcast(b, "u", "T").ok).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// applyBroadcastDelivery
// ---------------------------------------------------------------------------

describe("applyBroadcastDelivery", () => {
  it("marks recipient as delivered", () => {
    const b = sendBroadcast(makeBroadcast(), "u", "T").broadcast!
    const updated = applyBroadcastDelivery(b, "w-1", "delivered", "system", "T")
    expect(updated.recipients.find((r) => r.recipient_id === "w-1")?.delivery_status).toBe("delivered")
  })

  it("marks partially_sent when some fail", () => {
    let b = sendBroadcast(makeBroadcast(), "u", "T").broadcast!
    b = applyBroadcastDelivery(b, "w-1", "delivered", "sys", "T")
    b = applyBroadcastDelivery(b, "w-2", "failed", "sys", "T")
    expect(b.status).toBe("partially_sent")
  })
})

// ---------------------------------------------------------------------------
// acknowledgeBroadcast
// ---------------------------------------------------------------------------

describe("acknowledgeBroadcast", () => {
  it("sets acknowledged_at for recipient", () => {
    const b = sendBroadcast(makeBroadcast(), "u", "T").broadcast!
    const acked = acknowledgeBroadcast(b, "w-1", "2025-08-02T21:05:00Z")
    expect(acked.recipients.find((r) => r.recipient_id === "w-1")?.acknowledged_at).toBe("2025-08-02T21:05:00Z")
  })

  it("is idempotent", () => {
    const b = sendBroadcast(makeBroadcast(), "u", "T").broadcast!
    const a1 = acknowledgeBroadcast(b, "w-1", "T1")
    const a2 = acknowledgeBroadcast(a1, "w-1", "T2")
    expect(a2.recipients.find((r) => r.recipient_id === "w-1")?.acknowledged_at).toBe("T1")
  })
})

// ---------------------------------------------------------------------------
// triggerEscalation
// ---------------------------------------------------------------------------

describe("triggerEscalation", () => {
  it("triggers escalation", () => {
    const b = createEmergencyBroadcast({
      broadcast_id: "bc-2", org_id: "org-1", severity: "warning", subject: "s", body: "b", channels: ["in_app"],
      recipients: [{ recipient_id: "w-1", channels: ["in_app"] }],
      escalations: [{ escalation_id: "esc-1", triggered_after_minutes: 5, escalated_to_ids: ["mgr-1"], triggered_at: null }],
      actor_id: "u", now: "T",
    })
    const updated = triggerEscalation(b, "esc-1", "system", "T2")
    expect(updated.escalations[0].triggered_at).toBe("T2")
    expect(updated.audit.at(-1)?.event_type).toBe("escalated")
  })
})

// ---------------------------------------------------------------------------
// cancelBroadcast
// ---------------------------------------------------------------------------

describe("cancelBroadcast", () => {
  it("cancels a sent broadcast with reason", () => {
    const b = sendBroadcast(makeBroadcast(), "u", "T").broadcast!
    const r = cancelBroadcast(b, "user-1", "T2", "False alarm")
    expect(r.ok).toBe(true)
    expect(r.broadcast?.status).toBe("cancelled")
    expect(r.broadcast?.cancel_reason).toBe("False alarm")
  })

  it("requires reason", () => {
    const b = sendBroadcast(makeBroadcast(), "u", "T").broadcast!
    expect(cancelBroadcast(b, "u", "T2", "  ").ok).toBe(false)
  })

  it("cannot cancel already cancelled broadcast", () => {
    const b = sendBroadcast(makeBroadcast(), "u", "T").broadcast!
    const cancelled = cancelBroadcast(b, "u", "T2", "reason").broadcast!
    expect(cancelBroadcast(cancelled, "u", "T3", "reason").ok).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// supersedeBroadcast
// ---------------------------------------------------------------------------

describe("supersedeBroadcast", () => {
  it("marks old as superseded and links replacement", () => {
    const old = sendBroadcast(makeBroadcast(), "u", "T").broadcast!
    const replacement = makeBroadcast({ broadcast_id: "bc-corrected", subject: "Correction" })
    const r = supersedeBroadcast(old, replacement, "u", "T2")
    expect(r.old.status).toBe("superseded")
    expect(r.replacement.supersedes_id).toBe("bc-1")
  })
})

// ---------------------------------------------------------------------------
// summarizeBroadcast
// ---------------------------------------------------------------------------

describe("summarizeBroadcast", () => {
  it("summarizes a sent broadcast", () => {
    let b = sendBroadcast(makeBroadcast(), "u", "T").broadcast!
    b = applyBroadcastDelivery(b, "w-1", "delivered", "sys", "T")
    b = acknowledgeBroadcast(b, "w-1", "T2")
    const s = summarizeBroadcast(b)
    expect(s.delivered_count).toBe(1)
    expect(s.acknowledged_count).toBe(1)
    expect(s.unacknowledged_count).toBe(1)
    expect(s.escalations_triggered).toBe(0)
  })
})
