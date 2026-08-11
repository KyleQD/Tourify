/**
 * ROUTE-309 — Route-to-logistics context reference model (pure).
 *
 * Every logistics record that is tied to travel must carry a canonical
 * stop/leg context reference. This module defines:
 *
 *  - `RouteLegContext`        — the canonical reference attached to each
 *                               logistics record (stop/leg ids + metadata).
 *  - `TravelSegmentRef`       — travel booking ↔ route leg link
 *  - `VehicleMovementRef`     — vehicle assignment ↔ route leg link
 *  - `RoomNightRef`           — hotel room night ↔ stop link
 *  - `EquipmentMoveRef`       — equipment movement ↔ leg link
 *  - `PassengerAssignmentRef` — per-person passenger list ↔ leg link
 *
 * Validation helpers confirm each ref is complete and consistent (no orphan
 * refs, no mismatched stop/leg pairs).
 *
 * These types are consumed by logistics APIs, logistics service layers, and
 * any module that reads/writes travel bookings, crew assignments, or equipment.
 *
 * Pure: no I/O, no `server-only`.
 */

// ---------------------------------------------------------------------------
// Canonical route-leg context
// ---------------------------------------------------------------------------

/**
 * The canonical context reference that every logistics record must carry
 * when it relates to a route leg or stop.
 *
 * Rules:
 *  - `tour_id` and `tour_version_id` identify the planning version.
 *  - At least one of `leg_id` or `stop_id` must be non-null.
 *  - `from_stop_id` / `to_stop_id` are required when `leg_id` is set.
 */
export interface RouteLegContext {
  tour_id: string
  tour_version_id: string
  /** The route leg this record is tied to. Null for stop-only records. */
  leg_id: string | null
  /** Origin stop of the leg (required when leg_id is set). */
  from_stop_id: string | null
  /** Destination stop of the leg (required when leg_id is set). */
  to_stop_id: string | null
  /**
   * The primary stop this record is tied to (departure or arrival).
   * Required when leg_id is null (stop-only context like a room night).
   */
  stop_id: string | null
  /** Transport mode of the leg (null for stop-only records). */
  transport_mode?: string | null
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export interface RouteContextValidationResult {
  valid: boolean
  errors: string[]
}

/**
 * Validate that a RouteLegContext is complete and internally consistent.
 */
export function validateRouteLegContext(ctx: RouteLegContext): RouteContextValidationResult {
  const errors: string[] = []

  if (!ctx.tour_id?.trim()) errors.push("tour_id is required.")
  if (!ctx.tour_version_id?.trim()) errors.push("tour_version_id is required.")

  const hasLeg = Boolean(ctx.leg_id)
  const hasStop = Boolean(ctx.stop_id)

  if (!hasLeg && !hasStop) {
    errors.push("At least one of leg_id or stop_id must be set.")
  }

  if (hasLeg) {
    if (!ctx.from_stop_id) errors.push("from_stop_id is required when leg_id is set.")
    if (!ctx.to_stop_id) errors.push("to_stop_id is required when leg_id is set.")
  }

  return { valid: errors.length === 0, errors }
}

// ---------------------------------------------------------------------------
// Travel segment (booking ↔ leg)
// ---------------------------------------------------------------------------

export type TravelMode = "drive" | "fly" | "rail" | "ferry" | "bus" | "walk" | "other"

/**
 * A travel segment links a transport booking to a canonical route leg.
 * Examples: a flight booking, a ground transport charter, a ferry reservation.
 */
export interface TravelSegmentRef {
  /** Stable id of this travel segment record. */
  segment_id: string
  /** Canonical route-leg context. */
  context: RouteLegContext
  /** External booking reference (PNR, booking number, etc.). */
  booking_reference?: string | null
  /** Name of the carrier/provider. */
  carrier?: string | null
  /** Actual departure UTC ISO. Null until confirmed. */
  departure_utc?: string | null
  /** Actual arrival UTC ISO. Null until confirmed. */
  arrival_utc?: string | null
  mode: TravelMode
  /** Number of passengers on this segment. */
  passenger_count: number
}

// ---------------------------------------------------------------------------
// Vehicle movement (vehicle assignment ↔ leg)
// ---------------------------------------------------------------------------

export type VehicleType = "bus" | "van" | "truck" | "car" | "sprinter" | "aircraft" | "other"

/**
 * A vehicle movement record links an assigned vehicle/driver to a route leg.
 * May span multiple passengers or equipment items.
 */
export interface VehicleMovementRef {
  movement_id: string
  context: RouteLegContext
  vehicle_type: VehicleType
  /** Vendor / fleet company name. */
  vendor?: string | null
  /** Internal asset id when the vehicle is org-owned. */
  vehicle_asset_id?: string | null
  /** Driver name or personnel id. */
  driver_ref?: string | null
  /** UTC ISO — planned departure. */
  planned_departure_utc?: string | null
  /** UTC ISO — planned arrival. */
  planned_arrival_utc?: string | null
  /** Passenger ids on this movement. */
  passenger_ids: string[]
  /** Equipment item ids loaded on this movement. */
  equipment_ids: string[]
}

// ---------------------------------------------------------------------------
// Room night (hotel stay ↔ stop)
// ---------------------------------------------------------------------------

/**
 * A room night links a hotel reservation line to a tour stop.
 * A multi-night stay for one stop yields multiple RoomNightRef records
 * (one per calendar date) or one record with night_count > 1.
 */
export interface RoomNightRef {
  room_night_id: string
  /** Context — stop_id is required; leg_id is null. */
  context: RouteLegContext
  /** Property / hotel name. */
  property_name: string
  /** Confirmation number from the property. */
  confirmation_number?: string | null
  /** YYYY-MM-DD check-in. */
  check_in_date: string
  /** YYYY-MM-DD check-out. */
  check_out_date: string
  /** Number of consecutive nights. */
  night_count: number
  /** Personnel id occupying the room. */
  occupant_id: string
  /** Room type label. */
  room_type?: string | null
}

// ---------------------------------------------------------------------------
// Equipment move (equipment item ↔ leg)
// ---------------------------------------------------------------------------

export type EquipmentMoveMode = "own_vehicle" | "cargo" | "airline_baggage" | "freight" | "other"

/**
 * An equipment move links a piece of equipment (instrument, case, production
 * asset) to a route leg, specifying how it travels.
 */
export interface EquipmentMoveRef {
  move_id: string
  context: RouteLegContext
  /** Internal equipment / asset item id. */
  equipment_item_id: string
  /** Human label for the item (e.g. "Nord Stage 3 + case"). */
  item_label: string
  mode: EquipmentMoveMode
  /** Vehicle movement id if the equipment rides a tracked vehicle. */
  vehicle_movement_id?: string | null
  /** Travel segment id if the equipment is checked baggage / cargo. */
  travel_segment_id?: string | null
  /** UTC ISO — when the item must depart. */
  required_departure_utc?: string | null
  /** Any special handling notes. */
  handling_notes?: string | null
}

// ---------------------------------------------------------------------------
// Passenger assignment (person ↔ leg)
// ---------------------------------------------------------------------------

/**
 * A passenger assignment ties a specific crew/personnel record to a route leg
 * and optionally to a vehicle movement or travel segment.
 */
export interface PassengerAssignmentRef {
  assignment_id: string
  context: RouteLegContext
  /** Personnel / workforce member id. */
  person_id: string
  /** Display name at time of assignment. */
  person_name: string
  /** Vehicle movement this person rides. Null when using separate transport. */
  vehicle_movement_id?: string | null
  /** Travel segment (e.g. flight) for this person. */
  travel_segment_id?: string | null
  /** Whether a room night is booked for this person at the destination stop. */
  has_room_night: boolean
  /** Notes (seat preference, dietary, etc.). */
  notes?: string | null
}

// ---------------------------------------------------------------------------
// Logistics bundle — aggregate for a single leg
// ---------------------------------------------------------------------------

/**
 * All logistics records attached to a single route leg or stop, keyed by
 * stop/leg context. Used by the logistics API to return a complete picture
 * for one leg of the route.
 */
export interface RouteLegLogisticsBundle {
  context: RouteLegContext
  travel_segments: TravelSegmentRef[]
  vehicle_movements: VehicleMovementRef[]
  room_nights: RoomNightRef[]
  equipment_moves: EquipmentMoveRef[]
  passenger_assignments: PassengerAssignmentRef[]
}

// ---------------------------------------------------------------------------
// Builder helpers
// ---------------------------------------------------------------------------

/**
 * Build a minimal RouteLegContext for a leg-based record.
 */
export function makeLegContext(args: {
  tourId: string
  tourVersionId: string
  legId: string
  fromStopId: string
  toStopId: string
  transportMode?: string | null
}): RouteLegContext {
  return {
    tour_id: args.tourId,
    tour_version_id: args.tourVersionId,
    leg_id: args.legId,
    from_stop_id: args.fromStopId,
    to_stop_id: args.toStopId,
    stop_id: null,
    transport_mode: args.transportMode ?? null,
  }
}

/**
 * Build a minimal RouteLegContext for a stop-based record (e.g. room night).
 */
export function makeStopContext(args: {
  tourId: string
  tourVersionId: string
  stopId: string
}): RouteLegContext {
  return {
    tour_id: args.tourId,
    tour_version_id: args.tourVersionId,
    leg_id: null,
    from_stop_id: null,
    to_stop_id: null,
    stop_id: args.stopId,
    transport_mode: null,
  }
}

// ---------------------------------------------------------------------------
// Consistency check helpers
// ---------------------------------------------------------------------------

/**
 * Check that a set of logistics records are all internally consistent:
 *  - Every record has a valid RouteLegContext.
 *  - Vehicle movement passenger_ids are referenced by PassengerAssignmentRefs.
 *  - Equipment move vehicle_movement_id references exist in the bundle.
 */
export interface BundleConsistencyResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

export function checkBundleConsistency(
  bundle: RouteLegLogisticsBundle,
): BundleConsistencyResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Validate context
  const ctxResult = validateRouteLegContext(bundle.context)
  if (!ctxResult.valid) errors.push(...ctxResult.errors.map((e) => `context: ${e}`))

  // Build lookup sets
  const movementIds = new Set(bundle.vehicle_movements.map((m) => m.movement_id))
  const segmentIds = new Set(bundle.travel_segments.map((s) => s.segment_id))
  const assignedPersonIds = new Set(bundle.passenger_assignments.map((a) => a.person_id))

  // Check vehicle movements have valid contexts
  for (const vm of bundle.vehicle_movements) {
    const r = validateRouteLegContext(vm.context)
    if (!r.valid) errors.push(`vehicle_movement ${vm.movement_id}: ${r.errors.join("; ")}`)
    // Warn if movement references passengers not in assignments
    for (const pid of vm.passenger_ids) {
      if (!assignedPersonIds.has(pid)) {
        warnings.push(
          `vehicle_movement ${vm.movement_id}: passenger ${pid} has no passenger_assignment.`,
        )
      }
    }
  }

  // Check equipment moves reference real movement/segment ids
  for (const em of bundle.equipment_moves) {
    const r = validateRouteLegContext(em.context)
    if (!r.valid) errors.push(`equipment_move ${em.move_id}: ${r.errors.join("; ")}`)
    if (em.vehicle_movement_id && !movementIds.has(em.vehicle_movement_id)) {
      errors.push(
        `equipment_move ${em.move_id}: vehicle_movement_id "${em.vehicle_movement_id}" not found in bundle.`,
      )
    }
    if (em.travel_segment_id && !segmentIds.has(em.travel_segment_id)) {
      errors.push(
        `equipment_move ${em.move_id}: travel_segment_id "${em.travel_segment_id}" not found in bundle.`,
      )
    }
  }

  // Check passenger assignments reference real movement/segment ids
  for (const pa of bundle.passenger_assignments) {
    const r = validateRouteLegContext(pa.context)
    if (!r.valid) errors.push(`passenger_assignment ${pa.assignment_id}: ${r.errors.join("; ")}`)
    if (pa.vehicle_movement_id && !movementIds.has(pa.vehicle_movement_id)) {
      errors.push(
        `passenger_assignment ${pa.assignment_id}: vehicle_movement_id "${pa.vehicle_movement_id}" not found in bundle.`,
      )
    }
    if (pa.travel_segment_id && !segmentIds.has(pa.travel_segment_id)) {
      errors.push(
        `passenger_assignment ${pa.assignment_id}: travel_segment_id "${pa.travel_segment_id}" not found in bundle.`,
      )
    }
  }

  return { valid: errors.length === 0, errors, warnings }
}
