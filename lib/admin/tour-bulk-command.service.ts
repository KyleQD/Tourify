/**
 * TOUR-210 — Bulk tour command preview + execution.
 */

import "server-only"

import {
  parseTourBulkCommand,
  summarizeBulkExecuteResults,
  TourBulkCommandError,
  type TourBulkExecuteItemResult,
  type TourBulkExecuteResult,
  type TourBulkPreviewItem,
  type TourBulkPreviewResult,
} from "@/lib/admin/tour-bulk-command"
import { createTourDeletePreview } from "@/lib/admin/tour-delete-eligibility"
import { AdminTourEventOperationsService } from "@/lib/admin/tour-event-operations.service"
import {
  loadTourTagsByTourIds,
  replaceTourTags,
  type OrgTourTag,
} from "@/lib/admin/tour-tags.service"
import {
  executeTourTransition,
  previewTourTransition,
  TourTransitionError,
} from "@/lib/admin/tour-transition.service"
import { TourAccessDeniedError, requireTourAccess } from "@/lib/admin/tour-access.service"
import type { AdminCapability } from "@/lib/auth/admin-capabilities"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseLike = { from: (table: string) => any }

function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids)]
}

export async function previewTourBulkCommand(args: {
  supabase: SupabaseLike
  userId: string
  orgId: string
  capabilities: readonly AdminCapability[]
  input: unknown
}): Promise<TourBulkPreviewResult> {
  const command = parseTourBulkCommand(args.input)
  const tourIds = uniqueIds(command.tour_ids)

  if (command.action === "transition") {
    const items: TourBulkPreviewItem[] = []
    for (const tourId of tourIds) {
      const preview = await previewTourTransition({
        supabase: args.supabase,
        userId: args.userId,
        orgId: args.orgId,
        tourId,
        command: command.command,
        capabilities: args.capabilities,
        reason: command.reason,
      })
      items.push({
        tourId: preview.tourId,
        name: preview.name,
        status: preview.status,
        eligible: preview.eligible,
        code: preview.code,
        message: preview.message,
        blockers: preview.unmetBlockers,
        nextState: preview.nextState,
      })
    }
    return summarizePreview("transition", items, command.command)
  }

  if (command.action === "delete_drafts") {
    if (!args.capabilities.includes("tour.delete")) {
      throw new TourBulkCommandError(
        "capability_denied",
        "Missing capability tour.delete.",
        403,
      )
    }
    const items: TourBulkPreviewItem[] = []
    for (const tourId of tourIds) {
      try {
        await requireTourAccess({
          supabase: args.supabase,
          userId: args.userId,
          tourId,
          orgId: args.orgId,
        })
        const { data: tour, error: loadError } = await args.supabase
          .from("tours")
          .select("id, org_id, status, name, settings")
          .eq("id", tourId)
          .eq("org_id", args.orgId)
          .maybeSingle()
        if (loadError) throw new Error(loadError.message)
        if (!tour?.id) {
          items.push({
            tourId,
            name: null,
            status: null,
            eligible: false,
            code: "entity_not_found",
            message: "Tour not found.",
          })
          continue
        }
        const preview = await createTourDeletePreview({
          supabase: args.supabase,
          tourId,
          orgId: args.orgId,
          tour: tour as Record<string, unknown>,
        })
        items.push({
          tourId,
          name: typeof tour.name === "string" ? tour.name : null,
          status: preview.currentState,
          eligible: preview.canDelete,
          code: preview.canDelete ? undefined : "tour_delete_ineligible",
          message: preview.canDelete
            ? "Eligible for hard delete."
            : preview.blockers.map((b) => b.detail).join(" ") || "Not eligible for delete.",
          blockers: preview.blockers.map((b) => b.id),
        })
      } catch (error) {
        items.push({
          tourId,
          name: null,
          status: null,
          eligible: false,
          code: error instanceof TourAccessDeniedError ? "entity_not_found" : "preview_failed",
          message: error instanceof Error ? error.message : "Preview failed.",
        })
      }
    }
    return summarizePreview("delete_drafts", items)
  }

  // assign_tags
  if (!args.capabilities.includes("tour.manage")) {
    throw new TourBulkCommandError(
      "capability_denied",
      "Missing capability tour.manage.",
      403,
    )
  }
  const tagIds = uniqueIds(command.tag_ids)
  const { data: tags, error: tagError } = await args.supabase
    .from("org_tour_tags")
    .select("id")
    .eq("org_id", args.orgId)
    .in("id", tagIds)
  if (tagError && tagError.code !== "42P01") throw new Error(tagError.message)
  const allowedTagIds = new Set((tags ?? []).map((row: { id: string }) => String(row.id)))
  if (allowedTagIds.size === 0) {
    throw new TourBulkCommandError("invalid_tags", "No valid organization tags were provided.")
  }

  const items: TourBulkPreviewItem[] = []
  for (const tourId of tourIds) {
    try {
      const access = await requireTourAccess({
        supabase: args.supabase,
        userId: args.userId,
        tourId,
        orgId: args.orgId,
      })
      items.push({
        tourId,
        name: access.name,
        status: access.status,
        eligible: true,
        message: `Will ${command.mode === "replace" ? "replace" : "merge"} tags.`,
      })
    } catch {
      items.push({
        tourId,
        name: null,
        status: null,
        eligible: false,
        code: "entity_not_found",
        message: "Tour not found.",
      })
    }
  }
  return summarizePreview("assign_tags", items)
}

export async function executeTourBulkCommand(args: {
  supabase: SupabaseLike
  userId: string
  orgId: string
  capabilities: readonly AdminCapability[]
  input: unknown
  idempotencyKey: string
  correlationId?: string | null
}): Promise<TourBulkExecuteResult> {
  if (!args.idempotencyKey?.trim()) {
    throw new TourBulkCommandError(
      "idempotency_required",
      "Idempotency-Key is required for bulk execution.",
      422,
    )
  }

  const command = parseTourBulkCommand(args.input)
  const tourIds = uniqueIds(command.tour_ids)
  const results: TourBulkExecuteItemResult[] = []

  if (command.action === "transition") {
    for (let index = 0; index < tourIds.length; index += 1) {
      const tourId = tourIds[index]
      const itemKey = `${args.idempotencyKey}:${command.command}:${tourId}:${index}`
      try {
        const result = await executeTourTransition({
          supabase: args.supabase,
          userId: args.userId,
          orgId: args.orgId,
          tourId,
          command: command.command,
          capabilities: args.capabilities,
          reason: command.reason,
          correlationId: args.correlationId,
          idempotencyKey: itemKey,
        })
        results.push({
          tourId,
          ok: true,
          toState: result.toState,
        })
      } catch (error) {
        results.push(mapExecuteError(tourId, error))
      }
    }
    const summary = summarizeBulkExecuteResults(results)
    return {
      action: "transition",
      command: command.command,
      results,
      ...summary,
    }
  }

  if (command.action === "delete_drafts") {
    if (!args.capabilities.includes("tour.delete")) {
      throw new TourBulkCommandError(
        "capability_denied",
        "Missing capability tour.delete.",
        403,
      )
    }
    for (const tourId of tourIds) {
      try {
        await AdminTourEventOperationsService.deleteTour({
          supabase: args.supabase,
          userId: args.userId,
          tourId,
          orgId: args.orgId,
          capabilities: args.capabilities,
          correlationId: args.correlationId,
        })
        results.push({ tourId, ok: true })
      } catch (error) {
        results.push(mapExecuteError(tourId, error))
      }
    }
    const summary = summarizeBulkExecuteResults(results)
    return { action: "delete_drafts", results, ...summary }
  }

  // assign_tags
  if (!args.capabilities.includes("tour.manage")) {
    throw new TourBulkCommandError(
      "capability_denied",
      "Missing capability tour.manage.",
      403,
    )
  }
  const tagIds = uniqueIds(command.tag_ids)
  const mode = command.mode ?? "merge"

  for (const tourId of tourIds) {
    try {
      await requireTourAccess({
        supabase: args.supabase,
        userId: args.userId,
        tourId,
        orgId: args.orgId,
      })
      let nextTagIds = tagIds
      if (mode === "merge") {
        const existing = await loadTourTagsByTourIds({
          supabase: args.supabase,
          tourIds: [tourId],
        })
        const current = (existing.get(tourId) ?? []) as OrgTourTag[]
        nextTagIds = uniqueIds([...current.map((tag) => tag.id), ...tagIds])
      }
      await replaceTourTags({
        supabase: args.supabase,
        tourId,
        orgId: args.orgId,
        userId: args.userId,
        tagIds: nextTagIds,
      })
      results.push({ tourId, ok: true })
    } catch (error) {
      results.push(mapExecuteError(tourId, error))
    }
  }
  const summary = summarizeBulkExecuteResults(results)
  return { action: "assign_tags", results, ...summary }
}

function summarizePreview(
  action: TourBulkPreviewResult["action"],
  items: TourBulkPreviewItem[],
  command?: string,
): TourBulkPreviewResult {
  const eligibleCount = items.filter((item) => item.eligible).length
  const ineligibleCount = items.length - eligibleCount
  return {
    action,
    command,
    items,
    eligibleCount,
    ineligibleCount,
    requiresConfirmation: eligibleCount > 0,
  }
}

function mapExecuteError(tourId: string, error: unknown): TourBulkExecuteItemResult {
  if (error instanceof TourTransitionError) {
    return {
      tourId,
      ok: false,
      error: error.message,
      code: error.code,
    }
  }
  if (error instanceof TourAccessDeniedError) {
    return {
      tourId,
      ok: false,
      error: error.message,
      code: error.code,
    }
  }
  if (error && typeof error === "object" && "code" in error) {
    const code = String((error as { code?: string }).code || "execute_failed")
    const message = error instanceof Error ? error.message : "Execute failed."
    return { tourId, ok: false, error: message, code }
  }
  return {
    tourId,
    ok: false,
    error: error instanceof Error ? error.message : "Execute failed.",
    code: "execute_failed",
  }
}

export function getTourBulkCommandErrorStatus(error: unknown, fallback = 500): number {
  if (error instanceof TourBulkCommandError) return error.status
  if (error instanceof TourTransitionError) return error.status
  return fallback
}
