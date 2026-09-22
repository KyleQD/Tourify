/**
 * LOG-302 — Tour logistics board.
 *
 * Provides read-model views of logistics tasks across a tour, supporting
 * filtering/grouping by: tour, stop, leg, department (domain), owner, due-date
 * window, blocker state, and domain.
 *
 * Also provides:
 *  - Bulk eligibility preview: which tasks in a set can transition to a target
 *    status, and which cannot (with per-item reasons).
 *  - Bulk execute that returns partial-failure results per task.
 *
 * All view helpers are pure (no I/O). The command executor is a thin shell that
 * callers supply real I/O to via the `TransitionExecutor` callback.
 */

import {
  canTransitionExtendedStatus,
  type ExtendedTaskStatus,
  type TaskBoardSummary,
  buildTaskBoardSummary,
} from "@/lib/admin/logistics-task-dependencies"
import { type LogisticsTaskDomain } from "@/lib/admin/logistics-task-taxonomy"

// ---------------------------------------------------------------------------
// Core task shape for the board (fields needed for all view/filter helpers)
// ---------------------------------------------------------------------------

export interface LogisticsBoardTask {
  id: string
  title: string
  status: ExtendedTaskStatus
  priority: "low" | "medium" | "high" | "urgent"
  domain: LogisticsTaskDomain
  /** Nullable if not yet assigned. */
  owner_user_id: string | null
  tour_id: string | null
  stop_id: string | null
  leg_id: string | null
  due_date: string | null   // ISO date (YYYY-MM-DD)
  /** Category within domain (e.g. "meal_service", "load_in"). */
  category: string | null
  /** True if this task is currently blocked by a hard dependency (failed/cancelled upstream). */
  hard_blocked: boolean
  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// Filter / view helpers
// ---------------------------------------------------------------------------

export interface BoardFilter {
  tour_id?: string | null
  stop_id?: string | null
  leg_id?: string | null
  /** Filter to one or more domains. */
  domains?: LogisticsTaskDomain[]
  /** Filter to specific statuses. */
  statuses?: ExtendedTaskStatus[]
  owner_user_id?: string | null
  /** Only tasks with due_date <= this ISO date string. */
  due_before?: string | null
  /** Only tasks in `blocked` status or with hard_blocked=true. */
  blockers_only?: boolean
  /** Only tasks that are NOT in a terminal state. */
  active_only?: boolean
}

/** Apply a filter to a list of board tasks (pure). */
export function filterBoardTasks(
  tasks: readonly LogisticsBoardTask[],
  filter: BoardFilter,
): LogisticsBoardTask[] {
  return tasks.filter((task) => {
    if (filter.tour_id !== undefined && task.tour_id !== filter.tour_id) return false
    if (filter.stop_id !== undefined && task.stop_id !== filter.stop_id) return false
    if (filter.leg_id !== undefined && task.leg_id !== filter.leg_id) return false
    if (filter.domains && filter.domains.length > 0 && !filter.domains.includes(task.domain)) return false
    if (filter.statuses && filter.statuses.length > 0 && !filter.statuses.includes(task.status)) return false
    if (filter.owner_user_id !== undefined && task.owner_user_id !== filter.owner_user_id) return false
    if (filter.due_before && task.due_date && task.due_date > filter.due_before) return false
    if (filter.blockers_only && !task.hard_blocked && task.status !== "blocked") return false
    if (filter.active_only) {
      const terminal = new Set<ExtendedTaskStatus>(["complete", "cancelled", "failed"])
      if (terminal.has(task.status)) return false
    }
    return true
  })
}

// ---------------------------------------------------------------------------
// Grouping helpers
// ---------------------------------------------------------------------------

export type GroupKey =
  | "domain"
  | "status"
  | "owner"
  | "tour"
  | "stop"
  | "leg"
  | "due_date"

/** Group tasks by a single dimension. Returns a record keyed by dimension value. */
export function groupBoardTasks(
  tasks: readonly LogisticsBoardTask[],
  by: GroupKey,
): Record<string, LogisticsBoardTask[]> {
  const groups: Record<string, LogisticsBoardTask[]> = {}

  const key = (task: LogisticsBoardTask): string => {
    switch (by) {
      case "domain":      return task.domain
      case "status":      return task.status
      case "owner":       return task.owner_user_id ?? "__unassigned__"
      case "tour":        return task.tour_id ?? "__no_tour__"
      case "stop":        return task.stop_id ?? "__no_stop__"
      case "leg":         return task.leg_id ?? "__no_leg__"
      case "due_date":    return task.due_date ?? "__no_due__"
    }
  }

  for (const task of tasks) {
    const k = key(task)
    if (!groups[k]) groups[k] = []
    groups[k].push(task)
  }

  return groups
}

/** Build a per-group board summary (counts by status, blocker flags). */
export function buildGroupedBoardSummaries(
  groups: Record<string, readonly LogisticsBoardTask[]>,
): Record<string, TaskBoardSummary> {
  const result: Record<string, TaskBoardSummary> = {}
  for (const [key, tasks] of Object.entries(groups)) {
    result[key] = buildTaskBoardSummary(tasks)
  }
  return result
}

// ---------------------------------------------------------------------------
// Bulk transition preview (eligibility check)
// ---------------------------------------------------------------------------

export type BulkIneligibilityReason =
  | "illegal_status_transition"
  | "task_is_terminal"
  | "access_denied"

export interface BulkTaskEligibility {
  task_id: string
  eligible: boolean
  reason?: BulkIneligibilityReason
  reason_detail?: string
}

export interface BulkTransitionPreview {
  target_status: ExtendedTaskStatus
  eligible: BulkTaskEligibility[]
  eligible_count: number
  ineligible_count: number
  total: number
}

/**
 * Preview which tasks in `taskIds` can transition to `targetStatus`.
 *
 * `taskStatusMap`: task_id → current ExtendedTaskStatus (caller resolves).
 * `accessDeniedIds`: optional set of task IDs the caller is not authorized to mutate.
 */
export function previewBulkTransition(args: {
  taskIds: readonly string[]
  targetStatus: ExtendedTaskStatus
  taskStatusMap: Record<string, ExtendedTaskStatus | undefined>
  accessDeniedIds?: ReadonlySet<string>
}): BulkTransitionPreview {
  const eligible: BulkTaskEligibility[] = []
  const TERMINAL: ReadonlySet<ExtendedTaskStatus> = new Set(["complete", "cancelled", "failed"])

  for (const id of args.taskIds) {
    if (args.accessDeniedIds?.has(id)) {
      eligible.push({
        task_id: id,
        eligible: false,
        reason: "access_denied",
        reason_detail: "Caller does not have access to this task",
      })
      continue
    }

    const current = args.taskStatusMap[id]
    if (!current) {
      eligible.push({
        task_id: id,
        eligible: false,
        reason: "illegal_status_transition",
        reason_detail: "Task status unknown or task not found",
      })
      continue
    }

    if (current === args.targetStatus) {
      // Idempotent — treat as eligible (no-op write)
      eligible.push({ task_id: id, eligible: true })
      continue
    }

    if (TERMINAL.has(current)) {
      eligible.push({
        task_id: id,
        eligible: false,
        reason: "task_is_terminal",
        reason_detail: `Task is in terminal state '${current}' and cannot be changed`,
      })
      continue
    }

    if (!canTransitionExtendedStatus(current, args.targetStatus)) {
      eligible.push({
        task_id: id,
        eligible: false,
        reason: "illegal_status_transition",
        reason_detail: `Status transition ${current} → ${args.targetStatus} is not allowed`,
      })
      continue
    }

    eligible.push({ task_id: id, eligible: true })
  }

  const eligible_count = eligible.filter((e) => e.eligible).length
  return {
    target_status: args.targetStatus,
    eligible,
    eligible_count,
    ineligible_count: eligible.length - eligible_count,
    total: eligible.length,
  }
}

// ---------------------------------------------------------------------------
// Bulk transition executor (partial-failure, one task at a time)
// ---------------------------------------------------------------------------

export interface BulkTransitionItemResult {
  task_id: string
  ok: boolean
  skipped?: boolean  // idempotent (already at target status)
  error?: string
}

export interface BulkTransitionResult {
  target_status: ExtendedTaskStatus
  results: BulkTransitionItemResult[]
  succeeded: number
  skipped: number
  failed: number
  total: number
}

/**
 * Execute a bulk status transition, accepting partial failures.
 *
 * Only eligible tasks (from preview) are attempted. The `executor` callback
 * performs the actual I/O for a single task and throws on failure.
 */
export async function executeBulkTransition(args: {
  preview: BulkTransitionPreview
  executor: (taskId: string, targetStatus: ExtendedTaskStatus) => Promise<void>
}): Promise<BulkTransitionResult> {
  const { preview } = args
  const results: BulkTransitionItemResult[] = []

  for (const entry of preview.eligible) {
    if (!entry.eligible) {
      results.push({ task_id: entry.task_id, ok: false, error: entry.reason_detail ?? entry.reason })
      continue
    }

    // Check if already at target (idempotent no-op)
    // We trust preview.eligible[i].eligible === true means transition is valid.
    // The actual current status is re-read by executor; if it's already target, we mark skipped.
    try {
      await args.executor(entry.task_id, preview.target_status)
      results.push({ task_id: entry.task_id, ok: true })
    } catch (err) {
      results.push({
        task_id: entry.task_id,
        ok: false,
        error: err instanceof Error ? err.message : "transition failed",
      })
    }
  }

  return {
    target_status: preview.target_status,
    results,
    succeeded: results.filter((r) => r.ok && !r.skipped).length,
    skipped: results.filter((r) => r.skipped).length,
    failed: results.filter((r) => !r.ok).length,
    total: results.length,
  }
}

// ---------------------------------------------------------------------------
// Board view — full tour logistics overview
// ---------------------------------------------------------------------------

export interface TourLogisticsBoardView {
  tour_id: string
  filter_applied: BoardFilter
  tasks: LogisticsBoardTask[]
  total: number
  summary: TaskBoardSummary
  /** Per-domain breakdown. */
  by_domain: Record<string, TaskBoardSummary>
  /** Per-stop breakdown (only if tasks have stop_id). */
  by_stop: Record<string, TaskBoardSummary>
  /** Per-owner breakdown. */
  by_owner: Record<string, TaskBoardSummary>
}

/**
 * Build a full tour logistics board view from a flat task list.
 * Pure; no I/O.
 */
export function buildTourLogisticsBoardView(
  tourId: string,
  allTasks: readonly LogisticsBoardTask[],
  filter: BoardFilter = {},
): TourLogisticsBoardView {
  const tasks = filterBoardTasks(allTasks, { ...filter, tour_id: tourId })

  const byDomainGroups = groupBoardTasks(tasks, "domain")
  const byStopGroups = groupBoardTasks(tasks, "stop")
  const byOwnerGroups = groupBoardTasks(tasks, "owner")

  return {
    tour_id: tourId,
    filter_applied: filter,
    tasks,
    total: tasks.length,
    summary: buildTaskBoardSummary(tasks),
    by_domain: buildGroupedBoardSummaries(byDomainGroups),
    by_stop: buildGroupedBoardSummaries(byStopGroups),
    by_owner: buildGroupedBoardSummaries(byOwnerGroups),
  }
}
