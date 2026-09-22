import { NextResponse } from "next/server"

import {
  executeTicketingCommand,
  getTicketingCommandErrorStatus,
  TicketingCommandError,
} from "@/lib/admin/ticketing-command.service"
import { ticketingCommandSchema } from "@/lib/admin/ticketing-command-schemas"
import { TicketingValidationError } from "@/lib/admin/ticketing-validation"
import { OrgEntityAccessError } from "@/lib/admin/org-entity-access"
import { withOrgCommand, adminErrorResponse } from "@/lib/auth/api-auth"

/**
 * TIX-103 — Canonical admin ticketing command endpoint.
 * Requires acting org + ticketing.view (per-action capability inside) + Idempotency-Key.
 */
export const POST = withOrgCommand({
  capability: "ticketing.view",
  schema: ticketingCommandSchema,
  commandName: "admin.ticketing.command",
  target: { kind: "organization" },
  requireIdempotency: true,
  handler: async ({ auth, context, input, idempotencyKey }) => {
    try {
      const result = await executeTicketingCommand({
        supabase: auth.supabase,
        userId: auth.user.id,
        orgId: context.orgId,
        capabilities: context.capabilities,
        command: input,
        idempotencyKey,
      })
      return NextResponse.json(
        {
          success: true,
          data: result.data,
          message: result.message,
        },
        { status: result.status || 200 },
      )
    } catch (error) {
      const status = getTicketingCommandErrorStatus(error, 500)
      const code =
        error instanceof TicketingCommandError
          ? error.code
          : error instanceof TicketingValidationError
            ? "ticketing_validation_error"
            : error instanceof OrgEntityAccessError
              ? error.code
              : "command_failed"
      const message = error instanceof Error ? error.message : "Ticketing command failed"
      return adminErrorResponse(status, code, message, context.correlationId)
    }
  },
})
