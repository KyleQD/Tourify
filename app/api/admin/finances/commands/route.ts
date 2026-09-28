import { NextResponse } from "next/server"

import {
  executeFinanceCommand,
  getFinanceCommandErrorStatus,
  FinanceCommandError,
} from "@/lib/admin/finance-command.service"
import {
  financeCommandSchema,
  FinanceStatusTransitionError,
} from "@/lib/admin/finance-command-schemas"
import { OrgEntityAccessError } from "@/lib/admin/org-entity-access"
import { withOrgCommand, adminErrorResponse } from "@/lib/auth/api-auth"

/**
 * FIN-103 — Canonical admin finance command endpoint.
 * Requires acting org + finance.view (per-action manage/pay/approve inside) + Idempotency-Key.
 */
export const POST = withOrgCommand({
  capability: "finance.view",
  schema: financeCommandSchema,
  commandName: "admin.finances.command",
  target: { kind: "organization" },
  requireIdempotency: true,
  handler: async ({ auth, context, input, idempotencyKey }) => {
    try {
      const result = await executeFinanceCommand({
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
      const status = getFinanceCommandErrorStatus(error, 500)
      const code =
        error instanceof FinanceCommandError
          ? error.code
          : error instanceof FinanceStatusTransitionError
            ? error.code
            : error instanceof OrgEntityAccessError
              ? error.code
              : "command_failed"
      const message = error instanceof Error ? error.message : "Finance command failed"
      return adminErrorResponse(status, code, message, context.correlationId)
    }
  },
})
