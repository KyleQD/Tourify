/**
 * PUB-404 — Emergency broadcast.
 *
 * An emergency broadcast is a high-priority notice that:
 *  - Targets a bounded, explicitly-defined audience
 *  - Supports multi-channel fanout (in-app/push/SMS/email)
 *  - Has an escalation path if not acknowledged
 *  - Can be cancelled (revoked) or corrected (superseded)
 *  - Carries audit controls to prevent abuse
 *
 * Authorization is checked externally; this module models the domain only.
 *
 * Pure: no I/O, no Supabase imports.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BroadcastStatus =
  | "draft"
  | "pending"          // Queued but not yet sent
  | "sent"
  | "partially_sent"   // Some channels/recipients failed
  | "cancelled"
  | "superseded"

export type BroadcastChannel = "in_app" | "push" | "sms" | "email"

export const BROADCAST_SEVERITIES = ["informational", "warning", "emergency"] as const
export type BroadcastSeverity = (typeof BROADCAST_SEVERITIES)[number]

export interface BroadcastRecipient {
  recipient_id: string
  channels: BroadcastChannel[]
  delivery_status: "pending" | "delivered" | "failed"
  acknowledged_at: string | null
}

export interface BroadcastEscalation {
  escalation_id: string
  triggered_after_minutes: number
  escalated_to_ids: string[]
  triggered_at: string | null
}

export interface BroadcastAuditEntry {
  entry_id: string
  event_type:
    | "created"
    | "sent"
    | "recipient_delivered"
    | "recipient_failed"
    | "acknowledged"
    | "escalated"
    | "cancelled"
    | "superseded"
  actor_id: string
  occurred_at: string
  detail: string
}

export interface EmergencyBroadcast {
  broadcast_id: string
  org_id: string
  event_id: string | null
  severity: BroadcastSeverity
  subject: string
  body: string
  channels: BroadcastChannel[]
  status: BroadcastStatus
  recipients: BroadcastRecipient[]
  escalations: BroadcastEscalation[]
  /** If this broadcast supersedes another, the previous broadcast's ID. */
  supersedes_id: string | null
  cancelled_by: string | null
  cancelled_at: string | null
  cancel_reason: string | null
  audit: BroadcastAuditEntry[]
  created_by: string
  created_at: string
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createEmergencyBroadcast(params: {
  broadcast_id: string
  org_id: string
  event_id?: string | null
  severity: BroadcastSeverity
  subject: string
  body: string
  channels: BroadcastChannel[]
  recipients: Omit<BroadcastRecipient, "delivery_status" | "acknowledged_at">[]
  escalations?: BroadcastEscalation[]
  actor_id: string
  now: string
}): EmergencyBroadcast {
  const audit: BroadcastAuditEntry[] = [{
    entry_id: `${params.broadcast_id}-created`,
    event_type: "created",
    actor_id: params.actor_id,
    occurred_at: params.now,
    detail: `Broadcast created: ${params.subject} (severity=${params.severity})`,
  }]
  return {
    broadcast_id: params.broadcast_id,
    org_id: params.org_id,
    event_id: params.event_id ?? null,
    severity: params.severity,
    subject: params.subject,
    body: params.body,
    channels: params.channels,
    status: "draft",
    recipients: params.recipients.map((r) => ({ ...r, delivery_status: "pending", acknowledged_at: null })),
    escalations: params.escalations ?? [],
    supersedes_id: null,
    cancelled_by: null,
    cancelled_at: null,
    cancel_reason: null,
    audit,
    created_by: params.actor_id,
    created_at: params.now,
  }
}

// ---------------------------------------------------------------------------
// Send
// ---------------------------------------------------------------------------

export interface BroadcastSendResult {
  ok: boolean
  broadcast: EmergencyBroadcast | null
  error?: string
}

export function sendBroadcast(
  broadcast: EmergencyBroadcast,
  actor: string,
  now: string,
): BroadcastSendResult {
  if (broadcast.status !== "draft" && broadcast.status !== "pending") {
    return { ok: false, broadcast: null, error: `Cannot send a broadcast with status '${broadcast.status}'.` }
  }
  if (broadcast.recipients.length === 0) {
    return { ok: false, broadcast: null, error: "Cannot send broadcast with no recipients." }
  }
  const entry: BroadcastAuditEntry = {
    entry_id: `${broadcast.broadcast_id}-sent`,
    event_type: "sent",
    actor_id: actor,
    occurred_at: now,
    detail: `Broadcast sent to ${broadcast.recipients.length} recipients`,
  }
  return {
    ok: true,
    broadcast: { ...broadcast, status: "sent", audit: [...broadcast.audit, entry] },
  }
}

// ---------------------------------------------------------------------------
// Delivery outcome
// ---------------------------------------------------------------------------

export function applyBroadcastDelivery(
  broadcast: EmergencyBroadcast,
  recipient_id: string,
  outcome: "delivered" | "failed",
  actor: string,
  now: string,
): EmergencyBroadcast {
  const recipients = broadcast.recipients.map((r) =>
    r.recipient_id === recipient_id ? { ...r, delivery_status: outcome } : r,
  )
  const anyFailed = recipients.some((r) => r.delivery_status === "failed")
  const allDone = recipients.every((r) => r.delivery_status !== "pending")
  const status = allDone && anyFailed ? "partially_sent" : broadcast.status

  const entry: BroadcastAuditEntry = {
    entry_id: `${broadcast.broadcast_id}-${now}-${outcome}`,
    event_type: outcome === "delivered" ? "recipient_delivered" : "recipient_failed",
    actor_id: actor,
    occurred_at: now,
    detail: `${recipient_id} ${outcome}`,
  }
  return { ...broadcast, recipients, status, audit: [...broadcast.audit, entry] }
}

// ---------------------------------------------------------------------------
// Acknowledgement
// ---------------------------------------------------------------------------

export function acknowledgeBroadcast(
  broadcast: EmergencyBroadcast,
  recipient_id: string,
  now: string,
): EmergencyBroadcast {
  const recipients = broadcast.recipients.map((r) =>
    r.recipient_id === recipient_id && !r.acknowledged_at ? { ...r, acknowledged_at: now } : r,
  )
  const entry: BroadcastAuditEntry = {
    entry_id: `${broadcast.broadcast_id}-${now}-ack`,
    event_type: "acknowledged",
    actor_id: recipient_id,
    occurred_at: now,
    detail: `${recipient_id} acknowledged broadcast`,
  }
  return { ...broadcast, recipients, audit: [...broadcast.audit, entry] }
}

// ---------------------------------------------------------------------------
// Escalation trigger
// ---------------------------------------------------------------------------

export function triggerEscalation(
  broadcast: EmergencyBroadcast,
  escalation_id: string,
  actor: string,
  now: string,
): EmergencyBroadcast {
  const escalations = broadcast.escalations.map((e) =>
    e.escalation_id === escalation_id ? { ...e, triggered_at: now } : e,
  )
  const entry: BroadcastAuditEntry = {
    entry_id: `${broadcast.broadcast_id}-${now}-esc`,
    event_type: "escalated",
    actor_id: actor,
    occurred_at: now,
    detail: `Escalation ${escalation_id} triggered`,
  }
  return { ...broadcast, escalations, audit: [...broadcast.audit, entry] }
}

// ---------------------------------------------------------------------------
// Cancel
// ---------------------------------------------------------------------------

export function cancelBroadcast(
  broadcast: EmergencyBroadcast,
  actor: string,
  now: string,
  reason: string,
): BroadcastSendResult {
  if (broadcast.status === "cancelled" || broadcast.status === "superseded") {
    return { ok: false, broadcast: null, error: `Cannot cancel a ${broadcast.status} broadcast.` }
  }
  if (!reason.trim()) {
    return { ok: false, broadcast: null, error: "Cancel reason is required." }
  }
  const entry: BroadcastAuditEntry = {
    entry_id: `${broadcast.broadcast_id}-${now}-cancel`,
    event_type: "cancelled",
    actor_id: actor,
    occurred_at: now,
    detail: `Cancelled: ${reason}`,
  }
  return {
    ok: true,
    broadcast: { ...broadcast, status: "cancelled", cancelled_by: actor, cancelled_at: now, cancel_reason: reason, audit: [...broadcast.audit, entry] },
  }
}

// ---------------------------------------------------------------------------
// Supersede (correction)
// ---------------------------------------------------------------------------

export function supersedeBroadcast(
  old: EmergencyBroadcast,
  replacement: EmergencyBroadcast,
  actor: string,
  now: string,
): { old: EmergencyBroadcast; replacement: EmergencyBroadcast } {
  const entry: BroadcastAuditEntry = {
    entry_id: `${old.broadcast_id}-${now}-superseded`,
    event_type: "superseded",
    actor_id: actor,
    occurred_at: now,
    detail: `Superseded by ${replacement.broadcast_id}`,
  }
  return {
    old: { ...old, status: "superseded", audit: [...old.audit, entry] },
    replacement: { ...replacement, supersedes_id: old.broadcast_id },
  }
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

export interface BroadcastSummary {
  broadcast_id: string
  status: BroadcastStatus
  severity: BroadcastSeverity
  total_recipients: number
  delivered_count: number
  failed_count: number
  acknowledged_count: number
  unacknowledged_count: number
  escalations_triggered: number
}

export function summarizeBroadcast(broadcast: EmergencyBroadcast): BroadcastSummary {
  let delivered_count = 0, failed_count = 0, acknowledged_count = 0
  for (const r of broadcast.recipients) {
    if (r.delivery_status === "delivered") delivered_count += 1
    if (r.delivery_status === "failed") failed_count += 1
    if (r.acknowledged_at) acknowledged_count += 1
  }
  return {
    broadcast_id: broadcast.broadcast_id,
    status: broadcast.status,
    severity: broadcast.severity,
    total_recipients: broadcast.recipients.length,
    delivered_count,
    failed_count,
    acknowledged_count,
    unacknowledged_count: broadcast.recipients.length - acknowledged_count,
    escalations_triggered: broadcast.escalations.filter((e) => e.triggered_at !== null).length,
  }
}
