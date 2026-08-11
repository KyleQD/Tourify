/**
 * LIVE-410 — Planned vs actual timeline capture.
 *
 * Operators record actual start/end/delay times for run-of-show items.
 * Core invariant: the published planned version is NEVER mutated.
 * Actual data lives in a separate ActualRecord overlay.
 *
 * Supports:
 *  - Recording actual start, end, and delay (with reason)
 *  - Deriving variance from planned times
 *  - Downstream notification eligibility (late-start / significant delay)
 *  - Operator/timestamp audit on every mutation
 *
 * Pure: no I/O, no Supabase imports.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ActualRecordStatus =
  | "not_started"
  | "in_progress"
  | "completed"
  | "skipped"

/** A non-mutating overlay for one ROS item's actual timing. */
export interface ActualRecord {
  /** Matches the ROS item's item_id. */
  ros_item_id: string
  event_id: string
  /** UTC ISO-8601 or null. */
  actual_start_utc: string | null
  actual_end_utc: string | null
  status: ActualRecordStatus
  /** Sum of all reported delay minutes. */
  total_delay_minutes: number
  delay_entries: DelayEntry[]
  operator_id: string
  last_updated_at: string
}

export interface DelayEntry {
  delay_id: string
  minutes: number
  reason: string
  reported_by: string
  reported_at: string
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createActualRecord(params: {
  ros_item_id: string
  event_id: string
  operator_id: string
  now: string
}): ActualRecord {
  return {
    ros_item_id: params.ros_item_id,
    event_id: params.event_id,
    actual_start_utc: null,
    actual_end_utc: null,
    status: "not_started",
    total_delay_minutes: 0,
    delay_entries: [],
    operator_id: params.operator_id,
    last_updated_at: params.now,
  }
}

// ---------------------------------------------------------------------------
// Mark actual start
// ---------------------------------------------------------------------------

export interface ActualUpdateResult {
  ok: boolean
  record: ActualRecord | null
  error?: string
}

export function markActualStart(
  record: ActualRecord,
  actual_start_utc: string,
  operator_id: string,
  now: string,
): ActualUpdateResult {
  if (record.status === "completed" || record.status === "skipped") {
    return {
      ok: false,
      record: null,
      error: `Cannot mark start on a ${record.status} record.`,
    }
  }
  return {
    ok: true,
    record: {
      ...record,
      actual_start_utc,
      status: "in_progress",
      operator_id,
      last_updated_at: now,
    },
  }
}

// ---------------------------------------------------------------------------
// Mark actual end
// ---------------------------------------------------------------------------

export function markActualEnd(
  record: ActualRecord,
  actual_end_utc: string,
  operator_id: string,
  now: string,
): ActualUpdateResult {
  if (record.status === "not_started") {
    return {
      ok: false,
      record: null,
      error: "Cannot mark end before item has started.",
    }
  }
  if (record.status === "skipped") {
    return {
      ok: false,
      record: null,
      error: "Cannot mark end on a skipped record.",
    }
  }
  return {
    ok: true,
    record: {
      ...record,
      actual_end_utc,
      status: "completed",
      operator_id,
      last_updated_at: now,
    },
  }
}

// ---------------------------------------------------------------------------
// Mark skipped
// ---------------------------------------------------------------------------

export function markSkipped(
  record: ActualRecord,
  operator_id: string,
  now: string,
): ActualUpdateResult {
  if (record.status === "completed") {
    return { ok: false, record: null, error: "Cannot skip a completed record." }
  }
  return {
    ok: true,
    record: {
      ...record,
      status: "skipped",
      operator_id,
      last_updated_at: now,
    },
  }
}

// ---------------------------------------------------------------------------
// Report delay
// ---------------------------------------------------------------------------

export function reportDelay(
  record: ActualRecord,
  params: {
    delay_id: string
    minutes: number
    reason: string
    reported_by: string
    reported_at: string
  },
): ActualUpdateResult {
  if (params.minutes <= 0) {
    return { ok: false, record: null, error: "Delay minutes must be positive." }
  }
  if (!params.reason.trim()) {
    return { ok: false, record: null, error: "Delay reason is required." }
  }
  const entry: DelayEntry = {
    delay_id: params.delay_id,
    minutes: params.minutes,
    reason: params.reason,
    reported_by: params.reported_by,
    reported_at: params.reported_at,
  }
  return {
    ok: true,
    record: {
      ...record,
      total_delay_minutes: record.total_delay_minutes + params.minutes,
      delay_entries: [...record.delay_entries, entry],
      operator_id: params.reported_by,
      last_updated_at: params.reported_at,
    },
  }
}

// ---------------------------------------------------------------------------
// Variance computation
// ---------------------------------------------------------------------------

export interface PlannedTimes {
  planned_start_utc: string
  planned_end_utc: string | null
}

export interface TimelineVariance {
  ros_item_id: string
  start_variance_minutes: number | null
  end_variance_minutes: number | null
  is_late_start: boolean
  is_late_end: boolean
  /** True if variance exceeds the significance threshold. */
  is_significant: boolean
  total_delay_minutes: number
}

const SIGNIFICANT_VARIANCE_MINUTES = 15

/**
 * Compute variance between planned and actual times.
 * Positive variance means later than planned.
 * The planned record is not mutated.
 */
export function computeTimelineVariance(
  planned: PlannedTimes,
  actual: ActualRecord,
  significantThresholdMinutes = SIGNIFICANT_VARIANCE_MINUTES,
): TimelineVariance {
  const plannedStartMs = new Date(planned.planned_start_utc).getTime()

  let start_variance_minutes: number | null = null
  let end_variance_minutes: number | null = null

  if (actual.actual_start_utc) {
    const actualStartMs = new Date(actual.actual_start_utc).getTime()
    start_variance_minutes = Math.round((actualStartMs - plannedStartMs) / 60_000)
  }

  if (planned.planned_end_utc && actual.actual_end_utc) {
    const plannedEndMs = new Date(planned.planned_end_utc).getTime()
    const actualEndMs = new Date(actual.actual_end_utc).getTime()
    end_variance_minutes = Math.round((actualEndMs - plannedEndMs) / 60_000)
  }

  const is_late_start = start_variance_minutes !== null && start_variance_minutes > 0
  const is_late_end = end_variance_minutes !== null && end_variance_minutes > 0
  const maxVariance = Math.max(
    Math.abs(start_variance_minutes ?? 0),
    Math.abs(end_variance_minutes ?? 0),
    actual.total_delay_minutes,
  )
  const is_significant = maxVariance >= significantThresholdMinutes

  return {
    ros_item_id: actual.ros_item_id,
    start_variance_minutes,
    end_variance_minutes,
    is_late_start,
    is_late_end,
    is_significant,
    total_delay_minutes: actual.total_delay_minutes,
  }
}

// ---------------------------------------------------------------------------
// Notification eligibility
// ---------------------------------------------------------------------------

export type VarianceNotificationReason =
  | "late_start"
  | "significant_delay"
  | "late_end"

export interface VarianceNotification {
  ros_item_id: string
  reasons: VarianceNotificationReason[]
  /** True if any notification should be triggered. */
  should_notify: boolean
}

export function computeVarianceNotification(
  variance: TimelineVariance,
): VarianceNotification {
  const reasons: VarianceNotificationReason[] = []
  if (variance.is_late_start) reasons.push("late_start")
  if (variance.total_delay_minutes >= SIGNIFICANT_VARIANCE_MINUTES) reasons.push("significant_delay")
  if (variance.is_late_end) reasons.push("late_end")

  return {
    ros_item_id: variance.ros_item_id,
    reasons,
    should_notify: reasons.length > 0,
  }
}

// ---------------------------------------------------------------------------
// Summary view across multiple items
// ---------------------------------------------------------------------------

export interface ActualsSummary {
  total_items: number
  not_started_count: number
  in_progress_count: number
  completed_count: number
  skipped_count: number
  delayed_item_count: number
  max_delay_minutes: number
  significant_variance_count: number
}

export function summarizeActuals(
  records: readonly ActualRecord[],
  plannedMap: Record<string, PlannedTimes>,
): ActualsSummary {
  let not_started_count = 0
  let in_progress_count = 0
  let completed_count = 0
  let skipped_count = 0
  let delayed_item_count = 0
  let max_delay_minutes = 0
  let significant_variance_count = 0

  for (const r of records) {
    if (r.status === "not_started") not_started_count += 1
    else if (r.status === "in_progress") in_progress_count += 1
    else if (r.status === "completed") completed_count += 1
    else if (r.status === "skipped") skipped_count += 1

    if (r.total_delay_minutes > 0) {
      delayed_item_count += 1
      if (r.total_delay_minutes > max_delay_minutes) {
        max_delay_minutes = r.total_delay_minutes
      }
    }

    const planned = plannedMap[r.ros_item_id]
    if (planned) {
      const v = computeTimelineVariance(planned, r)
      if (v.is_significant) significant_variance_count += 1
    }
  }

  return {
    total_items: records.length,
    not_started_count,
    in_progress_count,
    completed_count,
    skipped_count,
    delayed_item_count,
    max_delay_minutes,
    significant_variance_count,
  }
}
