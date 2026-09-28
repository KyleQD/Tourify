/**
 * WORK-410 — Conflict resolution model (pure).
 *
 * Provides a unified conflict model that aggregates violations from multiple
 * upstream sources (labor/rest rules, shift overlaps, credential gaps, availability
 * conflicts, locked edits) and provides:
 *   - Typed conflict records with rule/evidence/severity/affected assignments
 *   - Override workflow: authorized actor provides reason; override is recorded
 *   - Remediation suggestions: alternative actions to resolve without override
 *   - Summary for UI rendering (group by severity, status, type)
 *
 * Sources integrated:
 *   - WORK-406: LaborViolation (turnaround/meal/consecutive/overlap/travel_work)
 *   - WORK-407/408: schedule/generation conflicts (locked_conflict/soft_conflict)
 *   - WORK-404: availability conflicts (time_off_approved/pending/outside_availability)
 *   - WORK-405: credential gaps (missing/expired/unverified)
 *
 * Pure: no I/O, no `server-only`.
 */

// ---------------------------------------------------------------------------
// Conflict type taxonomy
// ---------------------------------------------------------------------------

export type ConflictSource =
  | "labor_rule"         // from WORK-406 LaborViolation
  | "shift_overlap"      // two shifts at same time for same person
  | "locked_edit"        // candidate conflicts with a locked shift
  | "availability"       // time_off or outside_availability
  | "credential_gap"     // missing/expired/unverified credential
  | "capacity"           // headcount_required not met

export type ConflictSeverity = "error" | "warning"

export type ConflictStatus =
  | "open"          // not yet resolved
  | "overridden"    // acknowledged with reason by authorized actor
  | "remediated"    // conflict no longer applies after change

// ---------------------------------------------------------------------------
// Evidence — what the conflict refers to
// ---------------------------------------------------------------------------

export interface ConflictEvidence {
  /** Human-readable explanation of what was found. */
  description: string
  /** Shift IDs involved (if applicable). */
  shift_ids: string[]
  /** Assignment IDs involved (if applicable). */
  assignment_ids: string[]
  /** Person IDs involved (if applicable). */
  person_ids: string[]
  /** Rule text / threshold that was violated (e.g. "10h turnaround required"). */
  rule_text?: string | null
  /** Numeric measure (e.g. actual gap hours). */
  measured_value?: number | null
  /** Threshold that was expected. */
  threshold_value?: number | null
}

// ---------------------------------------------------------------------------
// Remediation suggestion
// ---------------------------------------------------------------------------

export type RemediationAction =
  | "remove_shift"         // delete the conflicting shift
  | "reschedule_shift"     // change start/end time
  | "replace_person"       // assign a different person
  | "update_credential"    // obtain/upload missing credential
  | "approve_time_off"     // force-approve the time-off conflict
  | "extend_rest"          // add a rest period
  | "no_action_required"   // informational only (warning with no blocking impact)

export interface RemediationSuggestion {
  action: RemediationAction
  description: string
  /** Primary shift/assignment ID the action applies to. */
  target_id?: string | null
}

// ---------------------------------------------------------------------------
// Conflict record
// ---------------------------------------------------------------------------

export interface WorkforceConflict {
  conflict_id: string
  source: ConflictSource
  severity: ConflictSeverity
  status: ConflictStatus
  /** Short label for UI list rendering. */
  title: string
  evidence: ConflictEvidence
  remediations: RemediationSuggestion[]
  /** ISO datetime when conflict was detected. */
  detected_at: string
  /** When overridden: actor who overrode, reason, and timestamp. */
  override?: {
    actor: string
    reason: string
    at: string
  } | null
}

// ---------------------------------------------------------------------------
// Override command
// ---------------------------------------------------------------------------

export interface ConflictOverrideResult {
  status: "ok" | "already_resolved" | "override_not_allowed" | "validation_error"
  conflict: WorkforceConflict | null
  error?: string
}

/**
 * Mark a conflict as overridden. Errors are (severity=error) conflicts that
 * require an explicit reason. Warnings may be overridden without one.
 * A conflict in 'remediated' or already 'overridden' status cannot be
 * re-overridden.
 */
export function overrideConflict(
  conflict: WorkforceConflict,
  actor: string,
  at: string,
  reason: string,
): ConflictOverrideResult {
  if (conflict.status === "overridden" || conflict.status === "remediated") {
    return {
      status: "already_resolved",
      conflict,
      error: `Conflict is already '${conflict.status}'.`,
    }
  }

  if (!reason.trim()) {
    return {
      status: "validation_error",
      conflict,
      error: "An override reason is required.",
    }
  }

  return {
    status: "ok",
    conflict: {
      ...conflict,
      status: "overridden",
      override: { actor, reason, at },
    },
  }
}

/**
 * Mark a conflict as remediated (e.g. the offending shift was removed or
 * the credential was uploaded). No reason required.
 */
export function markConflictRemediated(
  conflict: WorkforceConflict,
  actor: string,
  at: string,
): ConflictOverrideResult {
  if (conflict.status === "remediated") {
    return { status: "already_resolved", conflict, error: "Conflict is already remediated." }
  }

  return {
    status: "ok",
    conflict: { ...conflict, status: "remediated" },
  }
}

// ---------------------------------------------------------------------------
// Conflict builder helpers (translate upstream violation types)
// ---------------------------------------------------------------------------

import type { LaborViolation } from "./labor-rest-rules"

export function conflictFromLaborViolation(
  violation: LaborViolation,
  conflictId: string,
  detectedAt: string,
): WorkforceConflict {
  const remediations: RemediationSuggestion[] = [
    {
      action: violation.violation_type === "shift_overlap" ? "remove_shift" : "extend_rest",
      description:
        violation.violation_type === "shift_overlap"
          ? "Remove or reschedule one of the overlapping shifts."
          : "Add a rest period or reschedule the shift to meet the minimum requirement.",
      target_id: violation.shift_ids[0] ?? null,
    },
  ]

  return {
    conflict_id: conflictId,
    source: "labor_rule",
    severity: violation.severity,
    status: "open",
    title: `Labor violation: ${violation.violation_type.replace(/_/g, " ")}`,
    evidence: {
      description: violation.detail,
      shift_ids: violation.shift_ids,
      assignment_ids: [],
      person_ids: [violation.person_id],
      rule_text: violation.assumption,
    },
    remediations,
    detected_at: detectedAt,
    override: null,
  }
}

export function conflictFromAvailabilityConflict(args: {
  conflict_id: string
  person_id: string
  shift_id: string
  conflict_type: "time_off_approved" | "time_off_pending" | "outside_availability" | "marked_unavailable"
  detail: string
  detected_at: string
}): WorkforceConflict {
  const severity: ConflictSeverity =
    args.conflict_type === "time_off_approved" ? "error" : "warning"

  return {
    conflict_id: args.conflict_id,
    source: "availability",
    severity,
    status: "open",
    title: `Availability conflict: ${args.conflict_type.replace(/_/g, " ")}`,
    evidence: {
      description: args.detail,
      shift_ids: [args.shift_id],
      assignment_ids: [],
      person_ids: [args.person_id],
    },
    remediations: [
      {
        action: "replace_person",
        description: "Assign a different person who is available.",
        target_id: args.shift_id,
      },
    ],
    detected_at: args.detected_at,
    override: null,
  }
}

export function conflictFromCredentialGap(args: {
  conflict_id: string
  person_id: string
  shift_id: string
  credential_type: string
  gap_code: "missing" | "expired" | "unverified"
  detail: string
  is_blocking: boolean
  detected_at: string
}): WorkforceConflict {
  return {
    conflict_id: args.conflict_id,
    source: "credential_gap",
    severity: args.is_blocking ? "error" : "warning",
    status: "open",
    title: `Credential gap: ${args.credential_type} (${args.gap_code})`,
    evidence: {
      description: args.detail,
      shift_ids: [args.shift_id],
      assignment_ids: [],
      person_ids: [args.person_id],
    },
    remediations: [
      {
        action: "update_credential",
        description: "Upload or renew the required credential for this person.",
        target_id: args.person_id,
      },
    ],
    detected_at: args.detected_at,
    override: null,
  }
}

// ---------------------------------------------------------------------------
// Conflict summary
// ---------------------------------------------------------------------------

export interface ConflictSummary {
  total: number
  open: number
  overridden: number
  remediated: number
  error_count: number
  warning_count: number
  by_source: Record<ConflictSource, number>
  /** True when there are no open error-severity conflicts. */
  can_publish: boolean
}

export function summarizeConflicts(conflicts: WorkforceConflict[]): ConflictSummary {
  const open = conflicts.filter((c) => c.status === "open").length
  const overridden = conflicts.filter((c) => c.status === "overridden").length
  const remediated = conflicts.filter((c) => c.status === "remediated").length

  const errorCount = conflicts.filter((c) => c.severity === "error" && c.status === "open").length
  const warningCount = conflicts.filter((c) => c.severity === "warning" && c.status === "open").length

  const bySource: Record<ConflictSource, number> = {
    labor_rule: 0,
    shift_overlap: 0,
    locked_edit: 0,
    availability: 0,
    credential_gap: 0,
    capacity: 0,
  }
  for (const c of conflicts) bySource[c.source]++

  return {
    total: conflicts.length,
    open,
    overridden,
    remediated,
    error_count: errorCount,
    warning_count: warningCount,
    by_source: bySource,
    can_publish: errorCount === 0,
  }
}
