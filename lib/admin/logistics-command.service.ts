/**
 * LOG-103 — Canonical logistics task command service.
 * Per-action validation, parent access, status transitions, activity audit.
 */

import {
  assertLogisticsStatusTransition,
  type LogisticsCommand,
  type LogisticsTaskStatus,
} from "@/lib/admin/logistics-command-schemas"
import {
  assertAdminLogisticsTaskAccess,
  assertAdminLogisticsTasksAccess,
} from "@/lib/admin/logistics-task-access"
import { assertLogisticsTaskTaxonomy } from "@/lib/admin/logistics-task-taxonomy"

type SupabaseLike = { from: (table: string) => any }

export class LogisticsCommandError extends Error {
  readonly status: number
  readonly code: string

  constructor(code: string, message: string, status = 422) {
    super(message)
    this.name = "LogisticsCommandError"
    this.code = code
    this.status = status
  }
}

export function getLogisticsCommandErrorStatus(error: unknown, fallback = 500): number {
  if (error instanceof LogisticsCommandError) return error.status
  if (error && typeof error === "object" && "status" in error) {
    const status = Number((error as { status: unknown }).status)
    if (Number.isFinite(status) && status >= 400 && status < 600) return status
  }
  const message = error instanceof Error ? error.message : ""
  if (/not found/i.test(message)) return 404
  if (/not available|forbidden|acting organization/i.test(message)) return 403
  if (/illegal|validation|unknown fields|outside a resolvable/i.test(message)) return 422
  return fallback
}

async function assertTaskOrgMatch(args: {
  supabase: SupabaseLike
  taskId: string
  orgId: string
  userId: string
}) {
  const task = await assertAdminLogisticsTaskAccess({
    supabase: args.supabase,
    userId: args.userId,
    orgId: args.orgId,
    taskId: args.taskId,
  })

  const { data, error } = await args.supabase
    .from("logistics_tasks")
    .select("id, org_id, status, type, title, event_id, tour_id, created_by")
    .eq("id", args.taskId)
    .maybeSingle()
  if (error) throw new LogisticsCommandError("db_error", error.message, 500)
  if (!data) throw new LogisticsCommandError("not_found", "Logistics task not found.", 404)

  if (typeof data.org_id === "string" && data.org_id && data.org_id !== args.orgId) {
    throw new LogisticsCommandError(
      "org_mismatch",
      "Logistics task does not belong to the acting organization.",
      403,
    )
  }

  return { ...task, ...data }
}

async function writeActivity(args: {
  supabase: SupabaseLike
  taskId: string
  actorId: string
  orgId: string | null
  action: string
  prevStatus?: string | null
  newStatus?: string | null
  metadata?: Record<string, unknown>
}) {
  const row: Record<string, unknown> = {
    task_id: args.taskId,
    actor_id: args.actorId,
    action: args.action,
    prev_status: args.prevStatus ?? null,
    new_status: args.newStatus ?? null,
    metadata: {
      ...(args.metadata || {}),
      org_id: args.orgId,
    },
  }
  if (args.orgId) row.org_id = args.orgId

  const { error } = await args.supabase.from("logistics_activity").insert(row)
  if (error && /org_id/i.test(error.message || "")) {
    const { org_id: _ignored, ...withoutOrg } = row
    const retry = await args.supabase.from("logistics_activity").insert(withoutOrg)
    if (retry.error) throw new LogisticsCommandError("audit_failed", retry.error.message, 500)
    return
  }
  if (error) throw new LogisticsCommandError("audit_failed", error.message, 500)
}

export async function executeLogisticsCommand(args: {
  supabase: SupabaseLike
  userId: string
  orgId: string
  command: LogisticsCommand
  idempotencyKey?: string | null
}): Promise<{ data: unknown; message?: string }> {
  const { command } = args

  const a = args as any
  switch (command.action) {
    case "create_task":
      return createLogisticsTask(a)
    case "update_task":
      return updateLogisticsTask(a)
    case "transition_task_status":
      return transitionLogisticsTaskStatus(a)
    case "delete_task":
      return deleteLogisticsTask(a)
    case "bulk_transition_task_status":
      return bulkTransitionLogisticsTaskStatus(a)
    default:
      throw new LogisticsCommandError("unknown_action", "Unsupported logistics command", 400)
  }
}

async function createLogisticsTask(args: {
  supabase: SupabaseLike
  userId: string
  orgId: string
  command: Extract<LogisticsCommand, { action: "create_task" }>
}) {
  const { command } = args
  const taxonomy = assertLogisticsTaskTaxonomy({
    type: command.type,
    category: command.category,
    source_type: command.source_type,
    source_id: command.source_id,
    is_authoritative: command.is_authoritative,
  })
  if (!taxonomy.ok)
    throw new LogisticsCommandError("validation_failed", taxonomy.error, 400)

  const tags = Array.isArray(command.tags) ? [...command.tags] : []
  if (taxonomy.category && !tags.includes(`category:${taxonomy.category}`))
    tags.push(`category:${taxonomy.category}`)

  const payload = {
    event_id: command.event_id ?? null,
    tour_id: command.tour_id ?? null,
    org_id: args.orgId,
    type: taxonomy.domain,
    title: command.title,
    description: command.description ?? null,
    status: "pending" as LogisticsTaskStatus,
    priority: command.priority || "medium",
    assigned_to_user_id: command.assigned_to_user_id ?? null,
    due_date: command.due_date ?? null,
    budget: command.budget ?? null,
    actual_cost: command.actual_cost ?? null,
    notes: command.notes ?? null,
    tags: tags.length > 0 ? tags : null,
    source_type: taxonomy.source_type,
    source_id: taxonomy.source_id,
    created_by: args.userId,
  }

  const { data, error } = await args.supabase
    .from("logistics_tasks")
    .insert(payload)
    .select("*")
    .single()
  if (error) throw new LogisticsCommandError("db_error", error.message, 500)

  await writeActivity({
    supabase: args.supabase,
    taskId: data.id,
    actorId: args.userId,
    orgId: args.orgId,
    action: "created",
    newStatus: "pending",
    metadata: { idempotency: true },
  })

  if (data.assigned_to_user_id) {
    await args.supabase.from("notifications").insert({
      user_id: data.assigned_to_user_id,
      type: "task_assigned",
      title: `New task: ${data.title}`,
      content: data.description || null,
      metadata: { task_id: data.id, event_id: data.event_id },
    })
  }

  return { data, message: "Logistics task created" }
}

async function updateLogisticsTask(args: {
  supabase: SupabaseLike
  userId: string
  orgId: string
  command: Extract<LogisticsCommand, { action: "update_task" }>
}) {
  const { command } = args
  await assertTaskOrgMatch({
    supabase: args.supabase,
    taskId: command.id,
    orgId: args.orgId,
    userId: args.userId,
  })

  if (command.type || command.category || command.source_type || command.source_id) {
    const { data: existing } = await args.supabase
      .from("logistics_tasks")
      .select("type")
      .eq("id", command.id)
      .maybeSingle()
    const taxonomy = assertLogisticsTaskTaxonomy({
      type: command.type || existing?.type || "equipment",
      category: command.category,
      source_type: command.source_type,
      source_id: command.source_id,
    })
    if (!taxonomy.ok)
      throw new LogisticsCommandError("validation_failed", taxonomy.error, 400)
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (command.title !== undefined) updates.title = command.title
  if (command.description !== undefined) updates.description = command.description
  if (command.type !== undefined) updates.type = command.type
  if (command.priority !== undefined) updates.priority = command.priority
  if (command.assigned_to_user_id !== undefined)
    updates.assigned_to_user_id = command.assigned_to_user_id
  if (command.due_date !== undefined) updates.due_date = command.due_date
  if (command.budget !== undefined) updates.budget = command.budget
  if (command.actual_cost !== undefined) updates.actual_cost = command.actual_cost
  if (command.notes !== undefined) updates.notes = command.notes
  if (command.tags !== undefined) updates.tags = command.tags
  if (command.source_type !== undefined) updates.source_type = command.source_type
  if (command.source_id !== undefined) updates.source_id = command.source_id

  if (command.category) {
    const tags = Array.isArray(command.tags) ? [...command.tags] : null
    if (tags) {
      const without = tags.filter((t) => !t.startsWith("category:"))
      without.push(`category:${command.category}`)
      updates.tags = without
    }
  }

  // Stamp acting org when legacy row was null (never overwrite a different org).
  updates.org_id = args.orgId

  const { data, error } = await args.supabase
    .from("logistics_tasks")
    .update(updates)
    .eq("id", command.id)
    .select("*")
    .single()
  if (error) throw new LogisticsCommandError("db_error", error.message, 500)

  await writeActivity({
    supabase: args.supabase,
    taskId: command.id,
    actorId: args.userId,
    orgId: args.orgId,
    action: "updated",
    metadata: { fields: Object.keys(updates).filter((k) => k !== "updated_at") },
  })

  return { data, message: "Logistics task updated" }
}

async function transitionLogisticsTaskStatus(args: {
  supabase: SupabaseLike
  userId: string
  orgId: string
  command: Extract<LogisticsCommand, { action: "transition_task_status" }>
}) {
  const { command } = args
  const current = await assertTaskOrgMatch({
    supabase: args.supabase,
    taskId: command.id,
    orgId: args.orgId,
    userId: args.userId,
  })

  const from = String(current.status || "pending")
  const to = command.status

  // Same-status is idempotent success (no write / no duplicate activity noise).
  if (from === to) return { data: current, message: "Status unchanged (idempotent)" }

  assertLogisticsStatusTransition(from, to)

  const { data, error } = await args.supabase
    .from("logistics_tasks")
    .update({
      status: to,
      org_id: args.orgId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", command.id)
    .select("*")
    .single()
  if (error) throw new LogisticsCommandError("db_error", error.message, 500)

  await writeActivity({
    supabase: args.supabase,
    taskId: command.id,
    actorId: args.userId,
    orgId: args.orgId,
    action: "status_changed",
    prevStatus: from,
    newStatus: to,
  })

  return { data, message: `Status transitioned ${from} → ${to}` }
}

async function deleteLogisticsTask(args: {
  supabase: SupabaseLike
  userId: string
  orgId: string
  command: Extract<LogisticsCommand, { action: "delete_task" }>
}) {
  await assertTaskOrgMatch({
    supabase: args.supabase,
    taskId: args.command.id,
    orgId: args.orgId,
    userId: args.userId,
  })

  const { error } = await args.supabase
    .from("logistics_tasks")
    .delete()
    .eq("id", args.command.id)
  if (error) throw new LogisticsCommandError("db_error", error.message, 500)

  return { data: { id: args.command.id }, message: "Logistics task deleted" }
}

async function bulkTransitionLogisticsTaskStatus(args: {
  supabase: SupabaseLike
  userId: string
  orgId: string
  command: Extract<LogisticsCommand, { action: "bulk_transition_task_status" }>
}) {
  const { command } = args
  await assertAdminLogisticsTasksAccess({
    supabase: args.supabase,
    userId: args.userId,
    orgId: args.orgId,
    taskIds: command.ids,
  })

  const results: Array<{ id: string; ok: boolean; error?: string }> = []
  for (const id of command.ids) {
    try {
      await transitionLogisticsTaskStatus({
        supabase: args.supabase,
        userId: args.userId,
        orgId: args.orgId,
        command: { action: "transition_task_status", id, status: command.status },
      })
      results.push({ id, ok: true })
    } catch (error) {
      results.push({
        id,
        ok: false,
        error: error instanceof Error ? error.message : "transition failed",
      })
    }
  }

  const succeeded = results.filter((r) => r.ok).length
  return {
    data: { results, succeeded, failed: results.length - succeeded },
    message: `Bulk transition: ${succeeded}/${results.length} succeeded`,
  }
}
