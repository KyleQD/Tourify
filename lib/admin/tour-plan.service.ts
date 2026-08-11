/**
 * PLAN-101 — Canonical tour plan read/write service.
 *
 * Builder must not write route JSON and tour_events links independently.
 * One command validates org, capability context, plan version, and full schema,
 * then derives settings.route from reconciled stop links.
 */

import { z } from "zod"

import { requireTourAccess, TourAccessDeniedError } from "@/lib/admin/tour-access.service"
import { AdminTourEventOperationsService } from "@/lib/admin/tour-event-operations.service"
import {
  buildTourPlanConflictDiff,
  type TourPlanConflictDiff,
} from "@/lib/admin/tour-plan-diff"
import {
  tourPlanStopSchema,
  tourPlanWriteSchema,
  type TourPlanStop,
  type TourPlanWriteInput,
} from "@/lib/admin/tour-plan-schemas"
import {
  assertTourStopReconcileMode,
  type TourStopReconcileMode,
  type TourStopReconcilePlan,
} from "@/lib/admin/tour-stop-reconciliation"
import { normalizeTourPlanDraft } from "@/lib/admin/tour-plan-normalize.service"

export {
  tourPlanStopSchema,
  tourPlanWriteSchema,
  type TourPlanStop,
  type TourPlanWriteInput,
}

type SupabaseLike = { from: (table: string) => any }

export class TourPlanVersionConflictError extends Error {
  readonly status = 409
  readonly code = "version_conflict"
  currentVersion: number
  expectedVersion: number
  diff: TourPlanConflictDiff | null
  serverPlan: TourPlanView | null

  constructor(args: {
    currentVersion: number
    expectedVersion: number
    diff?: TourPlanConflictDiff | null
    serverPlan?: TourPlanView | null
  }) {
    super(`Plan version conflict. Current version is ${args.currentVersion}.`)
    this.name = "TourPlanVersionConflictError"
    this.currentVersion = args.currentVersion
    this.expectedVersion = args.expectedVersion
    this.diff = args.diff ?? null
    this.serverPlan = args.serverPlan ?? null
  }
}

export class TourPlanValidationError extends Error {
  readonly status = 400
  readonly code = "plan_invalid"

  constructor(message: string) {
    super(message)
    this.name = "TourPlanValidationError"
  }
}

export interface TourPlanView {
  tourId: string
  orgId: string | null
  planVersion: number
  name: string
  description: string | null
  status: string | null
  start_date: string | null
  end_date: string | null
  main_artist: string | null
  markets: string[]
  route_notes: string | null
  stops: Array<{
    event_id: string | null
    ordinal: number
    name: string
    venue: string | null
    date: string | null
    time: string | null
    market: string | null
    leg_name: string | null
    capacity: number | null
    advance_status: string
    stop_type: string
  }>
  /** Derived projection — never an independent write target. */
  routeProjection: Array<Record<string, unknown>>
}

function readSettings(row: Record<string, unknown>): Record<string, unknown> {
  return row.settings && typeof row.settings === "object" && !Array.isArray(row.settings)
    ? (row.settings as Record<string, unknown>)
    : {}
}

function deriveRouteProjection(stops: TourPlanView["stops"]): Array<Record<string, unknown>> {
  return stops.map((stop, index) => ({
    order: index + 1,
    name: stop.name,
    venue: stop.venue,
    date: stop.date,
    time: stop.time,
    market: stop.market,
    leg_name: stop.leg_name,
    capacity: stop.capacity,
    advance_status: stop.advance_status,
    event_id: stop.event_id,
    stop_type: stop.stop_type,
  }))
}

export async function readTourPlan(args: {
  supabase: SupabaseLike
  userId: string
  tourId: string
  orgId?: string | null
}): Promise<TourPlanView> {
  try {
    await requireTourAccess({
      supabase: args.supabase,
      userId: args.userId,
      tourId: args.tourId,
      orgId: args.orgId,
    })
  } catch (error) {
    if (error instanceof TourAccessDeniedError) throw error
    throw error
  }

  const { data: tour, error } = await args.supabase
    .from("tours")
    .select("*")
    .eq("id", args.tourId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!tour) throw new TourAccessDeniedError()

  const settings = readSettings(tour)
  const planVersion = typeof tour.plan_version === "number" ? tour.plan_version : 1

  // PLAN-201 — prefer normalized tour_stops when a draft version exists.
  const normalizedPlan = await readNormalizedDraftStops({
    supabase: args.supabase,
    tourId: args.tourId,
    draftVersionId: tour.current_draft_version_id ? String(tour.current_draft_version_id) : null,
    planVersion,
  })

  let stops: TourPlanView["stops"] = normalizedPlan.stops
  if (!normalizedPlan.authoritative) {
    const { data: links, error: linkError } = await args.supabase
      .from("tour_events")
      .select(
        "event_id, ordinal, is_primary, leg_name, market, advance_status, routing_notes, events_v2(id, title, status, start_at, end_at, venue_id, settings, capacity)",
      )
      .eq("tour_id", args.tourId)
      .order("ordinal", { ascending: true })
    if (linkError) throw new Error(linkError.message)

    stops = (links ?? []).map((link: any, index: number) => {
      const event = link.events_v2 || {}
      const eventSettings =
        event.settings && typeof event.settings === "object" ? event.settings : {}
      const startAt = event.start_at ? String(event.start_at) : null
      return {
        event_id: link.event_id ? String(link.event_id) : null,
        ordinal: typeof link.ordinal === "number" ? link.ordinal : index,
        name: String(event.title || eventSettings.name || `Stop ${index + 1}`),
        venue:
          typeof eventSettings.venue_label === "string"
            ? eventSettings.venue_label
            : typeof eventSettings.venue_name === "string"
              ? eventSettings.venue_name
              : null,
        date: startAt ? startAt.slice(0, 10) : null,
        time: startAt && startAt.length >= 16 ? startAt.slice(11, 16) : null,
        market: link.market ?? null,
        leg_name: link.leg_name ?? null,
        capacity: event.capacity == null ? null : Number(event.capacity),
        advance_status: String(link.advance_status || "not_started"),
        stop_type: "show",
      }
    })
  }

  return {
    tourId: String(tour.id),
    orgId: (tour.org_id as string | null) ?? null,
    planVersion,
    name: String(tour.name || "Untitled tour"),
    description: (tour.description as string | null) ?? null,
    status: (tour.status as string | null) ?? null,
    start_date: (tour.start_date as string | null) ?? null,
    end_date: (tour.end_date as string | null) ?? null,
    main_artist:
      typeof settings.main_artist === "string"
        ? settings.main_artist
        : (tour.main_artist as string | null) ?? null,
    markets: Array.isArray(settings.markets)
      ? settings.markets.map(String)
      : [],
    route_notes: typeof settings.route_notes === "string" ? settings.route_notes : null,
    stops,
    routeProjection: deriveRouteProjection(stops),
  }
}

async function readNormalizedDraftStops(args: {
  supabase: SupabaseLike
  tourId: string
  draftVersionId: string | null
  planVersion: number
}): Promise<{
  /** False only when canonical plan storage/version is not present yet. */
  authoritative: boolean
  stops: TourPlanView["stops"]
}> {
  let versionId = args.draftVersionId
  if (!versionId) {
    const { data: version, error } = await args.supabase
      .from("tour_versions")
      .select("id")
      .eq("tour_id", args.tourId)
      .eq("version_number", args.planVersion)
      .eq("status", "draft")
      .maybeSingle()
    if (error) {
      if (error.code === "42P01" || error.code === "PGRST205") {
        return { authoritative: false, stops: [] }
      }
      throw new Error(error.message || "Failed to load the canonical tour plan version.")
    }
    versionId = version?.id ? String(version.id) : null
  }
  if (!versionId) return { authoritative: false, stops: [] }

  const { data: rows, error: stopError } = await args.supabase
    .from("tour_stops")
    .select(
      "event_id, ordinal, name, venue_label, local_date, local_time, market, leg_name, capacity, advance_status, stop_type, status",
    )
    .eq("tour_version_id", versionId)
    .eq("status", "active")
    .order("ordinal", { ascending: true })

  if (stopError) {
    if (stopError.code === "42P01" || stopError.code === "PGRST205") {
      return { authoritative: false, stops: [] }
    }
    throw new Error(stopError.message || "Failed to load canonical tour stops.")
  }
  if (!rows?.length) return { authoritative: true, stops: [] }

  return {
    authoritative: true,
    stops: rows.map((row: Record<string, unknown>, index: number) => ({
      event_id: row.event_id ? String(row.event_id) : null,
      ordinal: typeof row.ordinal === "number" ? row.ordinal : index,
      name: String(row.name || `Stop ${index + 1}`),
      venue: row.venue_label ? String(row.venue_label) : null,
      date: row.local_date ? String(row.local_date).slice(0, 10) : null,
      time: row.local_time ? String(row.local_time).slice(0, 5) : null,
      market: row.market ? String(row.market) : null,
      leg_name: row.leg_name ? String(row.leg_name) : null,
      capacity: row.capacity == null ? null : Number(row.capacity),
      advance_status: String(row.advance_status || "not_started"),
      stop_type: String(row.stop_type || "show"),
    })),
  }
}

async function throwPlanVersionConflict(args: {
  supabase: SupabaseLike
  userId: string
  tourId: string
  orgId?: string | null
  expectedVersion: number
  currentVersion: number
  client: z.output<typeof tourPlanWriteSchema>
}): Promise<never> {
  const serverPlan = await readTourPlan({
    supabase: args.supabase,
    userId: args.userId,
    tourId: args.tourId,
    orgId: args.orgId,
  })
  const diff = buildTourPlanConflictDiff({
    expectedVersion: args.expectedVersion,
    server: {
      planVersion: serverPlan.planVersion,
      name: serverPlan.name,
      description: serverPlan.description,
      status: serverPlan.status,
      start_date: serverPlan.start_date,
      end_date: serverPlan.end_date,
      main_artist: serverPlan.main_artist,
      route_notes: serverPlan.route_notes,
      stops: serverPlan.stops,
    },
    client: {
      name: args.client.name,
      description: args.client.description,
      status: args.client.status,
      start_date: args.client.start_date,
      end_date: args.client.end_date,
      main_artist: args.client.main_artist,
      route_notes: args.client.route_notes,
      stops: args.client.stops.map((stop, index) => ({
        event_id: stop.event_id ?? null,
        ordinal: stop.ordinal ?? index,
        name: stop.name,
        venue: stop.venue ?? null,
        date: stop.date,
        time: stop.time ?? null,
        market: stop.market ?? null,
        advance_status: stop.advance_status,
      })),
    },
  })
  throw new TourPlanVersionConflictError({
    currentVersion: args.currentVersion || serverPlan.planVersion,
    expectedVersion: args.expectedVersion,
    diff,
    serverPlan,
  })
}

export interface TourPlanWriteResult {
  plan: TourPlanView
  reconciliation: TourStopReconcilePlan | null
}

export async function writeTourPlan(args: {
  supabase: SupabaseLike
  userId: string
  tourId: string
  orgId?: string | null
  input: unknown
}): Promise<TourPlanWriteResult> {
  if (
    args.input
    && typeof args.input === "object"
    && !Array.isArray(args.input)
    && "routing" in (args.input as Record<string, unknown>)
    && (args.input as Record<string, unknown>).routing !== undefined
  ) {
    throw new TourPlanValidationError(
      "Independent routing JSON is not accepted. Submit stops only; route projection is derived server-side.",
    )
  }

  const parsed = tourPlanWriteSchema.safeParse(args.input)
  if (!parsed.success) {
    throw new TourPlanValidationError(
      parsed.error.issues.map((issue) => issue.message).join("; ") || "Invalid plan payload.",
    )
  }
  const input = parsed.data

  const access = await requireTourAccess({
    supabase: args.supabase,
    userId: args.userId,
    tourId: args.tourId,
    orgId: args.orgId,
  })

  const { data: existing, error: loadError } = await args.supabase
    .from("tours")
    .select("id, org_id, plan_version, settings")
    .eq("id", args.tourId)
    .maybeSingle()
  if (loadError) throw new Error(loadError.message)
  if (!existing) throw new TourAccessDeniedError()

  const currentVersion = typeof existing.plan_version === "number" ? existing.plan_version : 1
  const orgId = access.orgId || args.orgId || existing.org_id
  if (!orgId) throw new TourPlanValidationError("Tour is missing organization scope.")

  if (input.expectedPlanVersion !== currentVersion) {
    await throwPlanVersionConflict({
      supabase: args.supabase,
      userId: args.userId,
      tourId: args.tourId,
      orgId,
      expectedVersion: input.expectedPlanVersion,
      currentVersion,
      client: input,
    })
  }

  const reconcileMode = assertTourStopReconcileMode(input.reconcileMode || "exact")

  // Single command path: stop set → relational links → derived route JSON (no independent write).
  const updated = await AdminTourEventOperationsService.updateTour({
    supabase: args.supabase,
    userId: args.userId,
    tourId: args.tourId,
    orgId,
    input: {
      name: input.name,
      description: input.description,
      status: input.status as "active" | "completed" | "cancelled" | "planning" | "on_hold" | undefined,
      start_date: input.start_date,
      end_date: input.end_date,
      main_artist: input.main_artist,
      artist_id: input.artist_id,
      markets: input.markets,
      cover_image_url: input.cover_image_url || null,
      budget: input.budget,
      reconcile_mode: reconcileMode,
      // Stop set — updateTour reconciles tour_events per explicit mode
      events: input.stops.map((stop, index) => ({
        ...(stop.event_id ? { id: stop.event_id } : {}),
        name: stop.name,
        venue: stop.venue || "",
        date: stop.date,
        time: stop.time || undefined,
        capacity: stop.capacity ?? undefined,
        market: stop.market || undefined,
        leg_name: stop.leg_name || undefined,
        advance_status: stop.advance_status,
        ordinal: stop.ordinal ?? index,
      })),
      event_ids: input.stops
        .map((stop) => stop.event_id)
        .filter((id): id is string => Boolean(id)),
      settings: {
        ...(input.settings || {}),
        route_notes: input.route_notes ?? null,
        planning_venue_snapshots: input.stops.map((stop, index) => ({
          event_id: stop.event_id ?? null,
          ordinal: stop.ordinal ?? index,
          venue: stop.venue ?? null,
          venue_address: stop.venue_address ?? null,
          venue_city: stop.venue_city ?? null,
          venue_state: stop.venue_state ?? null,
          venue_postal_code: stop.venue_postal_code ?? null,
          venue_country: stop.venue_country ?? null,
          venue_website: stop.venue_website ?? null,
          capacity: stop.capacity ?? null,
          contact_name: stop.contact_name ?? null,
          contact_email: stop.contact_email ?? null,
          contact_phone: stop.contact_phone ?? null,
          technical_specs: stop.technical_specs ?? null,
        })),
        // Placeholder only — overwritten from projection after reconcile
        route: [],
      },
    },
  })

  const planAfterLinks = await readTourPlan({
    supabase: args.supabase,
    userId: args.userId,
    tourId: args.tourId,
    orgId,
  })

  const nextVersion = currentVersion + 1
  const settings = {
    ...readSettings(updated as Record<string, unknown>),
    ...(input.settings || {}),
    route_notes: input.route_notes ?? null,
    route: planAfterLinks.routeProjection,
    plan_source: "canonical_plan_service",
  }

  let versionQuery = args.supabase
    .from("tours")
    .update({ plan_version: nextVersion, settings })
    .eq("id", args.tourId)
    .eq("plan_version", currentVersion)
  if (orgId) versionQuery = versionQuery.eq("org_id", orgId)
  const { data: bumped, error: bumpError } = await versionQuery.select("id, plan_version").maybeSingle()
  if (bumpError) throw new Error(bumpError.message)
  if (!bumped) {
    await throwPlanVersionConflict({
      supabase: args.supabase,
      userId: args.userId,
      tourId: args.tourId,
      orgId,
      expectedVersion: input.expectedPlanVersion,
      currentVersion,
      client: input,
    })
  }

  // PLAN-201 — dual-write normalized draft version + stops; quarantine conflicts.
  try {
    await normalizeTourPlanDraft({
      supabase: args.supabase,
      userId: args.userId,
      tourId: args.tourId,
      orgId,
      skipAccessCheck: true,
    })
  } catch (error) {
    // Normalized tables may be absent until migration; compatibility reads remain available.
    const code = error && typeof error === "object" && "code" in error
      ? String((error as { code?: string }).code)
      : ""
    if (code !== "42P01" && code !== "PGRST205") {
      console.warn("[tour-plan] normalizeTourPlanDraft failed:", error)
    }
  }

  // Every successful mutation returns the new authoritative version + reconcile summary.
  const plan = await readTourPlan({
    supabase: args.supabase,
    userId: args.userId,
    tourId: args.tourId,
    orgId,
  })
  const reconciliation =
    updated && typeof updated === "object" && "reconciliation" in updated
      ? ((updated as { reconciliation?: TourStopReconcilePlan }).reconciliation ?? null)
      : null

  return { plan, reconciliation }
}

export function getTourPlanErrorStatus(error: unknown, fallback = 500): number {
  if (error instanceof TourPlanVersionConflictError) return error.status
  if (error instanceof TourPlanValidationError) return error.status
  if (error instanceof TourAccessDeniedError) return error.status
  return fallback
}
