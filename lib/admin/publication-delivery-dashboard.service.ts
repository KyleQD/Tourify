/**
 * PUB-205 — Delivery dashboard reads, safe retry, authorized export.
 */

import "server-only"

import { logAuditEvent } from "@/lib/audit"
import {
  buildDeliveryDashboardSummary,
  buildDeliveryEvidenceRows,
  deliveryEvidenceToCsv,
  filterDeliveryRows,
  isSafeDeliveryRetry,
  type DeliveryDashboardFilters,
  type DeliveryDashboardSummary,
  type DeliveryEvidenceRow,
  type PublicationDeliveryRowView,
} from "@/lib/admin/publication-delivery-dashboard"
import type { PublicationDeliveryChannel, PublicationDeliveryStatus } from "@/lib/admin/publication-schema"
import { replayPublicationOutboxDeadLetter } from "@/lib/admin/publication-outbox.service"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseLike = { from: (table: string) => any }

function mapDeliveryRow(raw: Record<string, unknown>): PublicationDeliveryRowView {
  const recipient =
    raw.admin_publication_recipients && typeof raw.admin_publication_recipients === "object"
      ? (raw.admin_publication_recipients as Record<string, unknown>)
      : {}
  const snapshot =
    raw.admin_publication_snapshots && typeof raw.admin_publication_snapshots === "object"
      ? (raw.admin_publication_snapshots as Record<string, unknown>)
      : {}

  return {
    id: String(raw.id),
    orgId: String(raw.org_id),
    snapshotId: String(raw.snapshot_id),
    recipientId: String(raw.recipient_id),
    channel: raw.channel as PublicationDeliveryChannel,
    status: raw.status as PublicationDeliveryStatus,
    attempts: Number(raw.attempts ?? 0),
    providerRef: raw.provider_ref ? String(raw.provider_ref) : null,
    lastErrorClass: raw.last_error_class ? String(raw.last_error_class) : null,
    lastError: raw.last_error ? String(raw.last_error) : null,
    outboxId: raw.outbox_id ? String(raw.outbox_id) : null,
    queuedAt: raw.queued_at ? String(raw.queued_at) : null,
    deliveredAt: raw.delivered_at ? String(raw.delivered_at) : null,
    openedAt: raw.opened_at ? String(raw.opened_at) : null,
    acknowledgedAt: raw.acknowledged_at ? String(raw.acknowledged_at) : null,
    failedAt: raw.failed_at ? String(raw.failed_at) : null,
    recipientDisplayName: recipient.display_name ? String(recipient.display_name) : null,
    recipientSubjectType: recipient.subject_type ? String(recipient.subject_type) : null,
    recipientSubjectKey: recipient.subject_key ? String(recipient.subject_key) : null,
    publicationType: snapshot.publication_type ? String(snapshot.publication_type) : null,
    publicationTitle: snapshot.title ? String(snapshot.title) : null,
    tourId: snapshot.tour_id ? String(snapshot.tour_id) : null,
    eventId: snapshot.event_id ? String(snapshot.event_id) : null,
    snapshotSequence:
      typeof snapshot.sequence === "number" ? snapshot.sequence : Number(snapshot.sequence ?? NaN) || null,
    snapshotVersion:
      typeof snapshot.version === "number" ? snapshot.version : Number(snapshot.version ?? NaN) || null,
  }
}

export async function listPublicationDeliveries(args: {
  supabase: SupabaseLike
  orgId: string
  filters?: DeliveryDashboardFilters
  limit?: number
}): Promise<{ rows: PublicationDeliveryRowView[]; summary: DeliveryDashboardSummary }> {
  const limit = Math.min(Math.max(args.limit ?? 200, 1), 500)

  let query = args.supabase
    .from("admin_publication_deliveries")
    .select(
      `
      id, org_id, snapshot_id, recipient_id, channel, status, attempts,
      provider_ref, last_error_class, last_error, outbox_id,
      queued_at, delivered_at, opened_at, acknowledged_at, failed_at,
      admin_publication_recipients ( display_name, subject_type, subject_key ),
      admin_publication_snapshots ( publication_type, title, tour_id, event_id, sequence, version )
    `,
    )
    .eq("org_id", args.orgId)
    .order("queued_at", { ascending: false })
    .limit(limit)

  if (args.filters?.snapshotId) query = query.eq("snapshot_id", args.filters.snapshotId)
  if (args.filters?.channel && !Array.isArray(args.filters.channel))
    query = query.eq("channel", args.filters.channel)
  if (
    args.filters?.status &&
    args.filters.status !== "attention" &&
    !Array.isArray(args.filters.status)
  ) {
    query = query.eq("status", args.filters.status)
  }
  if (Array.isArray(args.filters?.status)) query = query.in("status", args.filters.status)
  if (Array.isArray(args.filters?.channel)) query = query.in("channel", args.filters.channel)

  const { data, error } = await query
  if (error) throw new Error(error.message)

  let rows = (data ?? []).map((row: Record<string, unknown>) => mapDeliveryRow(row))

  if (args.filters?.tourId || args.filters?.status === "attention" || args.filters?.q) {
    rows = filterDeliveryRows(rows, {
      tourId: args.filters.tourId,
      status: args.filters.status === "attention" ? "attention" : undefined,
      q: args.filters.q,
      channel: Array.isArray(args.filters.channel) ? args.filters.channel : undefined,
    })
  }

  return {
    rows,
    summary: buildDeliveryDashboardSummary(rows),
  }
}

export async function retrySafePublicationDeliveries(args: {
  supabase: SupabaseLike
  orgId: string
  actorUserId: string
  deliveryIds?: string[]
  snapshotId?: string
  correlationId?: string | null
}): Promise<{
  retried: string[]
  skipped: Array<{ id: string; reason: string }>
  replayedOutboxIds: string[]
}> {
  let query = args.supabase
    .from("admin_publication_deliveries")
    .select(
      "id, org_id, snapshot_id, status, last_error_class, outbox_id, attempts",
    )
    .eq("org_id", args.orgId)
    .eq("status", "failed")

  if (args.snapshotId) query = query.eq("snapshot_id", args.snapshotId)
  if (args.deliveryIds?.length) query = query.in("id", args.deliveryIds)

  const { data, error } = await query
  if (error) throw new Error(error.message)

  const retried: string[] = []
  const skipped: Array<{ id: string; reason: string }> = []
  const replayedOutboxIds: string[] = []
  const now = new Date().toISOString()

  for (const raw of data ?? []) {
    const row = raw as Record<string, unknown>
    const id = String(row.id)
    const view = {
      status: String(row.status) as PublicationDeliveryStatus,
      lastErrorClass: row.last_error_class ? String(row.last_error_class) : null,
    }
    if (!isSafeDeliveryRetry(view)) {
      skipped.push({ id, reason: "not_safe_to_retry" })
      continue
    }

    const { error: updateError } = await args.supabase
      .from("admin_publication_deliveries")
      .update({
        status: "queued",
        last_error: null,
        last_error_class: null,
        failed_at: null,
        processing_at: null,
        updated_at: now,
        queued_at: now,
      })
      .eq("id", id)
      .eq("org_id", args.orgId)
      .eq("status", "failed")

    if (updateError) {
      skipped.push({ id, reason: updateError.message })
      continue
    }

    retried.push(id)

    const outboxId = row.outbox_id ? String(row.outbox_id) : null
    if (outboxId) {
      const { data: outbox } = await args.supabase
        .from("admin_publication_outbox")
        .select("id, status")
        .eq("id", outboxId)
        .eq("org_id", args.orgId)
        .maybeSingle()

      if (outbox?.status === "dead") {
        try {
          await replayPublicationOutboxDeadLetter({
            orgId: args.orgId,
            outboxId,
            correlationId: args.correlationId,
          })
          replayedOutboxIds.push(outboxId)
        } catch {
          // Delivery already re-queued; outbox replay best-effort.
        }
      } else if (outbox?.status === "failed" || outbox?.status === "delivered") {
        await args.supabase
          .from("admin_publication_outbox")
          .update({
            status: "pending",
            available_at: now,
            last_error: null,
            last_error_class: null,
            locked_at: null,
            locked_by: null,
          })
          .eq("id", outboxId)
          .eq("org_id", args.orgId)
        replayedOutboxIds.push(outboxId)
      }
    }
  }

  await logAuditEvent({
    actorId: args.actorUserId,
    orgId: args.orgId,
    action: "publication.delivery.retry" as "update",
    entityType: "publication_delivery" as "content",
    entityId: args.snapshotId || retried[0] || "batch",
    correlationId: args.correlationId || undefined,
    newValues: {
      retriedCount: retried.length,
      skippedCount: skipped.length,
      replayedOutboxIds,
      deliveryIds: retried,
    },
  })

  return { retried, skipped, replayedOutboxIds }
}

export async function exportPublicationDeliveryEvidence(args: {
  supabase: SupabaseLike
  orgId: string
  filters?: DeliveryDashboardFilters
  format?: "json" | "csv"
  limit?: number
}): Promise<{ format: "json" | "csv"; rows: DeliveryEvidenceRow[]; csv?: string; summary: DeliveryDashboardSummary }> {
  const { rows, summary } = await listPublicationDeliveries({
    supabase: args.supabase,
    orgId: args.orgId,
    filters: args.filters,
    limit: args.limit ?? 500,
  })
  const evidence = buildDeliveryEvidenceRows(rows)
  const format = args.format === "csv" ? "csv" : "json"
  return {
    format,
    rows: evidence,
    csv: format === "csv" ? deliveryEvidenceToCsv(evidence) : undefined,
    summary,
  }
}
