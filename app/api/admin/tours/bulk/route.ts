import { NextResponse } from "next/server"

import { tourBulkCommandSchema, TourBulkCommandError } from "@/lib/admin/tour-bulk-command"
import {
  executeTourBulkCommand,
  getTourBulkCommandErrorStatus,
} from "@/lib/admin/tour-bulk-command.service"
import { withOrgCommand, adminErrorResponse } from "@/lib/auth/api-auth"

/**
 * TOUR-210 — Bulk command execution.
 * Requires Idempotency-Key; returns item-level results including partial failures.
 */
export const POST = withOrgCommand({
  capability: "tour.view",
  schema: tourBulkCommandSchema,
  commandName: "admin.tours.bulk",
  requireIdempotency: true,
  target: {
    kind: "entity",
    type: "tour",
    id: (input) => input.tour_ids || [],
  },
  handler: async ({ auth, context, input, idempotencyKey }) => {
    try {
      const result = await executeTourBulkCommand({
        supabase: auth.supabase,
        userId: auth.user.id,
        orgId: context.orgId,
        capabilities: context.capabilities,
        input,
        idempotencyKey: idempotencyKey || "",
        correlationId: context.correlationId,
      })

      // HTTP 200 even on partial failure — body reports succeeded/failed/partialFailure.
      return NextResponse.json({
        success: result.failed === 0,
        partialFailure: result.partialFailure,
        result,
        orgId: context.orgId,
      })
    } catch (error: unknown) {
      if (error instanceof TourBulkCommandError) {
        return adminErrorResponse(
          error.status,
          error.code,
          error.message,
          context.correlationId,
        )
      }
      const status = getTourBulkCommandErrorStatus(error, 500)
      const message = error instanceof Error ? error.message : "Bulk execution failed"
      return adminErrorResponse(status, "bulk_failed", message, context.correlationId)
    }
  },
})
