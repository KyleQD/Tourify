/**
 * WORK-409 — Assignment workflow (pure).
 *
 * Implements the full lifecycle for shift-to-person assignments:
 *   draft → offered → accepted | declined → confirmed → released | cancelled
 *
 * Key features:
 *   - Typed status transitions with reason and deadline fields
 *   - Replacement workflow: declined/released triggers an open replacement slot
 *   - Reminder eligibility check (upcoming deadline, not yet accepted)
 *   - Audit trail: every command returns a typed audit event
 *   - No I/O — pure command functions
 *
 * Note: WORK-401 defines the tour-party member status lifecycle (7 statuses).
 * This module handles the *shift assignment* lifecycle at the (shift × person) level.
 *
 * Pure: no I/O, no `server-only`.
 */

// ---------------------------------------------------------------------------
// Status lifecycle
// ---------------------------------------------------------------------------

export type AssignmentStatus =
  | "draft"
  | "offered"
  | "accepted"
  | "declined"
  | "confirmed"
  | "released"
  | "cancelled"

export const ASSIGNMENT_TRANSITIONS: Record<AssignmentStatus, AssignmentStatus[]> = {
  draft:     ["offered", "cancelled"],
  offered:   ["accepted", "declined", "cancelled"],
  accepted:  ["confirmed", "released", "cancelled"],
  declined:  ["draft"],                         // can be re-drafted for replacement
  confirmed: ["released", "cancelled"],
  released:  ["draft"],                         // re-assignable
  cancelled: [],
}

// ---------------------------------------------------------------------------
// Core types
// ---------------------------------------------------------------------------

export interface ShiftAssignment {
  assignment_id: string
  shift_id: string
  person_id: string
  org_id: string
  tour_id: string
  status: AssignmentStatus
  /** Reason for last status change (decline/cancel/release). */
  reason?: string | null
  /** ISO datetime: deadline by which offered person must respond. */
  response_deadline?: string | null
  /** Reminder was sent at this ISO datetime. */
  last_reminder_sent_at?: string | null
  /** When a replacement is needed, this links to the open position. */
  replacement_requested: boolean
  /** Actor who performed the last transition. */
  last_actor: string
  created_by: string
  created_at: string
  updated_by: string
  updated_at: string
}

export interface AssignmentCommandResult {
  status: "ok" | "invalid_transition" | "validation_error"
  assignment: ShiftAssignment | null
  audit: AssignmentAuditEvent | null
  error?: string
}

// ---------------------------------------------------------------------------
// Audit
// ---------------------------------------------------------------------------

export type AssignmentAuditAction =
  | "offered"
  | "accepted"
  | "declined"
  | "confirmed"
  | "released"
  | "cancelled"
  | "reminder_sent"
  | "replacement_requested"

export interface AssignmentAuditEvent {
  assignment_id: string
  shift_id: string
  person_id: string
  action: AssignmentAuditAction
  actor: string
  at: string
  reason?: string | null
  metadata?: Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Transition command
// ---------------------------------------------------------------------------

export function transitionAssignment(
  assignment: ShiftAssignment,
  toStatus: AssignmentStatus,
  actor: string,
  at: string,
  opts?: {
    reason?: string | null
    response_deadline?: string | null
  },
): AssignmentCommandResult {
  const allowed = ASSIGNMENT_TRANSITIONS[assignment.status]
  if (!allowed.includes(toStatus)) {
    return {
      status: "invalid_transition",
      assignment,
      audit: null,
      error: `Cannot transition assignment from '${assignment.status}' to '${toStatus}'.`,
    }
  }

  // Decline and release require a reason
  if ((toStatus === "declined" || toStatus === "released") && !opts?.reason) {
    return {
      status: "validation_error",
      assignment,
      audit: null,
      error: `A reason is required when transitioning to '${toStatus}'.`,
    }
  }

  const updated: ShiftAssignment = {
    ...assignment,
    status: toStatus,
    reason: opts?.reason ?? assignment.reason,
    response_deadline: toStatus === "offered"
      ? (opts?.response_deadline ?? assignment.response_deadline)
      : assignment.response_deadline,
    last_actor: actor,
    updated_by: actor,
    updated_at: at,
  }

  const action = toStatus as AssignmentAuditAction
  const audit: AssignmentAuditEvent = {
    assignment_id: assignment.assignment_id,
    shift_id: assignment.shift_id,
    person_id: assignment.person_id,
    action,
    actor,
    at,
    reason: opts?.reason ?? null,
  }

  return { status: "ok", assignment: updated, audit }
}

// ---------------------------------------------------------------------------
// Offer with deadline
// ---------------------------------------------------------------------------

export function offerAssignment(
  assignment: ShiftAssignment,
  actor: string,
  at: string,
  responseDeadline: string,
): AssignmentCommandResult {
  return transitionAssignment(assignment, "offered", actor, at, {
    response_deadline: responseDeadline,
  })
}

// ---------------------------------------------------------------------------
// Reminder eligibility
// ---------------------------------------------------------------------------

export interface ReminderEligibility {
  eligible: boolean
  reason: string
}

/**
 * A reminder is eligible when:
 *   - Assignment is in 'offered' status
 *   - Response deadline exists and has not yet passed
 *   - Either no reminder has been sent, or last reminder was sent
 *     more than `min_reminder_gap_hours` ago
 */
export function checkReminderEligibility(
  assignment: ShiftAssignment,
  nowIso: string,
  minReminderGapHours = 24,
): ReminderEligibility {
  if (assignment.status !== "offered") {
    return { eligible: false, reason: `Assignment is '${assignment.status}', not 'offered'.` }
  }
  if (!assignment.response_deadline) {
    return { eligible: false, reason: "No response_deadline set — cannot determine reminder timing." }
  }
  if (nowIso >= assignment.response_deadline) {
    return { eligible: false, reason: "Response deadline has already passed." }
  }
  if (assignment.last_reminder_sent_at) {
    const gapMs = new Date(nowIso).getTime() - new Date(assignment.last_reminder_sent_at).getTime()
    const gapHours = gapMs / 3_600_000
    if (gapHours < minReminderGapHours) {
      return {
        eligible: false,
        reason: `Last reminder sent ${gapHours.toFixed(1)}h ago (minimum gap: ${minReminderGapHours}h).`,
      }
    }
  }
  return { eligible: true, reason: "Eligible for reminder." }
}

export function markReminderSent(
  assignment: ShiftAssignment,
  actor: string,
  at: string,
): { assignment: ShiftAssignment; audit: AssignmentAuditEvent } {
  return {
    assignment: {
      ...assignment,
      last_reminder_sent_at: at,
      updated_by: actor,
      updated_at: at,
    },
    audit: {
      assignment_id: assignment.assignment_id,
      shift_id: assignment.shift_id,
      person_id: assignment.person_id,
      action: "reminder_sent",
      actor,
      at,
    },
  }
}

// ---------------------------------------------------------------------------
// Replacement workflow
// ---------------------------------------------------------------------------

export interface ReplacementRequest {
  original_assignment_id: string
  shift_id: string
  tour_id: string
  org_id: string
  reason: string
  requested_by: string
  requested_at: string
}

/**
 * When an assignment is declined or released, request a replacement.
 * Returns the updated assignment and a typed replacement request record.
 * Emits a replacement_requested audit event.
 */
export function requestReplacement(
  assignment: ShiftAssignment,
  actor: string,
  at: string,
): {
  assignment: ShiftAssignment
  replacement: ReplacementRequest
  audit: AssignmentAuditEvent
} | { error: string } {
  if (assignment.status !== "declined" && assignment.status !== "released") {
    return {
      error: `Replacement can only be requested for 'declined' or 'released' assignments (current: '${assignment.status}').`,
    }
  }
  if (assignment.replacement_requested) {
    return { error: "Replacement already requested for this assignment." }
  }

  const updated: ShiftAssignment = {
    ...assignment,
    replacement_requested: true,
    updated_by: actor,
    updated_at: at,
  }

  const replacement: ReplacementRequest = {
    original_assignment_id: assignment.assignment_id,
    shift_id: assignment.shift_id,
    tour_id: assignment.tour_id,
    org_id: assignment.org_id,
    reason: assignment.reason ?? "No reason provided",
    requested_by: actor,
    requested_at: at,
  }

  const audit: AssignmentAuditEvent = {
    assignment_id: assignment.assignment_id,
    shift_id: assignment.shift_id,
    person_id: assignment.person_id,
    action: "replacement_requested",
    actor,
    at,
    metadata: { original_assignment_id: assignment.assignment_id },
  }

  return { assignment: updated, replacement, audit }
}

// ---------------------------------------------------------------------------
// Bulk assignment overview
// ---------------------------------------------------------------------------

export interface AssignmentSummary {
  total: number
  by_status: Record<AssignmentStatus, number>
  needs_replacement: number
  overdue_response: number
}

export function summarizeAssignments(
  assignments: ShiftAssignment[],
  nowIso: string,
): AssignmentSummary {
  const byStatus: Record<AssignmentStatus, number> = {
    draft: 0,
    offered: 0,
    accepted: 0,
    declined: 0,
    confirmed: 0,
    released: 0,
    cancelled: 0,
  }
  for (const a of assignments) byStatus[a.status]++

  const needsReplacement = assignments.filter(
    (a) => (a.status === "declined" || a.status === "released") && !a.replacement_requested,
  ).length

  const overdueResponse = assignments.filter(
    (a) =>
      a.status === "offered" &&
      a.response_deadline != null &&
      nowIso > a.response_deadline,
  ).length

  return {
    total: assignments.length,
    by_status: byStatus,
    needs_replacement: needsReplacement,
    overdue_response: overdueResponse,
  }
}
