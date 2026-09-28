/**
 * PUB-402 — Publication acknowledgement workflows.
 *
 * Publisher selects required recipients and sets a deadline.
 * Reminders and escalations are deduplicated.
 * Acknowledgement stores the publication version and timestamp.
 *
 * Pure: no I/O, no Supabase imports.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AckStatus = "pending" | "acknowledged" | "overdue" | "waived"

export interface PublicationAckRecord {
  ack_id: string
  publication_id: string
  publication_version: number
  recipient_id: string
  status: AckStatus
  deadline: string | null
  acknowledged_at: string | null
  waived_by: string | null
  waived_at: string | null
  waive_reason: string | null
  reminders_sent: AckReminderEntry[]
}

export interface AckReminderEntry {
  reminder_id: string
  sent_at: string
  channel: string
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createAckRecord(params: {
  ack_id: string
  publication_id: string
  publication_version: number
  recipient_id: string
  deadline: string | null
}): PublicationAckRecord {
  return {
    ack_id: params.ack_id,
    publication_id: params.publication_id,
    publication_version: params.publication_version,
    recipient_id: params.recipient_id,
    status: "pending",
    deadline: params.deadline,
    acknowledged_at: null,
    waived_by: null,
    waived_at: null,
    waive_reason: null,
    reminders_sent: [],
  }
}

// ---------------------------------------------------------------------------
// Acknowledge
// ---------------------------------------------------------------------------

export function acknowledgeRecord(
  record: PublicationAckRecord,
  now: string,
): PublicationAckRecord {
  if (record.status === "acknowledged") return record // idempotent
  return { ...record, status: "acknowledged", acknowledged_at: now }
}

// ---------------------------------------------------------------------------
// Waive
// ---------------------------------------------------------------------------

export function waiveAck(
  record: PublicationAckRecord,
  waivedBy: string,
  reason: string,
  now: string,
): { ok: boolean; record: PublicationAckRecord | null; error?: string } {
  if (!reason.trim()) return { ok: false, record: null, error: "Waive reason is required." }
  if (record.status === "acknowledged") return { ok: false, record: null, error: "Already acknowledged." }
  return {
    ok: true,
    record: { ...record, status: "waived", waived_by: waivedBy, waived_at: now, waive_reason: reason },
  }
}

// ---------------------------------------------------------------------------
// Mark overdue
// ---------------------------------------------------------------------------

export function markOverdueAcks(
  records: readonly PublicationAckRecord[],
  nowIso: string,
): PublicationAckRecord[] {
  return records.map((r) => {
    if (r.status !== "pending") return r
    if (!r.deadline) return r
    if (r.deadline < nowIso) return { ...r, status: "overdue" }
    return r
  })
}

// ---------------------------------------------------------------------------
// Reminders (deduplicated per ack)
// ---------------------------------------------------------------------------

export function recordReminderSent(
  record: PublicationAckRecord,
  reminder: AckReminderEntry,
): PublicationAckRecord {
  // Idempotent on reminder_id
  if (record.reminders_sent.some((r) => r.reminder_id === reminder.reminder_id)) return record
  return { ...record, reminders_sent: [...record.reminders_sent, reminder] }
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

export interface AckWorkflowSummary {
  total: number
  pending_count: number
  acknowledged_count: number
  overdue_count: number
  waived_count: number
  all_resolved: boolean
}

export function summarizeAckWorkflow(records: readonly PublicationAckRecord[]): AckWorkflowSummary {
  let pending_count = 0, acknowledged_count = 0, overdue_count = 0, waived_count = 0
  for (const r of records) {
    if (r.status === "pending") pending_count += 1
    else if (r.status === "acknowledged") acknowledged_count += 1
    else if (r.status === "overdue") overdue_count += 1
    else if (r.status === "waived") waived_count += 1
  }
  return {
    total: records.length,
    pending_count,
    acknowledged_count,
    overdue_count,
    waived_count,
    all_resolved: pending_count === 0 && overdue_count === 0,
  }
}
