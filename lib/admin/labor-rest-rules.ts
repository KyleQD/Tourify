/**
 * WORK-406 — Labor/rest rule profiles (pure).
 *
 * Configurable jurisdiction/contract templates detect:
 *   - Turnaround violations (insufficient rest between end of work and next call)
 *   - Meal/rest break requirements (max consecutive hours before a break)
 *   - Consecutive work days (max days without a day off)
 *   - Shift overlap (same person assigned to two shifts that overlap)
 *   - Travel-work conflict (travel leg immediately adjacent to a work shift
 *     with insufficient buffer)
 *
 * Every profile documents its assumptions explicitly. The checker is pure:
 * it accepts pre-fetched shift/travel data and returns typed violations.
 *
 * Pure: no I/O, no `server-only`.
 */

// ---------------------------------------------------------------------------
// Rule profile
// ---------------------------------------------------------------------------

export interface LaborRuleProfile {
  profile_id: string
  name: string
  /** Jurisdiction or contract type (for disclosure). */
  jurisdiction: string
  /** Explicit list of assumptions this profile makes. */
  assumptions: string[]
  /** Minimum hours between end of last shift and start of next call. */
  min_turnaround_hours: number
  /** Maximum consecutive work hours before a meal/rest break is required. */
  max_consecutive_work_hours: number
  /** Required break duration in minutes. */
  required_break_minutes: number
  /** Maximum consecutive work days before a day off is required. */
  max_consecutive_work_days: number
  /** Minimum travel buffer in hours between a travel arrival and work start. */
  min_travel_buffer_hours: number
  /** When true, travel time counts against consecutive work days. */
  travel_counts_as_work_day: boolean
}

/** Well-known built-in profiles (org can override any field). */
export const IATSE_LOCAL_PROFILE: LaborRuleProfile = {
  profile_id: "iatse-local",
  name: "IATSE Local (US)",
  jurisdiction: "US / IATSE collective agreement",
  assumptions: [
    "Turnaround is measured from actual end of last call to start of next call",
    "Meals are provided by employer; 6-hour rule triggers mandatory break",
    "Travel day does not count as a work day unless call is issued",
    "Overtime and premium calculations are handled by payroll, not this rule engine",
  ],
  min_turnaround_hours: 10,
  max_consecutive_work_hours: 6,
  required_break_minutes: 30,
  max_consecutive_work_days: 6,
  min_travel_buffer_hours: 8,
  travel_counts_as_work_day: false,
}

export const EU_WORKING_TIME_PROFILE: LaborRuleProfile = {
  profile_id: "eu-working-time",
  name: "EU Working Time Directive",
  jurisdiction: "European Union",
  assumptions: [
    "11-hour daily rest period is measured from actual end of work",
    "20-minute break required when work exceeds 6 hours",
    "48-hour average working week enforcement is handled separately",
    "Travel to/from the workplace counts as working time per ECJ ruling",
  ],
  min_turnaround_hours: 11,
  max_consecutive_work_hours: 6,
  required_break_minutes: 20,
  max_consecutive_work_days: 6,
  min_travel_buffer_hours: 0,  // travel counts as work
  travel_counts_as_work_day: true,
}

export const BASIC_PROFILE: LaborRuleProfile = {
  profile_id: "basic",
  name: "Basic (No Jurisdiction)",
  jurisdiction: "None — documentation only",
  assumptions: [
    "8-hour turnaround is a recommended minimum, not a legal requirement",
    "No meal break mandates enforced; purely advisory",
    "Consecutive day limit is 7 as a general best practice",
  ],
  min_turnaround_hours: 8,
  max_consecutive_work_hours: 8,
  required_break_minutes: 30,
  max_consecutive_work_days: 7,
  min_travel_buffer_hours: 4,
  travel_counts_as_work_day: false,
}

// ---------------------------------------------------------------------------
// Shift and travel leg input types
// ---------------------------------------------------------------------------

export interface ShiftWindow {
  shift_id: string
  person_id: string
  /** ISO datetime UTC. */
  start_utc: string
  end_utc: string
  /** Local date (YYYY-MM-DD) for consecutive-day counting. */
  local_date: string
  is_travel_leg: boolean
}

// ---------------------------------------------------------------------------
// Violation types
// ---------------------------------------------------------------------------

export type LaborViolationType =
  | "turnaround"            // insufficient rest between shifts
  | "meal_break_required"   // shift too long without break
  | "consecutive_days"      // too many work days in a row
  | "shift_overlap"         // two shifts overlap for same person
  | "travel_work_conflict"  // travel leg butts up against work shift with no buffer

export type LaborViolationSeverity = "error" | "warning"

export interface LaborViolation {
  violation_type: LaborViolationType
  severity: LaborViolationSeverity
  person_id: string
  /** Shift IDs involved. */
  shift_ids: string[]
  /** Human-readable explanation including the rule threshold. */
  detail: string
  /** The profile assumption that underpins this rule. */
  assumption: string
}

// ---------------------------------------------------------------------------
// Checkers (pure functions)
// ---------------------------------------------------------------------------

function toMs(iso: string): number {
  return new Date(iso).getTime()
}

function durationHours(startUtc: string, endUtc: string): number {
  return (toMs(endUtc) - toMs(startUtc)) / 3_600_000
}

/** Check turnaround violations for a person's ordered shifts. */
export function checkTurnaround(
  shifts: ShiftWindow[],
  profile: LaborRuleProfile,
): LaborViolation[] {
  const violations: LaborViolation[] = []
  const sorted = [...shifts].sort((a, b) => toMs(a.start_utc) - toMs(b.start_utc))

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]
    const curr = sorted[i]
    const gapHours = (toMs(curr.start_utc) - toMs(prev.end_utc)) / 3_600_000

    if (gapHours < profile.min_turnaround_hours) {
      violations.push({
        violation_type: "turnaround",
        severity: "error",
        person_id: prev.person_id,
        shift_ids: [prev.shift_id, curr.shift_id],
        detail: `Only ${gapHours.toFixed(1)}h rest between shifts (minimum ${profile.min_turnaround_hours}h).`,
        assumption: profile.assumptions[0],
      })
    }
  }
  return violations
}

/** Check meal/break requirement: any single shift exceeding max_consecutive_work_hours. */
export function checkMealBreaks(
  shifts: ShiftWindow[],
  profile: LaborRuleProfile,
): LaborViolation[] {
  return shifts
    .filter((s) => !s.is_travel_leg)
    .filter((s) => durationHours(s.start_utc, s.end_utc) > profile.max_consecutive_work_hours)
    .map((s) => ({
      violation_type: "meal_break_required" as const,
      severity: "warning" as const,
      person_id: s.person_id,
      shift_ids: [s.shift_id],
      detail: `Shift duration ${durationHours(s.start_utc, s.end_utc).toFixed(1)}h exceeds ${profile.max_consecutive_work_hours}h limit — ${profile.required_break_minutes}min break required.`,
      assumption: profile.assumptions[1] ?? profile.assumptions[0],
    }))
}

/** Check consecutive work days without a day off. */
export function checkConsecutiveDays(
  shifts: ShiftWindow[],
  profile: LaborRuleProfile,
): LaborViolation[] {
  const violations: LaborViolation[] = []

  // Collect work dates per person
  const datesByPerson = new Map<string, Set<string>>()
  for (const s of shifts) {
    if (!s.is_travel_leg || profile.travel_counts_as_work_day) {
      const set = datesByPerson.get(s.person_id) ?? new Set()
      set.add(s.local_date)
      datesByPerson.set(s.person_id, set)
    }
  }

  for (const [personId, dates] of datesByPerson) {
    const sorted = Array.from(dates).sort()
    let run = 1
    let runStart = sorted[0]

    for (let i = 1; i < sorted.length; i++) {
      const prev = new Date(sorted[i - 1])
      const curr = new Date(sorted[i])
      const diff = (curr.getTime() - prev.getTime()) / 86_400_000

      if (diff === 1) {
        run++
        if (run > profile.max_consecutive_work_days) {
          violations.push({
            violation_type: "consecutive_days",
            severity: "warning",
            person_id: personId,
            shift_ids: [],
            detail: `${run} consecutive work days starting ${runStart} exceeds limit of ${profile.max_consecutive_work_days}.`,
            assumption: profile.assumptions[0],
          })
        }
      } else {
        run = 1
        runStart = sorted[i]
      }
    }
  }
  return violations
}

/** Check shift overlaps for the same person. */
export function checkShiftOverlap(
  shifts: ShiftWindow[],
  _profile: LaborRuleProfile,
): LaborViolation[] {
  const violations: LaborViolation[] = []
  const byPerson = new Map<string, ShiftWindow[]>()

  for (const s of shifts) {
    const arr = byPerson.get(s.person_id) ?? []
    arr.push(s)
    byPerson.set(s.person_id, arr)
  }

  for (const [personId, personShifts] of byPerson) {
    const sorted = [...personShifts].sort((a, b) => toMs(a.start_utc) - toMs(b.start_utc))
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1]
      const curr = sorted[i]
      // Overlap when prev ends after curr starts
      if (toMs(prev.end_utc) > toMs(curr.start_utc)) {
        violations.push({
          violation_type: "shift_overlap",
          severity: "error",
          person_id: personId,
          shift_ids: [prev.shift_id, curr.shift_id],
          detail: `Shift '${prev.shift_id}' (ends ${prev.end_utc}) overlaps '${curr.shift_id}' (starts ${curr.start_utc}).`,
          assumption: "Assignments must not overlap for the same person",
        })
      }
    }
  }
  return violations
}

/** Check travel-work buffer violations: travel arrival too close to next work shift start. */
export function checkTravelWorkConflict(
  shifts: ShiftWindow[],
  profile: LaborRuleProfile,
): LaborViolation[] {
  if (profile.min_travel_buffer_hours === 0) return []

  const violations: LaborViolation[] = []
  const byPerson = new Map<string, ShiftWindow[]>()

  for (const s of shifts) {
    const arr = byPerson.get(s.person_id) ?? []
    arr.push(s)
    byPerson.set(s.person_id, arr)
  }

  for (const [personId, personShifts] of byPerson) {
    const sorted = [...personShifts].sort((a, b) => toMs(a.start_utc) - toMs(b.start_utc))
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1]
      const curr = sorted[i]
      // Travel leg followed by a work shift with insufficient buffer
      if (prev.is_travel_leg && !curr.is_travel_leg) {
        const bufferHours = (toMs(curr.start_utc) - toMs(prev.end_utc)) / 3_600_000
        if (bufferHours < profile.min_travel_buffer_hours) {
          violations.push({
            violation_type: "travel_work_conflict",
            severity: "warning",
            person_id: personId,
            shift_ids: [prev.shift_id, curr.shift_id],
            detail: `Only ${bufferHours.toFixed(1)}h between travel arrival and work call (minimum ${profile.min_travel_buffer_hours}h).`,
            assumption: profile.assumptions[0],
          })
        }
      }
    }
  }
  return violations
}

// ---------------------------------------------------------------------------
// Full rule check
// ---------------------------------------------------------------------------

export interface LaborRuleCheckResult {
  person_id: string
  profile_id: string
  violations: LaborViolation[]
  error_count: number
  warning_count: number
  /** True when no error-severity violations. */
  passes: boolean
}

export function checkLaborRules(args: {
  person_id: string
  shifts: ShiftWindow[]
  profile: LaborRuleProfile
}): LaborRuleCheckResult {
  const { person_id, shifts, profile } = args
  const personShifts = shifts.filter((s) => s.person_id === person_id)

  const violations: LaborViolation[] = [
    ...checkTurnaround(personShifts, profile),
    ...checkMealBreaks(personShifts, profile),
    ...checkConsecutiveDays(personShifts, profile),
    ...checkShiftOverlap(personShifts, profile),
    ...checkTravelWorkConflict(personShifts, profile),
  ]

  const errors = violations.filter((v) => v.severity === "error").length
  const warnings = violations.filter((v) => v.severity === "warning").length

  return {
    person_id,
    profile_id: profile.profile_id,
    violations,
    error_count: errors,
    warning_count: warnings,
    passes: errors === 0,
  }
}
