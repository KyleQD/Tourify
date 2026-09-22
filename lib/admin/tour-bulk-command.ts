/**
 * TOUR-210 — Bulk tour command contracts (preview + execute).
 *
 * Preview classifies eligible/ineligible before confirmation.
 * Execute requires Idempotency-Key and returns item-level results
 * without hiding partial failure.
 */

import { z } from "zod"

import { TOUR_TRANSITION_COMMANDS } from "@/lib/admin/tour-lifecycle"

export const TOUR_BULK_MAX_IDS = 100

export const TOUR_BULK_ACTIONS = [
  "transition",
  "delete_drafts",
  "assign_tags",
] as const

export type TourBulkAction = (typeof TOUR_BULK_ACTIONS)[number]

const uuid = z.string().uuid()

export const tourBulkCommandSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("transition"),
      command: z.enum(TOUR_TRANSITION_COMMANDS),
      tour_ids: z.array(uuid).min(1).max(TOUR_BULK_MAX_IDS),
      reason: z.string().trim().min(1).max(2000).optional().nullable(),
    })
    .strict(),
  z
    .object({
      action: z.literal("delete_drafts"),
      tour_ids: z.array(uuid).min(1).max(TOUR_BULK_MAX_IDS),
    })
    .strict(),
  z
    .object({
      action: z.literal("assign_tags"),
      tour_ids: z.array(uuid).min(1).max(TOUR_BULK_MAX_IDS),
      tag_ids: z.array(uuid).min(1).max(50),
      mode: z.enum(["replace", "merge"]).optional().default("merge"),
    })
    .strict(),
])

export type TourBulkCommand = z.infer<typeof tourBulkCommandSchema>

export interface TourBulkPreviewItem {
  tourId: string
  name: string | null
  status: string | null
  eligible: boolean
  code?: string
  message?: string
  blockers?: string[]
  nextState?: string
}

export interface TourBulkPreviewResult {
  action: TourBulkAction
  command?: string
  items: TourBulkPreviewItem[]
  eligibleCount: number
  ineligibleCount: number
  requiresConfirmation: boolean
}

export interface TourBulkExecuteItemResult {
  tourId: string
  ok: boolean
  error?: string
  code?: string
  toState?: string
}

export interface TourBulkExecuteResult {
  action: TourBulkAction
  command?: string
  results: TourBulkExecuteItemResult[]
  succeeded: number
  failed: number
  /** True when some items succeeded and some failed — never hidden. */
  partialFailure: boolean
}

export class TourBulkCommandError extends Error {
  readonly status: number
  readonly code: string

  constructor(code: string, message: string, status = 400) {
    super(message)
    this.name = "TourBulkCommandError"
    this.code = code
    this.status = status
  }
}

export function parseTourBulkCommand(body: unknown): TourBulkCommand {
  const parsed = tourBulkCommandSchema.safeParse(body)
  if (!parsed.success) {
    throw new TourBulkCommandError(
      "invalid_bulk_command",
      parsed.error.issues.map((issue) => issue.message).join("; ") || "Invalid bulk command.",
    )
  }
  return parsed.data
}

export function summarizeBulkExecuteResults(
  results: TourBulkExecuteItemResult[],
): Pick<TourBulkExecuteResult, "succeeded" | "failed" | "partialFailure"> {
  const succeeded = results.filter((row) => row.ok).length
  const failed = results.length - succeeded
  return {
    succeeded,
    failed,
    partialFailure: succeeded > 0 && failed > 0,
  }
}
