/**
 * WORK-103 — Canonical assignment status maps and transitions.
 *
 * Canonical status lives on employment_assignments. Surface statuses
 * (roster / shift / tour team) map into this lifecycle.
 */

import type {
  EmploymentAssignmentStatus,
  RosterMemberStatus,
} from "@/types/hiring-roster-work-mode"

export type ShiftSurfaceStatus =
  | "scheduled"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "declined"
  | "pending"
  | "published"
  | "draft"
  | string

export type TourTeamSurfaceStatus = "confirmed" | "pending" | "declined" | "invited" | "active" | string

export class WorkforceAssignmentTransitionError extends Error {
  readonly status = 422
  readonly code = "illegal_assignment_transition"

  constructor(from: string, to: string) {
    super(`Illegal assignment transition: ${from} → ${to}`)
    this.name = "WorkforceAssignmentTransitionError"
  }
}

/** Allowed edges for employment_assignments.status (WORK-103 scope). */
export const CANONICAL_ASSIGNMENT_TRANSITIONS: Record<
  EmploymentAssignmentStatus,
  readonly EmploymentAssignmentStatus[]
> = {
  invited: ["confirmed", "declined", "cancelled"],
  confirmed: ["active", "cancelled"],
  active: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
  declined: ["cancelled"],
}

export function mapRosterStatusToAssignment(
  status?: RosterMemberStatus | null,
): EmploymentAssignmentStatus | undefined {
  if (!status) return undefined
  if (status === "active") return "active"
  if (status === "pending") return "invited"
  if (status === "inactive" || status === "suspended" || status === "offboarded") return "cancelled"
  return undefined
}

export function mapAssignmentStatusToRoster(
  status: EmploymentAssignmentStatus,
): RosterMemberStatus {
  if (status === "active") return "active"
  if (status === "invited" || status === "confirmed") return "pending"
  return "inactive"
}

export function mapShiftStatusToAssignment(
  shiftStatus: ShiftSurfaceStatus | null | undefined,
  options?: { override?: EmploymentAssignmentStatus; cancelled?: boolean },
): EmploymentAssignmentStatus {
  if (options?.override) return options.override
  if (options?.cancelled || shiftStatus === "cancelled") return "cancelled"
  if (shiftStatus === "declined") return "declined"
  if (shiftStatus === "confirmed") return "confirmed"
  if (shiftStatus === "completed") return "confirmed"
  return "invited"
}

export function mapAssignmentStatusToShift(
  status: EmploymentAssignmentStatus,
): "scheduled" | "confirmed" | "completed" | "cancelled" | "declined" {
  if (status === "cancelled") return "cancelled"
  if (status === "declined") return "declined"
  if (status === "completed") return "completed"
  if (status === "confirmed" || status === "active") return "confirmed"
  return "scheduled"
}

export function mapAssignmentStatusToTourTeam(
  status: EmploymentAssignmentStatus,
): "confirmed" | "pending" | "declined" {
  if (status === "cancelled") return "declined"
  if (status === "declined") return "declined"
  if (status === "confirmed" || status === "active" || status === "completed") return "confirmed"
  return "pending"
}

export function mapTourTeamStatusToAssignment(
  status: TourTeamSurfaceStatus | null | undefined,
): EmploymentAssignmentStatus {
  const normalized = String(status || "").toLowerCase()
  if (normalized === "declined") return "declined"
  if (normalized === "confirmed" || normalized === "active") return "confirmed"
  return "invited"
}

export function assertAssignmentTransition(
  from: EmploymentAssignmentStatus,
  to: EmploymentAssignmentStatus,
): void {
  if (from === to) return
  const allowed = CANONICAL_ASSIGNMENT_TRANSITIONS[from] || []
  if (!allowed.includes(to)) throw new WorkforceAssignmentTransitionError(from, to)
}

export function canTransitionAssignment(
  from: EmploymentAssignmentStatus,
  to: EmploymentAssignmentStatus,
): boolean {
  if (from === to) return true
  return (CANONICAL_ASSIGNMENT_TRANSITIONS[from] || []).includes(to)
}

export function presentTourMemberAssignmentStatus(tourTeamStatus: string | null | undefined): {
  assignmentStatus: EmploymentAssignmentStatus
  tourTeamStatus: string
} {
  const assignmentStatus = mapTourTeamStatusToAssignment(tourTeamStatus)
  return {
    assignmentStatus,
    tourTeamStatus: String(tourTeamStatus || "pending"),
  }
}
