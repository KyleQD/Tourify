/**
 * LOG-301 — Logistics task model with dependencies, checklist, and completion validation (pure).
 *
 * Generic logistics tasks are work-trackers that complement (not replace)
 * structured domain records. This module upgrades the task model to support:
 *
 *  - Blockers:           explicit blocker_task_ids that prevent status advance
 *  - Dependencies:       upstream tasks that must complete first
 *  - Repeated checklist: ordered checklist items with checked state + repeat policy
 *  - Source entity:      domain record + version that spawned this task
 *  - Completion validation: domain-specific validator that gates "complete"
 *  - Explicit failed/unknown states
 *
 * Pure: no I/O, no `server-only`.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LogisticsTaskStatus =
  | "backlog"
  | "planned"
  | "in_progress"
  | "blocked"
  | "ready_for_review"
  | "complete"
  | "failed"
  | "unknown"
  | "cancelled"

export type LogisticsTaskDomain =
  | "equipment"
  | "catering"
  | "transport"
  | "lodging"
  | "site_map"
  | "general"

export type ChecklistRepeatPolicy = "none" | "per_occurrence" | "per_stop"

export interface ChecklistItem {
  item_id: string
  label: string
  checked: boolean
  checked_by?: string | null
  checked_at?: string | null
  /** Required before task can complete. */
  required: boolean
  repeat_policy: ChecklistRepeatPolicy
}

export interface SourceEntityRef {
  entity_type: string
  entity_id: string
  entity_version?: string | null
}

export interface LogisticsTask {
  task_id: string
  org_id: string
  tour_id?: string | null
  event_id?: string | null
  stop_id?: string | null
  leg_id?: string | null
  domain: LogisticsTaskDomain
  category: string
  title: string
  description?: string | null
  owner_id?: string | null
  assignee_ids: string[]
  priority: "low" | "normal" | "high" | "critical"
  due_date?: string | null
  due_tz?: string | null
  status: LogisticsTaskStatus
  /** Task ids that block this task from progressing. */
  blocker_task_ids: string[]
  /** Task ids this task depends on (must complete before this can start). */
  dependency_task_ids: string[]
  checklist: ChecklistItem[]
  source?: SourceEntityRef | null
  /** If set, completion requires this domain record to validate. */
  completion_validator?: string | null
  created_by: string
  created_at: string
  updated_by: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// Completion validation
// ---------------------------------------------------------------------------

export type CompletionBlockerCode =
  | "unchecked_required_items"
  | "open_blockers"
  | "unmet_dependencies"
  | "domain_validator_pending"

export interface CompletionBlocker {
  code: CompletionBlockerCode
  detail: string
}

/**
 * Determine whether a task can transition to "complete".
 * Returns a list of blockers (empty = may complete).
 */
export function getCompletionBlockers(
  task: LogisticsTask,
  resolvedTaskIds: Set<string>,
): CompletionBlocker[] {
  const blockers: CompletionBlocker[] = []

  // Required checklist items
  const unchecked = task.checklist.filter((i) => i.required && !i.checked)
  if (unchecked.length > 0) {
    blockers.push({
      code: "unchecked_required_items",
      detail: `${unchecked.length} required checklist item(s) not checked: ${unchecked.map((i) => i.label).join(", ")}`,
    })
  }

  // Open blockers
  const openBlockers = task.blocker_task_ids.filter((id) => !resolvedTaskIds.has(id))
  if (openBlockers.length > 0) {
    blockers.push({
      code: "open_blockers",
      detail: `${openBlockers.length} blocker task(s) not resolved: ${openBlockers.join(", ")}`,
    })
  }

  // Unmet dependencies
  const unmetDeps = task.dependency_task_ids.filter((id) => !resolvedTaskIds.has(id))
  if (unmetDeps.length > 0) {
    blockers.push({
      code: "unmet_dependencies",
      detail: `${unmetDeps.length} dependency task(s) not complete: ${unmetDeps.join(", ")}`,
    })
  }

  // Domain validator pending
  if (task.completion_validator) {
    blockers.push({
      code: "domain_validator_pending",
      detail: `Completion requires domain validation from: ${task.completion_validator}`,
    })
  }

  return blockers
}

// ---------------------------------------------------------------------------
// State machine
// ---------------------------------------------------------------------------

export const TASK_STATUS_TRANSITIONS: Record<LogisticsTaskStatus, LogisticsTaskStatus[]> = {
  backlog:          ["planned", "cancelled"],
  planned:          ["in_progress", "blocked", "cancelled"],
  in_progress:      ["blocked", "ready_for_review", "complete", "failed", "cancelled"],
  blocked:          ["planned", "in_progress", "cancelled"],
  ready_for_review: ["in_progress", "complete", "failed", "cancelled"],
  complete:         ["in_progress"], // re-open
  failed:           ["planned", "cancelled"],
  unknown:          ["planned", "cancelled"],
  cancelled:        ["backlog"],
}

export function canTransitionTask(
  from: LogisticsTaskStatus,
  to: LogisticsTaskStatus,
): boolean {
  return TASK_STATUS_TRANSITIONS[from]?.includes(to) ?? false
}

export interface TaskTransitionResult {
  status: "ok" | "blocked_by_completion" | "invalid_transition"
  task: LogisticsTask | null
  blockers?: CompletionBlocker[]
  error?: string
}

export function transitionTask(
  task: LogisticsTask,
  toStatus: LogisticsTaskStatus,
  actor: string,
  at: string,
  resolvedTaskIds: Set<string>,
): TaskTransitionResult {
  if (!canTransitionTask(task.status, toStatus)) {
    return {
      status: "invalid_transition",
      task,
      error: `Cannot transition from '${task.status}' to '${toStatus}'.`,
    }
  }

  if (toStatus === "complete") {
    const completionBlockers = getCompletionBlockers(task, resolvedTaskIds)
    if (completionBlockers.length > 0) {
      return { status: "blocked_by_completion", task, blockers: completionBlockers }
    }
  }

  return {
    status: "ok",
    task: { ...task, status: toStatus, updated_by: actor, updated_at: at },
  }
}

// ---------------------------------------------------------------------------
// Checklist helpers
// ---------------------------------------------------------------------------

export function checkItem(
  task: LogisticsTask,
  itemId: string,
  actor: string,
  at: string,
): LogisticsTask {
  return {
    ...task,
    checklist: task.checklist.map((i) =>
      i.item_id === itemId ? { ...i, checked: true, checked_by: actor, checked_at: at } : i,
    ),
    updated_by: actor,
    updated_at: at,
  }
}

export function uncheckItem(
  task: LogisticsTask,
  itemId: string,
  actor: string,
  at: string,
): LogisticsTask {
  return {
    ...task,
    checklist: task.checklist.map((i) =>
      i.item_id === itemId ? { ...i, checked: false, checked_by: null, checked_at: null } : i,
    ),
    updated_by: actor,
    updated_at: at,
  }
}

export function allRequiredItemsChecked(task: LogisticsTask): boolean {
  return task.checklist.every((i) => !i.required || i.checked)
}
