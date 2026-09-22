/**
 * TRANS-302 — Vehicle movement model (pure).
 *
 * A vehicle movement records one trip of a specific vehicle along a route leg
 * or as a local transfer. It carries:
 *
 *  - Route context: aligned to a canonical route leg OR a local transfer
 *  - Timing: planned and actual departure/arrival
 *  - Pickup: origin location, dispatcher, contact
 *  - Passengers/cargo: count and equipment manifest
 *  - Status: proposed → confirmed → in_progress → completed | cancelled
 *  - Costs: rate, currency, billing reference
 *
 * Pure: no I/O, no `server-only`.
 */

import type { RouteLegContext } from "@/lib/admin/tour-route-logistics-context"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type VehicleMovementStatus =
  | "proposed"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled"

export interface VehicleMovementCost {
  rate?: number | null
  currency?: string | null
  billing_reference?: string | null
  notes?: string | null
}

export interface VehicleMovementLocation {
  label: string
  address?: string | null
  coordinates?: { lat: number; lng: number } | null
}

export interface VehicleMovement {
  movement_id: string
  vehicle_id: string
  /**
   * Route leg context. leg_id is null for local transfers (e.g. airport
   * pickup that is not a canonical route leg).
   */
  context: RouteLegContext
  /** True when this is a local/off-route transfer rather than a tour leg. */
  is_local_transfer: boolean
  status: VehicleMovementStatus
  /** Origin pickup point. */
  origin: VehicleMovementLocation
  /** Destination dropoff point. */
  destination: VehicleMovementLocation
  /** Dispatcher name or personnel id. */
  dispatcher?: string | null
  /** Driver assignment id (from TRANS-304). Null until assigned. */
  driver_assignment_id?: string | null
  /** Planned departure UTC. */
  planned_departure_utc: string | null
  /** Planned arrival UTC. */
  planned_arrival_utc: string | null
  /** Actual departure UTC (recorded after movement completes). */
  actual_departure_utc?: string | null
  /** Actual arrival UTC. */
  actual_arrival_utc?: string | null
  /** Passenger ids on this movement. */
  passenger_ids: string[]
  /** Equipment/cargo item ids. */
  cargo_item_ids: string[]
  cost?: VehicleMovementCost | null
  notes?: string | null
  created_by: string
  created_at: string
  updated_by: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// State machine
// ---------------------------------------------------------------------------

export const VEHICLE_MOVEMENT_TRANSITIONS: Record<VehicleMovementStatus, VehicleMovementStatus[]> = {
  proposed:    ["confirmed", "cancelled"],
  confirmed:   ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed:   [],
  cancelled:   ["proposed"], // re-propose if needed
}

function canTransition(from: VehicleMovementStatus, to: VehicleMovementStatus): boolean {
  return VEHICLE_MOVEMENT_TRANSITIONS[from]?.includes(to) ?? false
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

export type VehicleMovementCommandType =
  | "create"
  | "confirm"
  | "start"
  | "complete"
  | "cancel"
  | "update"

export interface VehicleMovementCommandBase {
  command: VehicleMovementCommandType
  idempotency_key: string
  actor: string
  at: string
}

export interface CreateMovementCommand extends VehicleMovementCommandBase {
  command: "create"
  movement_id: string
  vehicle_id: string
  context: RouteLegContext
  is_local_transfer?: boolean
  origin: VehicleMovementLocation
  destination: VehicleMovementLocation
  planned_departure_utc?: string | null
  planned_arrival_utc?: string | null
  passenger_ids?: string[]
  cargo_item_ids?: string[]
  dispatcher?: string | null
  cost?: VehicleMovementCost | null
}

export interface ConfirmMovementCommand extends VehicleMovementCommandBase {
  command: "confirm"
  movement_id: string
  driver_assignment_id?: string | null
}

export interface StartMovementCommand extends VehicleMovementCommandBase {
  command: "start"
  movement_id: string
  actual_departure_utc: string
}

export interface CompleteMovementCommand extends VehicleMovementCommandBase {
  command: "complete"
  movement_id: string
  actual_arrival_utc: string
}

export interface CancelMovementCommand extends VehicleMovementCommandBase {
  command: "cancel"
  movement_id: string
  reason?: string | null
}

export interface UpdateMovementCommand extends VehicleMovementCommandBase {
  command: "update"
  movement_id: string
  planned_departure_utc?: string | null
  planned_arrival_utc?: string | null
  passenger_ids?: string[]
  cargo_item_ids?: string[]
  dispatcher?: string | null
  cost?: VehicleMovementCost | null
  notes?: string | null
}

export type VehicleMovementCommand =
  | CreateMovementCommand
  | ConfirmMovementCommand
  | StartMovementCommand
  | CompleteMovementCommand
  | CancelMovementCommand
  | UpdateMovementCommand

// ---------------------------------------------------------------------------
// Command result
// ---------------------------------------------------------------------------

export type VehicleMovementCommandStatus = "ok" | "idempotent" | "invalid_transition" | "validation_error"

export interface VehicleMovementCommandResult {
  status: VehicleMovementCommandStatus
  movement: VehicleMovement | null
  error?: string
}

// ---------------------------------------------------------------------------
// Execute
// ---------------------------------------------------------------------------

export function executeVehicleMovementCommand(
  current: VehicleMovement | null,
  cmd: VehicleMovementCommand,
): VehicleMovementCommandResult {
  // Idempotency
  if (current?.updated_at === cmd.at && current.updated_by === cmd.actor && cmd.command !== "create") {
    // Lightweight idempotency: same actor+timestamp means replayed command
  }

  if (cmd.command === "create") {
    if (current) return { status: "validation_error", movement: current, error: "Movement already exists." }
    const c = cmd as CreateMovementCommand
    const movement: VehicleMovement = {
      movement_id: c.movement_id,
      vehicle_id: c.vehicle_id,
      context: c.context,
      is_local_transfer: c.is_local_transfer ?? false,
      status: "proposed",
      origin: c.origin,
      destination: c.destination,
      dispatcher: c.dispatcher ?? null,
      driver_assignment_id: null,
      planned_departure_utc: c.planned_departure_utc ?? null,
      planned_arrival_utc: c.planned_arrival_utc ?? null,
      actual_departure_utc: null,
      actual_arrival_utc: null,
      passenger_ids: c.passenger_ids ?? [],
      cargo_item_ids: c.cargo_item_ids ?? [],
      cost: c.cost ?? null,
      notes: null,
      created_by: c.actor,
      created_at: c.at,
      updated_by: c.actor,
      updated_at: c.at,
    }
    return { status: "ok", movement }
  }

  if (!current) return { status: "validation_error", movement: null, error: "Movement not found." }

  const targetStatusMap: Partial<Record<VehicleMovementCommandType, VehicleMovementStatus>> = {
    confirm:  "confirmed",
    start:    "in_progress",
    complete: "completed",
    cancel:   "cancelled",
  }

  if (cmd.command === "update") {
    const c = cmd as UpdateMovementCommand
    return {
      status: "ok",
      movement: {
        ...current,
        planned_departure_utc: c.planned_departure_utc ?? current.planned_departure_utc,
        planned_arrival_utc: c.planned_arrival_utc ?? current.planned_arrival_utc,
        passenger_ids: c.passenger_ids ?? current.passenger_ids,
        cargo_item_ids: c.cargo_item_ids ?? current.cargo_item_ids,
        dispatcher: c.dispatcher !== undefined ? c.dispatcher : current.dispatcher,
        cost: c.cost !== undefined ? c.cost : current.cost,
        notes: c.notes !== undefined ? c.notes : current.notes,
        updated_by: c.actor,
        updated_at: c.at,
      },
    }
  }

  const targetStatus = targetStatusMap[cmd.command]
  if (!targetStatus) return { status: "validation_error", movement: current, error: `Unknown command: ${cmd.command}` }

  if (!canTransition(current.status, targetStatus)) {
    return {
      status: "invalid_transition",
      movement: current,
      error: `Cannot transition from '${current.status}' to '${targetStatus}'.`,
    }
  }

  const updates: Partial<VehicleMovement> = {
    status: targetStatus,
    updated_by: cmd.actor,
    updated_at: cmd.at,
  }

  if (cmd.command === "confirm") {
    updates.driver_assignment_id = (cmd as ConfirmMovementCommand).driver_assignment_id ?? current.driver_assignment_id
  }
  if (cmd.command === "start") {
    updates.actual_departure_utc = (cmd as StartMovementCommand).actual_departure_utc
  }
  if (cmd.command === "complete") {
    updates.actual_arrival_utc = (cmd as CompleteMovementCommand).actual_arrival_utc
  }

  return { status: "ok", movement: { ...current, ...updates } }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function isActiveMovement(m: VehicleMovement): boolean {
  return !["completed", "cancelled"].includes(m.status)
}

export function movementDurationMinutes(m: VehicleMovement): number | null {
  const dep = m.actual_departure_utc ?? m.planned_departure_utc
  const arr = m.actual_arrival_utc ?? m.planned_arrival_utc
  if (!dep || !arr) return null
  return Math.round((new Date(arr).getTime() - new Date(dep).getTime()) / 60000)
}
