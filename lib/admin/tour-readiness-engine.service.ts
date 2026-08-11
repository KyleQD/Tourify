/**
 * PLAN-206 / PUB-201 — Load persisted plan and evaluate readiness.
 */

import "server-only"

import {
  applyReadinessWarningOverrides,
  evaluatePersistedTourReadiness,
  type TourReadinessEvaluation,
} from "@/lib/admin/tour-readiness-engine"
import { requireTourAccess } from "@/lib/admin/tour-access.service"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseLike = { from: (table: string) => any }

export async function evaluateTourReadinessFromPersistedPlan(args: {
  supabase: SupabaseLike
  userId: string
  tourId: string
  orgId: string
  overrideFindingIds?: readonly string[]
  hasOverrideCapability?: boolean
}): Promise<TourReadinessEvaluation> {
  await requireTourAccess({
    supabase: args.supabase,
    userId: args.userId,
    tourId: args.tourId,
    orgId: args.orgId,
  })

  const { data: tour, error } = await args.supabase
    .from("tours")
    .select("id, org_id, name, start_date, end_date, plan_version, current_draft_version_id, artist_id, settings")
    .eq("id", args.tourId)
    .eq("org_id", args.orgId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!tour) throw new Error("Tour not found.")

  const settings =
    tour.settings && typeof tour.settings === "object" && !Array.isArray(tour.settings)
      ? (tour.settings as Record<string, unknown>)
      : {}

  let versionId = tour.current_draft_version_id ? String(tour.current_draft_version_id) : null
  if (!versionId) {
    const planVersion = typeof tour.plan_version === "number" ? tour.plan_version : 1
    const { data: version } = await args.supabase
      .from("tour_versions")
      .select("id")
      .eq("tour_id", args.tourId)
      .eq("version_number", planVersion)
      .maybeSingle()
    versionId = version?.id ? String(version.id) : null
  }

  let stops: Array<Record<string, unknown>> = []
  if (versionId) {
    const { data: stopRows, error: stopError } = await args.supabase
      .from("tour_stops")
      .select("id, ordinal, stop_type, name, local_date, venue_label, venue_id, event_id, planning_status, timezone")
      .eq("tour_version_id", versionId)
      .eq("status", "active")
      .order("ordinal", { ascending: true })
    if (stopError && stopError.code !== "42P01") throw new Error(stopError.message)
    stops = (stopRows ?? []) as Array<Record<string, unknown>>
  }

  // Fallback: tour_events when normalized stops absent.
  if (stops.length === 0) {
    const { data: links } = await args.supabase
      .from("tour_events")
      .select("ordinal, events_v2(id, title, start_at, venue_id, settings)")
      .eq("tour_id", args.tourId)
      .order("ordinal", { ascending: true })
    stops = (links ?? []).map((link: any, index: number) => {
      const event = link.events_v2 || {}
      const eventSettings = event.settings && typeof event.settings === "object" ? event.settings : {}
      return {
        id: event.id,
        ordinal: typeof link.ordinal === "number" ? link.ordinal : index,
        stop_type: "show",
        name: event.title || `Stop ${index + 1}`,
        local_date: event.start_at ? String(event.start_at).slice(0, 10) : null,
        venue_label: eventSettings.venue_label || eventSettings.venue_name || null,
        venue_id: event.venue_id || null,
        event_id: event.id || null,
        timezone: null,
      }
    })
  }

  const evaluation = evaluatePersistedTourReadiness({
    tourId: args.tourId,
    orgId: args.orgId,
    name: String(tour.name || ""),
    mainArtist:
      typeof settings.main_artist === "string" ? settings.main_artist : null,
    artistAccountId: tour.artist_id ? String(tour.artist_id) : null,
    startDate: tour.start_date ? String(tour.start_date) : null,
    endDate: tour.end_date ? String(tour.end_date) : null,
    stops: stops.map((stop) => ({
      id: stop.id ? String(stop.id) : undefined,
      ordinal: Number(stop.ordinal || 0),
      stop_type: String(stop.stop_type || "show"),
      name: String(stop.name || ""),
      local_date: stop.local_date ? String(stop.local_date) : null,
      venue_label: stop.venue_label ? String(stop.venue_label) : null,
      venue_id: stop.venue_id ? String(stop.venue_id) : null,
      event_id: stop.event_id ? String(stop.event_id) : null,
      planning_status: stop.planning_status ? String(stop.planning_status) : null,
      timezone: stop.timezone ? String(stop.timezone) : null,
    })),
  })

  if (args.overrideFindingIds?.length) {
    return applyReadinessWarningOverrides({
      evaluation,
      overrideFindingIds: args.overrideFindingIds,
      hasOverrideCapability: Boolean(args.hasOverrideCapability),
    }).evaluation
  }

  return evaluation
}
