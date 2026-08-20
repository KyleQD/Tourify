import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { resolveCommerceContext } from "@/lib/admin/commerce/resolve-context"
import {
  normalizeCommerceFinancialActionReason,
  requireCommerceHighRiskAction,
} from "@/lib/admin/commerce/high-risk-actions"
import { requireCommerceIdempotencyKey } from "@/lib/admin/commerce/idempotency"
import {
  assertCommerceUpdatedAtMatches,
  commerceVersionConflictResponse,
  requireCommerceExpectedUpdatedAt,
} from "@/lib/admin/commerce/concurrency"
import { commerceErrorResponse, commerceJsonResponse } from "@/lib/admin/commerce/errors"

export const dynamic = "force-dynamic"

const payoutRetrySchema = z.object({
  reason: z.string().trim().min(3).max(1_000),
  idempotencyKey: z.string().trim().min(8).max(200).optional(),
  idempotency_key: z.string().trim().min(8).max(200).optional(),
  expectedUpdatedAt: z.string().datetime().optional(),
  expected_updated_at: z.string().datetime().optional(),
}).strict()

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const commerce = await resolveCommerceContext(request, {
      requiredPermission: "commerce.manage_payouts",
    })
    if (commerce instanceof NextResponse) return commerce

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return commerceErrorResponse({
        status: 400,
        code: "invalid_json",
        message: "Could not parse request body.",
        correlationId: commerce.request.correlationId,
      })
    }
    const parsed = payoutRetrySchema.safeParse(body)
    const denied = requireCommerceHighRiskAction(commerce, "payout.retry", {
      reason: parsed.success ? parsed.data.reason : undefined,
    })
    if (denied) return denied
    if (!parsed.success) {
      return commerceErrorResponse({
        status: 400,
        code: "invalid_request",
        message: "Invalid payout retry payload.",
        issues: parsed.error.issues,
        correlationId: commerce.request.correlationId,
      })
    }
    const idempotency = requireCommerceIdempotencyKey(request, commerce, parsed.data)
    if (idempotency instanceof NextResponse) return idempotency
    const precondition = requireCommerceExpectedUpdatedAt(commerce, parsed.data)
    if (precondition instanceof NextResponse) return precondition
    const actionReason = normalizeCommerceFinancialActionReason(parsed.data.reason).reason

    const supabase = await createClient()

    const { id } = await params
    const { data: payout, error: payoutError } = await supabase
      .from("marketplace_payout_ledger")
      .select("id, payout_status, metadata, updated_at")
      .eq("id", id)
      .single()

    if (payoutError || !payout) {
      return commerceErrorResponse({
        status: 404,
        code: "payout_not_found",
        message: "Payout row not found.",
        correlationId: commerce.request.correlationId,
      })
    }
    if (!["on_hold", "failed", "pending"].includes(payout.payout_status)) {
      return commerceErrorResponse({
        status: 400,
        code: "payout_retry_ineligible",
        message: "Payout is not eligible for retry.",
        correlationId: commerce.request.correlationId,
        details: { payoutStatus: payout.payout_status },
      })
    }
    const stale = assertCommerceUpdatedAtMatches(
      commerce,
      payout.updated_at,
      precondition,
      {
        entityType: "marketplace_payout_ledger",
        message: "Payout row changed while retry was being prepared.",
      },
    )
    if (stale) return stale

    const metadata = payout.metadata && typeof payout.metadata === "object" ? (payout.metadata as Record<string, unknown>) : {}
    const retryAttempts = Number(metadata.retryAttempts || 0) + 1

    const { data: updated, error: updateError } = await supabase
      .from("marketplace_payout_ledger")
      .update({
        payout_status: "scheduled",
        available_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        metadata: {
          ...metadata,
          retryAttempts,
          lastRetryBy: commerce.actor.userId,
          lastRetryAt: new Date().toISOString(),
          lastRetryReason: actionReason,
          lastRetryIdempotencyKey: idempotency.idempotencyKey,
        },
      })
      .eq("id", id)
      .eq("updated_at", precondition.expectedUpdatedAt)
      .select("*")
      .maybeSingle()

    if (updateError || !updated) {
      if (updateError) {
        console.error("Failed to retry marketplace payout", updateError)
        return commerceErrorResponse({
          status: 500,
          code: "payout_retry_failed",
          message: "Failed to retry payout scheduling.",
          retryable: true,
          correlationId: commerce.request.correlationId,
        })
      }
      return commerceVersionConflictResponse(commerce, {
        entityType: "marketplace_payout_ledger",
        message: "Payout row changed while retry was being scheduled.",
        expectedUpdatedAt: precondition.expectedUpdatedAt,
        currentUpdatedAt: payout.updated_at,
      })
    }

    return commerceJsonResponse({ data: updated, idempotencyKey: idempotency.idempotencyKey }, {
      correlationId: commerce.request.correlationId,
    })
  } catch (error) {
    console.error("Unexpected retry payout error", error)
    return commerceErrorResponse({
      status: 500,
      code: "unexpected_payout_retry_error",
      message: "Unexpected retry payout error.",
      retryable: true,
    })
  }
}
