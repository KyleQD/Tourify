/**
 * LIVE-407 — Unified live-task model.
 *
 * Live operational tasks complement (never replace) structured domain tables.
 * They can be linked to any of the five live-ops reference targets:
 *  - run_of_show_item   (ROS timeline item)
 *  - map_marker         (site-map marker or zone)
 *  - equipment_asset    (a specific equipment record)
 *  - person             (worker / crew member)
 *  - vendor             (vendor engagement)
 *
 * Design decisions:
 *  - Priority, status, owner, due date, and blocked reason are first-class.
 *  - Status transitions are audited (append-only AuditEntry list).
 *  - The logistics categories defined in LOG-301/302 are re-used via the
 *    LogisticsTaskDomain + category model; we do NOT add a new duplicate taxonomy.
 *  - Ref links are typed — one of five known live-ops target types.
 *  - No I/O, no Supabase imports; pure domain logic.
 */

import type { LogisticsTaskDomain } from "@/lib/admin/logistics-task-taxonomy"
import { isLogisticsTaskDomain } from "@/lib/admin/logistics-task-taxonomy"
import {
  canTransitionExtendedStatus,
  type ExtendedTaskStatus,
} from "@/lib/admin/logistics-task-dependencies"

// ---------------------------------------------------------------------------
// Live task ref target types
// ---------------------------------------------------------------------------

export const LIVE_TASK_REF_TYPES = [
  "ros_item",
  "map_marker",
  "equipment_asset",
  "person",
  "vendor",
] as const

export type LiveTaskRefType = (typeof LIVE_TASK_REF_TYPES)[number]

export interface LiveTaskRef {
  ref_type: LiveTaskRefType
  ref_id: string
  /** Optional human-readable label; never used for logic. */
  ref_label?: string | null
}

// ---------------------------------------------------------------------------
// Audit trail
// ---------------------------------------------------------------------------

export interface LiveTaskAuditEntry {
  entry_id: string
  event_type:
    | "created"
    | "status_changed"
    | "owner_changed"
    | "priority_changed"
    | "due_changed"
    | "blocked_reason_changed"
    | "ref_added"
    | "ref_removed"
    | "note_added"
  actor_id: string
  occurred_at: string
  /** Payload details (previous/next value, free-text note, etc.). */
  detail: string
}

// ---------------------------------------------------------------------------
// Live task
// ---------------------------------------------------------------------------

export interface LiveTask {
  task_id: string
  org_id: string
  event_id: string
  /** Logistics domain — re-uses the non-overlapping taxonomy (LOG-301). */
  domain: LogisticsTaskDomain | "live_ops"
  /** Category within domain — freeform for live_ops, constrained for logistics domains. */
  category: string | null
  title: string
  description: string | null
  status: ExtendedTaskStatus
  priority: "low" | "normal" | "high" | "critical"
  owner_id: string | null
  /** ISO-8601 datetime (with TZ or UTC 'Z' suffix). */
  due_at: string | null
  /** Populated when status = "blocked"; required on blocked transitions. */
  blocked_reason: string | null
  /** Links to up to 5 live-ops target types. */
  refs: LiveTaskRef[]
  audit: LiveTaskAuditEntry[]
  created_by: string
  created_at: string
  updated_by: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createLiveTask(params: {
  task_id: string
  org_id: string
  event_id: string
  domain: LiveTask["domain"]
  category?: string | null
  title: string
  description?: string | null
  priority?: LiveTask["priority"]
  owner_id?: string | null
  due_at?: string | null
  refs?: LiveTaskRef[]
  actor_id: string
  now: string
}): LiveTask {
  if (!isLiveTaskDomain(params.domain)) {
    throw new Error(`Invalid live task domain: ${String(params.domain)}`)
  }
  const audit: LiveTaskAuditEntry[] = [
    {
      entry_id: `${params.task_id}-created`,
      event_type: "created",
      actor_id: params.actor_id,
      occurred_at: params.now,
      detail: `Task created with title: ${params.title}`,
    },
  ]
  return {
    task_id: params.task_id,
    org_id: params.org_id,
    event_id: params.event_id,
    domain: params.domain,
    category: params.category ?? null,
    title: params.title,
    description: params.description ?? null,
    status: "pending",
    priority: params.priority ?? "normal",
    owner_id: params.owner_id ?? null,
    due_at: params.due_at ?? null,
    blocked_reason: null,
    refs: params.refs ?? [],
    audit,
    created_by: params.actor_id,
    created_at: params.now,
    updated_by: params.actor_id,
    updated_at: params.now,
  }
}

// ---------------------------------------------------------------------------
// Domain guard (live_ops + all logistics domains)
// ---------------------------------------------------------------------------

export function isLiveTaskDomain(value: unknown): value is LiveTask["domain"] {
  if (value === "live_ops") return true
  return isLogisticsTaskDomain(value)
}

// ---------------------------------------------------------------------------
// Status transition
// ---------------------------------------------------------------------------

export interface LiveTaskTransitionResult {
  ok: boolean
  task: LiveTask | null
  error?: string
}

export function transitionLiveTask(
  task: LiveTask,
  toStatus: ExtendedTaskStatus,
  actor: string,
  now: string,
  opts?: {
    /** Required when transitioning to "blocked". */
    blocked_reason?: string
  },
): LiveTaskTransitionResult {
  if (!canTransitionExtendedStatus(task.status, toStatus)) {
    return {
      ok: false,
      task: null,
      error: `Cannot transition from '${task.status}' to '${toStatus}'.`,
    }
  }

  if (toStatus === "blocked" && !opts?.blocked_reason?.trim()) {
    return {
      ok: false,
      task: null,
      error: "blocked_reason is required when transitioning to 'blocked'.",
    }
  }

  const entry: LiveTaskAuditEntry = {
    entry_id: `${task.task_id}-${now}-status`,
    event_type: "status_changed",
    actor_id: actor,
    occurred_at: now,
    detail: `${task.status} → ${toStatus}${opts?.blocked_reason ? `: ${opts.blocked_reason}` : ""}`,
  }

  return {
    ok: true,
    task: {
      ...task,
      status: toStatus,
      blocked_reason: toStatus === "blocked" ? (opts?.blocked_reason ?? null) : null,
      audit: [...task.audit, entry],
      updated_by: actor,
      updated_at: now,
    },
  }
}

// ---------------------------------------------------------------------------
// Owner assignment
// ---------------------------------------------------------------------------

export function assignLiveTaskOwner(
  task: LiveTask,
  owner_id: string | null,
  actor: string,
  now: string,
): LiveTask {
  const entry: LiveTaskAuditEntry = {
    entry_id: `${task.task_id}-${now}-owner`,
    event_type: "owner_changed",
    actor_id: actor,
    occurred_at: now,
    detail: `owner ${task.owner_id ?? "none"} → ${owner_id ?? "none"}`,
  }
  return {
    ...task,
    owner_id,
    audit: [...task.audit, entry],
    updated_by: actor,
    updated_at: now,
  }
}

// ---------------------------------------------------------------------------
// Priority change
// ---------------------------------------------------------------------------

export function changeLiveTaskPriority(
  task: LiveTask,
  priority: LiveTask["priority"],
  actor: string,
  now: string,
): LiveTask {
  const entry: LiveTaskAuditEntry = {
    entry_id: `${task.task_id}-${now}-priority`,
    event_type: "priority_changed",
    actor_id: actor,
    occurred_at: now,
    detail: `priority ${task.priority} → ${priority}`,
  }
  return {
    ...task,
    priority,
    audit: [...task.audit, entry],
    updated_by: actor,
    updated_at: now,
  }
}

// ---------------------------------------------------------------------------
// Due date
// ---------------------------------------------------------------------------

export function setLiveTaskDue(
  task: LiveTask,
  due_at: string | null,
  actor: string,
  now: string,
): LiveTask {
  const entry: LiveTaskAuditEntry = {
    entry_id: `${task.task_id}-${now}-due`,
    event_type: "due_changed",
    actor_id: actor,
    occurred_at: now,
    detail: `due_at ${task.due_at ?? "none"} → ${due_at ?? "none"}`,
  }
  return {
    ...task,
    due_at,
    audit: [...task.audit, entry],
    updated_by: actor,
    updated_at: now,
  }
}

// ---------------------------------------------------------------------------
// Refs (link / unlink)
// ---------------------------------------------------------------------------

export function addLiveTaskRef(
  task: LiveTask,
  ref: LiveTaskRef,
  actor: string,
  now: string,
): LiveTask {
  // Idempotent: skip if already present
  if (task.refs.some((r) => r.ref_type === ref.ref_type && r.ref_id === ref.ref_id)) {
    return task
  }
  const entry: LiveTaskAuditEntry = {
    entry_id: `${task.task_id}-${now}-ref-add`,
    event_type: "ref_added",
    actor_id: actor,
    occurred_at: now,
    detail: `linked ${ref.ref_type}:${ref.ref_id}`,
  }
  return {
    ...task,
    refs: [...task.refs, ref],
    audit: [...task.audit, entry],
    updated_by: actor,
    updated_at: now,
  }
}

export function removeLiveTaskRef(
  task: LiveTask,
  ref_type: LiveTaskRefType,
  ref_id: string,
  actor: string,
  now: string,
): LiveTask {
  const before = task.refs.length
  const refs = task.refs.filter((r) => !(r.ref_type === ref_type && r.ref_id === ref_id))
  if (refs.length === before) return task // nothing to remove

  const entry: LiveTaskAuditEntry = {
    entry_id: `${task.task_id}-${now}-ref-remove`,
    event_type: "ref_removed",
    actor_id: actor,
    occurred_at: now,
    detail: `unlinked ${ref_type}:${ref_id}`,
  }
  return {
    ...task,
    refs,
    audit: [...task.audit, entry],
    updated_by: actor,
    updated_at: now,
  }
}

// ---------------------------------------------------------------------------
// Audit note
// ---------------------------------------------------------------------------

export function addLiveTaskNote(
  task: LiveTask,
  note: string,
  actor: string,
  now: string,
): LiveTask {
  const entry: LiveTaskAuditEntry = {
    entry_id: `${task.task_id}-${now}-note`,
    event_type: "note_added",
    actor_id: actor,
    occurred_at: now,
    detail: note,
  }
  return {
    ...task,
    audit: [...task.audit, entry],
    updated_by: actor,
    updated_at: now,
  }
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

export interface LiveTaskSummary {
  total: number
  by_status: Record<ExtendedTaskStatus, number>
  by_priority: Record<LiveTask["priority"], number>
  blocked_count: number
  critical_open_count: number
  overdue_count: number
  unowned_count: number
}

const EXTENDED_STATUSES: ExtendedTaskStatus[] = [
  "pending",
  "confirmed",
  "in_progress",
  "blocked",
  "ready_for_review",
  "complete",
  "cancelled",
  "failed",
  "unknown",
]

const PRIORITIES: LiveTask["priority"][] = ["low", "normal", "high", "critical"]

export function summarizeLiveTasks(tasks: readonly LiveTask[], nowIso: string): LiveTaskSummary {
  const by_status = Object.fromEntries(
    EXTENDED_STATUSES.map((s) => [s, 0]),
  ) as Record<ExtendedTaskStatus, number>
  const by_priority = Object.fromEntries(
    PRIORITIES.map((p) => [p, 0]),
  ) as Record<LiveTask["priority"], number>

  let blocked_count = 0
  let critical_open_count = 0
  let overdue_count = 0
  let unowned_count = 0

  for (const t of tasks) {
    if (t.status in by_status) by_status[t.status] += 1
    by_priority[t.priority] += 1

    if (t.status === "blocked") blocked_count += 1
    if (t.priority === "critical" && t.status !== "complete" && t.status !== "cancelled") {
      critical_open_count += 1
    }
    if (
      t.due_at &&
      t.status !== "complete" &&
      t.status !== "cancelled" &&
      t.due_at < nowIso
    ) {
      overdue_count += 1
    }
    if (!t.owner_id && t.status !== "complete" && t.status !== "cancelled") {
      unowned_count += 1
    }
  }

  return {
    total: tasks.length,
    by_status,
    by_priority,
    blocked_count,
    critical_open_count,
    overdue_count,
    unowned_count,
  }
}
