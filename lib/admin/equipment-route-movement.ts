/**
 * EQUIP-303 — Equipment route-movement connection.
 *
 * Connects catalog items and cases (EQUIP-301/302) to route legs and stops
 * (ROUTE-301/309) with explicit location, movement, vehicle, and owner state.
 *
 * Core responsibilities:
 *  1. `EquipmentMovement`        — a single item/case travelling one leg or
 *                                   staged at one stop. Carries explicit origin,
 *                                   destination, vehicle, custody owner, and
 *                                   planned/actual times.
 *  2. `EquipmentLocationState`   — the derived "where is this asset right now"
 *                                   view across all legs.
 *  3. Gap detection               — for every manifest line, is there a movement
 *                                   covering every required leg/stop? Reports
 *                                   gaps (items with no movement) and capacity
 *                                   issues (vehicle weight/space exceeded).
 *  4. `buildEquipmentCoverageReport` — produces the full per-leg coverage view
 *                                   that managers act on before tour departure.
 *
 * All helpers are pure (no I/O).
 */

import {
  type EquipmentCaseStatus,
  type ManifestLineItem,
} from "@/lib/admin/equipment-manifest"
import {
  type EquipmentAssetStatus,
} from "@/lib/admin/equipment-catalog"
import {
  type RouteLegContext,
} from "@/lib/admin/tour-route-logistics-context"

// ============================================================================
// Equipment movement
// ============================================================================

/**
 * How the item/case travels on a leg.
 * Mirrors EquipmentMoveMode from ROUTE-309 but scoped to physical custody.
 */
export const EQUIPMENT_MOVEMENT_MODES = [
  "own_vehicle",       // Travels in an org-owned/chartered vehicle tracked in TRANS-301/302
  "cargo",             // General freight / cargo service
  "airline_baggage",   // Checked baggage on a flight
  "freight",           // Dedicated freight shipment
  "staged_in_place",   // Does not move — stays at the venue/stop across multiple dates
  "other",
] as const
export type EquipmentMovementMode = (typeof EQUIPMENT_MOVEMENT_MODES)[number]

/**
 * Lifecycle of a single equipment movement record.
 *  - `planned`     – Created on the manifest; not yet confirmed.
 *  - `confirmed`   – Carrier/vehicle confirmed; ready to dispatch.
 *  - `in_transit`  – Item is moving (loaded / en route).
 *  - `arrived`     – Item confirmed at destination stop.
 *  - `cancelled`   – Movement cancelled (item may be re-routed or left behind).
 */
export const MOVEMENT_STATUSES = [
  "planned",
  "confirmed",
  "in_transit",
  "arrived",
  "cancelled",
] as const
export type EquipmentMovementStatus = (typeof MOVEMENT_STATUSES)[number]

export const MOVEMENT_STATUS_TRANSITIONS: Record<
  EquipmentMovementStatus,
  readonly EquipmentMovementStatus[]
> = {
  planned:    ["confirmed", "cancelled"],
  confirmed:  ["in_transit", "cancelled"],
  in_transit: ["arrived", "cancelled"],
  arrived:    [],
  cancelled:  ["planned"],  // allow re-plan after cancel
}

export function canTransitionMovementStatus(
  from: EquipmentMovementStatus,
  to: EquipmentMovementStatus,
): boolean {
  if (from === to) return true
  return (MOVEMENT_STATUS_TRANSITIONS[from] as readonly EquipmentMovementStatus[]).includes(to)
}

export class MovementStatusTransitionError extends Error {
  readonly httpStatus = 422
  readonly code = "illegal_movement_status_transition"
  constructor(from: EquipmentMovementStatus, to: EquipmentMovementStatus) {
    super(`Illegal equipment movement status transition: ${from} → ${to}`)
    this.name = "MovementStatusTransitionError"
  }
}

export function assertMovementStatusTransition(
  from: EquipmentMovementStatus,
  to: EquipmentMovementStatus,
): void {
  if (!canTransitionMovementStatus(from, to))
    throw new MovementStatusTransitionError(from, to)
}

// ---------------------------------------------------------------------------
// The movement record
// ---------------------------------------------------------------------------

/** Physical location reference (e.g. stop venue, warehouse, airport). */
export interface PhysicalLocation {
  stop_id: string | null          // links to a tour stop when applicable
  location_label: string          // human-readable (e.g. "Chicago O'Hare", "Load dock B")
  location_notes: string | null
}

export interface EquipmentMovement {
  id: string
  org_id: string
  tour_id: string

  // What is moving
  /** catalog_item_id from equipment-catalog */
  catalog_item_id: string | null
  /** case_id from equipment-manifest; set when a whole case travels together */
  case_id: string | null
  /** Human label (snapshot at time of planning) */
  item_label: string

  // Leg context
  /** The route leg this movement is tied to. Null for stop-only staged items. */
  route_leg_context: RouteLegContext

  // How it moves
  mode: EquipmentMovementMode
  /** vehicle_movement_id from TRANS-302 when travelling in an org vehicle */
  vehicle_movement_id: string | null
  /** travel_segment_id from ROUTE-309 when checked baggage / cargo */
  travel_segment_id: string | null

  // Origin / destination
  origin: PhysicalLocation
  destination: PhysicalLocation

  // Timing
  /** UTC ISO planned departure from origin */
  planned_departure_utc: string | null
  /** UTC ISO actual departure (set when in_transit) */
  actual_departure_utc: string | null
  /** UTC ISO planned arrival at destination */
  planned_arrival_utc: string | null
  /** UTC ISO actual arrival (set when arrived) */
  actual_arrival_utc: string | null

  // Ownership / custody
  /** User or role responsible for this item during transit */
  custody_owner_id: string | null
  /** Display name of custody owner at time of assignment */
  custody_owner_label: string | null

  // Special handling
  handling_notes: string | null
  requires_climate_control: boolean
  is_fragile: boolean

  status: EquipmentMovementStatus
  created_at: string
  updated_at: string
}

// ============================================================================
// Equipment location state — derived "where is it now"
// ============================================================================

export type LocationStateSource = "movement_arrived" | "movement_in_transit" | "staged" | "unassigned"

export interface EquipmentLocationState {
  catalog_item_id: string | null
  case_id: string | null
  item_label: string
  /** Current location derived from latest movement */
  current_location: PhysicalLocation | null
  source: LocationStateSource
  /** The movement that establishes this location */
  movement_id: string | null
  /** Asset operational status from catalog */
  asset_status: EquipmentAssetStatus | null
}

/**
 * Derive the current location state for an item from its movement history.
 * Movements must be pre-sorted by planned_departure_utc (oldest first).
 */
export function deriveEquipmentLocationState(
  itemId: string,          // catalog_item_id or case_id
  isCase: boolean,
  itemLabel: string,
  movements: readonly EquipmentMovement[],
  assetStatus: EquipmentAssetStatus | null,
): EquipmentLocationState {
  const relevant = movements.filter((m) =>
    isCase
      ? m.case_id === itemId
      : m.catalog_item_id === itemId,
  )

  // Find latest terminal movement
  const arrived = relevant.filter((m) => m.status === "arrived")
  const inTransit = relevant.filter((m) => m.status === "in_transit")
  const staged = relevant.filter((m) => m.mode === "staged_in_place" && m.status === "confirmed")

  if (arrived.length > 0) {
    const latest = arrived[arrived.length - 1]
    return {
      catalog_item_id: isCase ? null : itemId,
      case_id: isCase ? itemId : null,
      item_label: itemLabel,
      current_location: latest.destination,
      source: "movement_arrived",
      movement_id: latest.id,
      asset_status: assetStatus,
    }
  }

  if (inTransit.length > 0) {
    const latest = inTransit[inTransit.length - 1]
    return {
      catalog_item_id: isCase ? null : itemId,
      case_id: isCase ? itemId : null,
      item_label: itemLabel,
      current_location: latest.origin,
      source: "movement_in_transit",
      movement_id: latest.id,
      asset_status: assetStatus,
    }
  }

  if (staged.length > 0) {
    const s = staged[staged.length - 1]
    return {
      catalog_item_id: isCase ? null : itemId,
      case_id: isCase ? itemId : null,
      item_label: itemLabel,
      current_location: s.destination,
      source: "staged",
      movement_id: s.id,
      asset_status: assetStatus,
    }
  }

  return {
    catalog_item_id: isCase ? null : itemId,
    case_id: isCase ? itemId : null,
    item_label: itemLabel,
    current_location: null,
    source: "unassigned",
    movement_id: null,
    asset_status: assetStatus,
  }
}

// ============================================================================
// Gap detection — items without movement coverage
// ============================================================================

export type CoverageGapCode =
  | "no_movement_for_leg"        // Required item has no movement record for this leg
  | "movement_cancelled"         // The only movement for this leg was cancelled
  | "no_custody_owner"           // Movement exists but no custody_owner assigned
  | "vehicle_capacity_exceeded"  // Total weight/count on vehicle exceeds limit

export interface EquipmentCoverageGap {
  code: CoverageGapCode
  leg_id: string | null
  stop_id: string | null
  /** manifest line item id */
  line_item_id: string
  item_label: string
  message: string
  /** Whether this gap blocks departure (blocking) or is a warning */
  severity: "blocking" | "warning"
}

/**
 * Evaluate coverage for a single manifest line across a set of required legs.
 *
 * `requiredLegIds`: the legs the item must traverse (from manifest scope).
 * `movements`: all movements for this item (pre-filtered).
 */
export function evaluateLineCoverage(
  lineItem: ManifestLineItem,
  requiredLegIds: readonly string[],
  movements: readonly EquipmentMovement[],
): EquipmentCoverageGap[] {
  const gaps: EquipmentCoverageGap[] = []

  for (const legId of requiredLegIds) {
    const legMovements = movements.filter(
      (m) =>
        m.route_leg_context.leg_id === legId &&
        m.status !== "cancelled",
    )

    // Check for total cancellation
    const allForLeg = movements.filter((m) => m.route_leg_context.leg_id === legId)
    const allCancelled =
      allForLeg.length > 0 && allForLeg.every((m) => m.status === "cancelled")

    if (allCancelled) {
      gaps.push({
        code: "movement_cancelled",
        leg_id: legId,
        stop_id: null,
        line_item_id: lineItem.id,
        item_label: lineItem.label,
        message: `All movements for '${lineItem.label}' on leg ${legId} are cancelled`,
        severity: "blocking",
      })
      continue
    }

    if (legMovements.length === 0) {
      gaps.push({
        code: "no_movement_for_leg",
        leg_id: legId,
        stop_id: null,
        line_item_id: lineItem.id,
        item_label: lineItem.label,
        message: `'${lineItem.label}' has no movement planned for leg ${legId}`,
        severity: "blocking",
      })
      continue
    }

    // Check for missing custody owner on any active movement
    for (const m of legMovements) {
      if (!m.custody_owner_id) {
        gaps.push({
          code: "no_custody_owner",
          leg_id: legId,
          stop_id: null,
          line_item_id: lineItem.id,
          item_label: lineItem.label,
          message: `Movement for '${lineItem.label}' on leg ${legId} has no custody owner`,
          severity: "warning",
        })
      }
    }
  }

  return gaps
}

// ---------------------------------------------------------------------------
// Vehicle capacity check
// ---------------------------------------------------------------------------

export interface VehicleCapacitySpec {
  vehicle_movement_id: string
  /** Maximum number of equipment items/cases the vehicle can carry */
  max_item_count: number | null
  /** Maximum total weight in kg */
  max_weight_kg: number | null
}

export interface EquipmentVehicleAssignment {
  vehicle_movement_id: string
  catalog_item_id: string | null
  case_id: string | null
  item_label: string
  /** Weight in kg (from catalog dimensions) */
  weight_kg: number | null
}

export interface VehicleCapacityResult {
  vehicle_movement_id: string
  item_count: number
  total_weight_kg: number
  over_count: boolean
  over_weight: boolean
  gaps: EquipmentCoverageGap[]
}

export function evaluateVehicleCapacity(
  spec: VehicleCapacitySpec,
  assignments: readonly EquipmentVehicleAssignment[],
): VehicleCapacityResult {
  const mine = assignments.filter((a) => a.vehicle_movement_id === spec.vehicle_movement_id)
  const item_count = mine.length
  const total_weight_kg = mine.reduce((sum, a) => sum + (a.weight_kg ?? 0), 0)

  const over_count = spec.max_item_count !== null && item_count > spec.max_item_count
  const over_weight = spec.max_weight_kg !== null && total_weight_kg > spec.max_weight_kg

  const gaps: EquipmentCoverageGap[] = []

  if (over_count) {
    gaps.push({
      code: "vehicle_capacity_exceeded",
      leg_id: null,
      stop_id: null,
      line_item_id: spec.vehicle_movement_id,
      item_label: `Vehicle ${spec.vehicle_movement_id}`,
      message: `Vehicle carries ${item_count} items but max is ${spec.max_item_count}`,
      severity: "blocking",
    })
  }
  if (over_weight) {
    gaps.push({
      code: "vehicle_capacity_exceeded",
      leg_id: null,
      stop_id: null,
      line_item_id: spec.vehicle_movement_id,
      item_label: `Vehicle ${spec.vehicle_movement_id}`,
      message: `Vehicle weight ${total_weight_kg.toFixed(1)} kg exceeds limit ${spec.max_weight_kg} kg`,
      severity: "blocking",
    })
  }

  return { vehicle_movement_id: spec.vehicle_movement_id, item_count, total_weight_kg, over_count, over_weight, gaps }
}

// ============================================================================
// Full tour equipment coverage report
// ============================================================================

export interface LegCoverageEntry {
  leg_id: string
  covered_item_count: number
  gap_count: number
  blocking_gap_count: number
  warning_gap_count: number
  gaps: EquipmentCoverageGap[]
}

export interface EquipmentCoverageReport {
  tour_id: string
  manifest_id: string
  total_line_items: number
  total_legs: number
  fully_covered_legs: number
  legs_with_gaps: number
  blocking_gap_count: number
  warning_gap_count: number
  per_leg: LegCoverageEntry[]
  unassigned_items: string[]   // item labels with no movement at all
}

/**
 * Build a full coverage report for a manifest across a set of tour legs.
 *
 * `legIds`: ordered list of route leg IDs the manifest must cover.
 * `allMovements`: every EquipmentMovement for this tour/manifest.
 */
export function buildEquipmentCoverageReport(args: {
  tourId: string
  manifestId: string
  lineItems: readonly ManifestLineItem[]
  legIds: readonly string[]
  allMovements: readonly EquipmentMovement[]
}): EquipmentCoverageReport {
  const { tourId, manifestId, lineItems, legIds, allMovements } = args

  const per_leg: LegCoverageEntry[] = []
  let total_blocking = 0
  let total_warning = 0
  const unassigned_labels = new Set<string>()

  for (const legId of legIds) {
    const legGaps: EquipmentCoverageGap[] = []

    for (const item of lineItems) {
      // Movements for this catalog item or case on this leg
      const itemMovements = allMovements.filter(
        (m) =>
          m.route_leg_context.leg_id === legId &&
          (m.catalog_item_id === item.source_id || m.case_id === item.source_id),
      )
      const gaps = evaluateLineCoverage(item, [legId], itemMovements)
      legGaps.push(...gaps)
    }

    const blocking = legGaps.filter((g) => g.severity === "blocking").length
    const warning = legGaps.filter((g) => g.severity === "warning").length
    total_blocking += blocking
    total_warning += warning

    per_leg.push({
      leg_id: legId,
      covered_item_count: lineItems.length - legGaps.filter((g) => g.code === "no_movement_for_leg").length,
      gap_count: legGaps.length,
      blocking_gap_count: blocking,
      warning_gap_count: warning,
      gaps: legGaps,
    })
  }

  // Find items with no movement at all on any leg
  for (const item of lineItems) {
    const hasAny = allMovements.some(
      (m) => m.catalog_item_id === item.source_id || m.case_id === item.source_id,
    )
    if (!hasAny) unassigned_labels.add(item.label)
  }

  const legs_with_gaps = per_leg.filter((l) => l.gap_count > 0).length

  return {
    tour_id: tourId,
    manifest_id: manifestId,
    total_line_items: lineItems.length,
    total_legs: legIds.length,
    fully_covered_legs: legIds.length - legs_with_gaps,
    legs_with_gaps,
    blocking_gap_count: total_blocking,
    warning_gap_count: total_warning,
    per_leg,
    unassigned_items: [...unassigned_labels],
  }
}
