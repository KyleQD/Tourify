/**
 * PLAN-402 — Presence and conflict-safe collaboration for tour builder.
 *
 * Active-editor presence is optional (editors can opt in/out).
 * Version conflicts are detected and resolved without data loss.
 * Comment threads provide structured discussion without notification noise.
 *
 * Design:
 *  - PresenceSession: a user editing a tour plan section (optional).
 *  - editPresence helpers: join/leave/heartbeat/list
 *  - ConflictResolution: detect and record how a version conflict was resolved
 *    (server-wins, client-wins, manual-merge — never silent overwrite).
 *  - PlanComment: threaded comment on a section/stop with reply/resolve.
 *  - NotificationPreference: per-user opt-out for low-signal events.
 *
 * Pure: no I/O, no Supabase imports.
 */

// ---------------------------------------------------------------------------
// Presence
// ---------------------------------------------------------------------------

export interface PresenceSession {
  session_id: string
  tour_id: string
  user_id: string
  section: string | null   // null = whole plan
  joined_at: string
  last_heartbeat: string
  is_active: boolean
}

export function joinPresence(params: {
  session_id: string
  tour_id: string
  user_id: string
  section?: string | null
  now: string
}): PresenceSession {
  return {
    session_id: params.session_id,
    tour_id: params.tour_id,
    user_id: params.user_id,
    section: params.section ?? null,
    joined_at: params.now,
    last_heartbeat: params.now,
    is_active: true,
  }
}

export function leavePresence(session: PresenceSession, now: string): PresenceSession {
  return { ...session, is_active: false, last_heartbeat: now }
}

export function heartbeatPresence(session: PresenceSession, now: string): PresenceSession {
  return { ...session, last_heartbeat: now }
}

/**
 * Return sessions that are still considered active (heartbeat within staleThresholdMs).
 */
export function getActivePresenceSessions(
  sessions: readonly PresenceSession[],
  nowIso: string,
  staleThresholdMs = 60_000,
): PresenceSession[] {
  const nowMs = new Date(nowIso).getTime()
  return sessions.filter((s) => {
    if (!s.is_active) return false
    const heartbeatMs = new Date(s.last_heartbeat).getTime()
    return nowMs - heartbeatMs <= staleThresholdMs
  })
}

// ---------------------------------------------------------------------------
// Conflict resolution
// ---------------------------------------------------------------------------

export type ConflictResolutionStrategy =
  | "server_wins"
  | "client_wins"
  | "manual_merge"

export interface PlanConflictResolution {
  resolution_id: string
  tour_id: string
  section: string
  server_version: number
  client_version: number
  strategy: ConflictResolutionStrategy
  resolved_by: string
  resolved_at: string
  /** Fields that were merged manually (for manual_merge strategy). */
  merged_fields: string[]
}

export function createConflictResolution(params: {
  resolution_id: string
  tour_id: string
  section: string
  server_version: number
  client_version: number
  strategy: ConflictResolutionStrategy
  resolved_by: string
  resolved_at: string
  merged_fields?: string[]
}): PlanConflictResolution {
  return {
    resolution_id: params.resolution_id,
    tour_id: params.tour_id,
    section: params.section,
    server_version: params.server_version,
    client_version: params.client_version,
    strategy: params.strategy,
    resolved_by: params.resolved_by,
    resolved_at: params.resolved_at,
    merged_fields: params.merged_fields ?? [],
  }
}

/**
 * Detect whether a version conflict exists between server and client.
 */
export function hasVersionConflict(
  serverVersion: number,
  clientVersion: number,
): boolean {
  return serverVersion !== clientVersion
}

// ---------------------------------------------------------------------------
// Plan comments
// ---------------------------------------------------------------------------

export type CommentStatus = "open" | "resolved"

export interface PlanComment {
  comment_id: string
  tour_id: string
  section: string
  stop_id: string | null
  author_id: string
  created_at: string
  body: string
  status: CommentStatus
  replies: PlanCommentReply[]
  resolved_by: string | null
  resolved_at: string | null
}

export interface PlanCommentReply {
  reply_id: string
  comment_id: string
  author_id: string
  created_at: string
  body: string
}

export function createPlanComment(params: {
  comment_id: string
  tour_id: string
  section: string
  stop_id?: string | null
  author_id: string
  body: string
  now: string
}): PlanComment {
  return {
    comment_id: params.comment_id,
    tour_id: params.tour_id,
    section: params.section,
    stop_id: params.stop_id ?? null,
    author_id: params.author_id,
    created_at: params.now,
    body: params.body,
    status: "open",
    replies: [],
    resolved_by: null,
    resolved_at: null,
  }
}

export function replyToComment(
  comment: PlanComment,
  reply: PlanCommentReply,
): PlanComment {
  // Idempotent on reply_id
  if (comment.replies.some((r) => r.reply_id === reply.reply_id)) return comment
  return { ...comment, replies: [...comment.replies, reply] }
}

export function resolveComment(
  comment: PlanComment,
  actor: string,
  now: string,
): PlanComment {
  if (comment.status === "resolved") return comment
  return { ...comment, status: "resolved", resolved_by: actor, resolved_at: now }
}

export function reopenComment(comment: PlanComment): PlanComment {
  return { ...comment, status: "open", resolved_by: null, resolved_at: null }
}

// ---------------------------------------------------------------------------
// Notification preferences
// ---------------------------------------------------------------------------

export type PlanNotificationEvent =
  | "comment_added"
  | "change_proposed"
  | "change_approved"
  | "change_rejected"
  | "conflict_detected"
  | "presence_joined"

export interface PlanNotificationPreference {
  user_id: string
  tour_id: string
  muted_events: PlanNotificationEvent[]
}

export function shouldNotify(
  pref: PlanNotificationPreference,
  event: PlanNotificationEvent,
): boolean {
  return !pref.muted_events.includes(event)
}

export function muteNotificationEvent(
  pref: PlanNotificationPreference,
  event: PlanNotificationEvent,
): PlanNotificationPreference {
  if (pref.muted_events.includes(event)) return pref
  return { ...pref, muted_events: [...pref.muted_events, event] }
}

export function unmuteNotificationEvent(
  pref: PlanNotificationPreference,
  event: PlanNotificationEvent,
): PlanNotificationPreference {
  return { ...pref, muted_events: pref.muted_events.filter((e) => e !== event) }
}
