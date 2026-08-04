/**
 * WORK-404 — Availability and time-off (pure).
 *
 * Workers and managers enter availability intervals and time-off requests
 * with IANA time zone, recurrence, approval/source metadata. The scheduling
 * conflict engine uses only persisted truth — never hard-coded or demo data.
 *
 * Models:
 *   AvailabilityInterval  — positive availability window (available, preferred)
 *   TimeOffRequest        — absence request (pending/approved/denied/cancelled)
 *   AvailabilitySource    — origin tag (self_entered/manager_entered/imported/system)
 *   RecurrenceRule        — weekly/biweekly/monthly or none
 *   ConflictCheckResult   — output of the scheduling conflict engine
 *
 * Pure: no I/O, no `server-only`.
 */

// ---------------------------------------------------------------------------
// Availability interval
// ---------------------------------------------------------------------------

export type AvailabilityType = "available" | "preferred" | "unavailable"
export type AvailabilitySource = "self_entered" | "manager_entered" | "imported" | "system"

export type RecurrenceFrequency = "none" | "weekly" | "biweekly" | "monthly"

export interface RecurrenceRule {
  frequency: RecurrenceFrequency
  /** ISO date after which recurrence stops (null = indefinite). */
  until_date: string | null
  /** Days of week (0=Sun … 6=Sat) when frequency is weekly/biweekly. */
  days_of_week: number[]
}

export interface AvailabilityInterval {
  interval_id: string
  org_id: string
  person_id: string
  type: AvailabilityType
  /** ISO date (YYYY-MM-DD) — inclusive start. */
  start_date: string
  /** ISO date (YYYY-MM-DD) — inclusive end. Null = open-ended. */
  end_date: string | null
  /** Optional local time window within the day (HH:MM 24h). */
  start_time: string | null
  end_time: string | null
  iana_zone: string
  recurrence: RecurrenceRule
  source: AvailabilitySource
  notes: string | null
  created_by: string
  created_at: string
}

// ---------------------------------------------------------------------------
// Time-off request
// ---------------------------------------------------------------------------

export type TimeOffStatus = "pending" | "approved" | "denied" | "cancelled"

export const TIME_OFF_TRANSITIONS: Record<TimeOffStatus, TimeOffStatus[]> = {
  pending:   ["approved", "denied", "cancelled"],
  approved:  ["cancelled"],
  denied:    ["pending"],    // re-submit allowed
  cancelled: [],
}

export type TimeOffCategory =
  | "vacation"
  | "personal"
  | "sick"
  | "travel_prep"
  | "family"
  | "other"

export interface TimeOffRequest {
  request_id: string
  org_id: string
  person_id: string
  category: TimeOffCategory
  /** ISO dates — inclusive. */
  start_date: string
  end_date: string
  iana_zone: string
  status: TimeOffStatus
  reason: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface TimeOffTransitionResult {
  ok: boolean
  request: TimeOffRequest
  error?: string
}

export function transitionTimeOff(
  request: TimeOffRequest,
  toStatus: TimeOffStatus,
  reviewedBy: string,
  at: string,
): TimeOffTransitionResult {
  const allowed = TIME_OFF_TRANSITIONS[request.status]
  if (!allowed.includes(toStatus)) {
    return {
      ok: false,
      request,
      error: `Cannot transition time-off from '${request.status}' to '${toStatus}'.`,
    }
  }
  return {
    ok: true,
    request: {
      ...request,
      status: toStatus,
      reviewed_by: reviewedBy,
      reviewed_at: at,
      updated_at: at,
    },
  }
}

// ---------------------------------------------------------------------------
// Date-range overlap helper (pure, date-only)
// ---------------------------------------------------------------------------

/** Returns true when [aStart, aEnd] and [bStart, bEnd] overlap (inclusive). */
export function dateRangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  return aStart <= bEnd && bStart <= aEnd
}

/** Expand a recurrence rule over a date range, returning matching ISO dates. */
export function expandRecurrence(
  rule: RecurrenceRule,
  baseStart: string,
  baseEnd: string | null,
  windowStart: string,
  windowEnd: string,
): string[] {
  if (rule.frequency === "none") {
    // Single interval — check if it overlaps the window
    const end = baseEnd ?? windowEnd
    if (!dateRangesOverlap(baseStart, end, windowStart, windowEnd)) return []
    // Return dates within the interval AND window
    const dates: string[] = []
    const s = new Date(Math.max(new Date(baseStart).getTime(), new Date(windowStart).getTime()))
    const e = new Date(Math.min(new Date(end).getTime(), new Date(windowEnd).getTime()))
    for (const d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().slice(0, 10))
    }
    return dates
  }

  // Recurring: walk from baseStart forward, collecting matching dates within window
  const dates: string[] = []
  const until = rule.until_date
    ? new Date(Math.min(new Date(rule.until_date).getTime(), new Date(windowEnd).getTime()))
    : new Date(windowEnd)

  const winStart = new Date(windowStart)
  const winEnd = new Date(windowEnd)

  // When days_of_week is set, walk day-by-day and emit matching weekdays.
  // Otherwise step by the recurrence interval (7 / 14 / monthly).
  if (rule.days_of_week.length > 0) {
    let current = new Date(Math.max(new Date(baseStart).getTime(), winStart.getTime()))
    while (current <= until && current <= winEnd) {
      if (rule.days_of_week.includes(current.getUTCDay())) {
        dates.push(current.toISOString().slice(0, 10))
      }
      current = new Date(current.getTime() + 86_400_000)
    }
    return dates
  }

  const stepDays = rule.frequency === "monthly" ? null : rule.frequency === "biweekly" ? 14 : 7
  let current = new Date(baseStart)

  while (current <= until) {
    if (current >= winStart && current <= winEnd) {
      dates.push(current.toISOString().slice(0, 10))
    }
    if (rule.frequency === "monthly") {
      current = new Date(current)
      current.setMonth(current.getMonth() + 1)
    } else {
      current = new Date(current.getTime() + (stepDays! * 86_400_000))
    }
  }
  return dates
}

// ---------------------------------------------------------------------------
// Scheduling conflict engine
// ---------------------------------------------------------------------------

export type AvailabilityConflictType =
  | "time_off_approved"       // person has approved time off on this date
  | "time_off_pending"        // person has pending time off (warning)
  | "marked_unavailable"      // person has an explicit unavailable interval
  | "outside_availability"    // no positive availability interval covers this date

export interface AvailabilityConflict {
  conflict_type: AvailabilityConflictType
  person_id: string
  date: string
  /** true = hard block; false = warning only */
  is_blocking: boolean
  detail: string
}

export interface AvailabilityConflictCheckInput {
  person_id: string
  /** ISO dates to check. */
  dates: string[]
  availability_intervals: AvailabilityInterval[]
  time_off_requests: TimeOffRequest[]
  /**
   * When true, "outside_availability" is treated as a warning rather than a block.
   * Use for roles where positive availability is optional.
   */
  require_positive_availability?: boolean
}

export interface AvailabilityConflictCheckResult {
  person_id: string
  dates_checked: number
  conflicts: AvailabilityConflict[]
  blocking_conflicts: number
  warning_conflicts: number
  is_schedulable: boolean
}

export function checkAvailabilityConflicts(
  input: AvailabilityConflictCheckInput,
): AvailabilityConflictCheckResult {
  const {
    person_id,
    dates,
    availability_intervals,
    time_off_requests,
    require_positive_availability = true,
  } = input

  const conflicts: AvailabilityConflict[] = []

  for (const date of dates) {
    // 1. Approved time off — hard block
    const approvedTimeOff = time_off_requests.find(
      (r) =>
        r.person_id === person_id &&
        r.status === "approved" &&
        dateRangesOverlap(r.start_date, r.end_date, date, date),
    )
    if (approvedTimeOff) {
      conflicts.push({
        conflict_type: "time_off_approved",
        person_id,
        date,
        is_blocking: true,
        detail: `Approved ${approvedTimeOff.category} time off: ${approvedTimeOff.start_date}–${approvedTimeOff.end_date}`,
      })
      continue  // no need to check further for this date
    }

    // 2. Pending time off — warning
    const pendingTimeOff = time_off_requests.find(
      (r) =>
        r.person_id === person_id &&
        r.status === "pending" &&
        dateRangesOverlap(r.start_date, r.end_date, date, date),
    )
    if (pendingTimeOff) {
      conflicts.push({
        conflict_type: "time_off_pending",
        person_id,
        date,
        is_blocking: false,
        detail: `Pending ${pendingTimeOff.category} time off: ${pendingTimeOff.start_date}–${pendingTimeOff.end_date}`,
      })
    }

    // 3. Explicit unavailable interval
    const unavailable = availability_intervals.find(
      (iv) =>
        iv.person_id === person_id &&
        iv.type === "unavailable" &&
        dateRangesOverlap(iv.start_date, iv.end_date ?? date, date, date),
    )
    if (unavailable) {
      conflicts.push({
        conflict_type: "marked_unavailable",
        person_id,
        date,
        is_blocking: true,
        detail: `Explicitly marked unavailable: ${unavailable.start_date}–${unavailable.end_date ?? "open-ended"}`,
      })
      continue
    }

    // 4. No positive availability — configurable block/warning
    if (require_positive_availability) {
      const hasPositive = availability_intervals.some(
        (iv) =>
          iv.person_id === person_id &&
          (iv.type === "available" || iv.type === "preferred") &&
          dateRangesOverlap(iv.start_date, iv.end_date ?? date, date, date),
      )
      if (!hasPositive) {
        conflicts.push({
          conflict_type: "outside_availability",
          person_id,
          date,
          is_blocking: true,
          detail: `No positive availability interval covers ${date}`,
        })
      }
    }
  }

  const blocking = conflicts.filter((c) => c.is_blocking).length
  const warnings = conflicts.filter((c) => !c.is_blocking).length

  return {
    person_id,
    dates_checked: dates.length,
    conflicts,
    blocking_conflicts: blocking,
    warning_conflicts: warnings,
    is_schedulable: blocking === 0,
  }
}

// ---------------------------------------------------------------------------
// Bulk availability check (multiple persons)
// ---------------------------------------------------------------------------

export interface BulkAvailabilityCheckResult {
  results: AvailabilityConflictCheckResult[]
  schedulable_count: number
  blocked_count: number
  warning_only_count: number
}

export function checkBulkAvailability(
  inputs: AvailabilityConflictCheckInput[],
): BulkAvailabilityCheckResult {
  const results = inputs.map(checkAvailabilityConflicts)
  return {
    results,
    schedulable_count: results.filter((r) => r.is_schedulable && r.warning_conflicts === 0).length,
    blocked_count: results.filter((r) => !r.is_schedulable).length,
    warning_only_count: results.filter((r) => r.is_schedulable && r.warning_conflicts > 0).length,
  }
}
