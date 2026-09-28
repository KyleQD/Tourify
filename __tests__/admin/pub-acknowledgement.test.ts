import { describe, it, expect } from "vitest"
import {
  createAckRecord,
  acknowledgeRecord,
  waiveAck,
  markOverdueAcks,
  recordReminderSent,
  summarizeAckWorkflow,
} from "@/lib/admin/pub-acknowledgement"

describe("createAckRecord", () => {
  it("creates pending ack", () => {
    const r = createAckRecord({ ack_id: "a-1", publication_id: "pub-1", publication_version: 1, recipient_id: "w-1", deadline: "2025-08-05T00:00:00Z" })
    expect(r.status).toBe("pending")
    expect(r.acknowledged_at).toBeNull()
  })
})

describe("acknowledgeRecord", () => {
  it("acknowledges record", () => {
    const r = createAckRecord({ ack_id: "a-1", publication_id: "p", publication_version: 1, recipient_id: "w-1", deadline: null })
    const acked = acknowledgeRecord(r, "2025-08-02T10:00:00Z")
    expect(acked.status).toBe("acknowledged")
    expect(acked.acknowledged_at).toBe("2025-08-02T10:00:00Z")
  })

  it("is idempotent", () => {
    const r = createAckRecord({ ack_id: "a", publication_id: "p", publication_version: 1, recipient_id: "w", deadline: null })
    const r1 = acknowledgeRecord(r, "T1")
    const r2 = acknowledgeRecord(r1, "T2")
    expect(r2).toBe(r1)
  })
})

describe("waiveAck", () => {
  it("waives with reason", () => {
    const r = createAckRecord({ ack_id: "a", publication_id: "p", publication_version: 1, recipient_id: "w", deadline: null })
    const result = waiveAck(r, "admin", "Absent for medical reasons", "T")
    expect(result.ok).toBe(true)
    expect(result.record?.status).toBe("waived")
  })

  it("requires non-empty reason", () => {
    const r = createAckRecord({ ack_id: "a", publication_id: "p", publication_version: 1, recipient_id: "w", deadline: null })
    expect(waiveAck(r, "a", "  ", "T").ok).toBe(false)
  })

  it("cannot waive already acknowledged", () => {
    const r = acknowledgeRecord(createAckRecord({ ack_id: "a", publication_id: "p", publication_version: 1, recipient_id: "w", deadline: null }), "T")
    expect(waiveAck(r, "a", "reason", "T").ok).toBe(false)
  })
})

describe("markOverdueAcks", () => {
  it("marks past-deadline pending records as overdue", () => {
    const r = createAckRecord({ ack_id: "a", publication_id: "p", publication_version: 1, recipient_id: "w", deadline: "2025-08-01T00:00:00Z" })
    const result = markOverdueAcks([r], "2025-08-02T00:00:00Z")
    expect(result[0].status).toBe("overdue")
  })

  it("does not mark future deadline as overdue", () => {
    const r = createAckRecord({ ack_id: "a", publication_id: "p", publication_version: 1, recipient_id: "w", deadline: "2025-08-10T00:00:00Z" })
    const result = markOverdueAcks([r], "2025-08-02T00:00:00Z")
    expect(result[0].status).toBe("pending")
  })
})

describe("recordReminderSent", () => {
  it("adds reminder idempotently", () => {
    const r = createAckRecord({ ack_id: "a", publication_id: "p", publication_version: 1, recipient_id: "w", deadline: null })
    const reminder = { reminder_id: "rem-1", sent_at: "T", channel: "email" }
    const r1 = recordReminderSent(r, reminder)
    const r2 = recordReminderSent(r1, reminder)
    expect(r2.reminders_sent).toHaveLength(1)
    expect(r2).toBe(r1)
  })
})

describe("summarizeAckWorkflow", () => {
  it("all_resolved when no pending/overdue", () => {
    const r1 = acknowledgeRecord(createAckRecord({ ack_id: "a1", publication_id: "p", publication_version: 1, recipient_id: "w1", deadline: null }), "T")
    const r2w = waiveAck(createAckRecord({ ack_id: "a2", publication_id: "p", publication_version: 1, recipient_id: "w2", deadline: null }), "admin", "reason", "T").record!
    const s = summarizeAckWorkflow([r1, r2w])
    expect(s.all_resolved).toBe(true)
  })
})
