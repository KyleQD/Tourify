/**
 * LOG-301 — Logistics task dependencies, blockers, checklists, and completion
 * validation.
 *
 * Extends the base task model (LOG-102/103) with:
 *  - Dependency / blocker links (another task must be complete before this one)
 *  - Repeated checklist items (per-task templates with per-item status)
 *  - Source entity/version tracking (the domain record this task is work for)
 *  - Completion validation (required checks gate `completed` status)
 *  - Explicit `failed` and `unknown` states for tasks that cannot complete
 *
 * All helpers are pure (no I/O); callers supply resolved domain data.
 */

// ---------------------------------------------------------------------------
// Extended task statuses (superset of LOG-103 set; `completed`/`cancelled` are
// shared; `failed` and `unknown` are new states added by LOG-301)
// ---------------------------------------------------------------------------

export const EXTENDED_TASK_STATUSES = [
  "pending",
  "confirmed",
  "in_progress",
  "blocked",
  "ready_for_review",
  "complete",
  "cancelled",
  "failed",
  "unknown",
] as const

export type ExtendedTaskStatus = (typeof EXTENDED_TASK_STATUSES)[number]

/** Terminal states: no further transitions allowed. */
export const TERMINAL_TASK_STATUSES = new Set<ExtendedTaskStatus>([
  "complete",
  "cancelled",
  "failed",
])

/** Non-terminal states: task is still actionable. */
export function isTerminalStatus(status: ExtendedTaskStatus): boolean {
  return TERMINAL_TASK_STATUSES.has(status)
}

export const EXTENDED_STATUS_TRANSITIONS: Record<
  ExtendedTaskStatus,
  readonly ExtendedTaskStatus[]
> = {
  pending: ["confirmed", "in_progress", "blocked", "cancelled", "unknown"],
  confirmed: ["in_progress", "blocked", "cancelled", "unknown"],
  in_progress: ["ready_for_review", "blocked", "failed", "cancelled", "unknown"],
  blocked: ["pending", "confirmed", "in_progress", "cancelled", "unknown"],
  ready_for_review: ["in_progress", "complete", "failed", "cancelled"],
  complete: [],
  cancelled: [],
  failed: ["pending"], // re-open allowed
  unknown: ["pending", "cancelled"],
}

export function canTransitionExtendedStatus(from: ExtendedTaskStatus, to: ExtendedTaskStatus): boolean {
  if (from === to) return true
  return (EXTENDED_STATUS_TRANSITIONS[from] as readonly ExtendedTaskStatus[]).includes(to)
}

export class ExtendedStatusTransitionError extends Error {
  readonly status = 422
  readonly code = "illegal_extended_task_status_transition"
  constructor(from: ExtendedTaskStatus, to: ExtendedTaskStatus) {
    super(`Illegal task status transition: ${from} → ${to}`)
    this.name = "ExtendedStatusTransitionError"
  }
}

export function assertExtendedStatusTransition(
  from: ExtendedTaskStatus,
  to: ExtendedTaskStatus,
): void {
  if (!canTransitionExtendedStatus(from, to))
    throw new ExtendedStatusTransitionError(from, to)
}

// ---------------------------------------------------------------------------
// Dependency / blocker links
// ---------------------------------------------------------------------------

export type DependencyRelation = "blocks" | "depends_on"

export interface TaskDependencyLink {
  /** The task that is the blocker/dependency. */
  dependency_task_id: string
  /** `blocks`: the linked task must complete before this task can start.
   *  `depends_on`: semantic alias for `blocks` from the dependant's perspective.
   *  Both encode: `dependency_task_id` must be `complete` before the current task
   *  may leave `pending`/`confirmed`.
   */
  relation: DependencyRelation
}

export interface DependencyCheckResult {
  /** Whether all upstream dependencies are satisfied (complete). */
  ok: boolean
  /** IDs of tasks that are not yet complete. */
  unresolved: string[]
  /** IDs of tasks in a terminal non-complete state (failed/cancelled) blocking this task. */
  hard_blocked_by: string[]
}

/**
 * Evaluate whether all dependency links are satisfied given known status map.
 * `statusMap`: task_id → ExtendedTaskStatus (caller resolves from DB).
 */
export function evaluateDependencies(
  links: readonly TaskDependencyLink[],
  statusMap: Record<string, ExtendedTaskStatus>,
): DependencyCheckResult {
  const unresolved: string[] = []
  const hard_blocked_by: string[] = []

  for (const link of links) {
    const depStatus = statusMap[link.dependency_task_id]
    if (!depStatus || depStatus === "unknown") {
      unresolved.push(link.dependency_task_id)
    } else if (depStatus !== "complete") {
      if (depStatus === "cancelled" || depStatus === "failed") {
        hard_blocked_by.push(link.dependency_task_id)
      } else {
        unresolved.push(link.dependency_task_id)
      }
    }
  }

  return {
    ok: unresolved.length === 0 && hard_blocked_by.length === 0,
    unresolved,
    hard_blocked_by,
  }
}

// ---------------------------------------------------------------------------
// Repeated checklist items
// ---------------------------------------------------------------------------

export type ChecklistItemStatus = "pending" | "passed" | "failed" | "skipped"

export interface ChecklistItemTemplate {
  id: string
  label: string
  /** When true the item must be `passed` before the task can transition to `complete`. */
  required: boolean
  /** Category for grouping (e.g. "pre_show", "load_in"). */
  category?: string
}

export interface ChecklistItemState extends ChecklistItemTemplate {
  status: ChecklistItemStatus
  completed_by?: string | null
  completed_at?: string | null
  notes?: string | null
}

/** Build initial checklist state from a template (all items start `pending`). */
export function buildChecklistFromTemplate(
  templates: readonly ChecklistItemTemplate[],
): ChecklistItemState[] {
  return templates.map((t) => ({
    ...t,
    status: "pending",
    completed_by: null,
    completed_at: null,
    notes: null,
  }))
}

/** Update a single checklist item by id; returns new array (immutable). */
export function updateChecklistItem(
  items: readonly ChecklistItemState[],
  itemId: string,
  update: Partial<Pick<ChecklistItemState, "status" | "completed_by" | "completed_at" | "notes">>,
): ChecklistItemState[] {
  return items.map((item) =>
    item.id === itemId ? { ...item, ...update } : item,
  )
}

// ---------------------------------------------------------------------------
// Source entity / version tracking
// ---------------------------------------------------------------------------

export interface SourceEntityRef {
  /** Domain table name (must be from LOGISTICS_STRUCTURED_AUTHORITY allowedSourceTypes). */
  source_type: string
  source_id: string
  /** Snapshot of the domain record's version at the time the task was created/updated.
   *  Useful for detecting stale task state when the domain record mutates. */
  source_version?: string | null
  /** Human-readable summary of the source entity for display; never used for logic. */
  source_summary?: string | null
}

export interface SourceEntityStaleness {
  /** Whether the task's tracked version differs from the domain record's current version. */
  is_stale: boolean
  task_version: string | null
  current_version: string | null
}

export function evaluateSourceEntityStaleness(
  ref: SourceEntityRef,
  currentVersion: string | null,
): SourceEntityStaleness {
  const taskVersion = ref.source_version ?? null
  return {
    is_stale: taskVersion !== null && currentVersion !== null && taskVersion !== currentVersion,
    task_version: taskVersion,
    current_version: currentVersion,
  }
}

// ---------------------------------------------------------------------------
// Completion validation
// ---------------------------------------------------------------------------

export type CompletionValidationCode =
  | "checklist_required_item_not_passed"
  | "dependency_not_complete"
  | "dependency_hard_blocked"
  | "status_transition_illegal"
  | "domain_validator_rejected"

export interface CompletionValidationIssue {
  code: CompletionValidationCode
  message: string
  /** The relevant item ID (checklist item, dependency task, etc.). */
  ref_id?: string
}

export interface CompletionValidationResult {
  allowed: boolean
  issues: CompletionValidationIssue[]
}

/**
 * Validate whether a task may transition to `complete`.
 *
 * Rules:
 * 1. Target status must be reachable from `currentStatus`.
 * 2. All required checklist items must be `passed`.
 * 3. All dependency links must be satisfied.
 * 4. An optional domain-validator callback may add issues.
 */
export function validateTaskCompletion(args: {
  currentStatus: ExtendedTaskStatus
  targetStatus: "complete"
  checklist: readonly ChecklistItemState[]
  dependencyLinks: readonly TaskDependencyLink[]
  dependencyStatusMap: Record<string, ExtendedTaskStatus>
  /** Optional external validator that may inject domain-specific issues. */
  domainValidator?: () => CompletionValidationIssue[]
}): CompletionValidationResult {
  const issues: CompletionValidationIssue[] = []

  // 1. Status transition validity
  if (!canTransitionExtendedStatus(args.currentStatus, "complete")) {
    issues.push({
      code: "status_transition_illegal",
      message: `Cannot transition from '${args.currentStatus}' to 'complete'`,
    })
  }

  // 2. Required checklist items
  for (const item of args.checklist) {
    if (item.required && item.status !== "passed") {
      issues.push({
        code: "checklist_required_item_not_passed",
        message: `Required checklist item '${item.label}' is ${item.status}`,
        ref_id: item.id,
      })
    }
  }

  // 3. Dependencies
  const depCheck = evaluateDependencies(args.dependencyLinks, args.dependencyStatusMap)
  for (const id of depCheck.unresolved) {
    issues.push({
      code: "dependency_not_complete",
      message: `Dependency task ${id} is not yet complete`,
      ref_id: id,
    })
  }
  for (const id of depCheck.hard_blocked_by) {
    issues.push({
      code: "dependency_hard_blocked",
      message: `Dependency task ${id} is cancelled or failed`,
      ref_id: id,
    })
  }

  // 4. Domain validator
  if (args.domainValidator) {
    issues.push(...args.domainValidator())
  }

  return { allowed: issues.length === 0, issues }
}

// ---------------------------------------------------------------------------
// Board summary helpers (used by LOG-302)
// ---------------------------------------------------------------------------

export interface TaskBoardSummary {
  total: number
  by_status: Record<ExtendedTaskStatus, number>
  blocked_count: number
  failed_count: number
  complete_count: number
  has_unresolved_hard_blockers: boolean
}

export function buildTaskBoardSummary(
  tasks: ReadonlyArray<{ status: ExtendedTaskStatus }>,
): TaskBoardSummary {
  const by_status = Object.fromEntries(
    EXTENDED_TASK_STATUSES.map((s) => [s, 0]),
  ) as Record<ExtendedTaskStatus, number>

  for (const t of tasks) {
    if (t.status in by_status) by_status[t.status] += 1
  }

  return {
    total: tasks.length,
    by_status,
    blocked_count: by_status.blocked,
    failed_count: by_status.failed,
    complete_count: by_status.complete,
    has_unresolved_hard_blockers:
      by_status.blocked > 0 || by_status.failed > 0,
  }
}
