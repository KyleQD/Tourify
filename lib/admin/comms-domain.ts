/**
 * COMMS-401 through COMMS-406 — Communications domain model.
 *
 * COMMS-401: Channel/audience model (assignment/grant-derived, named exceptions, cross-org guard)
 * COMMS-402: Unified inbox read model (combined messages/notifications/assignments/approvals/acks)
 * COMMS-403: Outbox-based notification routing (dedupe key, retryable, commit-before-send)
 * COMMS-404: Preferences and quiet hours (channel opt-in, DND, digest, emergency override)
 * COMMS-405: Escalation/acknowledgement (required action/version/deadline, reminders, escalation)
 * COMMS-406: Secure attachments and links (reauthorize at access time, expiry/revocation)
 *
 * Pure: no I/O, no Supabase imports.
 */

// ===========================================================================
// COMMS-401 — Channel / audience model
// ===========================================================================

export type ChannelType = "in_app" | "push" | "sms" | "email" | "webhook"

export interface ChannelMembership {
  member_id: string
  source: "assignment" | "grant" | "exception"
  added_at: string
  /** If added via exception, reason is required. */
  exception_reason: string | null
  org_id: string
}

export interface CommsChannel {
  channel_id: string
  org_id: string
  name: string
  channel_types: ChannelType[]
  members: ChannelMembership[]
}

/** Guard: returns only members from the given org (prevents cross-org discovery). */
export function filterChannelMembersByOrg(
  channel: CommsChannel,
  org_id: string,
): ChannelMembership[] {
  return channel.members.filter((m) => m.org_id === org_id)
}

/** Add member; named exceptions require reason. */
export function addChannelMember(
  channel: CommsChannel,
  member: ChannelMembership,
): { ok: boolean; channel: CommsChannel | null; error?: string } {
  if (member.source === "exception" && !member.exception_reason?.trim()) {
    return { ok: false, channel: null, error: "exception_reason is required for exception source." }
  }
  if (channel.org_id !== member.org_id) {
    return { ok: false, channel: null, error: "Cross-org membership is not permitted." }
  }
  if (channel.members.some((m) => m.member_id === member.member_id)) return { ok: true, channel }
  return { ok: true, channel: { ...channel, members: [...channel.members, member] } }
}

export function removeChannelMember(channel: CommsChannel, member_id: string): CommsChannel {
  return { ...channel, members: channel.members.filter((m) => m.member_id !== member_id) }
}

// ===========================================================================
// COMMS-402 — Unified inbox read model
// ===========================================================================

export type InboxItemType =
  | "message"
  | "notification"
  | "assignment"
  | "approval_request"
  | "acknowledgement_required"

export type InboxItemPriority = "low" | "normal" | "high" | "critical"

export interface UnifiedInboxItem {
  item_id: string
  recipient_id: string
  item_type: InboxItemType
  source_type: string
  source_id: string
  title: string
  body: string | null
  priority: InboxItemPriority
  is_read: boolean
  requires_action: boolean
  action_completed: boolean
  deep_link: string | null
  created_at: string
  expires_at: string | null
}

export interface InboxFilter {
  item_types?: InboxItemType[]
  priority?: InboxItemPriority[]
  unread_only?: boolean
  requires_action_only?: boolean
}

export function applyInboxFilter(
  items: readonly UnifiedInboxItem[],
  filter: InboxFilter,
): UnifiedInboxItem[] {
  return items.filter((i) => {
    if (filter.item_types && !filter.item_types.includes(i.item_type)) return false
    if (filter.priority && !filter.priority.includes(i.priority)) return false
    if (filter.unread_only && i.is_read) return false
    if (filter.requires_action_only && (!i.requires_action || i.action_completed)) return false
    return true
  })
}

export function markInboxItemRead(item: UnifiedInboxItem): UnifiedInboxItem {
  return { ...item, is_read: true }
}

// ===========================================================================
// COMMS-403 — Outbox-based notification routing
// ===========================================================================

export type NotificationOutboxStatus =
  | "pending"
  | "processing"
  | "delivered"
  | "failed"
  | "dead_lettered"

export interface NotificationOutboxEntry {
  entry_id: string
  /** Deduplication key: same key = at-most-once delivery per transaction. */
  dedupe_key: string
  audience_ids: string[]
  event_type: string
  payload: unknown
  status: NotificationOutboxStatus
  attempt_count: number
  max_attempts: number
  next_attempt_at: string | null
  delivered_at: string | null
  last_error: string | null
  created_at: string
}

export function createOutboxEntry(params: {
  entry_id: string
  dedupe_key: string
  audience_ids: string[]
  event_type: string
  payload: unknown
  max_attempts?: number
  now: string
}): NotificationOutboxEntry {
  return {
    entry_id: params.entry_id,
    dedupe_key: params.dedupe_key,
    audience_ids: params.audience_ids,
    event_type: params.event_type,
    payload: params.payload,
    status: "pending",
    attempt_count: 0,
    max_attempts: params.max_attempts ?? 3,
    next_attempt_at: params.now,
    delivered_at: null,
    last_error: null,
    created_at: params.now,
  }
}

export function applyOutboxAttempt(
  entry: NotificationOutboxEntry,
  outcome: "success" | "failure",
  error: string | null,
  now: string,
  retryDelayMs = 60_000,
): NotificationOutboxEntry {
  const attempt_count = entry.attempt_count + 1
  if (outcome === "success") {
    return { ...entry, status: "delivered", attempt_count, delivered_at: now, last_error: null }
  }
  const exhausted = attempt_count >= entry.max_attempts
  return {
    ...entry,
    status: exhausted ? "dead_lettered" : "failed",
    attempt_count,
    last_error: error,
    next_attempt_at: exhausted ? null : new Date(new Date(now).getTime() + retryDelayMs).toISOString(),
  }
}

// ===========================================================================
// COMMS-404 — Preferences and quiet hours
// ===========================================================================

export interface QuietHoursPolicy {
  /** Local time HH:MM (24h). */
  start_local: string
  end_local: string
  tz: string
  /** Exempt emergency and critical priority messages. */
  emergency_override: boolean
}

export interface NotificationPreferences {
  user_id: string
  org_id: string
  opted_in_channels: ChannelType[]
  digest_mode: boolean
  quiet_hours: QuietHoursPolicy | null
}

export function isInQuietHours(
  pref: NotificationPreferences,
  localTimeHHMM: string,
  priority: InboxItemPriority,
): boolean {
  if (!pref.quiet_hours) return false
  const qh = pref.quiet_hours
  if (qh.emergency_override && (priority === "critical" || priority === "high")) return false
  // Simple lexicographic comparison works for HH:MM strings in the same day
  const inWindow = qh.start_local <= qh.end_local
    ? localTimeHHMM >= qh.start_local && localTimeHHMM < qh.end_local
    : localTimeHHMM >= qh.start_local || localTimeHHMM < qh.end_local // crosses midnight
  return inWindow
}

export function isChannelOptedIn(pref: NotificationPreferences, channel: ChannelType): boolean {
  return pref.opted_in_channels.includes(channel)
}

// ===========================================================================
// COMMS-405 — Escalation / acknowledgement
// ===========================================================================

export type CommAckStatus = "pending" | "acknowledged" | "dismissed" | "escalated" | "overdue"

export interface CommAckRecord {
  ack_id: string
  message_id: string
  recipient_id: string
  required_version: number | null
  deadline: string | null
  status: CommAckStatus
  acknowledged_at: string | null
  reminder_count: number
  escalated_at: string | null
}

export function createCommAck(params: {
  ack_id: string
  message_id: string
  recipient_id: string
  required_version?: number | null
  deadline?: string | null
}): CommAckRecord {
  return {
    ack_id: params.ack_id,
    message_id: params.message_id,
    recipient_id: params.recipient_id,
    required_version: params.required_version ?? null,
    deadline: params.deadline ?? null,
    status: "pending",
    acknowledged_at: null,
    reminder_count: 0,
    escalated_at: null,
  }
}

export function acknowledgeComm(
  ack: CommAckRecord,
  now: string,
): CommAckRecord {
  if (ack.status === "acknowledged") return ack // idempotent
  return { ...ack, status: "acknowledged", acknowledged_at: now }
}

/** Dismiss ≠ acknowledge. Dismissed is NOT considered resolved for required-action gates. */
export function dismissComm(ack: CommAckRecord): CommAckRecord {
  if (ack.status === "acknowledged" || ack.status === "dismissed") return ack
  return { ...ack, status: "dismissed" }
}

export function escalateComm(ack: CommAckRecord, now: string): CommAckRecord {
  return { ...ack, status: "escalated", escalated_at: now }
}

export function incrementReminderCount(ack: CommAckRecord): CommAckRecord {
  return { ...ack, reminder_count: ack.reminder_count + 1 }
}

export function isCommResolved(ack: CommAckRecord): boolean {
  return ack.status === "acknowledged"
}

// ===========================================================================
// COMMS-406 — Secure attachments and links
// ===========================================================================

export type AttachmentAccessStatus = "active" | "expired" | "revoked"

export interface SecureAttachment {
  attachment_id: string
  org_id: string
  owner_id: string
  file_path: string
  mime_type: string
  /** Pre-authorized token for access (short-lived, reauthorized at access time). */
  access_token: string
  token_expires_at: string
  status: AttachmentAccessStatus
  revoked_by: string | null
  revoked_at: string | null
}

export function checkAttachmentAccess(
  attachment: SecureAttachment,
  requester_org_id: string,
  now: string,
): { allowed: boolean; reason: string } {
  if (attachment.status === "revoked") {
    return { allowed: false, reason: "Attachment has been revoked." }
  }
  if (attachment.status === "expired" || attachment.token_expires_at < now) {
    return { allowed: false, reason: "Attachment access has expired. Request a new link." }
  }
  if (requester_org_id !== attachment.org_id) {
    return { allowed: false, reason: "Cross-org attachment access is not permitted." }
  }
  return { allowed: true, reason: "Access authorized." }
}

export function revokeAttachment(
  attachment: SecureAttachment,
  revokedBy: string,
  now: string,
): SecureAttachment {
  return { ...attachment, status: "revoked", revoked_by: revokedBy, revoked_at: now }
}

export function refreshAttachmentToken(
  attachment: SecureAttachment,
  new_token: string,
  new_expires_at: string,
): SecureAttachment {
  if (attachment.status !== "active") return attachment
  return { ...attachment, access_token: new_token, token_expires_at: new_expires_at }
}
