/**
 * PLAN-201 — Persist tour_versions / tour_stops and quarantine conflicts.
 */

import "server-only"

import {
  buildTourPlanBackfill,
  type RouteJsonStopInput,
  type TourEventLinkInput,
  type TourPlanBackfillResult,
  type TourStopCandidate,
} from "@/lib/admin/tour-plan-backfill"
import { requireTourAccess, TourAccessDeniedError } from "@/lib/admin/tour-access.service"


type SupabaseLike = { from: (table: string) => any }

export interface TourPlanNormalizeResult {
  tourId: string
  orgId: string | null
  versionId: string | null
  versionNumber: number | null
  stopCount: number
  quarantineCount: number
  backfill: TourPlanBackfillResult
  skipped: boolean
  skipReason?: string
}

function readRouteJson(settings: Record<string, unknown>): RouteJsonStopInput[] {
  const route = settings.route
  if (!Array.isArray(route)) return []
  return route as RouteJsonStopInput[]
}

async function loadTourEventLinks(args: {
  supabase: SupabaseLike
  tourId: string
}): Promise<TourEventLinkInput[]> {
  const { data, error } = await args.supabase
    .from("tour_events")
    .select(
      "id, event_id, ordinal, market, leg_name, advance_status, routing_notes, events_v2(id, title, start_at, venue_id, capacity, settings)",
    )
    .eq("tour_id", args.tourId)
    .order("ordinal", { ascending: true })

  if (error) {
    if (error.code === "42P01") return []
    throw new Error(error.message)
  }

  return (data ?? []).map((link: Record<string, unknown>) => {
    const event = (link.events_v2 || {}) as Record<string, unknown>
    const eventSettings =
      event.settings && typeof event.settings === "object" && !Array.isArray(event.settings)
        ? (event.settings as Record<string, unknown>)
        : {}
    return {
      id: String(link.id),
      event_id: String(link.event_id),
      ordinal: typeof link.ordinal === "number" ? link.ordinal : null,
      market: link.market ? String(link.market) : null,
      leg_name: link.leg_name ? String(link.leg_name) : null,
      advance_status: link.advance_status ? String(link.advance_status) : null,
      routing_notes: link.routing_notes ? String(link.routing_notes) : null,
      event_title: event.title ? String(event.title) : null,
      event_start_at: event.start_at ? String(event.start_at) : null,
      venue_label:
        typeof eventSettings.venue_label === "string"
          ? eventSettings.venue_label
          : typeof eventSettings.venue_name === "string"
            ? eventSettings.venue_name
            : null,
      capacity: event.capacity == null ? null : Number(event.capacity),
      venue_id: event.venue_id ? String(event.venue_id) : null,
    }
  })
}

async function insertQuarantineRows(args: {
  supabase: SupabaseLike
  tourId: string
  orgId: string | null
  quarantine: TourPlanBackfillResult["quarantine"]
}): Promise<number> {
  if (args.quarantine.length === 0) return 0
  const rows = args.quarantine.map((item) => ({
    tour_id: args.tourId,
    org_id: args.orgId,
    conflict_type: item.conflict_type,
    reason: item.reason,
    source_ref: item.source_ref,
    payload: item.payload,
  }))
  const { error } = await args.supabase.from("tour_plan_quarantine").insert(rows)
  if (error) {
    if (error.code === "42P01") return 0
    throw new Error(error.message)
  }
  return rows.length
}

async function replaceDraftStops(args: {
  supabase: SupabaseLike
  versionId: string
  tourId: string
  orgId: string
  stops: TourStopCandidate[]
  userId: string
}): Promise<number> {
  await args.supabase.from("tour_stops").delete().eq("tour_version_id", args.versionId)

  if (args.stops.length === 0) return 0

  const rows = args.stops.map((stop) => ({
    tour_version_id: args.versionId,
    tour_id: args.tourId,
    org_id: args.orgId,
    ordinal: stop.ordinal,
    stop_type: stop.stop_type,
    event_id: stop.event_id,
    tour_event_id: stop.tour_event_id,
    name: stop.name,
    venue_label: stop.venue_label,
    market: stop.market,
    leg_name: stop.leg_name,
    local_date: stop.local_date,
    local_time: stop.local_time,
    capacity: stop.capacity,
    advance_status: stop.advance_status,
    venue_id: stop.venue_id,
    notes: stop.notes,
    status: "active",
    source: stop.source,
    created_by: args.userId,
    updated_by: args.userId,
  }))

  const { error } = await args.supabase.from("tour_stops").insert(rows)
  if (error) {
    if (error.code === "42P01") return 0
    throw new Error(error.message)
  }
  return rows.length
}

/**
 * Ensure a draft tour_versions row exists at tours.plan_version and replace its stops
 * from deterministic backfill of tour_events + settings.route.
 */
export async function normalizeTourPlanDraft(args: {
  supabase: SupabaseLike
  userId: string
  tourId: string
  orgId?: string | null
  /** When true, skip requireTourAccess (internal plan write path). */
  skipAccessCheck?: boolean
}): Promise<TourPlanNormalizeResult> {
  if (!args.skipAccessCheck) {
    await requireTourAccess({
      supabase: args.supabase,
      userId: args.userId,
      tourId: args.tourId,
      orgId: args.orgId,
    })
  }

  const { data: tour, error: tourError } = await args.supabase
    .from("tours")
    .select("id, org_id, plan_version, name, description, settings")
    .eq("id", args.tourId)
    .maybeSingle()

  if (tourError) {
    if (tourError.code === "42P01") {
      return {
        tourId: args.tourId,
        orgId: null,
        versionId: null,
        versionNumber: null,
        stopCount: 0,
        quarantineCount: 0,
        backfill: { stops: [], quarantine: [], canPersist: false },
        skipped: true,
        skipReason: "tours_unavailable",
      }
    }
    throw new Error(tourError.message)
  }
  if (!tour?.id) throw new TourAccessDeniedError()

  const orgId = (tour.org_id as string | null) ?? args.orgId ?? null
  const versionNumber = typeof tour.plan_version === "number" ? tour.plan_version : 1
  const settings =
    tour.settings && typeof tour.settings === "object" && !Array.isArray(tour.settings)
      ? (tour.settings as Record<string, unknown>)
      : {}

  const links = await loadTourEventLinks({ supabase: args.supabase, tourId: args.tourId })
  const backfill = buildTourPlanBackfill({
    orgId,
    tourId: args.tourId,
    tourEvents: links,
    routeJson: readRouteJson(settings),
  })

  const quarantineCount = await insertQuarantineRows({
    supabase: args.supabase,
    tourId: args.tourId,
    orgId,
    quarantine: backfill.quarantine,
  })

  if (!backfill.canPersist || !orgId) {
    return {
      tourId: args.tourId,
      orgId,
      versionId: null,
      versionNumber,
      stopCount: 0,
      quarantineCount,
      backfill,
      skipped: true,
      skipReason: "unresolvable_org",
    }
  }

  // Upsert draft version matching current plan_version.
  const { data: existingVersion } = await args.supabase
    .from("tour_versions")
    .select("id")
    .eq("tour_id", args.tourId)
    .eq("version_number", versionNumber)
    .maybeSingle()

  let versionId = existingVersion?.id ? String(existingVersion.id) : null

  if (!versionId) {
    const { data: created, error: createError } = await args.supabase
      .from("tour_versions")
      .insert({
        tour_id: args.tourId,
        org_id: orgId,
        version_number: versionNumber,
        status: "draft",
        name: tour.name ?? null,
        description: tour.description ?? null,
        route_notes: typeof settings.route_notes === "string" ? settings.route_notes : null,
        markets: Array.isArray(settings.markets) ? settings.markets.map(String) : [],
        settings_snapshot: {
          main_artist: settings.main_artist ?? null,
          genre: settings.genre ?? null,
        },
        source: links.length > 0 ? "backfill_tour_events" : "backfill_route_json",
        created_by: args.userId,
        updated_by: args.userId,
      })
      .select("id")
      .single()

    if (createError) {
      if (createError.code === "42P01") {
        return {
          tourId: args.tourId,
          orgId,
          versionId: null,
          versionNumber,
          stopCount: 0,
          quarantineCount,
          backfill,
          skipped: true,
          skipReason: "tour_versions_unavailable",
        }
      }
      // Unique race — re-select
      if (createError.code === "23505") {
        const { data: raced } = await args.supabase
          .from("tour_versions")
          .select("id")
          .eq("tour_id", args.tourId)
          .eq("version_number", versionNumber)
          .maybeSingle()
        versionId = raced?.id ? String(raced.id) : null
      } else {
        throw new Error(createError.message)
      }
    } else {
      versionId = created?.id ? String(created.id) : null
    }
  } else {
    await args.supabase
      .from("tour_versions")
      .update({
        name: tour.name ?? null,
        description: tour.description ?? null,
        route_notes: typeof settings.route_notes === "string" ? settings.route_notes : null,
        markets: Array.isArray(settings.markets) ? settings.markets.map(String) : [],
        updated_by: args.userId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", versionId)
  }

  if (!versionId) {
    return {
      tourId: args.tourId,
      orgId,
      versionId: null,
      versionNumber,
      stopCount: 0,
      quarantineCount,
      backfill,
      skipped: true,
      skipReason: "version_create_failed",
    }
  }

  const stopCount = await replaceDraftStops({
    supabase: args.supabase,
    versionId,
    tourId: args.tourId,
    orgId,
    stops: backfill.stops,
    userId: args.userId,
  })

  // Point tours.current_draft_version_id when column exists (migration adds it).
  await args.supabase
    .from("tours")
    .update({ current_draft_version_id: versionId })
    .eq("id", args.tourId)
    .eq("org_id", orgId)

  return {
    tourId: args.tourId,
    orgId,
    versionId,
    versionNumber,
    stopCount,
    quarantineCount,
    backfill,
    skipped: false,
  }
}

export async function backfillOrgTourPlans(args: {
  supabase: SupabaseLike
  userId: string
  orgId: string
  limit?: number
}): Promise<{
  processed: number
  persisted: number
  quarantinedTours: number
  results: TourPlanNormalizeResult[]
}> {
  const limit = Math.min(Math.max(args.limit ?? 100, 1), 500)
  const { data: tours, error } = await args.supabase
    .from("tours")
    .select("id")
    .eq("org_id", args.orgId)
    .order("updated_at", { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)

  const results: TourPlanNormalizeResult[] = []
  let persisted = 0
  let quarantinedTours = 0

  for (const row of tours ?? []) {
    const result = await normalizeTourPlanDraft({
      supabase: args.supabase,
      userId: args.userId,
      tourId: String(row.id),
      orgId: args.orgId,
      skipAccessCheck: true,
    })
    results.push(result)
    if (!result.skipped) persisted += 1
    if (result.quarantineCount > 0) quarantinedTours += 1
  }

  return {
    processed: results.length,
    persisted,
    quarantinedTours,
    results,
  }
}

export async function listOpenTourPlanQuarantine(args: {
  supabase: SupabaseLike
  orgId: string
  limit?: number
}): Promise<Array<Record<string, unknown>>> {
  const limit = Math.min(Math.max(args.limit ?? 100, 1), 500)
  const { data, error } = await args.supabase
    .from("tour_plan_quarantine")
    .select("*")
    .eq("org_id", args.orgId)
    .is("resolved_at", null)
    .order("detected_at", { ascending: false })
    .limit(limit)

  if (error) {
    if (error.code === "42P01") return []
    throw new Error(error.message)
  }
  return (data ?? []) as Array<Record<string, unknown>>
}
