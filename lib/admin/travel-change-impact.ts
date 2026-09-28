/**
 * TRAVEL-305 — Travel segment change impact engine (pure).
 *
 * Before committing a change to a travel segment (time, status, route),
 * the engine identifies all downstream records that would be affected:
 *
 *  - Affected passengers:  assignments on this segment
 *  - Connection risk:      other segments adjacent in the timeline that
 *                          depend on this segment's arrival time
 *  - Room nights:          lodging nights at the destination stop that
 *                          may need check-in time adjustment
 *  - Calls/shifts:         scheduled calls or crew shifts at origin/destination
 *                          whose timing conflicts with the new times
 *  - Equipment moves:      equipment items assigned to this leg that need
 *                          re-coordination
 *  - Cost impact:          change/cancellation fees or re-booking cost flag
 *  - Publications:         any shared itineraries already distributed that
 *                          contain the old segment data
 *
 * The engine returns a typed impact report. Caller decides whether to
 * proceed, cancel, or adjust the change.
 *
 * Pure: no I/O, no `server-only`.
 */

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

export interface SegmentChangeProposal {
  /** The segment being changed. */
  segment_id: string
  /** Current segment values. */
  current_departure_utc: string | null
  current_arrival_utc: string | null
  current_origin: string
  current_destination: string
  current_status: string
  /** Proposed new values (null = unchanged). */
  new_departure_utc?: string | null
  new_arrival_utc?: string | null
  new_origin?: string | null
  new_destination?: string | null
  new_status?: string | null
}

export interface AffectedPassenger {
  person_id: string
  person_name: string
  assignment_id: string
  /** Why they are affected. */
  reason: string
}

export interface ConnectionRisk {
  connecting_segment_id: string
  connecting_segment_label: string
  /** Minimum connection time in minutes. */
  min_connection_minutes: number
  /** Available connection time after the change. */
  available_connection_minutes: number
  /** True if the connection would be missed. */
  missed: boolean
}

export interface AffectedRoomNight {
  room_night_id: string
  property_name: string
  check_in_date: string
  occupant_id: string
  reason: string
}

export interface AffectedCallOrShift {
  record_id: string
  kind: "call" | "shift"
  label: string
  scheduled_utc: string
  conflict_type: "conflict" | "gap"
  reason: string
}

export interface AffectedEquipmentMove {
  move_id: string
  item_label: string
  reason: string
}

export interface CostImpact {
  has_change_fee: boolean
  estimated_change_fee?: number | null
  currency?: string | null
  rebooking_required: boolean
  note?: string | null
}

export interface AffectedPublication {
  publication_id: string
  publication_label: string
  audience_count: number
  reason: string
}

// ---------------------------------------------------------------------------
// Impact report
// ---------------------------------------------------------------------------

export interface SegmentChangeImpactReport {
  segment_id: string
  proposal: SegmentChangeProposal
  affected_passengers: AffectedPassenger[]
  connection_risks: ConnectionRisk[]
  affected_rooms: AffectedRoomNight[]
  affected_calls_and_shifts: AffectedCallOrShift[]
  affected_equipment: AffectedEquipmentMove[]
  cost_impact: CostImpact | null
  affected_publications: AffectedPublication[]
  /** Summary for decision dialog. */
  summary: {
    passenger_count: number
    missed_connection_count: number
    affected_room_count: number
    affected_call_count: number
    affected_equipment_count: number
    affected_publication_count: number
    has_cost_impact: boolean
    requires_acknowledgement: boolean
  }
}

// ---------------------------------------------------------------------------
// Input context for the engine
// ---------------------------------------------------------------------------

export interface ChangeImpactContext {
  /** Passenger assignments for this segment. */
  passenger_assignments: Array<{
    assignment_id: string
    person_id: string
    person_name: string
  }>
  /** Connecting segments that arrive into / depart from this segment. */
  connecting_segments: Array<{
    segment_id: string
    label: string
    departure_utc: string | null
    min_connection_minutes: number
  }>
  /** Room nights at the destination stop that overlap with arrival. */
  room_nights: Array<{
    room_night_id: string
    property_name: string
    check_in_date: string
    occupant_id: string
    expected_arrival_before_utc: string | null
  }>
  /** Calls and shifts at the affected stops. */
  calls_and_shifts: Array<{
    record_id: string
    kind: "call" | "shift"
    label: string
    scheduled_utc: string
    duration_minutes: number
  }>
  /** Equipment moves on this leg. */
  equipment_moves: Array<{
    move_id: string
    item_label: string
  }>
  /** Cost information for this segment. */
  cost_info?: {
    has_change_fee: boolean
    estimated_change_fee?: number | null
    currency?: string | null
    rebooking_required: boolean
    note?: string | null
  } | null
  /** Publications that contain this segment. */
  publications: Array<{
    publication_id: string
    publication_label: string
    audience_count: number
  }>
}

// ---------------------------------------------------------------------------
// Impact engine
// ---------------------------------------------------------------------------

/**
 * Compute the full impact of a segment change proposal.
 * Returns a typed report; does not modify any state.
 */
export function computeSegmentChangeImpact(
  proposal: SegmentChangeProposal,
  ctx: ChangeImpactContext,
): SegmentChangeImpactReport {
  // Determine what is actually changing
  const timeChanging =
    (proposal.new_departure_utc !== undefined && proposal.new_departure_utc !== proposal.current_departure_utc) ||
    (proposal.new_arrival_utc !== undefined && proposal.new_arrival_utc !== proposal.current_arrival_utc)

  const routeChanging =
    (proposal.new_origin !== undefined && proposal.new_origin !== proposal.current_origin) ||
    (proposal.new_destination !== undefined && proposal.new_destination !== proposal.current_destination)

  const statusChanging =
    proposal.new_status !== undefined && proposal.new_status !== proposal.current_status

  const isCancellation = proposal.new_status === "cancelled"

  // 1. Affected passengers
  const affected_passengers: AffectedPassenger[] = ctx.passenger_assignments.map((pa) => ({
    person_id: pa.person_id,
    person_name: pa.person_name,
    assignment_id: pa.assignment_id,
    reason: isCancellation
      ? "Segment is being cancelled — assignment will be voided."
      : timeChanging
        ? "Departure/arrival time is changing."
        : routeChanging
          ? "Route (origin/destination) is changing."
          : "Status is changing.",
  }))

  // 2. Connection risks (whenever arrival time is explicitly set or changes)
  const connection_risks: ConnectionRisk[] = []
  const newArrival = proposal.new_arrival_utc !== undefined
    ? proposal.new_arrival_utc
    : proposal.current_arrival_utc

  const arrivalRelevant = proposal.new_arrival_utc !== undefined || timeChanging

  if (arrivalRelevant && newArrival) {
    for (const cs of ctx.connecting_segments) {
      if (!cs.departure_utc) continue
      const available = Math.round(
        (new Date(cs.departure_utc).getTime() - new Date(newArrival).getTime()) / 60000,
      )
      const missed = available < cs.min_connection_minutes
      connection_risks.push({
        connecting_segment_id: cs.segment_id,
        connecting_segment_label: cs.label,
        min_connection_minutes: cs.min_connection_minutes,
        available_connection_minutes: available,
        missed,
      })
    }
  }

  // 3. Affected room nights (when arrival time or destination changes)
  const affected_rooms: AffectedRoomNight[] = []
  if (timeChanging || routeChanging || isCancellation) {
    for (const rn of ctx.room_nights) {
      let reason: string
      if (isCancellation) {
        reason = "Segment cancelled — hotel arrangements may need to change."
      } else if (routeChanging) {
        reason = "Destination changing — confirm room night is still at the correct property."
      } else {
        reason = "Arrival time changing — check-in window may be affected."
      }
      affected_rooms.push({
        room_night_id: rn.room_night_id,
        property_name: rn.property_name,
        check_in_date: rn.check_in_date,
        occupant_id: rn.occupant_id,
        reason,
      })
    }
  }

  // 4. Affected calls and shifts
  const affected_calls_and_shifts: AffectedCallOrShift[] = []
  const newDeparture = proposal.new_departure_utc ?? proposal.current_departure_utc

  if (timeChanging && newDeparture) {
    for (const cs of ctx.calls_and_shifts) {
      const csStart = new Date(cs.scheduled_utc).getTime()
      const csEnd = csStart + cs.duration_minutes * 60000
      const depTime = new Date(newDeparture).getTime()
      const arrTime = newArrival ? new Date(newArrival).getTime() : null

      // Conflict if the call overlaps with the new departure window
      if (depTime >= csStart && depTime < csEnd) {
        affected_calls_and_shifts.push({
          record_id: cs.record_id,
          kind: cs.kind,
          label: cs.label,
          scheduled_utc: cs.scheduled_utc,
          conflict_type: "conflict",
          reason: `Departure conflicts with scheduled ${cs.kind} "${cs.label}".`,
        })
      } else if (arrTime && arrTime >= csStart && arrTime < csEnd) {
        affected_calls_and_shifts.push({
          record_id: cs.record_id,
          kind: cs.kind,
          label: cs.label,
          scheduled_utc: cs.scheduled_utc,
          conflict_type: "conflict",
          reason: `Arrival conflicts with scheduled ${cs.kind} "${cs.label}".`,
        })
      }
    }
  }

  // 5. Affected equipment moves
  const affected_equipment: AffectedEquipmentMove[] = ctx.equipment_moves.map((em) => ({
    move_id: em.move_id,
    item_label: em.item_label,
    reason: isCancellation
      ? "Segment cancelled — equipment transport needs re-arrangement."
      : timeChanging
        ? "Segment timing changed — equipment pickup/delivery may need adjustment."
        : "Segment route changed — verify equipment is going to the correct destination.",
  }))

  // 6. Cost impact
  const cost_impact: CostImpact | null = ctx.cost_info
    ? {
        has_change_fee: ctx.cost_info.has_change_fee,
        estimated_change_fee: ctx.cost_info.estimated_change_fee ?? null,
        currency: ctx.cost_info.currency ?? null,
        rebooking_required: ctx.cost_info.rebooking_required,
        note: ctx.cost_info.note ?? null,
      }
    : null

  // 7. Affected publications
  const affected_publications: AffectedPublication[] = ctx.publications.map((pub) => ({
    publication_id: pub.publication_id,
    publication_label: pub.publication_label,
    audience_count: pub.audience_count,
    reason: "Segment data has changed — published itineraries contain outdated information.",
  }))

  const missed_connections = connection_risks.filter((c) => c.missed).length

  const summary = {
    passenger_count: affected_passengers.length,
    missed_connection_count: missed_connections,
    affected_room_count: affected_rooms.length,
    affected_call_count: affected_calls_and_shifts.length,
    affected_equipment_count: affected_equipment.length,
    affected_publication_count: affected_publications.length,
    has_cost_impact: cost_impact !== null,
    requires_acknowledgement:
      isCancellation ||
      missed_connections > 0 ||
      affected_publications.length > 0 ||
      (cost_impact?.has_change_fee ?? false),
  }

  return {
    segment_id: proposal.segment_id,
    proposal,
    affected_passengers,
    connection_risks,
    affected_rooms,
    affected_calls_and_shifts,
    affected_equipment,
    cost_impact,
    affected_publications,
    summary,
  }
}
