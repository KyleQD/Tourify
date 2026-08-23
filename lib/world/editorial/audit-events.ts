/**
 * P14-T08 — immutable editorial audit events (tamper-evident hash chain).
 *
 * Every privileged mutation appends one event capturing actor, action,
 * entity, before/after snapshot references, timestamp, and a required
 * reason. `event_hash` chains the previous event's hash, so deleting or
 * editing history breaks verification. Rows are insert-only from the
 * trusted server path; RLS denies everything else.
 */
import { createHash } from "node:crypto"

export type WorldAuditAction =
  | "candidate.approve"
  | "candidate.reject"
  | "candidate.request_evidence"
  | "candidate.match_existing"
  | "candidate.create_draft"
  | "candidate.merge_duplicate"
  | "candidate.assign_reviewer"
  | "claim.edit"
  | "radio.rights_update"
  | "publication.publish"
  | "publication.retire"
  | "publication.supersede"

export interface AuditEventInput {
  /** Deterministic ISO instant — injectable for tests, defaults to now. */
  occurredAt?: string
  actorId: string
  action: WorldAuditAction
  entityTable: string
  entityId: string
  beforeRef?: Record<string, unknown> | null
  afterRef?: Record<string, unknown> | null
  reason: string
  prevHash?: string | null
}

export interface AuditEventRow {
  occurred_at: string
  actor_id: string
  action: string
  entity_table: string
  entity_id: string
  before_ref: Record<string, unknown> | null
  after_ref: Record<string, unknown> | null
  reason: string
  prev_hash: string | null
  event_hash: string
}

/** Canonical JSON: sorted keys, no whitespace → stable hashes everywhere. */
function canonicalJson(value: unknown): string {
  if (value === null || value === undefined) return "null"
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(",")}}`
  }
  return JSON.stringify(value)
}

/**
 * Build one audit row. Fails closed on missing actor/action/entity/reason.
 * The hash covers the full chain position so reordering is detectable.
 */
export function buildAuditEvent(input: AuditEventInput): AuditEventRow {
  const actorId = input.actorId?.trim()
  const entityId = input.entityId?.trim()
  const entityTable = input.entityTable?.trim()
  const reason = input.reason?.trim()
  if (!actorId) throw new Error("audit_event_requires_actor")
  if (!entityId || !entityTable) throw new Error("audit_event_requires_entity")
  if (!reason) throw new Error("audit_event_requires_reason")

  const occurredAt = input.occurredAt ?? new Date().toISOString()
  const beforeRef = input.beforeRef ?? null
  const afterRef = input.afterRef ?? null
  const prevHash = input.prevHash ?? null

  const eventHash = createHash("sha256")
    .update(
      [
        canonicalJson(prevHash),
        canonicalJson(occurredAt),
        canonicalJson(actorId),
        canonicalJson(input.action),
        canonicalJson(entityTable),
        canonicalJson(entityId),
        canonicalJson(beforeRef),
        canonicalJson(afterRef),
        canonicalJson(reason),
      ].join("|"),
    )
    .digest("hex")

  return {
    occurred_at: occurredAt,
    actor_id: actorId,
    action: input.action,
    entity_table: entityTable,
    entity_id: entityId,
    before_ref: beforeRef,
    after_ref: afterRef,
    reason,
    prev_hash: prevHash,
    event_hash: eventHash,
  }
}

/** Verify an ordered chain of events (oldest first). */
export function verifyAuditChain(rows: readonly AuditEventRow[]): { valid: boolean; brokenAt: string | null } {
  let prev: string | null = null
  for (const row of rows) {
    const rebuilt: string = buildAuditEvent({
      occurredAt: row.occurred_at,
      actorId: row.actor_id,
      action: row.action as WorldAuditAction,
      entityTable: row.entity_table,
      entityId: row.entity_id,
      beforeRef: row.before_ref,
      afterRef: row.after_ref,
      reason: row.reason,
      prevHash: prev,
    }).event_hash
    if (rebuilt !== row.event_hash) return { valid: false, brokenAt: row.event_hash }
    if ((row.prev_hash ?? null) !== prev) return { valid: false, brokenAt: row.event_hash }
    prev = row.event_hash
  }
  return { valid: true, brokenAt: null }
}
