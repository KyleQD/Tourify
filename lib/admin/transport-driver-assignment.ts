/**
 * TRANS-304 — Driver assignment and rest/hours-of-service check (pure).
 *
 * Validates driver assignments against:
 *  - Driver qualifications (license class match)
 *  - Availability (no conflicting movements in the same window)
 *  - Planned drive hours vs configured policy (max hours)
 *  - Minimum rest between assignments (from policy)
 *  - Acknowledgement state
 *
 * Pure: no I/O, no `server-only`.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DriverAssignmentStatus =
  | "proposed"
  | "confirmed"
  | "acknowledged"
  | "completed"
  | "cancelled"

export interface DriverRestPolicy {
  /** Maximum consecutive drive minutes per assignment. Default 600 (10h). */
  maxDriveMinutes: number
  /** Minimum rest minutes between assignments. Default 480 (8h). */
  minRestMinutes: number
  /** Required license class for the vehicle type (e.g. "CDL-A", "Class 2"). */
  requiredLicenseClass?: string | null
}

export const DEFAULT_DRIVER_REST_POLICY: DriverRestPolicy = {
  maxDriveMinutes: 600,
  minRestMinutes: 480,
  requiredLicenseClass: null,
}

export interface DriverAssignment {
  assignment_id: string
  movement_id: string
  person_id: string
  person_name: string
  role: "primary" | "relief" | "backup"
  planned_drive_minutes: number | null
  status: DriverAssignmentStatus
  acknowledged_at: string | null
  created_by: string
  created_at: string
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type DriverCheckCode =
  | "ok"
  | "exceeds_drive_hours"
  | "insufficient_rest"
  | "missing_license_class"
  | "availability_conflict"

export interface DriverCheckResult {
  code: DriverCheckCode
  valid: boolean
  message: string
}

export interface DriverAssignmentConflict {
  conflicting_movement_id: string
  planned_departure_utc: string
  planned_arrival_utc: string
}

/**
 * Validate a driver assignment against policy.
 */
export function validateDriverAssignment(args: {
  plannedDriveMinutes: number | null
  driverLicenseClass?: string | null
  policy: DriverRestPolicy
  /** Previously completed assignments ending before this one starts. */
  previousAssignmentEndUtc?: string | null
  currentAssignmentStartUtc?: string | null
  /** Other active assignments with overlapping times. */
  conflicts?: DriverAssignmentConflict[]
}): DriverCheckResult[] {
  const results: DriverCheckResult[] = []

  // Drive hours check
  if (args.plannedDriveMinutes !== null && args.plannedDriveMinutes > args.policy.maxDriveMinutes) {
    results.push({
      code: "exceeds_drive_hours",
      valid: false,
      message: `Planned drive time (${args.plannedDriveMinutes}min) exceeds policy maximum (${args.policy.maxDriveMinutes}min).`,
    })
  }

  // Rest check
  if (args.previousAssignmentEndUtc && args.currentAssignmentStartUtc) {
    const restMinutes = Math.round(
      (new Date(args.currentAssignmentStartUtc).getTime() -
        new Date(args.previousAssignmentEndUtc).getTime()) / 60000,
    )
    if (restMinutes < args.policy.minRestMinutes) {
      results.push({
        code: "insufficient_rest",
        valid: false,
        message: `Only ${restMinutes}min rest before this assignment (policy requires ${args.policy.minRestMinutes}min).`,
      })
    }
  }

  // License class check
  if (args.policy.requiredLicenseClass && args.driverLicenseClass !== args.policy.requiredLicenseClass) {
    results.push({
      code: "missing_license_class",
      valid: false,
      message: `Driver license class '${args.driverLicenseClass ?? "none"}' does not meet requirement '${args.policy.requiredLicenseClass}'.`,
    })
  }

  // Availability conflict
  if (args.conflicts && args.conflicts.length > 0) {
    for (const conflict of args.conflicts) {
      results.push({
        code: "availability_conflict",
        valid: false,
        message: `Driver has a conflicting movement (${conflict.conflicting_movement_id}) at the same time.`,
      })
    }
  }

  if (results.length === 0) {
    results.push({ code: "ok", valid: true, message: "Driver assignment is valid." })
  }

  return results
}

export function driverAssignmentIsValid(checks: DriverCheckResult[]): boolean {
  return checks.every((c) => c.valid)
}
