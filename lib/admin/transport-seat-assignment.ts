/**
 * TRANS-303 — Seat/berth assignment (pure).
 *
 * Manages passenger seat and sleeping berth assignments for vehicle movements.
 * Features:
 *  - Capacity validation: overbooking is blocked or explicitly overridden
 *  - Accessibility: wheelchair space requirements must be met
 *  - Overnight continuity: passengers assigned to overnight legs must have
 *    a berth if the leg crosses midnight (if berths are available)
 *  - Visual/list assignment: produces a seat map for UI rendering
 *
 * Pure: no I/O, no `server-only`.
 */

import type { VehicleCapacity } from "@/lib/admin/transport-vehicle"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SeatAssignmentStatus = "assigned" | "unconfirmed" | "cancelled"

export interface SeatAssignment {
  assignment_id: string
  movement_id: string
  person_id: string
  person_name: string
  /** Seat/berth label (e.g. "14A", "Berth 3"). Null = unassigned position. */
  seat_label: string | null
  is_berth: boolean
  /** True if this seat is a wheelchair-accessible space. */
  is_wheelchair_space: boolean
  status: SeatAssignmentStatus
  created_by: string
  created_at: string
}

// ---------------------------------------------------------------------------
// Assignment conflicts
// ---------------------------------------------------------------------------

export type SeatConflictType =
  | "capacity_exceeded"         // total seats exceeded
  | "berth_required"            // overnight leg but no berth available
  | "wheelchair_space_required" // accessibility need not met
  | "duplicate_assignment"      // person already assigned to this movement
  | "seat_taken"                // specific seat label already assigned

export interface SeatConflict {
  conflict_type: SeatConflictType
  person_id: string
  person_name: string
  detail: string
  overridable: boolean
}

// ---------------------------------------------------------------------------
// Preview and execution
// ---------------------------------------------------------------------------

export interface SeatAssignmentInput {
  movement_id: string
  capacity: VehicleCapacity
  existing_assignments: SeatAssignment[]
  candidates: Array<{
    person_id: string
    person_name: string
    needs_wheelchair_space: boolean
    needs_berth: boolean
    preferred_seat_label?: string | null
  }>
  /** Whether the movement crosses midnight (requires berths). */
  is_overnight: boolean
  override_ids?: Set<string>
  actor: string
  at: string
}

export interface SeatAssignmentPreview {
  movement_id: string
  candidates: Array<{
    person_id: string
    person_name: string
    conflicts: SeatConflict[]
    can_assign: boolean
    assigned_seat_label: string | null
  }>
  can_proceed: boolean
  blocked_count: number
}

export interface SeatAssignmentResult {
  created: SeatAssignment[]
  skipped: Array<{ person_id: string; conflicts: SeatConflict[] }>
  overridden: SeatAssignment[]
}

// ---------------------------------------------------------------------------
// Seat map (for UI visual representation)
// ---------------------------------------------------------------------------

export interface SeatMapPosition {
  seat_label: string
  is_berth: boolean
  is_wheelchair_space: boolean
  assignment: SeatAssignment | null
}

// ---------------------------------------------------------------------------
// Preview engine
// ---------------------------------------------------------------------------

export function previewSeatAssignments(input: SeatAssignmentInput): SeatAssignmentPreview {
  const { candidates, existing_assignments, capacity, movement_id, is_overnight } = input

  const existingPersonIds = new Set(existing_assignments.map((a) => a.person_id))
  const existingSeats = new Set(existing_assignments.filter((a) => a.seat_label).map((a) => a.seat_label!))
  const usedWheelchairSpaces = existing_assignments.filter((a) => a.is_wheelchair_space).length

  let currentPassengerCount = existing_assignments.filter((a) => !a.is_berth && a.status !== "cancelled").length
  let currentBerthCount = existing_assignments.filter((a) => a.is_berth && a.status !== "cancelled").length
  let currentWheelchairUsed = usedWheelchairSpaces

  const result = candidates.map((cand) => {
    const conflicts: SeatConflict[] = []

    // Duplicate check
    if (existingPersonIds.has(cand.person_id)) {
      conflicts.push({
        conflict_type: "duplicate_assignment",
        person_id: cand.person_id,
        person_name: cand.person_name,
        detail: `${cand.person_name} is already assigned to this movement.`,
        overridable: false,
      })
    }

    // Capacity check
    if (!cand.needs_berth && currentPassengerCount >= capacity.passenger_seats) {
      conflicts.push({
        conflict_type: "capacity_exceeded",
        person_id: cand.person_id,
        person_name: cand.person_name,
        detail: `Passenger capacity (${capacity.passenger_seats}) would be exceeded.`,
        overridable: true,
      })
    }

    // Berth requirement for overnight
    if (is_overnight && cand.needs_berth) {
      if (currentBerthCount >= capacity.sleeping_berths) {
        conflicts.push({
          conflict_type: "berth_required",
          person_id: cand.person_id,
          person_name: cand.person_name,
          detail: `No sleeping berths available (${capacity.sleeping_berths} total).`,
          overridable: false,
        })
      }
    }

    // Wheelchair space
    if (cand.needs_wheelchair_space) {
      if (!capacity.is_accessible || currentWheelchairUsed >= capacity.wheelchair_spaces) {
        conflicts.push({
          conflict_type: "wheelchair_space_required",
          person_id: cand.person_id,
          person_name: cand.person_name,
          detail: `No wheelchair-accessible space available.`,
          overridable: false,
        })
      }
    }

    // Seat taken
    if (cand.preferred_seat_label && existingSeats.has(cand.preferred_seat_label)) {
      conflicts.push({
        conflict_type: "seat_taken",
        person_id: cand.person_id,
        person_name: cand.person_name,
        detail: `Seat ${cand.preferred_seat_label} is already taken.`,
        overridable: false,
      })
    }

    const hasBlocking = conflicts.some((c) => !c.overridable)
    const can_assign = !hasBlocking

    // Optimistically track usage for subsequent candidates
    if (can_assign) {
      if (cand.needs_berth) currentBerthCount++
      else currentPassengerCount++
      if (cand.needs_wheelchair_space) currentWheelchairUsed++
      if (cand.preferred_seat_label) existingSeats.add(cand.preferred_seat_label)
    }

    return {
      person_id: cand.person_id,
      person_name: cand.person_name,
      conflicts,
      can_assign,
      assigned_seat_label: cand.preferred_seat_label ?? null,
    }
  })

  const blocked_count = result.filter((r) => !r.can_assign).length

  return {
    movement_id,
    candidates: result,
    can_proceed: blocked_count === 0,
    blocked_count,
  }
}

// ---------------------------------------------------------------------------
// Execute
// ---------------------------------------------------------------------------

export function executeSeatAssignments(input: SeatAssignmentInput): SeatAssignmentResult {
  const preview = previewSeatAssignments(input)
  const overrideIds = input.override_ids ?? new Set<string>()
  const candidateMap = new Map(input.candidates.map((c) => [c.person_id, c]))

  const created: SeatAssignment[] = []
  const skipped: SeatAssignmentResult["skipped"] = []
  const overridden: SeatAssignment[] = []

  for (const item of preview.candidates) {
    const cand = candidateMap.get(item.person_id)
    if (!cand) continue

    const hasBlocking = item.conflicts.some((c) => !c.overridable)
    if (hasBlocking) {
      skipped.push({ person_id: item.person_id, conflicts: item.conflicts })
      continue
    }

    const hasOverridable = item.conflicts.some((c) => c.overridable)
    const forceOverride = hasOverridable && overrideIds.has(item.person_id)

    if (hasOverridable && !forceOverride) {
      skipped.push({ person_id: item.person_id, conflicts: item.conflicts })
      continue
    }

    const assignment: SeatAssignment = {
      assignment_id: `seat-${input.movement_id}-${item.person_id}`,
      movement_id: input.movement_id,
      person_id: item.person_id,
      person_name: item.person_name,
      seat_label: item.assigned_seat_label,
      is_berth: cand.needs_berth,
      is_wheelchair_space: cand.needs_wheelchair_space,
      status: "assigned",
      created_by: input.actor,
      created_at: input.at,
    }

    if (forceOverride) {
      overridden.push(assignment)
    } else {
      created.push(assignment)
    }
  }

  return { created, skipped, overridden }
}
