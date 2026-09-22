/**
 * PUB-204 — Transactional publication command (server).
 */

import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { logAuditEvent } from "@/lib/audit"
import {
  assembleTransactionalPublish,
  buildDefaultTourAudienceCandidates,
  buildDefaultTourBookSections,
  buildPublicationCommitIdempotencyKey,
  TransactionalPublishValidationError,
  type TransactionalPublishAssembly,
  type TransactionalPublishResultView,
} from "@/lib/admin/publication-transactional-publish"

export { TransactionalPublishValidationError }
import { normalizePublicationCorrelationId } from "@/lib/admin/publication-outbox"
import type { AudienceCandidate } from "@/lib/admin/publication-audience-preview"
import type { PublicationType } from "@/lib/admin/publication-schema"
import type { SnapshotSectionInput } from "@/lib/admin/publication-snapshot-renderer"

type SupabaseLike = { from: (table: string) => any; rpc: (...args: any[]) => any }

export class TransactionalPublishConflictError extends Error {
  status = 409

  constructor(message: string) {
    super(message)
    this.name = "TransactionalPublishConflictError"
  }
}

export class TransactionalPublishAuthError extends Error {
  status: number

  constructor(message: string, status = 403) {
    super(message)
    this.name = "TransactionalPublishAuthError"
    this.status = status
  }
}

function mapRpcRow(row: Record<string, unknown>): TransactionalPublishResultView {
  return {
    snapshotId: String(row.snapshot_id),
    domainTransactionId: row.domain_transaction_id ? String(row.domain_transaction_id) : null,
    outboxId: row.outbox_id ? String(row.outbox_id) : null,
    alreadyExisted: Boolean(row.already_existed),
    sequence: Number(row.sequence ?? 1),
    version: Number(row.version ?? 1),
    checksum: String(row.checksum ?? ""),
    correlationId: String(row.correlation_id ?? ""),
    status: "committed",
  }
}

/**
 * Commit a prepared assembly atomically. Duplicate idempotency returns original.
 */
export async function commitTransactionalPublication(args: {
  supabase: SupabaseLike
  orgId: string
  actorUserId: string
  idempotencyKey: string
  correlationId?: string | null
  assembly: TransactionalPublishAssembly
  commandName?: string
}): Promise<{ result: TransactionalPublishResultView; assembly: TransactionalPublishAssembly }> {
  if (!args.idempotencyKey?.trim()) {
    throw new TransactionalPublishValidationError("Idempotency-Key is required.")
  }

  const correlationId = normalizePublicationCorrelationId(args.correlationId)

  const { data, error } = await args.supabase.rpc("admin_publication_transactional_publish", {
    p_org_id: args.orgId,
    p_actor_user_id: args.actorUserId,
    p_idempotency_key: args.idempotencyKey.trim(),
    p_correlation_id: correlationId,
    p_snapshot: args.assembly.snapshot,
    p_sections: args.assembly.sections,
    p_audience: args.assembly.audience,
    p_recipients: args.assembly.recipients,
    p_deliveries: args.assembly.deliveries,
    p_lifecycle: args.assembly.lifecycle,
    p_command_name: args.commandName ?? "publication.publish",
  })

  if (error) {
    const message = error.message || "Transactional publish failed"
    if (/capability|permission|42501/i.test(message))
      throw new TransactionalPublishAuthError(message, 403)
    if (/idempotency|conflict|duplicate/i.test(message))
      throw new TransactionalPublishConflictError(message)
    throw new Error(message)
  }

  const row = Array.isArray(data) ? data[0] : data
  if (!row) throw new Error("Empty response from admin_publication_transactional_publish")

  const result = mapRpcRow(row as Record<string, unknown>)

  await logAuditEvent({
    actorId: args.actorUserId,
    orgId: args.orgId,
    action: (result.alreadyExisted ? "publish.idempotent_replay" : "publish") as "publish",
    entityType: "publication_snapshot" as "content",
    entityId: result.snapshotId,
    correlationId: result.correlationId,
    newValues: {
      kind: "publication.transactional_publish",
      publicationType: args.assembly.snapshot.publication_type,
      tourId: args.assembly.snapshot.tour_id,
      eventId: args.assembly.snapshot.event_id,
      checksum: result.checksum,
      sequence: result.sequence,
      version: result.version,
      alreadyExisted: result.alreadyExisted,
      deliveryCount: args.assembly.deliveries.length,
      recipientCount: args.assembly.audience.recipient_count,
      outboxId: result.outboxId,
      domainTransactionId: result.domainTransactionId,
    },
  })

  return { result, assembly: args.assembly }
}

export async function publishTourBookTransactionally(args: {
  supabase: SupabaseLike
  orgId: string
  actorUserId: string
  tourId: string
  idempotencyKey: string
  correlationId?: string | null
  title?: string
  sourcePlanVersion?: number
  candidates?: AudienceCandidate[]
  sections?: SnapshotSectionInput[]
}): Promise<{
  result: TransactionalPublishResultView
  assembly: TransactionalPublishAssembly
  tour: Record<string, unknown>
}> {
  const { data: tour, error } = await args.supabase
    .from("tours")
    .select("id, org_id, name, start_date, end_date, plan_version, settings, status")
    .eq("id", args.tourId)
    .eq("org_id", args.orgId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!tour) throw new TransactionalPublishAuthError("Tour not found.", 404)

  const settings =
    tour.settings && typeof tour.settings === "object" && !Array.isArray(tour.settings)
      ? (tour.settings as Record<string, unknown>)
      : {}

  const { data: links } = await args.supabase
    .from("tour_events")
    .select("ordinal, event_id, events_v2(id, title, start_at, settings)")
    .eq("tour_id", args.tourId)
    .order("ordinal", { ascending: true })

  const stops = (links ?? []).map((link: any, index: number) => {
    const event = link.events_v2 || {}
    const eventSettings =
      event.settings && typeof event.settings === "object" ? event.settings : {}
    return {
      ordinal: typeof link.ordinal === "number" ? link.ordinal : index,
      name: String(event.title || `Stop ${index + 1}`),
      local_date: event.start_at ? String(event.start_at).slice(0, 10) : null,
      venue_label: String(eventSettings.venue_label || eventSettings.venueLabel || "") || null,
      event_id: link.event_id ? String(link.event_id) : event.id ? String(event.id) : null,
    }
  })

  const sourcePlanVersion =
    args.sourcePlanVersion ??
    (typeof tour.plan_version === "number" ? tour.plan_version : 1)

  const sections =
    args.sections ??
    buildDefaultTourBookSections({
      tour: {
        id: String(tour.id),
        name: String(tour.name || "Tour"),
        start_date: tour.start_date ? String(tour.start_date) : null,
        end_date: tour.end_date ? String(tour.end_date) : null,
        settings,
      },
      stops,
    })

  const candidates =
    args.candidates ??
    buildDefaultTourAudienceCandidates({
      publisherUserId: args.actorUserId,
      settings,
    })

  const assembly = assembleTransactionalPublish({
    publicationType: "tour_book" satisfies PublicationType,
    orgId: args.orgId,
    subjectType: "tour",
    subjectId: args.tourId,
    title: args.title || `Tour book: ${String(tour.name || "Tour")}`,
    sourcePlanVersion,
    sections,
    candidates,
    lifecycleTourId: args.tourId,
  })

  const committed = await commitTransactionalPublication({
    supabase: args.supabase,
    orgId: args.orgId,
    actorUserId: args.actorUserId,
    idempotencyKey: args.idempotencyKey,
    correlationId: args.correlationId,
    assembly,
    commandName: "tour.publish",
  })

  // PUB-207 — new commit supersedes prior committed tour_book siblings (history retained).
  let supersededIds: string[] = []
  if (!committed.result.alreadyExisted) {
    const { supersedePriorCommittedSnapshots } = await import(
      "@/lib/admin/publication-lifecycle.service"
    )
    const prior = await supersedePriorCommittedSnapshots({
      supabase: args.supabase,
      orgId: args.orgId,
      actorUserId: args.actorUserId,
      newSnapshotId: committed.result.snapshotId,
      publicationType: "tour_book",
      tourId: args.tourId,
      correlationId: committed.result.correlationId,
    })
    supersededIds = prior.supersededIds
  }

  const { data: refreshed } = await args.supabase
    .from("tours")
    .select("*")
    .eq("id", args.tourId)
    .eq("org_id", args.orgId)
    .maybeSingle()

  return {
    result: committed.result,
    assembly: committed.assembly,
    tour: (refreshed || tour) as Record<string, unknown>,
    supersededIds,
  } as unknown as {
    result: typeof committed.result
    assembly: typeof committed.assembly
    tour: Record<string, unknown>
  }
}

export function resolveTourPublishIdempotencyKey(input: {
  orgId: string
  tourId: string
  headerKey?: string | null
  sourcePlanVersion?: number
}): string {
  const header = input.headerKey?.trim()
  if (header) return header
  return buildPublicationCommitIdempotencyKey({
    orgId: input.orgId,
    publicationType: "tour_book",
    subjectType: "tour",
    subjectId: input.tourId,
    naturalKey: `plan:${input.sourcePlanVersion ?? 1}`,
  })
}

/** Test helper type export for clients that need SupabaseClient. */
export type TransactionalPublishClient = SupabaseClient
