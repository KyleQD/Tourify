/**
 * P14 — editorial mutation orchestrator (the only World console writer).
 *
 * Every mutation runs the same governed pipeline, in order:
 *   1. session-scoped permission check (has_global_permission; never service
 *      role for the check itself, never client-supplied actor ids),
 *   2. fresh read of the stored row,
 *   3. optimistic version compare-and-swap guard (P14-T09),
 *   4. pure state-machine plan (fail-closed on invalid state),
 *   5. append-only hash-chained audit event (P14-T08),
 *   6. conditional UPDATE … WHERE version = expected (idempotent replay:
 *      re-running the same event_hash inserts nothing and rewrites nothing).
 *
 * Console pages call these through server actions; browsers never talk to
 * the tables directly.
 */
import { buildAuditEvent } from "./audit-events"
import {
  REQUIRED_PERMISSION,
  planCandidateAction,
  type CandidateActionInput,
  type CandidateSnapshot,
} from "./candidate-actions"
import { ensureCurrentVersion, nextVersion } from "./concurrency"
import {
  REQUIRED_PUBLISH_PERMISSION,
  REQUIRED_RETIRE_PERMISSION,
  planPublish,
  planRetire,
} from "./publication"

export interface EditorialClient {
  from(table: string): any
}

export interface PermissionChecker {
  (permission: string): Promise<boolean>
}

export class EditorialMutationError extends Error {
  constructor(
    public readonly code:
      | "permission_denied" | "not_found" | "version_conflict" | "invalid_transition",
    message: string,
  ) {
    super(message)
    this.name = "EditorialMutationError"
  }
}

interface StoredCandidateRow {
  id: string
  review_status: CandidateSnapshot["review_status"]
  match_status: CandidateSnapshot["match_status"]
  version: number | null
  matched_id: string | null
}

export interface MutationOutcome {
  ok: boolean
  code?: string
  auditHash?: string
}

/**
 * Shared pipeline for one candidate action.
 * `expectedVersion` comes from the reviewer's form (rendered row version).
 */
export async function applyCandidateAction(
  client: EditorialClient,
  opts: {
    actorId: string
    candidateId: string
    expectedVersion: number | null
    permissionCheck: PermissionChecker
    input: CandidateActionInput
    occurredAt?: string
  },
): Promise<MutationOutcome> {
  const required = REQUIRED_PERMISSION[opts.input.action]
  if (!(await opts.permissionCheck(required))) {
    throw new EditorialMutationError("permission_denied", `Missing ${required}`)
  }

  const { data: row, error } = await client
    .from("world_ingestion_candidates")
    .select("id, review_status, match_status, version, matched_id")
    .eq("id", opts.candidateId)
    .maybeSingle()
  if (error || !row) throw new EditorialMutationError("not_found", "Candidate not found.")

  const stored = row as StoredCandidateRow

  // P14-T09 — authoritative CAS against the stored row.
  try {
    ensureCurrentVersion("world_ingestion_candidates", stored.id, opts.expectedVersion, stored.version)
  } catch (err) {
    return { ok: false, code: "version_conflict" }
  }

  const plan = planCandidateAction(
    { id: stored.id, review_status: stored.review_status, match_status: stored.match_status, version: stored.version },
    opts.input,
  )
  if (!plan.ok) return { ok: false, code: plan.error }

  // Audit first: an append-only event with a unique hash makes replays no-ops.
  const event = buildAuditEvent({
    ...(opts.occurredAt ? { occurredAt: opts.occurredAt } : {}),
    actorId: opts.actorId,
    action: plan.auditAction,
    entityTable: "world_ingestion_candidates",
    entityId: stored.id,
    beforeRef: { review_status: stored.review_status, match_status: stored.match_status, version: stored.version },
    afterRef: plan.patch as unknown as Record<string, unknown>,
    reason: opts.input.reason,
  })
  await client.from("world_editorial_audit_events").upsert(event, { onConflict: "event_hash", ignoreDuplicates: true })

  // Conditional write: only applies while the row is still at the version
  // the planner saw — concurrent edits fail instead of overwriting.
  const { data: updated, error: updateError } = await client
    .from("world_ingestion_candidates")
    .update({ ...plan.patch, updated_at: new Date().toISOString() })
    .eq("id", stored.id)
    .eq("version", stored.version ?? 1)
    .select("id")
    .maybeSingle()
  if (updateError) throw new EditorialMutationError("invalid_transition", updateError.message ?? "update failed")
  if (!updated) return { ok: false, code: "version_conflict" }

  void nextVersion(stored.version) // patch already carries the next version
  return { ok: true, auditHash: event.event_hash }
}

/** Radio rights/health review (P14-T06): metadata-only ↔ playback-eligible ↔ retired. */
export async function applyRadioRightsUpdate(
  client: EditorialClient,
  opts: {
    actorId: string
    stationId: string
    expectedVersion: number | null
    rightsStatus: "metadata_only" | "playback_eligible" | "territory_restricted" | "retired"
    playbackStatus?: "healthy" | "unhealthy" | "unknown"
    reason: string
    permissionCheck: PermissionChecker
    occurredAt?: string
  },
): Promise<MutationOutcome> {
  if (!(await opts.permissionCheck("world.radio.review"))) {
    throw new EditorialMutationError("permission_denied", "Missing world.radio.review")
  }
  if (!opts.reason.trim()) return { ok: false, code: "reason_required" }

  const { data: row } = await client
    .from("world_radio_stations")
    .select("id, rights_status, playback_status, publication_status, version")
    .eq("id", opts.stationId)
    .maybeSingle()
  if (!row) throw new EditorialMutationError("not_found", "Station not found.")

  try {
    ensureCurrentVersion("world_radio_stations", row.id, opts.expectedVersion, row.version)
  } catch {
    return { ok: false, code: "version_conflict" }
  }

  // Rights ceiling rule (frozen playback architecture): retiring the station
  // forces playback ineligibility; territory-restricted stays metadata-safe.
  const nextPlayback =
    opts.rightsStatus === "retired"
      ? "unhealthy"
      : opts.playbackStatus ?? row.playback_status ?? "unknown"

  const patch = {
    rights_status: opts.rightsStatus,
    playback_status: nextPlayback,
    version: nextVersion(row.version),
  }

  const event = buildAuditEvent({
    ...(opts.occurredAt ? { occurredAt: opts.occurredAt } : {}),
    actorId: opts.actorId,
    action: "radio.rights_update",
    entityTable: "world_radio_stations",
    entityId: row.id,
    beforeRef: { rights_status: row.rights_status, playback_status: row.playback_status, version: row.version },
    afterRef: patch,
    reason: opts.reason,
  })
  await client.from("world_editorial_audit_events").upsert(event, { onConflict: "event_hash", ignoreDuplicates: true })

  const { data: updated } = await client
    .from("world_radio_stations")
    .update(patch)
    .eq("id", row.id)
    .eq("version", row.version ?? 1)
    .select("id")
    .maybeSingle()
  if (!updated) return { ok: false, code: "version_conflict" }

  return { ok: true, auditHash: event.event_hash }
}

/**
 * Claim relation edit (P14-T05): temporal scope, confidence, presentation
 * metadata. Reviewer authority required; every change is audited and
 * version-guarded. Claims never auto-publish — publication_state is
 * untouched here.
 */
export async function applyClaimEdit(
  client: EditorialClient,
  opts: {
    actorId: string
    claimId: string
    expectedVersion: number | null
    validFrom?: string | null
    validUntil?: string | null
    confidence?: number | null
    presentation?: Record<string, unknown> | null
    sourceIds?: string[] | null
    reason: string
    permissionCheck: PermissionChecker
    occurredAt?: string
  },
): Promise<MutationOutcome> {
  if (!(await opts.permissionCheck("world.knowledge.review"))) {
    throw new EditorialMutationError("permission_denied", "Missing world.knowledge.review")
  }
  if (!opts.reason.trim()) return { ok: false, code: "reason_required" }
  if (opts.confidence != null && (opts.confidence < 0 || opts.confidence > 1)) {
    return { ok: false, code: "confidence_out_of_range" }
  }

  const { data: row } = await client
    .from("world_claims")
    .select("id, confidence, valid_from, valid_until, metadata, version")
    .eq("id", opts.claimId)
    .maybeSingle()
  if (!row) throw new EditorialMutationError("not_found", "Claim not found.")

  try {
    ensureCurrentVersion("world_claims", row.id, opts.expectedVersion, row.version)
  } catch {
    return { ok: false, code: "version_conflict" }
  }

  const patch: Record<string, unknown> = { version: nextVersion(row.version) }
  if (opts.validFrom !== undefined) patch.valid_from = opts.validFrom
  if (opts.validUntil !== undefined) patch.valid_until = opts.validUntil
  if (opts.confidence !== undefined) patch.confidence = opts.confidence
  if (opts.presentation) {
    patch.metadata = { ...(row.metadata ?? {}), presentation: opts.presentation }
  }

  const event = buildAuditEvent({
    ...(opts.occurredAt ? { occurredAt: opts.occurredAt } : {}),
    actorId: opts.actorId,
    action: "claim.edit",
    entityTable: "world_claims",
    entityId: row.id,
    beforeRef: { confidence: row.confidence, valid_from: row.valid_from, valid_until: row.valid_until, version: row.version },
    afterRef: patch,
    reason: opts.reason,
  })
  await client.from("world_editorial_audit_events").upsert(event, { onConflict: "event_hash", ignoreDuplicates: true })

  const { data: updated } = await client
    .from("world_claims")
    .update(patch)
    .eq("id", row.id)
    .eq("version", row.version ?? 1)
    .select("id")
    .maybeSingle()
  if (!updated) return { ok: false, code: "version_conflict" }

  return { ok: true, auditHash: event.event_hash }
}

/** Publish gate (P14-T07) for any governed publication surface. */
export async function applyPublicationChange(
  client: EditorialClient,
  opts: {
    actorId: string
    kind: "publish" | "retire"
    entityTable: "world_radio_stations"
    entityId: string
    expectedVersion: number | null
    reason: string
    permissionCheck: PermissionChecker
    occurredAt?: string
  },
): Promise<MutationOutcome> {
  const required = opts.kind === "publish" ? REQUIRED_PUBLISH_PERMISSION : REQUIRED_RETIRE_PERMISSION
  if (!(await opts.permissionCheck(required))) {
    throw new EditorialMutationError("permission_denied", `Missing ${required}`)
  }

  const { data: row } = await client
    .from(opts.entityTable)
    .select("id, publication_status, review_status, version")
    .eq("id", opts.entityId)
    .maybeSingle()
  if (!row) throw new EditorialMutationError("not_found", "Entity not found.")

  try {
    ensureCurrentVersion(opts.entityTable, row.id, opts.expectedVersion, row.version)
  } catch {
    return { ok: false, code: "version_conflict" }
  }

  const snapshot = {
    id: row.id,
    publication_status: row.publication_status,
    review_status: row.review_status,
    version: row.version,
  }
  const permFlags = { hasPublishPermission: true }
  const plan =
    opts.kind === "publish"
      ? planPublish(snapshot, permFlags)
      : planRetire(snapshot, { ...permFlags, reason: opts.reason })
  if (!plan.ok) return { ok: false, code: plan.error }

  const event = buildAuditEvent({
    ...(opts.occurredAt ? { occurredAt: opts.occurredAt } : {}),
    actorId: opts.actorId,
    action: plan.auditAction,
    entityTable: opts.entityTable,
    entityId: row.id,
    beforeRef: { publication_status: row.publication_status, version: row.version },
    afterRef: plan.patch as unknown as Record<string, unknown>,
    reason: opts.reason,
  })
  await client.from("world_editorial_audit_events").upsert(event, { onConflict: "event_hash", ignoreDuplicates: true })

  const { data: updated } = await client
    .from(opts.entityTable)
    .update(plan.patch)
    .eq("id", row.id)
    .eq("version", row.version ?? 1)
    .select("id")
    .maybeSingle()
  if (!updated) return { ok: false, code: "version_conflict" }

  return { ok: true, auditHash: event.event_hash }
}
