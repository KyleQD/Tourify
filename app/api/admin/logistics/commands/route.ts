import { NextResponse } from "next/server"

import {
  executeLogisticsCommand,
  getLogisticsCommandErrorStatus,
  LogisticsCommandError,
} from "@/lib/admin/logistics-command.service"
import {
  LogisticsStatusTransitionError,
  logisticsCommandSchema,
} from "@/lib/admin/logistics-command-schemas"
import { withOrgCommand, adminErrorResponse } from "@/lib/auth/api-auth"

/**
 * LOG-103 — Canonical logistics task command endpoint.
 * Requires acting org + logistics.manage + Idempotency-Key for mutations.
 */
export const POST = withOrgCommand({
  capability: "logistics.manage",
  schema: logisticsCommandSchema,
  commandName: "admin.logistics.command",
  target: { kind: "organization" },
  requireIdempotency: true,
  handler: async ({ auth, context, input, idempotencyKey }) => {
    try {
      const result = await executeLogisticsCommand({
        supabase: auth.supabase,
        userId: auth.user.id,
        orgId: context.orgId,
        command: input,
        idempotencyKey,
      })
      return NextResponse.json({
        success: true,
        data: result.data,
        message: result.message,
      })
    } catch (error) {
      const status = getLogisticsCommandErrorStatus(error, 500)
      const code =
        error instanceof LogisticsCommandError
          ? error.code
          : error instanceof LogisticsStatusTransitionError
            ? error.code
            : "command_failed"
      const message = error instanceof Error ? error.message : "Logistics command failed"
      return adminErrorResponse(status, code, message, context.correlationId)
    }
  },
})
