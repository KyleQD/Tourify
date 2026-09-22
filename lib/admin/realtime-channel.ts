/**
 * LIVE-406 — Establish scoped realtime channel
 *
 * Models a scoped realtime pub/sub channel for live event operations.
 *
 * Design:
 *   - Each channel is scoped to (org_id, event_id) and optionally a
 *     sub-scope (role group, section, department).
 *   - Subscriptions are authorized at subscribe time; a capability check
 *     is re-run on every message receive.
 *   - Every message carries a monotonically increasing sequence_number
 *     so clients can detect gaps.
 *   - Reconnect / catch-up: a client supplies last_seq and the server
 *     returns all messages with seq > last_seq from the replay buffer.
 *   - Permission changes revoke subscriptions instantly.
 *
 * Pure domain logic; no Supabase / WebSocket imports.
 */

// ---------------------------------------------------------------------------
// Channel scope
// ---------------------------------------------------------------------------

export type ChannelSubScope =
  | "all"            // whole event
  | "department"     // one department only
  | "role_group"     // e.g. "stage_crew", "front_of_house"
  | "management"     // production management only

export interface RealtimeChannelScope {
  org_id: string
  event_id: string
  sub_scope: ChannelSubScope
  /** For department/role_group sub_scopes */
  scope_value?: string
}

// ---------------------------------------------------------------------------
// Subscription lifecycle
// ---------------------------------------------------------------------------

export type SubscriptionStatus =
  | "active"
  | "suspended"    // temporarily paused (e.g. permission check pending)
  | "revoked"      // hard revoke due to permission change or explicit kick

export interface RealtimeSubscription {
  id: string
  user_id: string
  channel_id: string
  scope: RealtimeChannelScope
  status: SubscriptionStatus
  /** Sequence number of the last message delivered to this subscriber */
  last_delivered_seq: number
  /** Client-reported last seen seq (for catch-up calculation) */
  last_seen_seq: number
  subscribed_at: string
  last_auth_check_at: string
  revoked_at?: string
  revoke_reason?: string
}

// ---------------------------------------------------------------------------
// Authorization check result
// ---------------------------------------------------------------------------

export type ChannelAuthResult =
  | { authorized: true }
  | { authorized: false; reason: string }

/**
 * Capability required to subscribe to each sub_scope level.
 * Callers pass the set of capabilities the acting user holds.
 */
const SCOPE_REQUIRED_CAPABILITY: Record<ChannelSubScope, string> = {
  all: "event.live_ops",
  department: "event.live_ops",
  role_group: "event.live_ops",
  management: "event.manage",
}

export function checkChannelAuthorization(
  scope: RealtimeChannelScope,
  userCapabilities: string[],
  userOrgId: string,
): ChannelAuthResult {
  if (userOrgId !== scope.org_id) {
    return { authorized: false, reason: "org_mismatch" }
  }
  const required = SCOPE_REQUIRED_CAPABILITY[scope.sub_scope]
  if (!userCapabilities.includes(required)) {
    return { authorized: false, reason: `missing_capability:${required}` }
  }
  return { authorized: true }
}

// ---------------------------------------------------------------------------
// Subscription lifecycle helpers
// ---------------------------------------------------------------------------

export function createSubscription(params: {
  id: string
  user_id: string
  channel_id: string
  scope: RealtimeChannelScope
  now?: string
}): RealtimeSubscription {
  const ts = params.now ?? new Date().toISOString()
  return {
    id: params.id,
    user_id: params.user_id,
    channel_id: params.channel_id,
    scope: params.scope,
    status: "active",
    last_delivered_seq: 0,
    last_seen_seq: 0,
    subscribed_at: ts,
    last_auth_check_at: ts,
  }
}

export function revokeSubscription(
  sub: RealtimeSubscription,
  reason: string,
  now?: string,
): RealtimeSubscription {
  if (sub.status === "revoked") return sub  // idempotent
  const ts = now ?? new Date().toISOString()
  return { ...sub, status: "revoked", revoked_at: ts, revoke_reason: reason }
}

export function markAuthChecked(
  sub: RealtimeSubscription,
  now?: string,
): RealtimeSubscription {
  const ts = now ?? new Date().toISOString()
  return { ...sub, last_auth_check_at: ts }
}

// ---------------------------------------------------------------------------
// Channel message
// ---------------------------------------------------------------------------

export type LiveMessageType =
  | "timeline_update"       // ROS item changed
  | "task_update"           // live task status changed
  | "announcement"          // operator broadcast
  | "check_in_event"        // check-in recorded
  | "incident_update"       // incident status changed
  | "permission_changed"    // capability/subscription change notification
  | "heartbeat"             // keep-alive / sequence ping

export interface RealtimeMessage {
  id: string
  channel_id: string
  sequence_number: number        // monotonically increasing per channel
  type: LiveMessageType
  payload: Record<string, unknown>
  /** Scope this message applies to; null = all subscribers */
  target_scope?: ChannelSubScope
  target_scope_value?: string
  sent_by: string
  sent_at: string
}

// ---------------------------------------------------------------------------
// Replay buffer — a fixed-size ring buffer for catch-up
// ---------------------------------------------------------------------------

export interface ReplayBuffer {
  channel_id: string
  messages: RealtimeMessage[]
  max_size: number
}

export function createReplayBuffer(channelId: string, maxSize = 200): ReplayBuffer {
  return { channel_id: channelId, messages: [], max_size: maxSize }
}

export function appendToBuffer(
  buffer: ReplayBuffer,
  message: RealtimeMessage,
): ReplayBuffer {
  const messages =
    buffer.messages.length >= buffer.max_size
      ? [...buffer.messages.slice(1), message]  // evict oldest
      : [...buffer.messages, message]
  return { ...buffer, messages }
}

/**
 * Returns all messages with sequence_number > lastSeq for catch-up.
 * Result is sorted ascending by sequence_number.
 */
export function getCatchUpMessages(
  buffer: ReplayBuffer,
  lastSeq: number,
): RealtimeMessage[] {
  return buffer.messages
    .filter((m) => m.sequence_number > lastSeq)
    .sort((a, b) => a.sequence_number - b.sequence_number)
}

// ---------------------------------------------------------------------------
// Sequence counter (per-channel, monotonic)
// ---------------------------------------------------------------------------

export interface ChannelSequenceState {
  channel_id: string
  next_seq: number
}

export function nextSequenceNumber(state: ChannelSequenceState): {
  seq: number
  updated: ChannelSequenceState
} {
  const seq = state.next_seq
  return { seq, updated: { ...state, next_seq: state.next_seq + 1 } }
}

// ---------------------------------------------------------------------------
// Message visibility check (for scoped delivery)
// ---------------------------------------------------------------------------

export function isMessageVisibleToSubscriber(
  message: RealtimeMessage,
  sub: RealtimeSubscription,
): boolean {
  if (sub.status !== "active") return false
  if (!message.target_scope || message.target_scope === "all") return true
  if (message.target_scope !== sub.scope.sub_scope) return false
  if (message.target_scope_value && sub.scope.scope_value !== message.target_scope_value) return false
  return true
}

// ---------------------------------------------------------------------------
// Gap detection (client-side)
// ---------------------------------------------------------------------------

export interface GapDetectionResult {
  has_gap: boolean
  /** First missing sequence number, if a gap is detected */
  first_missing_seq?: number
}

export function detectMessageGap(
  messages: RealtimeMessage[],
  expectedStartSeq: number,
): GapDetectionResult {
  if (messages.length === 0) return { has_gap: false }
  const sorted = [...messages].sort((a, b) => a.sequence_number - b.sequence_number)
  for (let i = 0; i < sorted.length; i++) {
    const expected = expectedStartSeq + i
    if (sorted[i].sequence_number !== expected) {
      return { has_gap: true, first_missing_seq: expected }
    }
  }
  return { has_gap: false }
}

// ---------------------------------------------------------------------------
// Channel summary
// ---------------------------------------------------------------------------

export interface RealtimeChannelSummary {
  channel_id: string
  scope: RealtimeChannelScope
  active_subscriber_count: number
  buffer_size: number
  latest_seq: number
}

export function summarizeChannel(
  channelId: string,
  scope: RealtimeChannelScope,
  subscriptions: RealtimeSubscription[],
  buffer: ReplayBuffer,
): RealtimeChannelSummary {
  const latest = buffer.messages.at(-1)?.sequence_number ?? 0
  return {
    channel_id: channelId,
    scope,
    active_subscriber_count: subscriptions.filter((s) => s.status === "active").length,
    buffer_size: buffer.messages.length,
    latest_seq: latest,
  }
}
