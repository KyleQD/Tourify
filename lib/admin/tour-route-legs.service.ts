/**
 * ROUTE-301 — Tour route legs service (server).
 * Regenerates legs deterministically from an ordered stop list,
 * preserving approved overrides and linked bookings.
 */

import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import {
  detectOrphanLegs,
  generateRouteLegPairs,
  mergeRouteLegSet,
  summarizeRouteLegSet,
  TourRouteLegError,
  type TourRouteLeg,
  type TourRouteLegStop,
} from "@/lib/admin/tour-route-legs"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseLike = { from: (table: string) => any }

function asClient(s: SupabaseLike): SupabaseClient {
  return s as unknown as SupabaseClient
}

function mapLegRow(raw: Record<string, unknown>): TourRouteLeg {
  return {
    id: String(raw.id),
    tour_version_id: String(raw.tour_version_id),
    tour_id: String(raw.tour_id),
    org_id: String(raw.org_id),
    from_stop_id: String(raw.from_stop_id),
    to_stop_id: String(raw.to_stop_id),
    from_ordinal: Number(raw.from_ordinal),
    to_ordinal: Number(raw.to_ordinal),
    transport_mode: (raw.transport_mode as TourRouteLeg["transport_mode"]) ?? "drive",
    distance_km: raw.distance_km != null ? Number(raw.distance_km) : null,
    duration_minutes: raw.duration_minutes != null ? Number(raw.duration_minutes) : null,
    buffer_minutes: Number(raw.buffer_minutes ?? 0),
    provider: raw.provider ? String(raw.provider) : null,
    provider_version: raw.provider_version ? String(raw.provider_version) : null,
    calculated_at: raw.calculated_at ? String(raw.calculated_at) : null,
    override:
      raw.override_approved_by
        ? {
            distance_km: raw.override_distance_km != null ? Number(raw.override_distance_km) : null,
            duration_minutes: raw.override_duration_minutes != null ? Number(raw.override_duration_minutes) : null,
            reason: raw.override_reason ? String(raw.override_reason) : null,
            approvedBy: String(raw.override_approved_by),
            approvedAt: raw.override_approved_at ? String(raw.override_approved_at) : null,
          }
        : null,
    transport_booking_id: raw.transport_booking_id ? String(raw.transport_booking_id) : null,
    has_conflict: Boolean(raw.has_conflict),
    conflict_codes: Array.isArray(raw.conflict_codes) ? raw.conflict_codes.map(String) : [],
    source: (raw.source as TourRouteLeg["source"]) ?? "auto",
  }
}

export interface RegenerateRouteLegResult {
  tourVersionId: string
  tourId: string
  orgId: string
  legCount: number
  summary: ReturnType<typeof summarizeRouteLegSet>
  legs: TourRouteLeg[]
  /** True when the table was not found (migration pending — degrade gracefully). */
  tableMissing?: boolean
}

/**
 * Load existing legs for a tour_version (for override/booking preservation).
 */
export async function loadRouteLegsByVersion(args: {
  supabase: SupabaseLike
  tourVersionId: string
  orgId: string
}): Promise<TourRouteLeg[]> {
  const { data, error } = await args.supabase
    .from("tour_route_legs")
    .select("*")
    .eq("tour_version_id", args.tourVersionId)
    .eq("org_id", args.orgId)
    .order("from_ordinal", { ascending: true })

  if (error) {
    if (error.code === "42P01") return [] // table missing → degrade
    throw new Error(error.message)
  }
  return (data ?? []).map((row: Record<string, unknown>) => mapLegRow(row))
}

/**
 * Regenerate all route legs for a tour_version from its ordered active stops.
 *
 * Steps:
 *  1. Load active stops for the version.
 *  2. Load existing legs (to extract overrides/bookings).
 *  3. Generate pairs deterministically.
 *  4. Merge: preserve approved overrides + linked bookings.
 *  5. Detect orphans (should be none — FK cascade handles stop deletions).
 *  6. Upsert legs; delete legs that no longer correspond to an active pair.
 */
export async function regenerateRouteLegsByVersion(args: {
  supabase: SupabaseLike
  tourVersionId: string
  tourId: string
  orgId: string
  actorUserId: string
}): Promise<RegenerateRouteLegResult> {
  // 1. Load active stops
  const { data: stopRows, error: stopError } = await args.supabase
    .from("tour_stops")
    .select("id, ordinal, name, local_date, stop_type")
    .eq("tour_version_id", args.tourVersionId)
    .eq("org_id", args.orgId)
    .eq("status", "active")
    .order("ordinal", { ascending: true })

  if (stopError) {
    if (stopError.code === "42P01") {
      return {
        tourVersionId: args.tourVersionId,
        tourId: args.tourId,
        orgId: args.orgId,
        legCount: 0,
        summary: summarizeRouteLegSet([]),
        legs: [],
        tableMissing: true,
      }
    }
    throw new Error(stopError.message)
  }

  const stops: TourRouteLegStop[] = (stopRows ?? []).map((row: Record<string, unknown>) => ({
    id: String(row.id),
    ordinal: Number(row.ordinal),
    name: String(row.name || ""),
    local_date: row.local_date ? String(row.local_date) : null,
    stop_type: row.stop_type ? String(row.stop_type) : null,
  }))

  // 2. Load existing legs
  const existingLegs = await loadRouteLegsByVersion({
    supabase: args.supabase,
    tourVersionId: args.tourVersionId,
    orgId: args.orgId,
  })

  // 3. Generate pairs
  const pairs = generateRouteLegPairs({ stops })

  // 4. Merge (preserve overrides + bookings)
  const mergedLegs = mergeRouteLegSet({
    tourVersionId: args.tourVersionId,
    tourId: args.tourId,
    orgId: args.orgId,
    generatedPairs: pairs,
    existingLegs,
  })

  // 5. Orphan check (programming guard — DB FK cascade is authoritative)
  const activeStopIds = new Set(stops.map((s) => s.id))
  const orphans = detectOrphanLegs({ legs: mergedLegs, activeStopIds })
  if (orphans.length > 0) {
    throw new TourRouteLegError(
      "orphan_legs_detected",
      `Leg regeneration produced orphan legs referencing missing stops: ${orphans.join(", ")}`,
    )
  }

  // 6. Upsert into DB
  const now = new Date().toISOString()

  // Determine the valid pair keys for cleanup
  const validPairKeys = new Set(mergedLegs.map((l) => `${l.from_stop_id}:${l.to_stop_id}`))

  // Delete stale legs (pairs that no longer exist in active stops)
  const staleExisting = existingLegs.filter(
    (l) => !validPairKeys.has(`${l.from_stop_id}:${l.to_stop_id}`),
  )
  if (staleExisting.length > 0) {
    const staleIds = staleExisting.map((l) => l.id).filter(Boolean) as string[]
    const { error: deleteError } = await args.supabase
      .from("tour_route_legs")
      .delete()
      .in("id", staleIds)
      .eq("org_id", args.orgId)
    if (deleteError && deleteError.code !== "42P01") {
      throw new Error(deleteError.message)
    }
  }

  // Upsert merged legs
  if (mergedLegs.length > 0) {
    const upsertRows = mergedLegs.map((leg) => ({
      ...(leg.id ? { id: leg.id } : {}),
      tour_version_id: leg.tour_version_id,
      tour_id: leg.tour_id,
      org_id: leg.org_id,
      from_stop_id: leg.from_stop_id,
      to_stop_id: leg.to_stop_id,
      from_ordinal: leg.from_ordinal,
      to_ordinal: leg.to_ordinal,
      transport_mode: leg.transport_mode,
      distance_km: leg.distance_km,
      duration_minutes: leg.duration_minutes,
      buffer_minutes: leg.buffer_minutes,
      provider: leg.provider,
      provider_version: leg.provider_version,
      calculated_at: leg.calculated_at,
      // Override fields
      override_distance_km: leg.override?.distance_km ?? null,
      override_duration_minutes: leg.override?.duration_minutes ?? null,
      override_reason: leg.override?.reason ?? null,
      override_approved_by: leg.override?.approvedBy ?? null,
      override_approved_at: leg.override?.approvedAt ?? null,
      transport_booking_id: leg.transport_booking_id,
      has_conflict: leg.has_conflict,
      conflict_codes: leg.conflict_codes,
      source: leg.source,
      updated_by: args.actorUserId,
      updated_at: now,
    }))

    const { error: upsertError } = await args.supabase
      .from("tour_route_legs")
      .upsert(upsertRows, { onConflict: "tour_version_id,from_stop_id,to_stop_id" })
    if (upsertError && upsertError.code !== "42P01") {
      throw new Error(upsertError.message)
    }
  }

  const summary = summarizeRouteLegSet(mergedLegs)
  return {
    tourVersionId: args.tourVersionId,
    tourId: args.tourId,
    orgId: args.orgId,
    legCount: mergedLegs.length,
    summary,
    legs: mergedLegs,
  }
}
