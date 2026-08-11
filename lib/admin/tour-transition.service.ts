/**
 * TOUR-202 — Execute tour lifecycle transition commands.
 *
 * Status cannot be patched directly; commands enforce readiness/state/capability
 * and write status + audit + outbox event.
 */

import { logAuditEvent } from "@/lib/audit"
import {
  evaluateTourTransition,
  getTourTransition,
  isTourHardDeleteEligible,
  normalizeTourLifecycleState,
  TOUR_TRANSITION_COMMANDS,
  type TourLifecycleState,
  type TourTransitionCommand,
  type TourTransitionSideEffect,
} from "@/lib/admin/tour-lifecycle"
import {
  isLegallyRetainedFromSettings,
  readTourPriorLifecycleActor,
} from "@/lib/admin/state-aware-authorization"
import { requireTourAccess } from "@/lib/admin/tour-access.service"
import { getTourReadiness } from "@/lib/admin/operations-readiness"
import { commitDomainWithOutbox } from "@/lib/admin/publication-outbox.service"
import { buildPublicationOutboxIdempotencyKey } from "@/lib/admin/publication-outbox"
import {
  applyTourArchiveSideEffects,
  resolveRestoreTargetState,
  type TourArchiveSideEffectResult,
} from "@/lib/admin/tour-archive-side-effects"
import type { AdminCapability } from "@/lib/auth/admin-capabilities"
import type { SupabaseClient } from "@supabase/supabase-js"


type SupabaseLike = SupabaseClient | { from: (table: string) => any; rpc?: (...args: any[]) => any }

export class TourTransitionError extends Error {
  readonly status: number
  readonly code: string
  readonly unmetBlockers?: string[]
  readonly readiness?: ReturnType<typeof getTourReadiness>

  constructor(args: {
    message: string
    code: string
    status?: number
    unmetBlockers?: string[]
    readiness?: ReturnType<typeof getTourReadiness>
  }) {
    super(args.message)
    this.name = "TourTransitionError"
    this.status = args.status ?? 422
    this.code = args.code
    this.unmetBlockers = args.unmetBlockers
    this.readiness = args.readiness
  }
}

export function isTourTransitionCommand(value: unknown): value is TourTransitionCommand {
  return typeof value === "string" && (TOUR_TRANSITION_COMMANDS as readonly string[]).includes(value)
}

function sideEffectToEventType(effect: TourTransitionSideEffect): string | null {
  switch (effect) {
    case "outbox.tour.lifecycle_changed":
      return "tour.lifecycle_changed"
    case "outbox.tour.published":
      return "tour.published"
    case "outbox.tour.retracted":
      return "tour.retracted"
    case "outbox.tour.cancelled":
      return "tour.cancelled"
    case "outbox.tour.archived":
      return "tour.archived"
    default:
      return null
  }
}

function auditActionForCommand(
  command: TourTransitionCommand,
): "update" | "publish" | "unpublish" | "settle" {
  if (command === "publish") return "publish"
  if (command === "retract") return "unpublish"
  if (command === "settle") return "settle"
  return "update"
}

async function collectUnmetBlockers(args: {
  supabase: SupabaseLike
  tour: Record<string, unknown>
  command: TourTransitionCommand
}): Promise<{ unmet: string[]; readiness: ReturnType<typeof getTourReadiness> | null }> {
  const definition = getTourTransition(args.command)
  if (!definition || definition.blockers.length === 0)
    return { unmet: [], readiness: null }

  const unmet: string[] = []
  let readiness: ReturnType<typeof getTourReadiness> | null = null
  const settings =
    args.tour.settings && typeof args.tour.settings === "object" && !Array.isArray(args.tour.settings)
      ? (args.tour.settings as Record<string, unknown>)
      : {}

  if (definition.blockers.includes("readiness.mandatory")) {
    const { data: links } = await args.supabase
      .from("tour_events")
      .select("event_id, events_v2:event_id(id, title, start_at, venue_id, status)")
      .eq("tour_id", args.tour.id)

    const events = (links ?? []).map((link: Record<string, unknown>) => {
      const ev = link.events_v2 as Record<string, unknown> | null
      return {
        id: ev?.id,
        name: ev?.title,
        date: typeof ev?.start_at === "string" ? String(ev.start_at).slice(0, 10) : null,
        venue_id: ev?.venue_id,
      }
    })

    readiness = getTourReadiness({
      name: typeof args.tour.name === "string" ? args.tour.name : "",
      main_artist: String(settings.main_artist ?? settings.mainArtist ?? ""),
      artist_account_id:
        typeof args.tour.artist_id === "string"
          ? args.tour.artist_id
          : typeof settings.artist_account_id === "string"
            ? settings.artist_account_id
            : null,
      start_date: typeof args.tour.start_date === "string" ? args.tour.start_date : null,
      end_date: typeof args.tour.end_date === "string" ? args.tour.end_date : null,
      events: events as unknown as Array<{ city?: string | null; venue?: string | null; date?: string | null }>,
      route: Array.isArray(settings.route) ? (settings.route as unknown as Array<{ city?: string | null; venue?: string | null; date?: string | null }>) : [],
      transportation:
        typeof settings.transportation === "object" && settings.transportation
          ? (settings.transportation as Record<string, unknown>)
          : {},
      accommodation:
        typeof settings.accommodation === "object" && settings.accommodation
          ? (settings.accommodation as Record<string, unknown>)
          : {},
      equipment: Array.isArray(settings.equipment)
        ? (settings.equipment as Array<Record<string, unknown>>)
        : [],
      crew_count: Array.isArray(settings.crew) ? settings.crew.length : 0,
      budget: args.tour.budget as string | number | null,
    })

    const hasCritical = readiness.conflicts.some((c) => c.severity === "critical")
    if (readiness.blockers.length > 0 || hasCritical) unmet.push("readiness.mandatory")
  }

  if (definition.blockers.includes("stops.all_ended")) {
    const { data: links } = await args.supabase
      .from("tour_events")
      .select("event_id, events_v2:event_id(id, end_at, start_at, status)")
      .eq("tour_id", args.tour.id)

    const now = Date.now()
    const openStops = (links ?? []).filter((link: Record<string, unknown>) => {
      const ev = link.events_v2 as Record<string, unknown> | null
      if (!ev?.id) return false
      const endRaw = (ev.end_at || ev.start_at) as string | null
      if (!endRaw) return true
      const endMs = Date.parse(String(endRaw))
      if (!Number.isFinite(endMs)) return true
      return endMs > now
    })
    if (openStops.length > 0) unmet.push("stops.all_ended")
  }

  if (definition.blockers.includes("finance.settlements_approved")) {
    const { data: settlements, error } = await args.supabase
      .from("settlements")
      .select("id, status")
      .eq("tour_id", args.tour.id)

    if (error && error.code !== "42P01") {
      unmet.push("finance.settlements_approved")
    } else {
      const rows = settlements ?? []
      if (rows.length === 0) unmet.push("finance.settlements_approved")
      else if (rows.some((row: { status?: string }) => row.status !== "finalized" && row.status !== "paid"))
        unmet.push("finance.settlements_approved")
    }
  }

  return { unmet, readiness }
}

export async function executeTourTransition(args: {
  supabase: SupabaseLike
  userId: string
  orgId: string
  tourId: string
  command: TourTransitionCommand
  capabilities: readonly AdminCapability[]
  reason?: string | null
  correlationId?: string | null
  idempotencyKey?: string | null
}): Promise<{
  tour: Record<string, unknown>
  fromState: TourLifecycleState
  toState: TourLifecycleState
  command: TourTransitionCommand
  outboxIds: string[]
  transactionId: string | null
  archiveSideEffects?: TourArchiveSideEffectResult
}> {
  if (!isTourTransitionCommand(args.command)) {
    throw new TourTransitionError({
      message: "Unknown tour lifecycle command.",
      code: "tour_transition_unknown",
      status: 400,
    })
  }

  await requireTourAccess({
    supabase: args.supabase,
    userId: args.userId,
    tourId: args.tourId,
    orgId: args.orgId,
  })

  const { data: tour, error: loadError } = await args.supabase
    .from("tours")
    .select("id, org_id, status, name, description, start_date, end_date, budget, artist_id, settings, created_by, user_id, metadata_version, calendar_token")
    .eq("id", args.tourId)
    .eq("org_id", args.orgId)
    .maybeSingle()

  if (loadError) throw new Error(loadError.message)
  if (!tour?.id) {
    throw new TourTransitionError({
      message: "Tour not found.",
      code: "entity_not_found",
      status: 404,
    })
  }

  const currentState = normalizeTourLifecycleState(tour.status)
  if (!currentState) {
    throw new TourTransitionError({
      message: "Tour lifecycle state is missing or unrecognized.",
      code: "tour_lifecycle_state_unknown",
    })
  }

  const { unmet, readiness } = await collectUnmetBlockers({
    supabase: args.supabase,
    tour: tour as Record<string, unknown>,
    command: args.command,
  })

  const settings = (tour.settings && typeof tour.settings === "object" && !Array.isArray(tour.settings)
    ? tour.settings
    : {}) as Record<string, unknown>

  const evaluation = evaluateTourTransition({
    command: args.command,
    currentState: tour.status,
    capabilities: args.capabilities,
    reason: args.reason,
    unmetBlockers: unmet,
    actorUserId: args.userId,
    priorActorUserId: readTourPriorLifecycleActor(settings) || tour.created_by || tour.user_id,
    legallyRetained: isLegallyRetainedFromSettings(settings),
  })

  if (!evaluation.ok || !evaluation.nextState || !evaluation.definition) {
    throw new TourTransitionError({
      message: evaluation.message || "Transition denied.",
      code: evaluation.code || "tour_transition_blocked",
      status: evaluation.code === "capability_denied" || evaluation.code === "separation_of_duties"
        ? 403
        : 422,
      unmetBlockers: evaluation.unmetBlockers,
      readiness: readiness ?? undefined,
    })
  }

  let nextState = evaluation.nextState
  // TOUR-207 — restore returns to pre-archive state when recorded.
  if (args.command === "restore") {
    nextState = resolveRestoreTargetState(settings, evaluation.nextState)
  }

  const now = new Date().toISOString()
  let workingSettings = { ...settings }
  let archiveSideEffects: TourArchiveSideEffectResult | undefined

  // TOUR-207 — revoke eligible shares and stamp preserved inventory before status flip.
  if (args.command === "archive") {
    const applied = await applyTourArchiveSideEffects({
      supabase: args.supabase,
      orgId: args.orgId,
      tourId: args.tourId,
      actorUserId: args.userId,
      currentState,
      tour: tour as Record<string, unknown>,
    })
    workingSettings = applied.nextSettings
    archiveSideEffects = applied.result
  }

  const lifecycle = {
    ...((workingSettings.lifecycle
      && typeof workingSettings.lifecycle === "object"
      && !Array.isArray(workingSettings.lifecycle)
      ? workingSettings.lifecycle
      : {}) as Record<string, unknown>),
    last_command: args.command,
    last_actor_id: args.userId,
    last_transition_at: now,
    ...(args.command === "publish" ? { published_by: args.userId, published_at: now } : {}),
    ...(args.command === "activate" ? { activated_by: args.userId, activated_at: now } : {}),
    ...(args.command === "complete" ? { completed_by: args.userId, completed_at: now } : {}),
    ...(args.command === "settle" ? { settled_by: args.userId, settled_at: now } : {}),
    ...(args.command === "archive"
      ? { archived_by: args.userId, archived_at: now, pre_archive_state: currentState }
      : {}),
    ...(args.command === "restore"
      ? { restored_by: args.userId, restored_at: now, restored_to: nextState }
      : {}),
    ...(args.reason?.trim() ? { last_reason: args.reason.trim() } : {}),
  }

  const currentMetaVersion =
    typeof tour.metadata_version === "number" && Number.isFinite(tour.metadata_version)
      ? tour.metadata_version
      : 1

  const patch: Record<string, unknown> = {
    status: nextState,
    updated_at: now,
    metadata_version: currentMetaVersion + 1,
    settings: {
      ...workingSettings,
      lifecycle,
    },
    ...(args.command === "archive" ? { calendar_token: null } : {}),
  }

  let updateQuery = args.supabase
    .from("tours")
    .update(patch)
    .eq("id", args.tourId)
    .eq("org_id", args.orgId)
    .eq("status", tour.status)

  // Prefer optimistic metadata_version when column exists.
  updateQuery = updateQuery.eq("metadata_version", currentMetaVersion)

  let { data: updated, error: updateError } = await updateQuery.select("*").maybeSingle()

  if (updateError && (updateError.code === "42703" || /metadata_version/i.test(updateError.message || ""))) {
    const { metadata_version: _mv, ...withoutMeta } = patch
    const retry = await args.supabase
      .from("tours")
      .update(withoutMeta)
      .eq("id", args.tourId)
      .eq("org_id", args.orgId)
      .eq("status", tour.status)
      .select("*")
      .maybeSingle()
    updated = retry.data
    updateError = retry.error
  }

  if (updateError) throw new Error(updateError.message)
  if (!updated) {
    throw new TourTransitionError({
      message: "Tour changed while the transition was applied. Reload and retry.",
      code: "version_conflict",
      status: 409,
    })
  }

  const correlationId = args.correlationId?.trim() || crypto.randomUUID()
  const outboxIds: string[] = []
  let transactionId: string | null = null

  const outboxEffects = evaluation.definition.sideEffects
    .map(sideEffectToEventType)
    .filter((value): value is string => Boolean(value))

  // Always emit at least lifecycle_changed.
  const eventTypes = Array.from(new Set(["tour.lifecycle_changed", ...outboxEffects]))

  try {
    for (const eventType of eventTypes) {
      const idempotencyKey =
        args.idempotencyKey?.trim()
        || buildPublicationOutboxIdempotencyKey({
          orgId: args.orgId,
          eventType,
          aggregateType: "tour",
          aggregateId: args.tourId,
          naturalKey: `tour.transition.${args.command}:${currentState}->${nextState}`,
        })

      const committed = await commitDomainWithOutbox(args.supabase as SupabaseClient, {
        orgId: args.orgId,
        commandName: `tour.transition.${args.command}`,
        correlationId,
        actorUserId: args.userId,
        domainPayload: {
          command: args.command,
          fromState: currentState,
          toState: nextState,
          reason: args.reason?.trim() || null,
        },
        eventType,
        aggregateType: "tour",
        aggregateId: args.tourId,
        outboxPayload: {
          tourId: args.tourId,
          command: args.command,
          fromState: currentState,
          toState: nextState,
          reason: args.reason?.trim() || null,
        },
        idempotencyKey: `${idempotencyKey}:${eventType}`,
      })
      outboxIds.push(committed.outboxId)
      if (!transactionId) transactionId = committed.transactionId
    }
  } catch (error) {
    // Roll back status so clients can retry the full command atomically.
    await args.supabase
      .from("tours")
      .update({
        status: currentState,
        settings,
        updated_at: now,
        metadata_version: currentMetaVersion,
      })
      .eq("id", args.tourId)
      .eq("org_id", args.orgId)
    console.error("[TOUR-202] outbox commit failed; status rolled back", error)
    throw new TourTransitionError({
      message:
        error instanceof Error
          ? `Transition outbox unavailable: ${error.message}`
          : "Transition outbox unavailable.",
      code: "outbox_unavailable",
      status: 503,
    })
  }

  await logAuditEvent({
    actorId: args.userId,
    orgId: args.orgId,
    action: auditActionForCommand(args.command),
    entityType: "tour",
    entityId: args.tourId,
    oldValues: { status: currentState },
    newValues: {
      status: nextState,
      command: args.command,
      reason: args.reason?.trim() || null,
      outbox_ids: outboxIds,
      transaction_id: transactionId,
      ...(archiveSideEffects
        ? {
            archive_side_effects: archiveSideEffects,
            preserved_records: archiveSideEffects.preserved,
          }
        : {}),
    },
    correlationId,
  })

  return {
    tour: updated as Record<string, unknown>,
    fromState: currentState,
    toState: nextState,
    command: args.command,
    outboxIds,
    transactionId,
    archiveSideEffects,
  }
}

/**
 * TOUR-210 — Dry-run a lifecycle transition (no mutation).
 * Used by bulk-preview to classify eligible vs ineligible items.
 */
export async function previewTourTransition(args: {
  supabase: SupabaseLike
  userId: string
  orgId: string
  tourId: string
  command: TourTransitionCommand
  capabilities: readonly AdminCapability[]
  reason?: string | null
}): Promise<{
  eligible: boolean
  tourId: string
  name: string | null
  status: string | null
  code?: string
  message?: string
  unmetBlockers?: string[]
  nextState?: TourLifecycleState
}> {
  if (!isTourTransitionCommand(args.command)) {
    return {
      eligible: false,
      tourId: args.tourId,
      name: null,
      status: null,
      code: "tour_transition_unknown",
      message: "Unknown tour lifecycle command.",
    }
  }

  try {
    await requireTourAccess({
      supabase: args.supabase,
      userId: args.userId,
      tourId: args.tourId,
      orgId: args.orgId,
    })
  } catch {
    return {
      eligible: false,
      tourId: args.tourId,
      name: null,
      status: null,
      code: "entity_not_found",
      message: "Tour not found.",
    }
  }

  const { data: tour, error: loadError } = await args.supabase
    .from("tours")
    .select("id, org_id, status, name, description, start_date, end_date, budget, artist_id, settings, created_by, user_id")
    .eq("id", args.tourId)
    .eq("org_id", args.orgId)
    .maybeSingle()

  if (loadError) throw new Error(loadError.message)
  if (!tour?.id) {
    return {
      eligible: false,
      tourId: args.tourId,
      name: null,
      status: null,
      code: "entity_not_found",
      message: "Tour not found.",
    }
  }

  const { unmet } = await collectUnmetBlockers({
    supabase: args.supabase,
    tour: tour as Record<string, unknown>,
    command: args.command,
  })

  const settings = (tour.settings && typeof tour.settings === "object" && !Array.isArray(tour.settings)
    ? tour.settings
    : {}) as Record<string, unknown>

  const evaluation = evaluateTourTransition({
    command: args.command,
    currentState: tour.status,
    capabilities: args.capabilities,
    reason: args.reason,
    unmetBlockers: unmet,
    actorUserId: args.userId,
    priorActorUserId: readTourPriorLifecycleActor(settings) || tour.created_by || tour.user_id,
    legallyRetained: isLegallyRetainedFromSettings(settings),
  })

  if (!evaluation.ok || !evaluation.nextState) {
    return {
      eligible: false,
      tourId: String(tour.id),
      name: typeof tour.name === "string" ? tour.name : null,
      status: typeof tour.status === "string" ? tour.status : null,
      code: evaluation.code || "tour_transition_blocked",
      message: evaluation.message || "Transition denied.",
      unmetBlockers: evaluation.unmetBlockers,
    }
  }

  return {
    eligible: true,
    tourId: String(tour.id),
    name: typeof tour.name === "string" ? tour.name : null,
    status: typeof tour.status === "string" ? tour.status : null,
    nextState: evaluation.nextState,
  }
}

export function getTourTransitionErrorStatus(error: unknown, fallback = 500): number {
  if (error instanceof TourTransitionError) return error.status
  return fallback
}

/** Soft helper for tests — hard delete still draft-only. */
export function canHardDeleteAfterTransition(state: string | null | undefined): boolean {
  return isTourHardDeleteEligible(state)
}
