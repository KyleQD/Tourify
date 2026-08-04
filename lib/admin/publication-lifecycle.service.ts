/**
 * PUB-207 — Retract / supersede publication snapshots (server).
 * Invalidates share access and deliveries immediately; enqueues recipient notices;
 * never mutates snapshot payload; history remains queryable.
 */

import "server-only"

import { logAuditEvent } from "@/lib/audit"
import { commitDomainWithOutbox } from "@/lib/admin/publication-outbox.service"
import { buildPublicationOutboxIdempotencyKey } from "@/lib/admin/publication-outbox"
import {
  accessStateForSnapshot,
  buildPublicationLifecycleNotice,
  buildRetractionPatch,
  buildSupersedePatch,
  canRetractPublication,
  canSupersedePublication,
  isRetainedInPublicationHistory,
  validateRetractionReason,
  type PublicationLifecycleSnapshot,
} from "@/lib/admin/publication-lifecycle"
import type { SupabaseClient } from "@supabase/supabase-js"

type SupabaseLike = { from: (table: string) => any; rpc?: (...args: any[]) => any }

export class PublicationLifecycleError extends Error {
  status: number
  code: string

  constructor(message: string, status = 400, code = "lifecycle_error") {
    super(message)
    this.name = "PublicationLifecycleError"
    this.status = status
    this.code = code
  }
}

function mapSnapshot(raw: Record<string, unknown>): PublicationLifecycleSnapshot {
  return {
    id: String(raw.id),
    orgId: String(raw.org_id),
    status: String(raw.status || "draft"),
    supersededBy: raw.superseded_by ? String(raw.superseded_by) : null,
    retractedAt: raw.retracted_at ? String(raw.retracted_at) : null,
    retractedReason: raw.retracted_reason ? String(raw.retracted_reason) : null,
    sequence: raw.sequence == null ? null : Number(raw.sequence),
    version: raw.version == null ? null : Number(raw.version),
    publicationType: raw.publication_type ? String(raw.publication_type) : null,
    tourId: raw.tour_id ? String(raw.tour_id) : null,
    eventId: raw.event_id ? String(raw.event_id) : null,
    title: raw.title ? String(raw.title) : null,
    checksum: raw.checksum ? String(raw.checksum) : null,
  }
}

async function loadSnapshot(args: {
  supabase: SupabaseLike
  orgId: string
  snapshotId: string
}): Promise<PublicationLifecycleSnapshot> {
  const { data, error } = await args.supabase
    .from("admin_publication_snapshots")
    .select(
      "id, org_id, status, superseded_by, retracted_at, retracted_reason, sequence, version, publication_type, tour_id, event_id, title, checksum, payload",
    )
    .eq("id", args.snapshotId)
    .eq("org_id", args.orgId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) throw new PublicationLifecycleError("Snapshot not found.", 404, "missing")
  return mapSnapshot(data as Record<string, unknown>)
}

/**
 * Immediately invalidate share tokens and queued/open deliveries for a snapshot.
 * Does not delete access logs or snapshot history.
 */
export async function invalidatePublicationAccess(args: {
  supabase: SupabaseLike
  orgId: string
  snapshotId: string
  reason: "retracted" | "superseded"
}): Promise<{ revokedShareTokens: number; revokedDeliveries: number }> {
  const now = new Date().toISOString()

  const { data: tokens, error: tokenError } = await args.supabase
    .from("admin_publication_share_tokens")
    .update({ revoked_at: now })
    .eq("org_id", args.orgId)
    .eq("snapshot_id", args.snapshotId)
    .is("revoked_at", null)
    .select("id")
  if (tokenError) throw new Error(tokenError.message)

  const { data: deliveries, error: deliveryError } = await args.supabase
    .from("admin_publication_deliveries")
    .update({
      status: "revoked",
      revoked_at: now,
      updated_at: now,
      last_error_class: args.reason,
      last_error: `Publication ${args.reason}`,
    })
    .eq("org_id", args.orgId)
    .eq("snapshot_id", args.snapshotId)
    .in("status", ["queued", "processing", "delivered", "opened", "failed"])
    .select("id")
  if (deliveryError) throw new Error(deliveryError.message)

  return {
    revokedShareTokens: (tokens ?? []).length,
    revokedDeliveries: (deliveries ?? []).length,
  }
}

async function enqueueLifecycleNotice(args: {
  supabase: SupabaseLike
  orgId: string
  actorUserId: string
  correlationId: string
  action: "retract" | "supersede"
  snapshot: PublicationLifecycleSnapshot
  reason?: string | null
  successorSnapshotId?: string | null
}) {
  const notice = buildPublicationLifecycleNotice({
    action: args.action,
    snapshot: args.snapshot,
    reason: args.reason,
    successorSnapshotId: args.successorSnapshotId,
    actorUserId: args.actorUserId,
    correlationId: args.correlationId,
  })

  const eventType =
    args.action === "retract" ? "publication.retracted" : "publication.superseded"

  return commitDomainWithOutbox(args.supabase as SupabaseClient, {
    orgId: args.orgId,
    commandName: `publication.${args.action}`,
    correlationId: args.correlationId,
    actorUserId: args.actorUserId,
    domainPayload: notice,
    eventType,
    aggregateType: "publication_snapshot",
    aggregateId: args.snapshot.id,
    outboxPayload: notice,
    idempotencyKey: buildPublicationOutboxIdempotencyKey({
      orgId: args.orgId,
      eventType,
      aggregateType: "publication_snapshot",
      aggregateId: args.snapshot.id,
      naturalKey: `${args.action}:${args.correlationId}`,
    }),
  })
}

export async function retractPublicationSnapshot(args: {
  supabase: SupabaseLike
  orgId: string
  actorUserId: string
  snapshotId: string
  reason: string
  correlationId?: string | null
}) {
  const reasonResult = validateRetractionReason(args.reason)
  if (!reasonResult.ok)
    throw new PublicationLifecycleError("A retraction reason is required.", 400, reasonResult.reason)

  const snapshot = await loadSnapshot({
    supabase: args.supabase,
    orgId: args.orgId,
    snapshotId: args.snapshotId,
  })
  const allowed = canRetractPublication(snapshot)
  if (!allowed.ok)
    throw new PublicationLifecycleError(
      `Cannot retract publication (${allowed.reason}).`,
      409,
      allowed.reason,
    )

  const correlationId = args.correlationId?.trim() || crypto.randomUUID()
  const patch = buildRetractionPatch({ reason: reasonResult.reason })

  const { data: updated, error } = await args.supabase
    .from("admin_publication_snapshots")
    .update(patch)
    .eq("id", args.snapshotId)
    .eq("org_id", args.orgId)
    .eq("status", "committed")
    .select("id, org_id, status, retracted_at, retracted_reason, superseded_by, sequence, version, publication_type, tour_id, event_id, title, checksum")
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!updated)
    throw new PublicationLifecycleError("Snapshot could not be retracted.", 409, "conflict")

  const invalidation = await invalidatePublicationAccess({
    supabase: args.supabase,
    orgId: args.orgId,
    snapshotId: args.snapshotId,
    reason: "retracted",
  })

  const notice = await enqueueLifecycleNotice({
    supabase: args.supabase,
    orgId: args.orgId,
    actorUserId: args.actorUserId,
    correlationId,
    action: "retract",
    snapshot: mapSnapshot(updated as Record<string, unknown>),
    reason: reasonResult.reason,
  })

  await logAuditEvent({
    actorId: args.actorUserId,
    orgId: args.orgId,
    action: "publication.retract" as "unpublish",
    entityType: "publication_snapshot" as "content",
    entityId: args.snapshotId,
    correlationId,
    oldValues: { status: "committed" },
    newValues: {
      status: "retracted",
      reason: reasonResult.reason,
      ...invalidation,
      outboxId: notice.outboxId,
      historyRetained: true,
    },
  })

  return {
    snapshot: mapSnapshot(updated as Record<string, unknown>),
    accessState: accessStateForSnapshot(mapSnapshot(updated as Record<string, unknown>)),
    invalidation,
    notice: {
      outboxId: notice.outboxId,
      alreadyExisted: notice.alreadyExisted,
      correlationId: notice.correlationId,
    },
  }
}

export async function supersedePublicationSnapshot(args: {
  supabase: SupabaseLike
  orgId: string
  actorUserId: string
  snapshotId: string
  successorSnapshotId: string
  reason?: string | null
  correlationId?: string | null
}) {
  const snapshot = await loadSnapshot({
    supabase: args.supabase,
    orgId: args.orgId,
    snapshotId: args.snapshotId,
  })
  const allowed = canSupersedePublication(snapshot, args.successorSnapshotId)
  if (!allowed.ok)
    throw new PublicationLifecycleError(
      `Cannot supersede publication (${allowed.reason}).`,
      409,
      allowed.reason,
    )

  const successor = await loadSnapshot({
    supabase: args.supabase,
    orgId: args.orgId,
    snapshotId: args.successorSnapshotId,
  })
  if (successor.status !== "committed")
    throw new PublicationLifecycleError(
      "Successor snapshot must be committed.",
      409,
      "invalid_successor",
    )

  const correlationId = args.correlationId?.trim() || crypto.randomUUID()
  const patch = buildSupersedePatch({ successorSnapshotId: args.successorSnapshotId })

  const { data: updated, error } = await args.supabase
    .from("admin_publication_snapshots")
    .update(patch)
    .eq("id", args.snapshotId)
    .eq("org_id", args.orgId)
    .eq("status", "committed")
    .select("id, org_id, status, retracted_at, retracted_reason, superseded_by, sequence, version, publication_type, tour_id, event_id, title, checksum")
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!updated)
    throw new PublicationLifecycleError("Snapshot could not be superseded.", 409, "conflict")

  const invalidation = await invalidatePublicationAccess({
    supabase: args.supabase,
    orgId: args.orgId,
    snapshotId: args.snapshotId,
    reason: "superseded",
  })

  const notice = await enqueueLifecycleNotice({
    supabase: args.supabase,
    orgId: args.orgId,
    actorUserId: args.actorUserId,
    correlationId,
    action: "supersede",
    snapshot: mapSnapshot(updated as Record<string, unknown>),
    reason: args.reason?.trim() || "Superseded by a newer publication version.",
    successorSnapshotId: args.successorSnapshotId,
  })

  await logAuditEvent({
    actorId: args.actorUserId,
    orgId: args.orgId,
    action: "publication.supersede" as "update",
    entityType: "publication_snapshot" as "content",
    entityId: args.snapshotId,
    correlationId,
    oldValues: { status: "committed" },
    newValues: {
      status: "superseded",
      supersededBy: args.successorSnapshotId,
      ...invalidation,
      outboxId: notice.outboxId,
      historyRetained: true,
    },
  })

  return {
    snapshot: mapSnapshot(updated as Record<string, unknown>),
    successor,
    accessState: accessStateForSnapshot(mapSnapshot(updated as Record<string, unknown>)),
    invalidation,
    notice: {
      outboxId: notice.outboxId,
      alreadyExisted: notice.alreadyExisted,
      correlationId: notice.correlationId,
    },
  }
}

/**
 * After a new commit, mark prior committed siblings (same org+type+tour/event) superseded.
 */
export async function supersedePriorCommittedSnapshots(args: {
  supabase: SupabaseLike
  orgId: string
  actorUserId: string
  newSnapshotId: string
  publicationType: string
  tourId?: string | null
  eventId?: string | null
  correlationId?: string | null
}): Promise<{ supersededIds: string[] }> {
  let query = args.supabase
    .from("admin_publication_snapshots")
    .select("id")
    .eq("org_id", args.orgId)
    .eq("publication_type", args.publicationType)
    .eq("status", "committed")
    .neq("id", args.newSnapshotId)

  if (args.tourId) query = query.eq("tour_id", args.tourId)
  else if (args.eventId) query = query.eq("event_id", args.eventId)
  else return { supersededIds: [] }

  const { data, error } = await query
  if (error) throw new Error(error.message)

  const supersededIds: string[] = []
  for (const row of data ?? []) {
    const id = String((row as { id: string }).id)
    try {
      await supersedePublicationSnapshot({
        supabase: args.supabase,
        orgId: args.orgId,
        actorUserId: args.actorUserId,
        snapshotId: id,
        successorSnapshotId: args.newSnapshotId,
        reason: "Replaced by a newer committed publication.",
        correlationId: args.correlationId,
      })
      supersededIds.push(id)
    } catch (err) {
      if (err instanceof PublicationLifecycleError && err.status === 409) continue
      throw err
    }
  }

  return { supersededIds }
}

export async function listPublicationHistory(args: {
  supabase: SupabaseLike
  orgId: string
  tourId?: string
  eventId?: string
  publicationType?: string
  limit?: number
}) {
  const limit = Math.min(Math.max(args.limit ?? 50, 1), 200)
  let query = args.supabase
    .from("admin_publication_snapshots")
    .select(
      "id, org_id, status, superseded_by, retracted_at, retracted_reason, sequence, version, publication_type, tour_id, event_id, title, checksum, published_at, created_at, publisher_user_id",
    )
    .eq("org_id", args.orgId)
    .in("status", ["committed", "superseded", "retracted"])
    .order("created_at", { ascending: false })
    .limit(limit)

  if (args.tourId) query = query.eq("tour_id", args.tourId)
  if (args.eventId) query = query.eq("event_id", args.eventId)
  if (args.publicationType) query = query.eq("publication_type", args.publicationType)

  const { data, error } = await query
  if (error) throw new Error(error.message)

  return (data ?? [])
    .map((row: Record<string, unknown>) => {
      const snapshot = mapSnapshot(row)
      return {
        ...snapshot,
        accessState: accessStateForSnapshot(snapshot),
        retainedInHistory: isRetainedInPublicationHistory(snapshot.status),
        publishedAt: row.published_at ? String(row.published_at) : null,
        createdAt: row.created_at ? String(row.created_at) : null,
        publisherUserId: row.publisher_user_id ? String(row.publisher_user_id) : null,
      }
    })
}
