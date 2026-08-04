/**
 * TOUR-206 — Idempotent resumable tour duplication job.
 *
 * Large copies run domain-by-domain; source IDs are preserved in audit metadata
 * and job id_map; new tokens/identities are generated for the target tour.
 */

import { logAuditEvent } from "@/lib/audit"
import { AdminTourEventOperationsService } from "@/lib/admin/tour-event-operations.service"
import {
  decodeTourDuplicatePlanToken,
  normalizeTourDuplicateSelection,
  type TourDuplicateDomain,
  type TourDuplicateDomainSelection,
} from "@/lib/admin/tour-duplicate-preview"
import {
  TOUR_DUPLICATE_DOMAIN_ORDER,
  initialDomainStatus,
  isProtectedEventForDuplicate,
  nextPendingDomain,
  selectionFromUnknown,
  summarizeDomainStatus,
  type TourDuplicateDomainResult,
  type TourDuplicateDomainStatusMap,
  type TourDuplicateIdMap,
  type TourDuplicateJobStatus,
} from "@/lib/admin/tour-duplicate-job"

export {
  TOUR_DUPLICATE_DOMAIN_ORDER,
  initialDomainStatus,
  isProtectedEventForDuplicate,
  nextPendingDomain,
  summarizeDomainStatus,
}
export type {
  TourDuplicateDomainResult,
  TourDuplicateDomainStatusMap,
  TourDuplicateIdMap,
  TourDuplicateJobStatus,
}

export interface TourDuplicateJobRow {
  id: string
  org_id: string
  source_tour_id: string
  target_tour_id: string | null
  actor_user_id: string
  plan_token: string
  selection: TourDuplicateDomainSelection
  proposed_name: string | null
  idempotency_key: string
  status: TourDuplicateJobStatus
  current_domain: TourDuplicateDomain | null
  domain_status: TourDuplicateDomainStatusMap
  id_map: TourDuplicateIdMap
  correlation_id: string
  attempts: number
  last_error: string | null
  created_at?: string
  updated_at?: string
  completed_at?: string | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseLike = { from: (table: string) => any }

function asSelection(value: unknown): TourDuplicateDomainSelection {
  return selectionFromUnknown(value)
}

function presentJob(row: Record<string, unknown>): TourDuplicateJobRow {
  return {
    id: String(row.id),
    org_id: String(row.org_id),
    source_tour_id: String(row.source_tour_id),
    target_tour_id: row.target_tour_id ? String(row.target_tour_id) : null,
    actor_user_id: String(row.actor_user_id),
    plan_token: String(row.plan_token),
    selection: asSelection(row.selection),
    proposed_name: row.proposed_name ? String(row.proposed_name) : null,
    idempotency_key: String(row.idempotency_key),
    status: String(row.status) as TourDuplicateJobStatus,
    current_domain: (row.current_domain as TourDuplicateDomain | null) ?? null,
    domain_status: (row.domain_status as TourDuplicateDomainStatusMap) || {},
    id_map: (row.id_map as TourDuplicateIdMap) || {},
    correlation_id: String(row.correlation_id || ""),
    attempts: Number(row.attempts || 0),
    last_error: row.last_error ? String(row.last_error) : null,
    created_at: row.created_at ? String(row.created_at) : undefined,
    updated_at: row.updated_at ? String(row.updated_at) : undefined,
    completed_at: row.completed_at ? String(row.completed_at) : null,
  }
}

async function persistJob(
  supabase: SupabaseLike,
  jobId: string,
  patch: Record<string, unknown>,
): Promise<TourDuplicateJobRow> {
  const { data, error } = await supabase
    .from("tour_duplicate_jobs")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", jobId)
    .select("*")
    .single()
  if (error || !data) throw new Error(error?.message || "Failed to update duplicate job")
  return presentJob(data)
}

async function auditDomain(args: {
  actorId: string
  orgId: string
  correlationId: string
  jobId: string
  domain: TourDuplicateDomain
  sourceTourId: string
  targetTourId: string | null
  sourceIds: string[]
  idMapSlice: Record<string, string>
  result: TourDuplicateDomainResult
}) {
  await logAuditEvent({
    actorId: args.actorId,
    orgId: args.orgId,
    action: "create",
    entityType: "tour",
    entityId: args.targetTourId ?? undefined,
    correlationId: args.correlationId || undefined,
    newValues: {
      kind: "tour.duplicate.domain",
      job_id: args.jobId,
      domain: args.domain,
      source_tour_id: args.sourceTourId,
      target_tour_id: args.targetTourId,
      source_entity_ids: args.sourceIds,
      id_map: args.idMapSlice,
      copied: args.result.copied,
      failed: args.result.failed,
      excluded: args.result.excluded,
      status: args.result.status,
      error: args.result.error ?? null,
    },
  })
}

async function stepMetadata(args: {
  supabase: SupabaseLike
  job: TourDuplicateJobRow
  userId: string
  sourceTour: Record<string, unknown>
}): Promise<{
  result: TourDuplicateDomainResult
  targetTourId: string
  idMapSlice: Record<string, string>
  sourceIds: string[]
}> {
  if (args.job.target_tour_id) {
    return {
      result: {
        status: "completed",
        copied: 1,
        failed: 0,
        excluded: 0,
      },
      targetTourId: args.job.target_tour_id,
      idMapSlice: { [args.job.source_tour_id]: args.job.target_tour_id },
      sourceIds: [args.job.source_tour_id],
    }
  }

  const settings =
    args.sourceTour.settings && typeof args.sourceTour.settings === "object"
      ? { ...(args.sourceTour.settings as Record<string, unknown>) }
      : {}
  delete settings.share_token
  delete settings.calendar_token
  settings.duplicated_from_tour_id = args.job.source_tour_id
  settings.duplicate_job_id = args.job.id

  const created = await AdminTourEventOperationsService.createTour({
    supabase: args.supabase,
    userId: args.userId,
    orgId: args.job.org_id,
    input: {
      name: args.job.proposed_name || `${String(args.sourceTour.name || "Tour")} (Copy)`,
      status: "planning",
      description:
        typeof args.sourceTour.description === "string" ? args.sourceTour.description : undefined,
      start_date:
        typeof args.sourceTour.start_date === "string" ? args.sourceTour.start_date : undefined,
      end_date: typeof args.sourceTour.end_date === "string" ? args.sourceTour.end_date : undefined,
      budget: args.sourceTour.budget as number | string | undefined,
      settings,
      artist_id:
        typeof args.sourceTour.artist_id === "string" ? args.sourceTour.artist_id : undefined,
    },
  })

  const targetTourId = String(created.id)
  // Ensure calendar/share tokens are not copied if createTour echoed settings.
  await args.supabase
    .from("tours")
    .update({
      calendar_token: null,
      settings,
    })
    .eq("id", targetTourId)
    .eq("org_id", args.job.org_id)

  return {
    result: { status: "completed", copied: 1, failed: 0, excluded: 0 },
    targetTourId,
    idMapSlice: { [args.job.source_tour_id]: targetTourId },
    sourceIds: [args.job.source_tour_id],
  }
}

async function stepEvents(args: {
  supabase: SupabaseLike
  job: TourDuplicateJobRow
  userId: string
  targetTourId: string
}): Promise<{
  result: TourDuplicateDomainResult
  idMapSlice: Record<string, string>
  sourceIds: string[]
}> {
  const existingMap = { ...(args.job.id_map.events || {}) }
  const { data: links, error } = await args.supabase
    .from("tour_events")
    .select("ordinal, is_primary, advance_status, leg_name, market, routing_notes, events_v2:event_id(*)")
    .eq("tour_id", args.job.source_tour_id)
    .order("ordinal", { ascending: true })
  if (error) throw new Error(error.message)

  let copied = 0
  let failed = 0
  let excluded = 0
  const sourceIds: string[] = []

  for (const link of links || []) {
    const event = (link.events_v2 || {}) as Record<string, unknown>
    const sourceEventId = String(event.id || "")
    if (!sourceEventId) continue
    sourceIds.push(sourceEventId)
    if (existingMap[sourceEventId]) {
      copied += 1
      continue
    }
    if (isProtectedEventForDuplicate(event)) {
      excluded += 1
      continue
    }
    try {
      const created = await AdminTourEventOperationsService.createEvent({
        supabase: args.supabase,
        userId: args.userId,
        orgId: args.job.org_id,
        input: {
          title: String(event.title || event.name || "Untitled stop"),
          name: String(event.title || event.name || "Untitled stop"),
          start_at: typeof event.start_at === "string" ? event.start_at : undefined,
          status: "draft",
          tour_id: args.targetTourId,
          tour_assignments: [
            {
              tour_id: args.targetTourId,
              ordinal: typeof link.ordinal === "number" ? link.ordinal : copied,
              is_primary: Boolean(link.is_primary),
              leg_name: link.leg_name ?? null,
              market: link.market ?? null,
              advance_status: "not_started",
              routing_notes: link.routing_notes ?? null,
            },
          ],
        },
      })
      existingMap[sourceEventId] = String(created.id)
      copied += 1
    } catch {
      failed += 1
    }
  }

  return {
    result: {
      status: failed > 0 && copied === 0 ? "failed" : "completed",
      copied,
      failed,
      excluded,
      error: failed > 0 ? `${failed} event(s) failed to copy` : null,
    },
    idMapSlice: existingMap,
    sourceIds,
  }
}

async function stepTeamRoles(args: {
  supabase: SupabaseLike
  job: TourDuplicateJobRow
  targetTourId: string
}): Promise<{
  result: TourDuplicateDomainResult
  idMapSlice: Record<string, string>
  sourceIds: string[]
}> {
  const existingMap = { ...(args.job.id_map.team_roles || {}) }
  const { data: members, error } = await args.supabase
    .from("tour_team_members")
    .select("id, user_id, role, status, member_name, member_email, name, email, phone, responsibilities")
    .eq("tour_id", args.job.source_tour_id)
    .limit(500)
  if (error && error.code !== "42P01") throw new Error(error.message)
  if (error?.code === "42P01") {
    return {
      result: { status: "skipped", copied: 0, failed: 0, excluded: 0, error: "team table unavailable" },
      idMapSlice: existingMap,
      sourceIds: [],
    }
  }

  let copied = 0
  let failed = 0
  const sourceIds: string[] = []

  for (const member of members || []) {
    const sourceId = String(member.id)
    sourceIds.push(sourceId)
    if (existingMap[sourceId]) {
      copied += 1
      continue
    }
    const row = {
      tour_id: args.targetTourId,
      org_id: args.job.org_id,
      user_id: member.user_id ?? null,
      role: member.role || "member",
      role_in_team: member.role || "member",
      status: member.status === "confirmed" ? "pending" : member.status || "pending",
      is_active: true,
      name: member.member_name || member.name || null,
      email: member.member_email || member.email || null,
      phone: member.phone || null,
      responsibilities: member.responsibilities || null,
      assigned_by: args.job.actor_user_id,
      assigned_at: new Date().toISOString(),
    }
    const { data, error: insertError } = await args.supabase
      .from("tour_team_members")
      .insert(row)
      .select("id")
      .maybeSingle()
    if (insertError || !data?.id) {
      failed += 1
      continue
    }
    existingMap[sourceId] = String(data.id)
    copied += 1
  }

  return {
    result: {
      status: failed > 0 && copied === 0 ? "failed" : "completed",
      copied,
      failed,
      excluded: 0,
      error: failed > 0 ? `${failed} team role(s) failed` : null,
    },
    idMapSlice: existingMap,
    sourceIds,
  }
}

async function stepVendors(args: {
  supabase: SupabaseLike
  job: TourDuplicateJobRow
  targetTourId: string
}): Promise<{
  result: TourDuplicateDomainResult
  idMapSlice: Record<string, string>
  sourceIds: string[]
}> {
  const existingMap = { ...(args.job.id_map.vendors || {}) }
  const { data: vendors, error } = await args.supabase
    .from("tour_vendors")
    .select("*")
    .eq("tour_id", args.job.source_tour_id)
    .limit(500)
  if (error && error.code !== "42P01") throw new Error(error.message)
  if (error?.code === "42P01") {
    return {
      result: { status: "skipped", copied: 0, failed: 0, excluded: 0, error: "vendors table unavailable" },
      idMapSlice: existingMap,
      sourceIds: [],
    }
  }

  let copied = 0
  let failed = 0
  const sourceIds: string[] = []

  for (const vendor of vendors || []) {
    const sourceId = String(vendor.id)
    sourceIds.push(sourceId)
    if (existingMap[sourceId]) {
      copied += 1
      continue
    }
    const { id: _id, created_at: _c, updated_at: _u, ...rest } = vendor
    const row = {
      ...rest,
      tour_id: args.targetTourId,
      payment_status: "pending",
      created_by: args.job.actor_user_id,
    }
    const { data, error: insertError } = await args.supabase
      .from("tour_vendors")
      .insert(row)
      .select("id")
      .maybeSingle()
    if (insertError || !data?.id) {
      failed += 1
      continue
    }
    existingMap[sourceId] = String(data.id)
    copied += 1
  }

  return {
    result: {
      status: failed > 0 && copied === 0 ? "failed" : "completed",
      copied,
      failed,
      excluded: 0,
      error: failed > 0 ? `${failed} vendor(s) failed` : null,
    },
    idMapSlice: existingMap,
    sourceIds,
  }
}

async function stepLogistics(args: {
  supabase: SupabaseLike
  job: TourDuplicateJobRow
  targetTourId: string
}): Promise<{
  result: TourDuplicateDomainResult
  idMapSlice: Record<string, string>
  sourceIds: string[]
}> {
  const existingMap = { ...(args.job.id_map.logistics_skeletons || {}) }
  const { data: tasks, error } = await args.supabase
    .from("logistics_tasks")
    .select("id, type, title, status, description, category")
    .eq("tour_id", args.job.source_tour_id)
    .limit(500)
  if (error && error.code !== "42P01" && error.code !== "42703") throw new Error(error.message)
  if (error) {
    return {
      result: {
        status: "skipped",
        copied: 0,
        failed: 0,
        excluded: 0,
        error: "logistics table unavailable",
      },
      idMapSlice: existingMap,
      sourceIds: [],
    }
  }

  let copied = 0
  let failed = 0
  const sourceIds: string[] = []

  for (const task of tasks || []) {
    const sourceId = String(task.id)
    sourceIds.push(sourceId)
    if (existingMap[sourceId]) {
      copied += 1
      continue
    }
    const row = {
      org_id: args.job.org_id,
      tour_id: args.targetTourId,
      type: task.type || "general",
      title: task.title || task.type || "Logistics task",
      description: task.description || null,
      category: task.category || null,
      status: "pending",
      source_type: "tour_duplicate",
      source_id: sourceId,
      created_by: args.job.actor_user_id,
    }
    const { data, error: insertError } = await args.supabase
      .from("logistics_tasks")
      .insert(row)
      .select("id")
      .maybeSingle()
    if (insertError || !data?.id) {
      failed += 1
      continue
    }
    existingMap[sourceId] = String(data.id)
    copied += 1
  }

  return {
    result: {
      status: failed > 0 && copied === 0 ? "failed" : "completed",
      copied,
      failed,
      excluded: 0,
      error: failed > 0 ? `${failed} logistics task(s) failed` : null,
    },
    idMapSlice: existingMap,
    sourceIds,
  }
}

async function stepBudgets(args: {
  supabase: SupabaseLike
  job: TourDuplicateJobRow
  targetTourId: string
}): Promise<{
  result: TourDuplicateDomainResult
  idMapSlice: Record<string, string>
  sourceIds: string[]
}> {
  const existingMap = { ...(args.job.id_map.budgets || {}) }
  const { data: rows, error } = await args.supabase
    .from("financial_transactions")
    .select("id, type, category, amount, description, payment_status")
    .eq("tour_id", args.job.source_tour_id)
    .eq("org_id", args.job.org_id)
    .limit(500)
  if (error && error.code !== "42P01") throw new Error(error.message)
  if (error?.code === "42P01") {
    return {
      result: { status: "skipped", copied: 0, failed: 0, excluded: 0, error: "finance table unavailable" },
      idMapSlice: existingMap,
      sourceIds: [],
    }
  }

  let copied = 0
  let failed = 0
  let excluded = 0
  const sourceIds: string[] = []

  for (const tx of rows || []) {
    const sourceId = String(tx.id)
    sourceIds.push(sourceId)
    if (existingMap[sourceId]) {
      copied += 1
      continue
    }
    if (tx.payment_status === "paid" || tx.payment_status === "settled") {
      excluded += 1
      continue
    }
    const { data, error: insertError } = await args.supabase
      .from("financial_transactions")
      .insert({
        org_id: args.job.org_id,
        tour_id: args.targetTourId,
        type: tx.type,
        category: tx.category,
        amount: tx.amount,
        description: tx.description,
        payment_status: "pending",
        created_by: args.job.actor_user_id,
      })
      .select("id")
      .maybeSingle()
    if (insertError || !data?.id) {
      failed += 1
      continue
    }
    existingMap[sourceId] = String(data.id)
    copied += 1
  }

  return {
    result: {
      status: failed > 0 && copied === 0 ? "failed" : "completed",
      copied,
      failed,
      excluded,
      error: failed > 0 ? `${failed} budget line(s) failed` : null,
    },
    idMapSlice: existingMap,
    sourceIds,
  }
}

async function stepSoftDomain(args: {
  domain: TourDuplicateDomain
  reason: string
}): Promise<{
  result: TourDuplicateDomainResult
  idMapSlice: Record<string, string>
  sourceIds: string[]
}> {
  return {
    result: {
      status: "skipped",
      copied: 0,
      failed: 0,
      excluded: 0,
      error: args.reason,
    },
    idMapSlice: {},
    sourceIds: [],
  }
}

export async function startTourDuplicateJob(args: {
  supabase: SupabaseLike
  userId: string
  orgId: string
  sourceTourId: string
  planToken: string
  idempotencyKey: string
  correlationId: string
  proposedName?: string | null
  selection?: Partial<TourDuplicateDomainSelection> | null
}): Promise<{ job: TourDuplicateJobRow; created: boolean }> {
  const plan = decodeTourDuplicatePlanToken(args.planToken)
  if (plan.sourceTourId !== args.sourceTourId)
    throw new Error("Plan token source tour does not match request")
  if (plan.orgId !== args.orgId) throw new Error("Plan token organization does not match acting org")

  const selection = normalizeTourDuplicateSelection(args.selection || plan.selection)
  const proposedName = (args.proposedName || plan.proposedName).trim()

  const { data: existing } = await args.supabase
    .from("tour_duplicate_jobs")
    .select("*")
    .eq("org_id", args.orgId)
    .eq("idempotency_key", args.idempotencyKey)
    .maybeSingle()

  if (existing) {
    return { job: presentJob(existing), created: false }
  }

  const domainStatus = initialDomainStatus(selection)
  const { data, error } = await args.supabase
    .from("tour_duplicate_jobs")
    .insert({
      org_id: args.orgId,
      source_tour_id: args.sourceTourId,
      actor_user_id: args.userId,
      plan_token: args.planToken,
      selection,
      proposed_name: proposedName,
      idempotency_key: args.idempotencyKey,
      status: "queued",
      current_domain: "metadata",
      domain_status: domainStatus,
      id_map: {},
      correlation_id: args.correlationId,
      attempts: 0,
    })
    .select("*")
    .single()

  if (error?.code === "23505") {
    const { data: raced } = await args.supabase
      .from("tour_duplicate_jobs")
      .select("*")
      .eq("org_id", args.orgId)
      .eq("idempotency_key", args.idempotencyKey)
      .maybeSingle()
    if (raced) return { job: presentJob(raced), created: false }
  }
  if (error || !data) throw new Error(error?.message || "Failed to create duplicate job")

  await logAuditEvent({
    actorId: args.userId,
    orgId: args.orgId,
    action: "create",
    entityType: "tour",
    entityId: args.sourceTourId,
    correlationId: args.correlationId,
    newValues: {
      kind: "tour.duplicate.job_started",
      job_id: data.id,
      source_tour_id: args.sourceTourId,
      idempotency_key: args.idempotencyKey,
      selection,
      proposed_name: proposedName,
    },
  })

  return { job: presentJob(data), created: true }
}

export async function stepTourDuplicateJob(args: {
  supabase: SupabaseLike
  jobId: string
  orgId: string
  userId: string
}): Promise<TourDuplicateJobRow> {
  const { data: raw, error } = await args.supabase
    .from("tour_duplicate_jobs")
    .select("*")
    .eq("id", args.jobId)
    .eq("org_id", args.orgId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!raw) throw new Error("Duplicate job not found")

  let job = presentJob(raw)
  if (job.status === "completed" || job.status === "canceled") return job

  const { data: sourceTour, error: tourError } = await args.supabase
    .from("tours")
    .select("*")
    .eq("id", job.source_tour_id)
    .eq("org_id", args.orgId)
    .maybeSingle()
  if (tourError) throw new Error(tourError.message)
  if (!sourceTour) throw new Error("Source tour not found")

  const domain = nextPendingDomain(job.domain_status)
  if (!domain) {
    return persistJob(args.supabase, job.id, {
      status: "completed",
      completed_at: new Date().toISOString(),
      current_domain: null,
      last_error: null,
    })
  }

  job = await persistJob(args.supabase, job.id, {
    status: "running",
    current_domain: domain,
    attempts: job.attempts + 1,
    locked_at: new Date().toISOString(),
    locked_by: args.userId,
  })

  const domainStatus = { ...job.domain_status }
  domainStatus[domain] = {
    ...(domainStatus[domain] || { copied: 0, failed: 0, excluded: 0 }),
    status: "running",
  }

  try {
    let result: TourDuplicateDomainResult
    let idMapSlice: Record<string, string> = {}
    let sourceIds: string[] = []
    let targetTourId = job.target_tour_id

    if (domain === "metadata") {
      const stepped = await stepMetadata({
        supabase: args.supabase,
        job,
        userId: args.userId,
        sourceTour: sourceTour as Record<string, unknown>,
      })
      result = stepped.result
      idMapSlice = stepped.idMapSlice
      sourceIds = stepped.sourceIds
      targetTourId = stepped.targetTourId
    } else if (!targetTourId) {
      throw new Error("Target tour missing; metadata step must complete first")
    } else if (domain === "events") {
      const stepped = await stepEvents({
        supabase: args.supabase,
        job,
        userId: args.userId,
        targetTourId,
      })
      result = stepped.result
      idMapSlice = stepped.idMapSlice
      sourceIds = stepped.sourceIds
    } else if (domain === "team_roles") {
      const stepped = await stepTeamRoles({
        supabase: args.supabase,
        job,
        targetTourId,
      })
      result = stepped.result
      idMapSlice = stepped.idMapSlice
      sourceIds = stepped.sourceIds
    } else if (domain === "vendors") {
      const stepped = await stepVendors({
        supabase: args.supabase,
        job,
        targetTourId,
      })
      result = stepped.result
      idMapSlice = stepped.idMapSlice
      sourceIds = stepped.sourceIds
    } else if (domain === "logistics_skeletons") {
      const stepped = await stepLogistics({
        supabase: args.supabase,
        job,
        targetTourId,
      })
      result = stepped.result
      idMapSlice = stepped.idMapSlice
      sourceIds = stepped.sourceIds
    } else if (domain === "budgets") {
      const stepped = await stepBudgets({
        supabase: args.supabase,
        job,
        targetTourId,
      })
      result = stepped.result
      idMapSlice = stepped.idMapSlice
      sourceIds = stepped.sourceIds
    } else if (domain === "templates") {
      const stepped = await stepSoftDomain({
        domain,
        reason: "Tour-scoped templates deferred; org library remains linked",
      })
      result = stepped.result
      idMapSlice = stepped.idMapSlice
      sourceIds = stepped.sourceIds
    } else if (domain === "documents") {
      const stepped = await stepSoftDomain({
        domain,
        reason: "Document binary copy deferred; references excluded in this job step",
      })
      result = stepped.result
      idMapSlice = stepped.idMapSlice
      sourceIds = stepped.sourceIds
    } else {
      const stepped = await stepSoftDomain({
        domain,
        reason: "Permission grants re-evaluated on access; not auto-copied",
      })
      result = stepped.result
      idMapSlice = stepped.idMapSlice
      sourceIds = stepped.sourceIds
    }

    domainStatus[domain] = result
    const idMap = {
      ...job.id_map,
      [domain]: { ...(job.id_map[domain] || {}), ...idMapSlice },
    }

    await auditDomain({
      actorId: args.userId,
      orgId: args.orgId,
      correlationId: job.correlation_id,
      jobId: job.id,
      domain,
      sourceTourId: job.source_tour_id,
      targetTourId,
      sourceIds,
      idMapSlice,
      result,
    })

    const summary = summarizeDomainStatus(domainStatus)
    const next = nextPendingDomain(domainStatus)
    return persistJob(args.supabase, job.id, {
      target_tour_id: targetTourId,
      domain_status: domainStatus,
      id_map: idMap,
      current_domain: next,
      status: summary.allTerminal
        ? summary.hasFailure
          ? "failed"
          : "completed"
        : "running",
      completed_at: summary.allTerminal ? new Date().toISOString() : null,
      last_error: result.status === "failed" ? result.error || "Domain failed" : null,
      locked_at: null,
      locked_by: null,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Domain step failed"
    domainStatus[domain] = {
      status: "failed",
      copied: domainStatus[domain]?.copied || 0,
      failed: (domainStatus[domain]?.failed || 0) + 1,
      excluded: domainStatus[domain]?.excluded || 0,
      error: message,
    }
    return persistJob(args.supabase, job.id, {
      domain_status: domainStatus,
      status: "failed",
      last_error: message,
      current_domain: domain,
      locked_at: null,
      locked_by: null,
    })
  }
}

export async function runTourDuplicateJobToCompletion(args: {
  supabase: SupabaseLike
  jobId: string
  orgId: string
  userId: string
  maxSteps?: number
}): Promise<TourDuplicateJobRow> {
  const maxSteps = args.maxSteps ?? TOUR_DUPLICATE_DOMAIN_ORDER.length + 2
  let job: TourDuplicateJobRow | null = null
  for (let i = 0; i < maxSteps; i += 1) {
    job = await stepTourDuplicateJob({
      supabase: args.supabase,
      jobId: args.jobId,
      orgId: args.orgId,
      userId: args.userId,
    })
    if (job.status === "completed" || job.status === "failed" || job.status === "canceled")
      return job
  }
  return job!
}

export async function getTourDuplicateJob(args: {
  supabase: SupabaseLike
  orgId: string
  jobId: string
}): Promise<TourDuplicateJobRow | null> {
  const { data, error } = await args.supabase
    .from("tour_duplicate_jobs")
    .select("*")
    .eq("id", args.jobId)
    .eq("org_id", args.orgId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data ? presentJob(data) : null
}
