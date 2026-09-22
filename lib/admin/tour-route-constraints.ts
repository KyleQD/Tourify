/**
 * ROUTE-304 — Route constraint engine (pure).
 *
 * Detects planning conflicts on a tour route. Each check returns a typed
 * RouteConstraintViolation or null (no violation). The engine evaluates all
 * checks and returns a consolidated result with severity / remediation.
 *
 * Checks (per spec ROUTE-304):
 *  1. same_day_overlap         — two show-stops on the same local calendar day
 *  2. insufficient_travel      — travel + buffer time < gap between stops
 *  3. insufficient_rest        — no adequate rest period after a drive leg
 *  4. excessive_drive          — single leg drive duration > policy max
 *  5. curfew_conflict          — departure or arrival falls after venue curfew
 *  6. border_ferry_risk        — ferry/international leg with no customs buffer
 *  7. missing_location         — stop has no venue or location data
 *  8. impossible_arrival       — travel time means arriving after show start
 *
 * Pure: no I/O, no `server-only`. Imports only from sibling ROUTE-30x modules.
 */

import { isSameLocalDay, computeTravelMinutes } from "@/lib/admin/tour-route-timezone"
import { resolveEffectiveLegValues, type TourRouteLeg } from "@/lib/admin/tour-route-legs"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RouteConstraintCode =
  | "same_day_overlap"
  | "insufficient_travel"
  | "insufficient_rest"
  | "excessive_drive"
  | "curfew_conflict"
  | "border_ferry_risk"
  | "missing_location"
  | "impossible_arrival"

export type RouteConstraintSeverity = "error" | "warning" | "info"

export interface RouteConstraintViolation {
  code: RouteConstraintCode
  severity: RouteConstraintSeverity
  legId: string | null
  fromStopId: string | null
  toStopId: string | null
  /** Human-readable description for UI/log. */
  message: string
  /** Evidence fields included for remediation context. */
  evidence: Record<string, unknown>
  /** Link to spec section or UI panel for remediation. */
  remediationHint: string
}

// ---------------------------------------------------------------------------
// Stop and leg inputs for the engine
// ---------------------------------------------------------------------------

export interface ConstraintStop {
  id: string
  ordinal: number
  name: string
  stop_type?: string | null
  /** UTC ISO — show start time (null if unscheduled). */
  start_utc?: string | null
  /** UTC ISO — show end / load-out time (null if unscheduled). */
  end_utc?: string | null
  /** IANA zone for local display. */
  ianaZone?: string | null
  /** Venue curfew in local HH:MM (24h). Null if not set. */
  curfew_local?: string | null
  /** True when this stop requires border crossing. */
  has_border_crossing?: boolean
  /** Venue label (or null if no location set). */
  venue_label?: string | null
  venue_id?: string | null
  /** Lat/lng available flag (for location completeness). */
  has_coordinates?: boolean
}

export interface ConstraintLeg {
  id: string | null
  fromStopId: string
  toStopId: string
  fromOrdinal: number
  toOrdinal: number
  transport_mode: TourRouteLeg["transport_mode"]
  duration_minutes: number | null
  distance_km: number | null
  buffer_minutes: number
  override: TourRouteLeg["override"]
}

// ---------------------------------------------------------------------------
// Policy thresholds (defaults — may be overridden via ROUTE-305 profiles)
// ---------------------------------------------------------------------------

export interface RouteConstraintPolicy {
  /** Max drive minutes per single leg before "excessive drive" fires. Default: 10h. */
  maxDriveMinutes: number
  /** Min rest minutes between consecutive drive legs. Default: 8h. */
  minRestMinutes: number
  /** Min buffer minutes between arrival and show start. Default: 60 min. */
  minArrivalBufferMinutes: number
  /** Border/ferry customs minimum buffer minutes. Default: 120 min. */
  borderFerryBufferMinutes: number
}

export const DEFAULT_ROUTE_CONSTRAINT_POLICY: RouteConstraintPolicy = {
  maxDriveMinutes: 600,        // 10 hours
  minRestMinutes: 480,         // 8 hours
  minArrivalBufferMinutes: 60, // 1 hour
  borderFerryBufferMinutes: 120, // 2 hours
}

// ---------------------------------------------------------------------------
// Individual constraint checkers
// ---------------------------------------------------------------------------

/**
 * 1. Same-day overlap: two show-type stops on the same local calendar day.
 */
export function checkSameDayOverlap(
  stopA: ConstraintStop,
  stopB: ConstraintStop,
): RouteConstraintViolation | null {
  const isShow = (s: ConstraintStop) =>
    !s.stop_type || s.stop_type === "show" || s.stop_type === "festival"

  if (!isShow(stopA) || !isShow(stopB)) return null
  if (!stopA.start_utc || !stopB.start_utc) return null

  const zoneA = stopA.ianaZone || "UTC"
  const zoneB = stopB.ianaZone || "UTC"

  const same = isSameLocalDay({ utcA: stopA.start_utc, zoneA, utcB: stopB.start_utc, zoneB })
  if (!same) return null

  return {
    code: "same_day_overlap",
    severity: "error",
    legId: null,
    fromStopId: stopA.id,
    toStopId: stopB.id,
    message: `"${stopA.name}" and "${stopB.name}" are both scheduled on the same local day.`,
    evidence: {
      stopAId: stopA.id,
      stopAStart: stopA.start_utc,
      stopAZone: zoneA,
      stopBId: stopB.id,
      stopBStart: stopB.start_utc,
      stopBZone: zoneB,
    },
    remediationHint: "Reschedule one stop to a different date or convert one to a non-show type.",
  }
}

/**
 * 2. Insufficient travel: leg travel + buffer time > gap between stop end and next stop start.
 */
export function checkInsufficientTravel(
  fromStop: ConstraintStop,
  toStop: ConstraintStop,
  leg: ConstraintLeg,
): RouteConstraintViolation | null {
  if (!fromStop.end_utc || !toStop.start_utc) return null
  const effective = resolveEffectiveLegValues(leg as unknown as TourRouteLeg)
  const travelMinutes = effective.duration_minutes
  if (travelMinutes == null) return null

  const gapMinutes = computeTravelMinutes({ departureUtc: fromStop.end_utc, arrivalUtc: toStop.start_utc })
  if (gapMinutes == null) return null

  const totalRequired = travelMinutes + leg.buffer_minutes
  if (gapMinutes >= totalRequired) return null

  return {
    code: "insufficient_travel",
    severity: "error",
    legId: leg.id,
    fromStopId: fromStop.id,
    toStopId: toStop.id,
    message:
      `Insufficient time between "${fromStop.name}" end and "${toStop.name}" start. ` +
      `Need ${totalRequired} min (${travelMinutes} travel + ${leg.buffer_minutes} buffer), ` +
      `have ${gapMinutes} min.`,
    evidence: { gapMinutes, travelMinutes, bufferMinutes: leg.buffer_minutes, totalRequired },
    remediationHint: "Adjust show times, reduce travel distance, or add a travel day between stops.",
  }
}

/**
 * 3. Insufficient rest: less than policy minimum rest between back-to-back drive legs.
 *    Checks the gap between fromStop.start and toStop.end of a non-drive stop.
 */
export function checkInsufficientRest(
  prevLeg: ConstraintLeg,
  restStop: ConstraintStop,
  nextLeg: ConstraintLeg,
  policy = DEFAULT_ROUTE_CONSTRAINT_POLICY,
): RouteConstraintViolation | null {
  if (prevLeg.transport_mode !== "drive" || nextLeg.transport_mode !== "drive") return null
  if (!restStop.start_utc || !restStop.end_utc) return null

  const restMinutes = computeTravelMinutes({ departureUtc: restStop.start_utc, arrivalUtc: restStop.end_utc })
  if (restMinutes == null || restMinutes >= policy.minRestMinutes) return null

  return {
    code: "insufficient_rest",
    severity: "warning",
    legId: nextLeg.id,
    fromStopId: prevLeg.fromStopId,
    toStopId: nextLeg.toStopId,
    message:
      `Insufficient rest at "${restStop.name}" between two drive legs. ` +
      `Rest window is ${restMinutes} min; policy requires ${policy.minRestMinutes} min.`,
    evidence: { restMinutes, requiredMinutes: policy.minRestMinutes, restStopId: restStop.id },
    remediationHint: "Extend the rest stop duration or insert a dedicated rest day.",
  }
}

/**
 * 4. Excessive drive: single leg drive duration exceeds policy maximum.
 */
export function checkExcessiveDrive(
  fromStop: ConstraintStop,
  toStop: ConstraintStop,
  leg: ConstraintLeg,
  policy = DEFAULT_ROUTE_CONSTRAINT_POLICY,
): RouteConstraintViolation | null {
  if (leg.transport_mode !== "drive") return null
  const effective = resolveEffectiveLegValues(leg as unknown as TourRouteLeg)
  const travelMinutes = effective.duration_minutes
  if (travelMinutes == null || travelMinutes <= policy.maxDriveMinutes) return null

  return {
    code: "excessive_drive",
    severity: "warning",
    legId: leg.id,
    fromStopId: fromStop.id,
    toStopId: toStop.id,
    message:
      `Drive from "${fromStop.name}" to "${toStop.name}" is ${travelMinutes} min ` +
      `(${(travelMinutes / 60).toFixed(1)} h), exceeding the policy maximum of ` +
      `${policy.maxDriveMinutes} min (${(policy.maxDriveMinutes / 60).toFixed(1)} h).`,
    evidence: { travelMinutes, maxDriveMinutes: policy.maxDriveMinutes, distance_km: effective.distance_km },
    remediationHint: "Consider flying, splitting into overnight legs, or inserting a rest day.",
  }
}

/**
 * 5. Curfew conflict: departure or arrival falls after the destination stop's curfew.
 *    Curfew is expressed as local HH:MM; arrival is derived from departure + travel time.
 */
export function checkCurfewConflict(
  fromStop: ConstraintStop,
  toStop: ConstraintStop,
  leg: ConstraintLeg,
): RouteConstraintViolation | null {
  if (!toStop.curfew_local || !fromStop.end_utc) return null
  const effective = resolveEffectiveLegValues(leg as unknown as TourRouteLeg)
  const travelMinutes = effective.duration_minutes
  if (travelMinutes == null) return null

  // Estimate arrival UTC
  const departureMs = Date.parse(fromStop.end_utc)
  if (Number.isNaN(departureMs)) return null
  const arrivalMs = departureMs + (travelMinutes + leg.buffer_minutes) * 60_000

  // Convert arrival to local time in toStop's zone
  const zone = toStop.ianaZone || "UTC"
  const arrivalDate = new Date(arrivalMs)
  let arrivalLocal: string
  try {
    const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: zone, hour: "2-digit", minute: "2-digit", hour12: false })
    arrivalLocal = fmt.format(arrivalDate).slice(0, 5)
  } catch {
    return null
  }

  // Compare HH:MM strings lexicographically (valid for 00:00–23:59)
  if (arrivalLocal <= toStop.curfew_local) return null

  return {
    code: "curfew_conflict",
    severity: "error",
    legId: leg.id,
    fromStopId: fromStop.id,
    toStopId: toStop.id,
    message:
      `Estimated arrival at "${toStop.name}" is ${arrivalLocal} local, ` +
      `after the venue curfew of ${toStop.curfew_local}.`,
    evidence: { estimatedArrivalLocal: arrivalLocal, curfew: toStop.curfew_local, zone },
    remediationHint: "Depart earlier, choose a faster transport mode, or negotiate venue curfew extension.",
  }
}

/**
 * 6. Border/ferry risk: leg uses ferry transport or involves a border crossing
 *    without adequate customs buffer in the gap.
 */
export function checkBorderFerryRisk(
  fromStop: ConstraintStop,
  toStop: ConstraintStop,
  leg: ConstraintLeg,
  policy = DEFAULT_ROUTE_CONSTRAINT_POLICY,
): RouteConstraintViolation | null {
  const isFerry = leg.transport_mode === "ferry"
  const hasBorderCrossing = fromStop.has_border_crossing || toStop.has_border_crossing

  if (!isFerry && !hasBorderCrossing) return null

  // Check whether the gap (beyond travel) provides the customs buffer
  if (!fromStop.end_utc || !toStop.start_utc) {
    // Can't compute gap — flag as warning for manual review
    return {
      code: "border_ferry_risk",
      severity: "warning",
      legId: leg.id,
      fromStopId: fromStop.id,
      toStopId: toStop.id,
      message:
        `Leg from "${fromStop.name}" to "${toStop.name}" involves a ` +
        `${isFerry ? "ferry crossing" : "border crossing"} but stop times are not set — ` +
        `cannot verify customs buffer.`,
      evidence: { isFerry, hasBorderCrossing, mode: leg.transport_mode },
      remediationHint: "Set confirmed departure/arrival times and verify customs/immigration buffer.",
    }
  }

  const effective = resolveEffectiveLegValues(leg as unknown as TourRouteLeg)
  const travelMinutes = effective.duration_minutes ?? 0
  const gapMinutes = computeTravelMinutes({ departureUtc: fromStop.end_utc, arrivalUtc: toStop.start_utc }) ?? 0
  const surplusMinutes = gapMinutes - travelMinutes - leg.buffer_minutes

  if (surplusMinutes >= policy.borderFerryBufferMinutes) return null

  return {
    code: "border_ferry_risk",
    severity: "warning",
    legId: leg.id,
    fromStopId: fromStop.id,
    toStopId: toStop.id,
    message:
      `Leg from "${fromStop.name}" to "${toStop.name}" involves a ` +
      `${isFerry ? "ferry" : "border"} crossing with only ${surplusMinutes} min surplus ` +
      `beyond travel time. Recommend ${policy.borderFerryBufferMinutes} min customs buffer.`,
    evidence: { surplusMinutes, required: policy.borderFerryBufferMinutes, isFerry, hasBorderCrossing },
    remediationHint: "Increase departure buffer or schedule an early ferry/crossing slot.",
  }
}

/**
 * 7. Missing location: stop has no venue or location data — route cannot be calculated.
 */
export function checkMissingLocation(stop: ConstraintStop): RouteConstraintViolation | null {
  const hasLocation = Boolean(stop.venue_id || stop.venue_label?.trim() || stop.has_coordinates)
  if (hasLocation) return null

  return {
    code: "missing_location",
    severity: "warning",
    legId: null,
    fromStopId: stop.id,
    toStopId: null,
    message: `Stop "${stop.name}" has no venue or location data — route legs cannot be calculated.`,
    evidence: { stopId: stop.id, stopType: stop.stop_type },
    remediationHint: "Attach a venue or enter location coordinates for this stop.",
  }
}

/**
 * 8. Impossible arrival: total travel time from previous stop end means arriving
 *    after the show start at the destination stop.
 */
export function checkImpossibleArrival(
  fromStop: ConstraintStop,
  toStop: ConstraintStop,
  leg: ConstraintLeg,
  policy = DEFAULT_ROUTE_CONSTRAINT_POLICY,
): RouteConstraintViolation | null {
  if (!fromStop.end_utc || !toStop.start_utc) return null
  const effective = resolveEffectiveLegValues(leg as unknown as TourRouteLeg)
  const travelMinutes = effective.duration_minutes
  if (travelMinutes == null) return null

  const departureMs = Date.parse(fromStop.end_utc)
  const showStartMs = Date.parse(toStop.start_utc)
  if (Number.isNaN(departureMs) || Number.isNaN(showStartMs)) return null

  const totalTravelMs = (travelMinutes + leg.buffer_minutes + policy.minArrivalBufferMinutes) * 60_000
  const requiredDepartureMs = showStartMs - totalTravelMs

  if (departureMs <= requiredDepartureMs) return null

  const lateMins = Math.round((departureMs - requiredDepartureMs) / 60_000)
  return {
    code: "impossible_arrival",
    severity: "error",
    legId: leg.id,
    fromStopId: fromStop.id,
    toStopId: toStop.id,
    message:
      `Cannot arrive at "${toStop.name}" in time: departure from "${fromStop.name}" is ` +
      `${lateMins} min too late for the show start (including ${travelMinutes} min travel, ` +
      `${leg.buffer_minutes} min buffer, and ${policy.minArrivalBufferMinutes} min arrival window).`,
    evidence: { lateMins, travelMinutes, bufferMinutes: leg.buffer_minutes, minArrivalBuffer: policy.minArrivalBufferMinutes },
    remediationHint: "End the prior show earlier, choose a faster transport mode, or postpone the next stop.",
  }
}

// ---------------------------------------------------------------------------
// Consolidated engine
// ---------------------------------------------------------------------------

export interface RouteConstraintEngineInput {
  stops: ConstraintStop[]
  legs: ConstraintLeg[]
  policy?: Partial<RouteConstraintPolicy>
}

export interface RouteConstraintEngineResult {
  violations: RouteConstraintViolation[]
  errors: RouteConstraintViolation[]
  warnings: RouteConstraintViolation[]
  hasErrors: boolean
  hasWarnings: boolean
  checkedAt: string
}

/**
 * Run all constraint checks against the complete route and return a
 * consolidated result. Checks are ordered by severity (errors first).
 */
export function evaluateRouteConstraints(
  input: RouteConstraintEngineInput,
): RouteConstraintEngineResult {
  const policy: RouteConstraintPolicy = {
    ...DEFAULT_ROUTE_CONSTRAINT_POLICY,
    ...(input.policy ?? {}),
  }

  const violations: RouteConstraintViolation[] = []

  // Build stop lookup by id
  const stopById = new Map(input.stops.map((s) => [s.id, s]))

  // 7. Missing location — per-stop check
  for (const stop of input.stops) {
    const v = checkMissingLocation(stop)
    if (v) violations.push(v)
  }

  // 1. Same-day overlap — all consecutive show pairs
  const showStops = input.stops
    .filter((s) => !s.stop_type || s.stop_type === "show" || s.stop_type === "festival")
    .sort((a, b) => a.ordinal - b.ordinal)

  for (let i = 0; i < showStops.length - 1; i++) {
    for (let j = i + 1; j < showStops.length; j++) {
      const v = checkSameDayOverlap(showStops[i], showStops[j])
      if (v) violations.push(v)
    }
  }

  // Per-leg checks (2, 4, 5, 6, 8)
  for (const leg of input.legs) {
    const from = stopById.get(leg.fromStopId)
    const to = stopById.get(leg.toStopId)
    if (!from || !to) continue

    const v2 = checkInsufficientTravel(from, to, leg)
    if (v2) violations.push(v2)

    const v4 = checkExcessiveDrive(from, to, leg, policy)
    if (v4) violations.push(v4)

    const v5 = checkCurfewConflict(from, to, leg)
    if (v5) violations.push(v5)

    const v6 = checkBorderFerryRisk(from, to, leg, policy)
    if (v6) violations.push(v6)

    const v8 = checkImpossibleArrival(from, to, leg, policy)
    if (v8) violations.push(v8)
  }

  // 3. Insufficient rest — consecutive drive-leg pairs with a stop between them
  const legsByFromStop = new Map(input.legs.map((l) => [l.fromStopId, l]))
  for (const leg of input.legs) {
    const restStop = stopById.get(leg.toStopId)
    if (!restStop) continue
    const nextLeg = legsByFromStop.get(leg.toStopId)
    if (!nextLeg) continue
    const v3 = checkInsufficientRest(leg, restStop, nextLeg, policy)
    if (v3) violations.push(v3)
  }

  const errors = violations.filter((v) => v.severity === "error")
  const warnings = violations.filter((v) => v.severity === "warning")

  return {
    violations,
    errors,
    warnings,
    hasErrors: errors.length > 0,
    hasWarnings: warnings.length > 0,
    checkedAt: new Date().toISOString(),
  }
}
