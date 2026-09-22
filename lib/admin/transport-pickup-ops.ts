/**
 * TRANS-305 — Pickup/dropoff operations (pure).
 *
 * Records the operational state of vehicle pickup and dropoff events:
 *  - Location with precise address and offline-accessible instructions
 *  - Passenger check state (arrived, waiting, checked_in, no_show)
 *  - Delay/exception reporting
 *  - Dispatcher contact fallback
 *
 * Pure: no I/O, no `server-only`.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PassengerCheckState =
  | "expected"
  | "waiting"
  | "checked_in"
  | "no_show"
  | "departed"

export type PickupEventType = "pickup" | "dropoff"

export interface PickupLocation {
  label: string
  address?: string | null
  coordinates?: { lat: number; lng: number } | null
  /** Offline instructions shown even without connectivity. */
  offline_instructions?: string | null
}

export interface PassengerCheckEntry {
  person_id: string
  person_name: string
  state: PassengerCheckState
  checked_at?: string | null
  note?: string | null
}

export interface PickupDelayEvent {
  reported_at: string
  delay_minutes: number
  reason: string
  reported_by: string
}

export interface PickupDropoffOperation {
  operation_id: string
  movement_id: string
  event_type: PickupEventType
  location: PickupLocation
  /** Scheduled UTC. */
  scheduled_utc: string
  /** Actual UTC (when event was completed). */
  actual_utc?: string | null
  dispatcher_contact?: string | null
  driver_contact?: string | null
  passenger_checks: PassengerCheckEntry[]
  delays: PickupDelayEvent[]
  status: "pending" | "in_progress" | "completed" | "exception"
  notes?: string | null
  created_by: string
  created_at: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function updatePassengerCheckState(
  op: PickupDropoffOperation,
  personId: string,
  newState: PassengerCheckState,
  at: string,
  note?: string | null,
): PickupDropoffOperation {
  return {
    ...op,
    passenger_checks: op.passenger_checks.map((pc) =>
      pc.person_id === personId
        ? { ...pc, state: newState, checked_at: at, note: note ?? pc.note }
        : pc,
    ),
  }
}

export function reportDelay(
  op: PickupDropoffOperation,
  delayMinutes: number,
  reason: string,
  reportedBy: string,
  at: string,
): PickupDropoffOperation {
  return {
    ...op,
    delays: [...op.delays, { reported_at: at, delay_minutes: delayMinutes, reason, reported_by: reportedBy }],
    status: "exception",
  }
}

export function totalDelayMinutes(op: PickupDropoffOperation): number {
  return op.delays.reduce((sum, d) => sum + d.delay_minutes, 0)
}

export function estimatedActualUtc(op: PickupDropoffOperation): string {
  const scheduled = new Date(op.scheduled_utc).getTime()
  const delayMs = totalDelayMinutes(op) * 60000
  return new Date(scheduled + delayMs).toISOString()
}

export function allPassengersCheckedIn(op: PickupDropoffOperation): boolean {
  return op.passenger_checks.every(
    (pc) => pc.state === "checked_in" || pc.state === "departed" || pc.state === "no_show",
  )
}
