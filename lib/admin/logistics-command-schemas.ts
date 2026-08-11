/**
 * LOG-103 — Per-action Zod schemas for logistics task commands.
 * Unknown fields rejected (.strict). Status transitions allowlisted.
 */

import { z } from "zod"

import { LOGISTICS_TASK_DOMAINS } from "@/lib/admin/logistics-task-taxonomy"

export const LOGISTICS_TASK_STATUSES = [
  "pending",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
  "needs_attention",
] as const

export type LogisticsTaskStatus = (typeof LOGISTICS_TASK_STATUSES)[number]

export const LOGISTICS_TASK_PRIORITIES = ["low", "medium", "high", "urgent"] as const

const uuid = z.string().uuid()
const optionalUuid = uuid.optional().nullable()

export const LOGISTICS_STATUS_TRANSITIONS: Record<LogisticsTaskStatus, readonly LogisticsTaskStatus[]> = {
  pending: ["confirmed", "in_progress", "cancelled", "needs_attention"],
  confirmed: ["in_progress", "cancelled", "needs_attention"],
  in_progress: ["completed", "cancelled", "needs_attention"],
  needs_attention: ["pending", "confirmed", "in_progress", "cancelled"],
  completed: [],
  cancelled: [],
}

export function canTransitionLogisticsStatus(from: string, to: string): boolean {
  if (from === to) return true
  const allowed = LOGISTICS_STATUS_TRANSITIONS[from as LogisticsTaskStatus]
  if (!allowed) return false
  return allowed.includes(to as LogisticsTaskStatus)
}

export class LogisticsStatusTransitionError extends Error {
  readonly status = 422
  readonly code = "illegal_logistics_status_transition"

  constructor(from: string, to: string) {
    super(`Illegal logistics task status transition: ${from} → ${to}`)
    this.name = "LogisticsStatusTransitionError"
  }
}

export function assertLogisticsStatusTransition(from: string, to: string): void {
  if (!canTransitionLogisticsStatus(from, to))
    throw new LogisticsStatusTransitionError(from, to)
}

export const createLogisticsTaskCommandSchema = z
  .object({
    action: z.literal("create_task"),
    type: z.enum(LOGISTICS_TASK_DOMAINS),
    title: z.string().trim().min(1).max(300),
    description: z.string().max(8000).optional().nullable(),
    category: z.string().max(80).optional().nullable(),
    status: z.literal("pending").optional().default("pending"),
    priority: z.enum(LOGISTICS_TASK_PRIORITIES).optional().default("medium"),
    event_id: optionalUuid,
    tour_id: optionalUuid,
    assigned_to_user_id: optionalUuid,
    due_date: z.string().optional().nullable(),
    budget: z.number().nonnegative().optional().nullable(),
    actual_cost: z.number().nonnegative().optional().nullable(),
    notes: z.string().max(8000).optional().nullable(),
    tags: z.array(z.string().max(80)).max(40).optional().nullable(),
    source_type: z.string().max(80).optional().nullable(),
    source_id: optionalUuid,
    is_authoritative: z.literal(true).optional(),
  })
  .strict()

export const updateLogisticsTaskCommandSchema = z
  .object({
    action: z.literal("update_task"),
    id: uuid,
    title: z.string().trim().min(1).max(300).optional(),
    description: z.string().max(8000).optional().nullable(),
    type: z.enum(LOGISTICS_TASK_DOMAINS).optional(),
    category: z.string().max(80).optional().nullable(),
    priority: z.enum(LOGISTICS_TASK_PRIORITIES).optional(),
    assigned_to_user_id: optionalUuid,
    due_date: z.string().optional().nullable(),
    budget: z.number().nonnegative().optional().nullable(),
    actual_cost: z.number().nonnegative().optional().nullable(),
    notes: z.string().max(8000).optional().nullable(),
    tags: z.array(z.string().max(80)).max(40).optional().nullable(),
    source_type: z.string().max(80).optional().nullable(),
    source_id: optionalUuid,
  })
  .strict()

export const transitionLogisticsTaskStatusCommandSchema = z
  .object({
    action: z.literal("transition_task_status"),
    id: uuid,
    status: z.enum(LOGISTICS_TASK_STATUSES),
  })
  .strict()

export const deleteLogisticsTaskCommandSchema = z
  .object({
    action: z.literal("delete_task"),
    id: uuid,
  })
  .strict()

export const bulkTransitionLogisticsTaskStatusCommandSchema = z
  .object({
    action: z.literal("bulk_transition_task_status"),
    ids: z.array(uuid).min(1).max(200),
    status: z.enum(LOGISTICS_TASK_STATUSES),
  })
  .strict()

export const logisticsCommandSchema = z.discriminatedUnion("action", [
  createLogisticsTaskCommandSchema,
  updateLogisticsTaskCommandSchema,
  transitionLogisticsTaskStatusCommandSchema,
  deleteLogisticsTaskCommandSchema,
  bulkTransitionLogisticsTaskStatusCommandSchema,
])

export type LogisticsCommand = z.infer<typeof logisticsCommandSchema>
export type LogisticsCommandAction = LogisticsCommand["action"]

export function parseLogisticsCommand(body: unknown): {
  ok: true
  data: LogisticsCommand
} | {
  ok: false
  error: string
  details?: unknown
} {
  if (!body || typeof body !== "object" || Array.isArray(body))
    return { ok: false, error: "Request body must be an object" }

  const parsed = logisticsCommandSchema.safeParse(body)
  if (!parsed.success) {
    return {
      ok: false,
      error: "Validation error — unknown fields or invalid values rejected",
      details: parsed.error.issues,
    }
  }
  return { ok: true, data: parsed.data }
}
