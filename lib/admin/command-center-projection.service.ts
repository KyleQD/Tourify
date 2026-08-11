/**
 * REP-202 — Persist and update tour command-center summary projections
 * from domain/outbox events (idempotent), with watermarks, rebuild, lag, reconcile.
 */

import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import { executeServiceRoleJob } from "@/lib/supabase/service-role-job"
import {
  advanceWatermark,
  COMMAND_CENTER_PROJECTION_SOURCES,
  computeSourceLag,
  decideProjectionApply,
  reconcileDomainCounts,
  resolveProjectionSourceFromEventType,
  summarizeLag,
  TOUR_COMMAND_CENTER_OUTBOX_EVENT_TYPES,
  type CommandCenterProjectionSource,
  type DomainReconciliationRow,
  type SourceLagReport,
} from "@/lib/admin/command-center-projection"
import {
  COMMAND_CENTER_SUMMARY_CONTRACT_VERSION,
  parseCommandCenterSummaryContract,
  type CommandCenterSummaryContract,
} from "@/lib/admin/command-center-summary-contract"
import { buildTourCommandCenterSummary } from "@/lib/admin/tour-command-center-summary"
import type { AdminCapability } from "@/lib/auth/admin-capabilities"
import {
  registerPublicationOutboxHandler,
  type PublicationOutboxRow,
} from "@/lib/admin/publication-outbox"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseLike = { from: (table: string) => any; rpc?: (...args: any[]) => any }

export interface ProjectionApplyResult {
  applied: boolean
  reason: "apply" | "already_applied" | "stale_event" | "skipped_non_tour"
  revision: number | null
  sourceKey: CommandCenterProjectionSource | null
}

export interface ProjectionHealthReport {
  orgId: string
  tourId: string
  revision: number | null
  projectedAt: string | null
  rebuiltAt: string | null
  contractVersion: number | null
  watermarks: Array<{
    sourceKey: string
    watermarkAt: string
    sourceVersion: string | null
    lastOutboxId: string | null
  }>
  lag: {
    overall: ReturnType<typeof summarizeLag>["overall"]
    maxLagMs: number | null
    laggingSources: CommandCenterProjectionSource[]
    missingWatermarks: CommandCenterProjectionSource[]
    sources: SourceLagReport[]
  }
  reconciliation: {
    matched: boolean
    rows: DomainReconciliationRow[]
  } | null
}

function asClient(supabase: SupabaseLike): SupabaseClient {
  return supabase as unknown as SupabaseClient
}

export async function applyOutboxEventToTourCommandCenterProjection(args: {
  supabase: SupabaseLike
  row: PublicationOutboxRow
  /** Optional prebuilt contract; when omitted, rebuild from live summary is used. */
  contract?: CommandCenterSummaryContract
  capabilities?: readonly AdminCapability[]
}): Promise<ProjectionApplyResult> {
  if (args.row.aggregate_type !== "tour" && !String(args.row.event_type).startsWith("tour.")) {
    // publication.* events may still target tour aggregates
    if (args.row.aggregate_type !== "tour" && args.row.aggregate_type !== "publication")
      return { applied: false, reason: "skipped_non_tour", revision: null, sourceKey: null }
  }

  const tourId =
    args.row.aggregate_type === "tour"
      ? args.row.aggregate_id
      : typeof args.row.payload.tourId === "string"
        ? args.row.payload.tourId
        : typeof args.row.payload.tour_id === "string"
          ? args.row.payload.tour_id
          : null

  if (!tourId)
    return { applied: false, reason: "skipped_non_tour", revision: null, sourceKey: null }

  const orgId = args.row.org_id
  const sourceKey = resolveProjectionSourceFromEventType(args.row.event_type)
  const client = asClient(args.supabase)

  const { data: existingApplied } = await client
    .from("tour_command_center_projection_applied_events")
    .select("id")
    .eq("org_id", orgId)
    .eq("outbox_id", args.row.id)
    .maybeSingle()

  const { data: watermarkRow } = await client
    .from("tour_command_center_source_watermarks")
    .select("watermark_at")
    .eq("org_id", orgId)
    .eq("tour_id", tourId)
    .eq("source_key", sourceKey)
    .maybeSingle()

  const decision = decideProjectionApply({
    alreadyApplied: Boolean(existingApplied?.id),
    eventCreatedAt: args.row.created_at,
    sourceWatermarkAt: watermarkRow?.watermark_at ? String(watermarkRow.watermark_at) : null,
  })
  if (!decision.apply)
    return { applied: false, reason: decision.reason, revision: null, sourceKey }

  let contract = args.contract
  if (!contract) {
    const { data: tour, error: tourError } = await client
      .from("tours")
      .select("*")
      .eq("id", tourId)
      .eq("org_id", orgId)
      .maybeSingle()
    if (tourError) throw new Error(tourError.message)
    if (!tour) throw new Error("Tour not found for projection apply.")

    const summary = await buildTourCommandCenterSummary({
      supabase: args.supabase,
      tourId,
      orgId,
      capabilities: args.capabilities ?? (["tour.view", "event.view"] as AdminCapability[]),
      tour: tour as Record<string, unknown>,
    })
    contract = summary.contract
  }

  parseCommandCenterSummaryContract(contract)

  const { data: existingProjection } = await client
    .from("tour_command_center_summary_projections")
    .select("id, revision")
    .eq("org_id", orgId)
    .eq("tour_id", tourId)
    .maybeSingle()

  const nextRevision =
    typeof existingProjection?.revision === "number" ? existingProjection.revision + 1 : 1
  const projectedAt = new Date().toISOString()
  const nextWatermark = advanceWatermark({
    current: watermarkRow?.watermark_at ? String(watermarkRow.watermark_at) : null,
    eventAt: args.row.created_at,
  })

  const projectionPayload = {
    org_id: orgId,
    tour_id: tourId,
    contract_version: COMMAND_CENTER_SUMMARY_CONTRACT_VERSION,
    revision: nextRevision,
    access_class: contract.access.class,
    contract,
    last_outbox_id: args.row.id,
    last_event_type: args.row.event_type,
    last_correlation_id: args.row.correlation_id,
    projected_at: projectedAt,
    updated_at: projectedAt,
  }

  if (existingProjection?.id) {
    const { error } = await client
      .from("tour_command_center_summary_projections")
      .update(projectionPayload)
      .eq("id", existingProjection.id)
    if (error) throw new Error(error.message)
  } else {
    const { error } = await client
      .from("tour_command_center_summary_projections")
      .insert(projectionPayload)
    if (error) throw new Error(error.message)
  }

  const { error: watermarkError } = await client
    .from("tour_command_center_source_watermarks")
    .upsert(
      {
        org_id: orgId,
        tour_id: tourId,
        source_key: sourceKey,
        watermark_at: nextWatermark,
        source_version: String(nextRevision),
        last_outbox_id: args.row.id,
        updated_at: projectedAt,
      },
      { onConflict: "org_id,tour_id,source_key" },
    )
  if (watermarkError) throw new Error(watermarkError.message)

  const { error: appliedError } = await client
    .from("tour_command_center_projection_applied_events")
    .insert({
      org_id: orgId,
      tour_id: tourId,
      outbox_id: args.row.id,
      idempotency_key: args.row.idempotency_key,
      event_type: args.row.event_type,
      source_key: sourceKey,
      applied_at: projectedAt,
    })
  if (appliedError) {
    // Unique violation = concurrent idempotent apply
    if (appliedError.code === "23505")
      return { applied: false, reason: "already_applied", revision: nextRevision, sourceKey }
    throw new Error(appliedError.message)
  }

  return { applied: true, reason: "apply", revision: nextRevision, sourceKey }
}

export async function rebuildTourCommandCenterProjection(args: {
  supabase: SupabaseLike
  orgId: string
  tourId: string
  capabilities: readonly AdminCapability[]
  correlationId?: string | null
}): Promise<{
  revision: number
  contract: CommandCenterSummaryContract
  rebuiltAt: string
}> {
  const client = asClient(args.supabase)
  const { data: tour, error: tourError } = await client
    .from("tours")
    .select("*")
    .eq("id", args.tourId)
    .eq("org_id", args.orgId)
    .maybeSingle()
  if (tourError) throw new Error(tourError.message)
  if (!tour) throw new Error("Tour not found.")

  const summary = await buildTourCommandCenterSummary({
    supabase: args.supabase,
    tourId: args.tourId,
    orgId: args.orgId,
    capabilities: args.capabilities,
    tour: tour as Record<string, unknown>,
  })
  const contract = parseCommandCenterSummaryContract(summary.contract)
  const rebuiltAt = new Date().toISOString()

  const { data: existing } = await client
    .from("tour_command_center_summary_projections")
    .select("id, revision")
    .eq("org_id", args.orgId)
    .eq("tour_id", args.tourId)
    .maybeSingle()

  const revision = typeof existing?.revision === "number" ? existing.revision + 1 : 1
  const payload = {
    org_id: args.orgId,
    tour_id: args.tourId,
    contract_version: COMMAND_CENTER_SUMMARY_CONTRACT_VERSION,
    revision,
    access_class: contract.access.class,
    contract,
    last_outbox_id: null,
    last_event_type: "projection.rebuild",
    last_correlation_id: args.correlationId ?? null,
    rebuilt_at: rebuiltAt,
    projected_at: rebuiltAt,
    updated_at: rebuiltAt,
  }

  if (existing?.id) {
    const { error } = await client
      .from("tour_command_center_summary_projections")
      .update(payload)
      .eq("id", existing.id)
    if (error) throw new Error(error.message)
  } else {
    const { error } = await client.from("tour_command_center_summary_projections").insert(payload)
    if (error) throw new Error(error.message)
  }

  for (const sourceKey of COMMAND_CENTER_PROJECTION_SOURCES) {
    const { error } = await client.from("tour_command_center_source_watermarks").upsert(
      {
        org_id: args.orgId,
        tour_id: args.tourId,
        source_key: sourceKey,
        watermark_at: rebuiltAt,
        source_version: `rebuild:${revision}`,
        last_outbox_id: null,
        updated_at: rebuiltAt,
      },
      { onConflict: "org_id,tour_id,source_key" },
    )
    if (error) throw new Error(error.message)
  }

  return { revision, contract, rebuiltAt }
}

export async function replayTourCommandCenterProjectionFromOutbox(args: {
  supabase: SupabaseLike
  orgId: string
  tourId: string
  capabilities: readonly AdminCapability[]
  /** Re-apply delivered/dead tour outbox rows newer than this ISO timestamp. */
  since?: string | null
  limit?: number
}): Promise<{
  scanned: number
  applied: number
  skipped: number
  results: ProjectionApplyResult[]
}> {
  const client = asClient(args.supabase)
  let query = client
    .from("admin_publication_outbox")
    .select("*")
    .eq("org_id", args.orgId)
    .eq("aggregate_id", args.tourId)
    .in("event_type", [...TOUR_COMMAND_CENTER_OUTBOX_EVENT_TYPES])
    .order("created_at", { ascending: true })
    .limit(args.limit ?? 100)

  if (args.since) query = query.gt("created_at", args.since)

  const { data, error } = await query
  if (error) throw new Error(error.message)

  const rows = (data ?? []) as PublicationOutboxRow[]
  const results: ProjectionApplyResult[] = []
  let applied = 0
  let skipped = 0

  for (const raw of rows) {
    const row: PublicationOutboxRow = {
      id: String(raw.id),
      org_id: String(raw.org_id),
      domain_transaction_id: raw.domain_transaction_id ? String(raw.domain_transaction_id) : null,
      event_type: String(raw.event_type),
      aggregate_type: String(raw.aggregate_type),
      aggregate_id: String(raw.aggregate_id),
      payload:
        raw.payload && typeof raw.payload === "object"
          ? (raw.payload as Record<string, unknown>)
          : {},
      idempotency_key: String(raw.idempotency_key),
      correlation_id: String(raw.correlation_id),
      status: raw.status as PublicationOutboxRow["status"],
      attempts: Number(raw.attempts ?? 0),
      max_attempts: Number(raw.max_attempts ?? 8),
      available_at: String(raw.available_at),
      locked_at: raw.locked_at ? String(raw.locked_at) : null,
      locked_by: raw.locked_by ? String(raw.locked_by) : null,
      last_error: raw.last_error ? String(raw.last_error) : null,
      last_error_class: raw.last_error_class ? String(raw.last_error_class) : null,
      created_at: String(raw.created_at),
      processed_at: raw.processed_at ? String(raw.processed_at) : null,
    }

    const result = await applyOutboxEventToTourCommandCenterProjection({
      supabase: args.supabase,
      row,
      capabilities: args.capabilities,
    })
    results.push(result)
    if (result.applied) applied += 1
    else skipped += 1
  }

  return { scanned: rows.length, applied, skipped, results }
}

export async function inspectTourCommandCenterProjection(args: {
  supabase: SupabaseLike
  orgId: string
  tourId: string
  capabilities: readonly AdminCapability[]
}): Promise<ProjectionHealthReport> {
  const client = asClient(args.supabase)
  const nowIso = new Date().toISOString()

  const { data: projection } = await client
    .from("tour_command_center_summary_projections")
    .select("revision, projected_at, rebuilt_at, contract_version, contract")
    .eq("org_id", args.orgId)
    .eq("tour_id", args.tourId)
    .maybeSingle()

  const { data: watermarkRows } = await client
    .from("tour_command_center_source_watermarks")
    .select("source_key, watermark_at, source_version, last_outbox_id")
    .eq("org_id", args.orgId)
    .eq("tour_id", args.tourId)

  const watermarks = (watermarkRows ?? []).map((row) => ({
    sourceKey: String(row.source_key),
    watermarkAt: String(row.watermark_at),
    sourceVersion: row.source_version ? String(row.source_version) : null,
    lastOutboxId: row.last_outbox_id ? String(row.last_outbox_id) : null,
  }))
  const watermarkBySource = new Map(
    watermarks.map((row) => [row.sourceKey, row.watermarkAt] as const),
  )

  const { data: tour } = await client
    .from("tours")
    .select("*")
    .eq("id", args.tourId)
    .eq("org_id", args.orgId)
    .maybeSingle()

  const tourUpdatedAt =
    typeof tour?.updated_at === "string" ? tour.updated_at : projection?.projected_at ?? null

  const lagSources: SourceLagReport[] = COMMAND_CENTER_PROJECTION_SOURCES.map((sourceKey) =>
    computeSourceLag({
      sourceKey,
      watermarkAt: watermarkBySource.get(sourceKey) ?? null,
      sourceUpdatedAt: tourUpdatedAt,
      nowIso,
    }),
  )

  let reconciliation: ProjectionHealthReport["reconciliation"] = null
  if (tour) {
    const liveSummary = await buildTourCommandCenterSummary({
      supabase: args.supabase,
      tourId: args.tourId,
      orgId: args.orgId,
      capabilities: args.capabilities,
      tour: tour as Record<string, unknown>,
    })
    const projectedContract =
      projection?.contract && typeof projection.contract === "object"
        ? parseCommandCenterSummaryContract(projection.contract)
        : null
    const rows = liveSummary.contract.domainMetrics.map((liveMetric) => {
      const projected = projectedContract?.domainMetrics.find(
        (row) => row.domain === liveMetric.domain,
      )
      return reconcileDomainCounts({
        domain: liveMetric.domain,
        projectedCount: projected?.count ?? null,
        liveCount: liveMetric.count,
      })
    })
    reconciliation = {
      matched: rows.every((row) => row.matched),
      rows,
    }
  }

  return {
    orgId: args.orgId,
    tourId: args.tourId,
    revision: typeof projection?.revision === "number" ? projection.revision : null,
    projectedAt: projection?.projected_at ? String(projection.projected_at) : null,
    rebuiltAt: projection?.rebuilt_at ? String(projection.rebuilt_at) : null,
    contractVersion:
      typeof projection?.contract_version === "number" ? projection.contract_version : null,
    watermarks,
    lag: {
      ...summarizeLag(lagSources),
      sources: lagSources,
    },
    reconciliation,
  }
}

/** @deprecated Prefer inspectTourCommandCenterProjection (non-mutating). */
export const getTourCommandCenterProjectionHealth = inspectTourCommandCenterProjection

let handlersRegistered = false

/** Register publication outbox handlers that update the summary projection. */
export function registerTourCommandCenterProjectionOutboxHandlers(): void {
  if (handlersRegistered) return
  handlersRegistered = true

  const handler = async (row: PublicationOutboxRow) => {
    const tourId = row.aggregate_type === "tour"
      ? row.aggregate_id
      : typeof row.payload.tourId === "string"
        ? row.payload.tourId
        : typeof row.payload.tour_id === "string"
          ? row.payload.tour_id
          : null

    await executeServiceRoleJob(
      {
        orgId: row.org_id,
        reason: `Apply ${row.event_type} to tour command-center projection`,
        moduleId: "admin.command-center.projection",
        target: { tourId },
      },
      async (client) => applyOutboxEventToTourCommandCenterProjection({
        supabase: client,
        row,
        capabilities: ["tour.view", "event.view", "tour.manage", "finance.view", "logistics.view", "vendor.view"],
      }),
    )
  }

  for (const eventType of TOUR_COMMAND_CENTER_OUTBOX_EVENT_TYPES)
    registerPublicationOutboxHandler(eventType, handler)
}

// Auto-register for cron / worker processes that import the service module.
registerTourCommandCenterProjectionOutboxHandlers()
