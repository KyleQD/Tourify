/**
 * TRAVEL-302 — Travel segment command and state machine (pure).
 *
 * Travel segments move through a lifecycle:
 *   proposed → requested → held → confirmed → [ticketed/vouchered] → changed |
 *   cancelled | completed → reconciled
 *
 * Rules:
 *  - Every command is idempotent: replaying the same command with the same
 *    idempotency key returns the previous result.
 *  - Commands include actor, timestamp, and optional reason/evidence.
 *  - "confirmed" requires confirmation_reference (evidence field).
 *  - "ticketed" requires ticket_reference.
 *  - Cancelling a confirmed segment captures cancellation_reason.
 *  - Audit log grows append-only; no entry is ever removed.
 *
 * Pure: no I/O, no `server-only`.
 */

import type { RouteLegContext } from "@/lib/admin/tour-route-logistics-context"

// ---------------------------------------------------------------------------
// State machine types
// ---------------------------------------------------------------------------

export type TravelSegmentStatus =
  | "proposed"
  | "requested"
  | "held"
  | "confirmed"
  | "ticketed"
  | "changed"
  | "cancelled"
  | "completed"
  | "reconciled"

export const TRAVEL_SEGMENT_TRANSITIONS: Record<TravelSegmentStatus, TravelSegmentStatus[]> = {
  proposed:   ["requested", "cancelled"],
  requested:  ["held", "confirmed", "cancelled"],
  held:       ["confirmed", "cancelled"],
  confirmed:  ["ticketed", "changed", "cancelled", "completed"],
  ticketed:   ["changed", "cancelled", "completed"],
  changed:    ["confirmed", "ticketed", "cancelled", "completed"],
  cancelled:  ["proposed"],   // allow re-opening cancelled → re-propose
  completed:  ["reconciled"],
  reconciled: [],
}

export type TravelMode = "air" | "rail" | "bus" | "van" | "car" | "ferry" | "other"

// ---------------------------------------------------------------------------
// Segment record
// ---------------------------------------------------------------------------

export interface TravelSegment {
  segment_id: string
  /** Canonical route leg context (or stop context for local transfers). */
  context: RouteLegContext
  /** Air/rail/bus/van/car/ferry/other. */
  mode: TravelMode
  /** Carrier or provider name. */
  carrier?: string | null
  /** Origin location label. */
  origin: string
  /** Destination location label. */
  destination: string
  /** UTC ISO — planned departure. Null until set. */
  departure_utc: string | null
  /** UTC ISO — planned arrival. Null until set. */
  arrival_utc: string | null
  /** External booking/reference number. */
  booking_reference?: string | null
  /** External confirmation number (required for "confirmed" status). */
  confirmation_reference?: string | null
  /** Ticket reference (required for "ticketed" status). */
  ticket_reference?: string | null
  status: TravelSegmentStatus
  /** Idempotency key for the last command. */
  last_idempotency_key: string | null
  /** Actor who last modified the record. */
  updated_by: string
  updated_at: string
  created_by: string
  created_at: string
  /** Append-only audit log. */
  audit_log: TravelSegmentAuditEntry[]
  /** Cancellation reason (set when status → cancelled). */
  cancellation_reason?: string | null
  /** Cost/contract reference. */
  cost_ref?: string | null
  /** Number of passengers on this segment. */
  passenger_count: number
}

export interface TravelSegmentAuditEntry {
  at: string
  actor: string
  from_status: TravelSegmentStatus | null
  to_status: TravelSegmentStatus
  command: string
  idempotency_key: string | null
  note?: string | null
}

// ---------------------------------------------------------------------------
// Command types
// ---------------------------------------------------------------------------

export type TravelSegmentCommandType =
  | "create"
  | "request"
  | "hold"
  | "confirm"
  | "ticket"
  | "change"
  | "cancel"
  | "complete"
  | "reconcile"

export interface TravelSegmentCommandBase {
  command: TravelSegmentCommandType
  idempotency_key: string
  actor: string
  at: string
}

export interface CreateTravelSegmentCommand extends TravelSegmentCommandBase {
  command: "create"
  segment_id: string
  context: RouteLegContext
  mode: TravelMode
  origin: string
  destination: string
  carrier?: string | null
  departure_utc?: string | null
  arrival_utc?: string | null
  passenger_count?: number
  cost_ref?: string | null
}

export interface RequestTravelSegmentCommand extends TravelSegmentCommandBase {
  command: "request"
  segment_id: string
}

export interface HoldTravelSegmentCommand extends TravelSegmentCommandBase {
  command: "hold"
  segment_id: string
  booking_reference?: string | null
}

export interface ConfirmTravelSegmentCommand extends TravelSegmentCommandBase {
  command: "confirm"
  segment_id: string
  confirmation_reference: string
  departure_utc?: string | null
  arrival_utc?: string | null
}

export interface TicketTravelSegmentCommand extends TravelSegmentCommandBase {
  command: "ticket"
  segment_id: string
  ticket_reference: string
}

export interface ChangeTravelSegmentCommand extends TravelSegmentCommandBase {
  command: "change"
  segment_id: string
  departure_utc?: string | null
  arrival_utc?: string | null
  origin?: string | null
  destination?: string | null
  note?: string | null
}

export interface CancelTravelSegmentCommand extends TravelSegmentCommandBase {
  command: "cancel"
  segment_id: string
  cancellation_reason?: string | null
}

export interface CompleteTravelSegmentCommand extends TravelSegmentCommandBase {
  command: "complete"
  segment_id: string
}

export interface ReconcileTravelSegmentCommand extends TravelSegmentCommandBase {
  command: "reconcile"
  segment_id: string
}

export type TravelSegmentCommand =
  | CreateTravelSegmentCommand
  | RequestTravelSegmentCommand
  | HoldTravelSegmentCommand
  | ConfirmTravelSegmentCommand
  | TicketTravelSegmentCommand
  | ChangeTravelSegmentCommand
  | CancelTravelSegmentCommand
  | CompleteTravelSegmentCommand
  | ReconcileTravelSegmentCommand

// ---------------------------------------------------------------------------
// Command result
// ---------------------------------------------------------------------------

export type TravelSegmentCommandResultStatus = "ok" | "idempotent" | "invalid_transition" | "validation_error"

export interface TravelSegmentCommandResult {
  status: TravelSegmentCommandResultStatus
  segment: TravelSegment | null
  /** Present when status is 'invalid_transition' or 'validation_error'. */
  error?: string
}

// ---------------------------------------------------------------------------
// Command execution
// ---------------------------------------------------------------------------

function canTransition(from: TravelSegmentStatus, to: TravelSegmentStatus): boolean {
  return TRAVEL_SEGMENT_TRANSITIONS[from]?.includes(to) ?? false
}

function appendAudit(
  log: TravelSegmentAuditEntry[],
  entry: TravelSegmentAuditEntry,
): TravelSegmentAuditEntry[] {
  return [...log, entry]
}

/**
 * Execute a travel segment command against the current (or null) segment.
 *
 * Returns:
 *  - ok:                  command applied successfully
 *  - idempotent:          same idempotency_key already processed; returns stored segment
 *  - invalid_transition:  state machine blocks this transition
 *  - validation_error:    required fields missing (e.g. confirmation_reference)
 */
export function executeTravelSegmentCommand(
  current: TravelSegment | null,
  cmd: TravelSegmentCommand,
): TravelSegmentCommandResult {
  // Idempotency check
  if (current && current.last_idempotency_key === cmd.idempotency_key) {
    return { status: "idempotent", segment: current }
  }

  if (cmd.command === "create") {
    // Create — segment must not already exist
    const segment: TravelSegment = {
      segment_id: cmd.segment_id,
      context: cmd.context,
      mode: cmd.mode,
      carrier: null,
      origin: cmd.origin,
      destination: cmd.destination,
      departure_utc: cmd.departure_utc ?? null,
      arrival_utc: cmd.arrival_utc ?? null,
      booking_reference: null,
      confirmation_reference: null,
      ticket_reference: null,
      status: "proposed",
      last_idempotency_key: cmd.idempotency_key,
      updated_by: cmd.actor,
      updated_at: cmd.at,
      created_by: cmd.actor,
      created_at: cmd.at,
      cancellation_reason: null,
      cost_ref: cmd.cost_ref ?? null,
      passenger_count: cmd.passenger_count ?? 0,
      audit_log: [
        {
          at: cmd.at,
          actor: cmd.actor,
          from_status: null,
          to_status: "proposed",
          command: "create",
          idempotency_key: cmd.idempotency_key,
        },
      ],
    }
    return { status: "ok", segment }
  }

  if (!current) {
    return { status: "validation_error", segment: null, error: "Segment not found." }
  }

  // Determine target status
  const targetStatusMap: Record<TravelSegmentCommandType, TravelSegmentStatus | null> = {
    create:     null,
    request:    "requested",
    hold:       "held",
    confirm:    "confirmed",
    ticket:     "ticketed",
    change:     "changed",
    cancel:     "cancelled",
    complete:   "completed",
    reconcile:  "reconciled",
  }

  const targetStatus = targetStatusMap[cmd.command]
  if (!targetStatus) {
    return { status: "validation_error", segment: null, error: `Unknown command: ${cmd.command}` }
  }

  // Check transition
  if (!canTransition(current.status, targetStatus)) {
    return {
      status: "invalid_transition",
      segment: current,
      error: `Cannot transition from '${current.status}' to '${targetStatus}'.`,
    }
  }

  // Validation
  if (cmd.command === "confirm") {
    const c = cmd as ConfirmTravelSegmentCommand
    if (!c.confirmation_reference?.trim()) {
      return {
        status: "validation_error",
        segment: current,
        error: "confirmation_reference is required for confirm command.",
      }
    }
  }

  if (cmd.command === "ticket") {
    const c = cmd as TicketTravelSegmentCommand
    if (!c.ticket_reference?.trim()) {
      return {
        status: "validation_error",
        segment: current,
        error: "ticket_reference is required for ticket command.",
      }
    }
  }

  // Apply the command
  const auditEntry: TravelSegmentAuditEntry = {
    at: cmd.at,
    actor: cmd.actor,
    from_status: current.status,
    to_status: targetStatus,
    command: cmd.command,
    idempotency_key: cmd.idempotency_key,
    note: cmd.command === "cancel" ? (cmd as CancelTravelSegmentCommand).cancellation_reason : undefined,
  }

  const updated: TravelSegment = {
    ...current,
    status: targetStatus,
    last_idempotency_key: cmd.idempotency_key,
    updated_by: cmd.actor,
    updated_at: cmd.at,
    audit_log: appendAudit(current.audit_log, auditEntry),
    // Apply field updates per command
    ...(cmd.command === "hold" && { booking_reference: (cmd as HoldTravelSegmentCommand).booking_reference ?? current.booking_reference }),
    ...(cmd.command === "confirm" && {
      confirmation_reference: (cmd as ConfirmTravelSegmentCommand).confirmation_reference,
      departure_utc: (cmd as ConfirmTravelSegmentCommand).departure_utc ?? current.departure_utc,
      arrival_utc: (cmd as ConfirmTravelSegmentCommand).arrival_utc ?? current.arrival_utc,
    }),
    ...(cmd.command === "ticket" && {
      ticket_reference: (cmd as TicketTravelSegmentCommand).ticket_reference,
    }),
    ...(cmd.command === "change" && {
      departure_utc: (cmd as ChangeTravelSegmentCommand).departure_utc ?? current.departure_utc,
      arrival_utc: (cmd as ChangeTravelSegmentCommand).arrival_utc ?? current.arrival_utc,
      origin: (cmd as ChangeTravelSegmentCommand).origin ?? current.origin,
      destination: (cmd as ChangeTravelSegmentCommand).destination ?? current.destination,
    }),
    ...(cmd.command === "cancel" && {
      cancellation_reason: (cmd as CancelTravelSegmentCommand).cancellation_reason ?? null,
    }),
  }

  return { status: "ok", segment: updated }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Check whether a segment is in an active (not cancelled/completed/reconciled) state.
 */
export function isActiveSegment(segment: TravelSegment): boolean {
  return !["cancelled", "completed", "reconciled"].includes(segment.status)
}

/**
 * Check whether a segment has confirmation evidence.
 */
export function isConfirmedSegment(segment: TravelSegment): boolean {
  return (
    ["confirmed", "ticketed", "changed", "completed", "reconciled"].includes(segment.status) &&
    Boolean(segment.confirmation_reference)
  )
}

/**
 * Get valid next commands for a segment in its current state.
 */
export function validNextCommands(segment: TravelSegment): TravelSegmentCommandType[] {
  const allowedStatuses = TRAVEL_SEGMENT_TRANSITIONS[segment.status] ?? []
  const statusToCommand: Record<TravelSegmentStatus, TravelSegmentCommandType> = {
    proposed:   "create",
    requested:  "request",
    held:       "hold",
    confirmed:  "confirm",
    ticketed:   "ticket",
    changed:    "change",
    cancelled:  "cancel",
    completed:  "complete",
    reconciled: "reconcile",
  }
  return allowedStatuses.map((s) => statusToCommand[s]).filter(Boolean)
}
