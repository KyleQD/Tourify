/**
 * TOUR-302 — Route and logistics health signal producers (pure).
 *
 * Integrates route and logistics data into the TOUR-301 health aggregation
 * framework. Provides signal builders for:
 *
 *  Route:
 *  - route.conflict_errors       — error-severity constraint violations
 *  - route.conflict_warnings     — warning-severity constraint violations
 *  - route.unknown_legs          — legs with no distance/duration data
 *  - route.stale_legs            — legs not recomputed recently
 *
 *  Logistics:
 *  - logistics.missing_segments  — stops with no travel segment attached
 *  - logistics.missing_rooms     — stops missing room nights for overnight crew
 *  - logistics.missing_equipment — legs with equipment items not assigned transport
 *  - logistics.unresolved_travelers — passenger assignments with missing person data
 *  - logistics.missing_meals     — stops with crew catering requirements not met
 *
 * Each producer returns a TourHealthSignal using the TOUR-301 buildSignal
 * factory, ensuring every signal has source/severity/threshold/owner/
 * freshness/remediationUrl.
 *
 * Pure: no I/O, no `server-only`.
 */

import {
  buildSignal,
  type TourHealthSignal,
  type HealthSignalDomain,
} from "@/lib/admin/tour-health-aggregation"
import type { RouteConstraintViolation } from "@/lib/admin/tour-route-constraints"
import type { RouteLegLogisticsBundle } from "@/lib/admin/tour-route-logistics-context"

// ---------------------------------------------------------------------------
// Route signal inputs
// ---------------------------------------------------------------------------

export interface RouteHealthInput {
  tourId: string
  /** Number of error-severity constraint violations. */
  conflictErrorCount: number
  /** Number of warning-severity constraint violations. */
  conflictWarningCount: number
  /** Number of legs missing distance AND duration data. */
  unknownLegCount: number
  /**
   * ISO timestamp of the oldest leg `calculated_at`.
   * Null if no legs have been calculated.
   */
  oldestLegCalculatedAt: string | null
  /** ISO now for freshness calculation. */
  evaluatedAt: string
  /** Base path for tour in admin UI. */
  adminTourPath: string
  /** Max age minutes before legs are considered stale. Default 120. */
  maxLegAgeMinutes?: number
  nowIso?: string
}

// ---------------------------------------------------------------------------
// Logistics signal inputs
// ---------------------------------------------------------------------------

export interface LogisticsHealthInput {
  tourId: string
  /** Number of show/festival stops that have no travel segment in the bundle. */
  missingSegmentCount: number
  /** Number of crew members without a room night at their destination stop. */
  missingRoomNightCount: number
  /**
   * Number of equipment items assigned to a leg but with no transport method
   * (vehicle movement or travel segment).
   */
  missingEquipmentTransportCount: number
  /**
   * Number of passenger assignments where person_id cannot be resolved to
   * a workforce record (orphan/unresolved traveler).
   */
  unresolvedTravelerCount: number
  /** Number of crew members at stops where catering has not been arranged. */
  missingMealCount: number
  evaluatedAt: string
  adminTourPath: string
  nowIso?: string
}

// ---------------------------------------------------------------------------
// Route signal producers
// ---------------------------------------------------------------------------

/**
 * Produce all four route health signals for a tour.
 */
export function buildRouteHealthSignals(input: RouteHealthInput): TourHealthSignal[] {
  const {
    tourId,
    conflictErrorCount,
    conflictWarningCount,
    unknownLegCount,
    oldestLegCalculatedAt,
    evaluatedAt,
    adminTourPath,
    maxLegAgeMinutes = 120,
    nowIso,
  } = input

  const routeDomain: HealthSignalDomain = "route"
  const routeRemediationUrl = `${adminTourPath}/route`

  // 1. Route constraint errors
  const conflictErrors = buildSignal({
    signal_id: "route.conflict_errors",
    label: "Route constraint errors",
    source: routeDomain,
    owner: routeDomain,
    threshold: { type: "count_lte", value: 0 },
    observedValue: conflictErrorCount,
    evaluated_at: evaluatedAt,
    remediationUrl: routeRemediationUrl,
    detail: conflictErrorCount > 0
      ? `${conflictErrorCount} error-severity constraint violation(s) require resolution.`
      : null,
    nowIso,
  })

  // 2. Route constraint warnings
  const conflictWarnings = buildSignal({
    signal_id: "route.conflict_warnings",
    label: "Route constraint warnings",
    source: routeDomain,
    owner: routeDomain,
    threshold: { type: "count_lte", value: 0 },
    observedValue: conflictWarningCount,
    evaluated_at: evaluatedAt,
    remediationUrl: routeRemediationUrl,
    detail: conflictWarningCount > 0
      ? `${conflictWarningCount} warning-severity constraint(s) should be reviewed.`
      : null,
    nowIso,
  })

  // Fix: warnings should be warning severity, not error
  const warningSignal: TourHealthSignal = {
    ...conflictWarnings,
    severity: conflictWarningCount > 0 ? "warning" : "ok",
  }

  // 3. Unknown legs
  const unknownLegs = buildSignal({
    signal_id: "route.unknown_legs",
    label: "Route legs missing data",
    source: routeDomain,
    owner: routeDomain,
    threshold: { type: "count_lte", value: 0 },
    observedValue: unknownLegCount,
    evaluated_at: evaluatedAt,
    remediationUrl: routeRemediationUrl,
    detail: unknownLegCount > 0
      ? `${unknownLegCount} leg(s) are missing distance or duration data.`
      : null,
    nowIso,
  })

  // 4. Stale legs — check age of oldest calculation
  const legAgeMinutes: number | null = oldestLegCalculatedAt
    ? Math.round(
        (new Date(nowIso ?? evaluatedAt).getTime() - new Date(oldestLegCalculatedAt).getTime()) / 60000,
      )
    : null

  const staleLegs = buildSignal({
    signal_id: "route.stale_legs",
    label: "Route leg data freshness",
    source: routeDomain,
    owner: routeDomain,
    threshold: { type: "age_minutes_lte", value: maxLegAgeMinutes },
    observedValue: legAgeMinutes,
    evaluated_at: evaluatedAt,
    remediationUrl: routeRemediationUrl,
    detail: legAgeMinutes != null && legAgeMinutes > maxLegAgeMinutes
      ? `Oldest route leg data is ${legAgeMinutes} minutes old (threshold: ${maxLegAgeMinutes} min).`
      : null,
    nowIso,
  })

  return [conflictErrors, warningSignal, unknownLegs, staleLegs]
}

// ---------------------------------------------------------------------------
// Logistics signal producers
// ---------------------------------------------------------------------------

/**
 * Produce all five logistics health signals for a tour.
 */
export function buildLogisticsHealthSignals(input: LogisticsHealthInput): TourHealthSignal[] {
  const {
    missingSegmentCount,
    missingRoomNightCount,
    missingEquipmentTransportCount,
    unresolvedTravelerCount,
    missingMealCount,
    evaluatedAt,
    adminTourPath,
    nowIso,
  } = input

  const logDomain: HealthSignalDomain = "logistics"
  const logUrl = `${adminTourPath}/logistics`

  const missingSegments = buildSignal({
    signal_id: "logistics.missing_segments",
    label: "Travel segments coverage",
    source: logDomain,
    owner: logDomain,
    threshold: { type: "count_lte", value: 0 },
    observedValue: missingSegmentCount,
    evaluated_at: evaluatedAt,
    remediationUrl: `${logUrl}/travel`,
    detail: missingSegmentCount > 0
      ? `${missingSegmentCount} stop(s) have no travel segment arranged.`
      : null,
    nowIso,
  })

  const missingRooms = buildSignal({
    signal_id: "logistics.missing_rooms",
    label: "Room night coverage",
    source: logDomain,
    owner: logDomain,
    threshold: { type: "count_lte", value: 0 },
    observedValue: missingRoomNightCount,
    evaluated_at: evaluatedAt,
    remediationUrl: `${logUrl}/lodging`,
    detail: missingRoomNightCount > 0
      ? `${missingRoomNightCount} crew member(s) are missing accommodation.`
      : null,
    nowIso,
  })

  const missingEquipment = buildSignal({
    signal_id: "logistics.missing_equipment",
    label: "Equipment transport coverage",
    source: logDomain,
    owner: logDomain,
    threshold: { type: "count_lte", value: 0 },
    observedValue: missingEquipmentTransportCount,
    evaluated_at: evaluatedAt,
    remediationUrl: `${logUrl}/equipment`,
    detail: missingEquipmentTransportCount > 0
      ? `${missingEquipmentTransportCount} equipment item(s) have no assigned transport.`
      : null,
    nowIso,
  })

  const unresolvedTravelers = buildSignal({
    signal_id: "logistics.unresolved_travelers",
    label: "Unresolved traveler data",
    source: logDomain,
    owner: logDomain,
    threshold: { type: "count_lte", value: 0 },
    observedValue: unresolvedTravelerCount,
    evaluated_at: evaluatedAt,
    remediationUrl: `${logUrl}/passengers`,
    detail: unresolvedTravelerCount > 0
      ? `${unresolvedTravelerCount} passenger assignment(s) cannot be matched to a workforce record.`
      : null,
    nowIso,
  })

  const missingMeals = buildSignal({
    signal_id: "logistics.missing_meals",
    label: "Crew catering coverage",
    source: logDomain,
    owner: logDomain,
    threshold: { type: "count_lte", value: 0 },
    observedValue: missingMealCount,
    evaluated_at: evaluatedAt,
    remediationUrl: `${logUrl}/catering`,
    detail: missingMealCount > 0
      ? `${missingMealCount} crew member(s) have unmet catering requirements.`
      : null,
    nowIso,
  })

  return [missingSegments, missingRooms, missingEquipment, unresolvedTravelers, missingMeals]
}

// ---------------------------------------------------------------------------
// Combined route + logistics signal set builder
// ---------------------------------------------------------------------------

/**
 * Build the full route + logistics signal set for a tour.
 * Returns all 9 signals (4 route + 5 logistics).
 */
export function buildRouteLogisticsHealthSignals(args: {
  route: RouteHealthInput
  logistics: LogisticsHealthInput
}): TourHealthSignal[] {
  return [
    ...buildRouteHealthSignals(args.route),
    ...buildLogisticsHealthSignals(args.logistics),
  ]
}

// ---------------------------------------------------------------------------
// Helper: derive route health inputs from raw constraint violations
// ---------------------------------------------------------------------------

/**
 * Convenience function: derive RouteHealthInput counts from raw
 * constraint violations + leg metadata.
 */
export function deriveRouteHealthCounts(violations: RouteConstraintViolation[]): {
  conflictErrorCount: number
  conflictWarningCount: number
} {
  return {
    conflictErrorCount: violations.filter((v) => v.severity === "error").length,
    conflictWarningCount: violations.filter((v) => v.severity === "warning").length,
  }
}

/**
 * Convenience: derive logistics health input counts from a set of bundles.
 * Segments/rooms/equipment counts are derived from bundle completeness.
 */
export function deriveLogisticsHealthCounts(bundles: RouteLegLogisticsBundle[]): {
  missingSegmentCount: number
  missingRoomNightCount: number
  missingEquipmentTransportCount: number
  unresolvedTravelerCount: number
} {
  let missingSegmentCount = 0
  let missingRoomNightCount = 0
  let missingEquipmentTransportCount = 0
  let unresolvedTravelerCount = 0

  for (const bundle of bundles) {
    // Missing segments: if there are passengers but no segments, flag
    if (bundle.passenger_assignments.length > 0 && bundle.travel_segments.length === 0) {
      missingSegmentCount++
    }

    // Missing rooms: count passengers with has_room_night=false
    missingRoomNightCount += bundle.passenger_assignments.filter(
      (pa) => !pa.has_room_night,
    ).length

    // Missing equipment transport: equipment moves with no vehicle or segment
    missingEquipmentTransportCount += bundle.equipment_moves.filter(
      (em) => !em.vehicle_movement_id && !em.travel_segment_id,
    ).length

    // Unresolved travelers: check bundle consistency warnings
    // Simplified: count assignments that have no matching vehicle or segment
    unresolvedTravelerCount += bundle.passenger_assignments.filter(
      (pa) =>
        !pa.vehicle_movement_id &&
        !pa.travel_segment_id &&
        bundle.travel_segments.length === 0,
    ).length
  }

  return {
    missingSegmentCount,
    missingRoomNightCount,
    missingEquipmentTransportCount,
    unresolvedTravelerCount,
  }
}
