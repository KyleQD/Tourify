/**
 * EVENT-201 — Load event fields and evaluate readiness from the shared contract.
 */

import "server-only"

import {
  applyEventReadinessWarningOverrides,
  evaluateEventReadiness,
  type EventReadinessEvaluation,
} from "@/lib/admin/event-readiness-engine"
import type { EventReadinessInput } from "@/lib/admin/operations-readiness"
import { requireEventAccess } from "@/lib/admin/event-access.service"

type SupabaseLike = { from: (table: string) => any }

type EvidenceStatus = "verified" | "missing" | "unavailable" | "not_provided"

async function resolveVenueProfileEvidence(args: {
  supabase: SupabaseLike
  venueAccountId: string | null
}): Promise<EvidenceStatus> {
  if (!args.venueAccountId) return "not_provided"
  try {
    const { data, error } = await args.supabase
      .from("venue_profiles")
      .select("id")
      .eq("id", args.venueAccountId)
      .maybeSingle()
    if (error) return "unavailable"
    return data?.id ? "verified" : "missing"
  } catch {
    return "unavailable"
  }
}

async function resolveCanonicalStaffingEvidence(args: {
  supabase: SupabaseLike
  eventId: string
  orgId: string
}): Promise<{ count: number; status: Exclude<EvidenceStatus, "not_provided"> }> {
  try {
    const { data, count, error } = await args.supabase
      .from("staff_shifts")
      .select("id", { count: "exact", head: true })
      .eq("event_id", args.eventId)
      .eq("org_id", args.orgId)
      .neq("status", "cancelled")
    if (error) return { count: 0, status: "unavailable" }
    const resolvedCount = typeof count === "number" ? count : Array.isArray(data) ? data.length : 0
    return { count: resolvedCount, status: resolvedCount > 0 ? "verified" : "missing" }
  } catch {
    return { count: 0, status: "unavailable" }
  }
}

export async function evaluateEventReadinessFromPersisted(args: {
  supabase: SupabaseLike
  userId: string
  eventId: string
  orgId: string
  overrideFindingIds?: readonly string[]
  hasOverrideCapability?: boolean
}): Promise<EventReadinessEvaluation> {
  await requireEventAccess({
    supabase: args.supabase,
    userId: args.userId,
    eventId: args.eventId,
    orgId: args.orgId,
  })

  const { data: event, error } = await args.supabase
    .from("events_v2")
    .select("id, org_id, title, start_at, venue_id, capacity, settings")
    .eq("id", args.eventId)
    .eq("org_id", args.orgId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!event) throw new Error("Event not found.")

  const settings =
    event.settings && typeof event.settings === "object" && !Array.isArray(event.settings)
      ? (event.settings as Record<string, unknown>)
      : {}

  const venueAccountId =
    typeof settings.venue_account_id === "string" ? settings.venue_account_id : null

  const [{ data: tourLinks }, venueProfileStatus, staffingEvidence] = await Promise.all([
    args.supabase
      .from("tour_events")
      .select("tour_id, is_primary")
      .eq("event_id", args.eventId),
    resolveVenueProfileEvidence({ supabase: args.supabase, venueAccountId }),
    resolveCanonicalStaffingEvidence({
      supabase: args.supabase,
      eventId: args.eventId,
      orgId: args.orgId,
    }),
  ])

  const tourIds = (tourLinks ?? [])
    .map((row: { tour_id?: string }) => String(row.tour_id || ""))
    .filter(Boolean)
  const primary = (tourLinks ?? []).find((row: { is_primary?: boolean }) => row.is_primary)

  const input: EventReadinessInput & { eventId: string; orgId: string } = {
    eventId: args.eventId,
    orgId: args.orgId,
    title: typeof event.title === "string" ? event.title : "",
    start_at: typeof event.start_at === "string" ? event.start_at : null,
    venue_name: typeof settings.venue_label === "string" ? settings.venue_label : null,
    venue_id: typeof event.venue_id === "string" ? event.venue_id : null,
    venue_account_id: venueAccountId,
    venue_profile_status: venueProfileStatus,
    capacity: event.capacity as string | number | null,
    tour_ids: tourIds,
    primary_tour_id: primary?.tour_id ? String(primary.tour_id) : null,
    technical_rider: typeof settings.technical_rider === "string" ? settings.technical_rider : null,
    hospitality_rider:
      typeof settings.hospitality_rider === "string" ? settings.hospitality_rider : null,
    security_notes: typeof settings.security_notes === "string" ? settings.security_notes : null,
    promoter_contact: settings.promoter_contact,
    load_in_time: typeof settings.load_in_time === "string" ? settings.load_in_time : null,
    sound_check_time: typeof settings.sound_check_time === "string" ? settings.sound_check_time : null,
    settlement_terms: typeof settings.settlement_terms === "string" ? settings.settlement_terms : null,
    ticket_price: settings.ticket_price as string | number | null,
    expected_revenue: settings.expected_revenue as string | number | null,
    expected_expenses: settings.expected_expenses as string | number | null,
    staff_count: staffingEvidence.count,
    staffing_status: staffingEvidence.status,
    vendor_count: Array.isArray(settings.vendor_ids) ? settings.vendor_ids.length : 0,
    team_count: [
      ...(Array.isArray(settings.artist_ids) ? settings.artist_ids : []),
      ...(Array.isArray(settings.staff_ids) ? settings.staff_ids : []),
      ...(Array.isArray(settings.vendor_ids) ? settings.vendor_ids : []),
    ].length,
    advance_status: typeof settings.advance_status === "string" ? settings.advance_status : null,
    has_logistics: Boolean(settings.has_logistics || settings.logistics),
    has_site_map: Boolean(settings.site_map_id || settings.has_site_map),
    has_documents: Boolean(settings.has_documents),
    has_comms: Boolean(settings.has_comms),
    day_sheet_notes: typeof settings.day_sheet_notes === "string" ? settings.day_sheet_notes : null,
  }

  const evaluation = evaluateEventReadiness(input)
  return applyEventReadinessWarningOverrides({
    evaluation,
    overrideFindingIds: args.overrideFindingIds,
    hasOverrideCapability: args.hasOverrideCapability,
  })
}
