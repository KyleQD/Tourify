/**
 * REL-401 — Offline/realtime test suite.
 *
 * Tests cover:
 *  - Worker itinerary/day-sheet/map offline freshness scenarios
 *  - Stale/superseded/revoked content detection
 *  - Queue ordering (sequence numbers, gap detection)
 *  - Permission revocation while subscribed
 *
 * Pure simulation — no I/O, no Supabase imports.
 * Companion to LIVE-406 (realtime-channel.ts) and LIVE-404/405 (day-sheet-publication/correction).
 */

// ---------------------------------------------------------------------------
// Offline package freshness
// ---------------------------------------------------------------------------

export type FreshnessStatus = "fresh" | "stale" | "superseded" | "revoked"

export interface OfflinePackage {
  package_id: string
  content_version: number
  downloaded_at: string
  /** ISO-8601 of the server's current version at download time. */
  server_version_at_download: string
  /** Whether the package's access grant was revoked server-side. */
  is_access_revoked: boolean
  ttl_seconds: number
}

export function computeOfflineFreshness(
  pkg: OfflinePackage,
  serverCurrentVersion: number,
  serverIsSuperseded: boolean,
  nowIso: string,
): FreshnessStatus {
  if (pkg.is_access_revoked) return "revoked"
  if (serverIsSuperseded) return "superseded"

  const downloadedMs = new Date(pkg.downloaded_at).getTime()
  const nowMs = new Date(nowIso).getTime()
  const ageSeconds = (nowMs - downloadedMs) / 1_000

  if (ageSeconds > pkg.ttl_seconds) return "stale"
  if (serverCurrentVersion > pkg.content_version) return "stale"
  return "fresh"
}

// ---------------------------------------------------------------------------
// Realtime queue ordering and gap detection
// ---------------------------------------------------------------------------

export interface QueuedMessage {
  seq: number
  payload: unknown
}

export interface QueueReconnectResult {
  in_order_messages: QueuedMessage[]
  gaps: Array<{ expected: number; got: number }>
  last_seq: number
}

/**
 * Replay messages received after a reconnect.
 * Messages must be sorted by seq; gaps are flagged (do not silently skip).
 */
export function processReconnectQueue(
  messages: QueuedMessage[],
  lastSeqSeen: number,
): QueueReconnectResult {
  const sorted = [...messages].sort((a, b) => a.seq - b.seq)
  const in_order_messages: QueuedMessage[] = []
  const gaps: Array<{ expected: number; got: number }> = []
  let expected = lastSeqSeen + 1

  for (const msg of sorted) {
    if (msg.seq < expected) continue // duplicate, skip
    if (msg.seq > expected) {
      gaps.push({ expected, got: msg.seq })
    }
    in_order_messages.push(msg)
    expected = msg.seq + 1
  }

  return {
    in_order_messages,
    gaps,
    last_seq: in_order_messages.length > 0 ? in_order_messages[in_order_messages.length - 1].seq : lastSeqSeen,
  }
}

// ---------------------------------------------------------------------------
// Permission revocation simulation
// ---------------------------------------------------------------------------

export type RevocationReason = "org_change" | "role_removed" | "grant_expired" | "manual_revoke"

export interface PermissionRevocationEvent {
  subscription_id: string
  reason: RevocationReason
  revoked_at: string
}

export type SubscriptionState = "active" | "revoked" | "reconnecting"

export interface SubscriptionStatus {
  subscription_id: string
  state: SubscriptionState
  revocation: PermissionRevocationEvent | null
}

export function applyRevocationEvent(
  status: SubscriptionStatus,
  event: PermissionRevocationEvent,
): SubscriptionStatus {
  if (status.state === "revoked") return status // already revoked
  return { ...status, state: "revoked", revocation: event }
}

/**
 * After a reconnect, the subscription should be in reconnecting state.
 * The caller must re-authorize before setting state back to active.
 */
export function markReconnecting(status: SubscriptionStatus): SubscriptionStatus {
  if (status.state === "revoked") return status // revoked stays revoked
  return { ...status, state: "reconnecting" }
}

export function reauthorize(status: SubscriptionStatus): SubscriptionStatus {
  if (status.state === "revoked") return status // cannot reauthorize revoked
  return { ...status, state: "active" }
}

// ---------------------------------------------------------------------------
// Stale content detection (day-sheet/map)
// ---------------------------------------------------------------------------

export interface ContentVersionRef {
  content_id: string
  client_version: number
  server_version: number
  is_superseded: boolean
  is_revoked: boolean
}

export type ContentStaleness =
  | "current"
  | "version_behind"
  | "superseded"
  | "revoked"

export function checkContentStaleness(ref: ContentVersionRef): ContentStaleness {
  if (ref.is_revoked) return "revoked"
  if (ref.is_superseded) return "superseded"
  if (ref.client_version < ref.server_version) return "version_behind"
  return "current"
}
