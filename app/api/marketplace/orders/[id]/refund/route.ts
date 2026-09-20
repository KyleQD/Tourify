import { NextRequest } from "next/server"
import { z } from "zod"
import { fromZodError, jsonError } from "@/lib/api/route-helpers"
import { requireMarketplaceEnabled } from "@/lib/marketplace/require-marketplace-enabled"
import { requireMarketplaceAccount } from "@/lib/marketplace/music-commerce-auth"
import { getStripeClient } from "@/lib/stripe"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const dynamic = "force-dynamic"

const refundSchema = z.object({
  idempotencyKey: z.string().min(8).max(128),
  reason: z.enum(["duplicate", "fraudulent", "requested_by_customer"]).default("requested_by_customer"),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = requireMarketplaceEnabled()
  if (guard) return guard

  const authResult = await requireMarketplaceAccount(request)
  if (!authResult.success) return authResult.response
  const { userId } = authResult.account
  const { id: orderId } = await params

  let body: z.infer<typeof refundSchema>
  try {
    body = refundSchema.parse(await request.json())
  } catch (error) {
    return fromZodError(error, "Invalid refund request") || jsonError({
      status: 400,
      code: "invalid_refund_request",
      message: "Invalid refund request.",
    })
  }

  const service = createServiceRoleClient()
  const { data: order, error: orderError } = await service
    .from("marketplace_orders")
    .select("id, seller_user_id, status, payment_status, payment_reference, metadata")
    .eq("id", orderId)
    .maybeSingle()

  if (orderError) {
    return jsonError({ status: 500, code: "order_lookup_failed", message: "Unable to load order.", retryable: true })
  }
  if (!order) return jsonError({ status: 404, code: "order_not_found", message: "Order not found." })
  if (order.seller_user_id !== userId) {
    return jsonError({ status: 403, code: "forbidden", message: "Only the seller can refund this order." })
  }
  if (order.status === "refunded" || order.payment_status === "refunded") {
    return jsonError({ status: 409, code: "already_refunded", message: "This order has already been refunded." })
  }
  if (order.payment_status !== "paid" || !order.payment_reference) {
    return jsonError({ status: 409, code: "order_not_refundable", message: "Only paid orders can be refunded." })
  }

  const audit = Array.isArray(order.metadata?.lifecycleAudit)
    ? order.metadata.lifecycleAudit.slice(-49)
    : []
  const existingRequest = audit.find((entry: any) =>
    entry?.action === "refund_requested" && entry?.idempotencyKey === body.idempotencyKey
  )
  if (existingRequest?.refundId) {
    return Response.json({
      data: { orderId, refundId: existingRequest.refundId, status: "submitted", alreadyRequested: true },
    })
  }

  const requestedAt = new Date().toISOString()
  const { error: holdError } = await service
    .from("marketplace_payout_ledger")
    .update({ payout_status: "on_hold" })
    .eq("order_id", orderId)
    .neq("payout_status", "paid")
  if (holdError) {
    return jsonError({ status: 500, code: "payout_hold_failed", message: "Unable to place the seller payout on hold.", retryable: true })
  }

  try {
    const refund = await getStripeClient().refunds.create(
      {
        payment_intent: order.payment_reference,
        reason: body.reason,
        refund_application_fee: true,
        reverse_transfer: true,
        metadata: { source: "marketplace_seller_refund", order_id: orderId },
      },
      { idempotencyKey: `marketplace-refund:${orderId}:${body.idempotencyKey}` },
    )

    const lifecycleAudit = [
      ...audit,
      {
        action: "refund_requested",
        actorUserId: userId,
        at: requestedAt,
        idempotencyKey: body.idempotencyKey,
        refundId: refund.id,
      },
    ]
    const { error: auditError } = await service
      .from("marketplace_orders")
      .update({ metadata: { ...(order.metadata || {}), lifecycleAudit } })
      .eq("id", orderId)
      .eq("payment_status", "paid")
    if (auditError) {
      return jsonError({ status: 500, code: "refund_audit_failed", message: "Refund submitted; audit reconciliation is required.", retryable: true })
    }

    return Response.json({ data: { orderId, refundId: refund.id, status: refund.status } }, { status: 202 })
  } catch (error) {
    console.error("Marketplace refund submission failed", { orderId, error })
    return jsonError({ status: 502, code: "refund_submission_failed", message: "Unable to submit the refund.", retryable: true })
  }
}
