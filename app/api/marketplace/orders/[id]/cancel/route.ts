import { NextRequest, NextResponse } from "next/server"
import { jsonError } from "@/lib/api/route-helpers"
import { getCancellationLifecycleTransition } from "@/lib/marketplace/order-lifecycle"
import { requireMarketplaceEnabled } from "@/lib/marketplace/require-marketplace-enabled"
import { requireMarketplaceAccount } from "@/lib/marketplace/music-commerce-auth"
import { getStripeClient } from "@/lib/stripe"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const dynamic = "force-dynamic"

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
  const service = createServiceRoleClient()

  const { data: order, error: orderError } = await service
    .from("marketplace_orders")
    .select("id, buyer_user_id, seller_user_id, status, payment_status, stripe_checkout_session_id, metadata")
    .eq("id", orderId)
    .maybeSingle()

  if (orderError) {
    return jsonError({ status: 500, code: "order_lookup_failed", message: "Unable to load order.", retryable: true })
  }
  if (!order) return jsonError({ status: 404, code: "order_not_found", message: "Order not found." })
  if (order.buyer_user_id !== userId && order.seller_user_id !== userId) {
    return jsonError({ status: 403, code: "forbidden", message: "You cannot cancel this order." })
  }

  const transition = getCancellationLifecycleTransition({
    orderStatus: order.status,
    paymentStatus: order.payment_status,
  })
  if (!transition.allowed) {
    if (transition.reason === "already_cancelled") {
      return NextResponse.json({ data: { orderId, status: "cancelled", alreadyCancelled: true } })
    }
    return jsonError({
      status: 409,
      code: transition.reason,
      message: transition.reason === "refund_required"
        ? "Paid orders must use the refund workflow."
        : "This order can no longer be cancelled.",
      retryable: false,
    })
  }

  if (order.stripe_checkout_session_id) {
    try {
      await getStripeClient().checkout.sessions.expire(order.stripe_checkout_session_id)
    } catch {
      return jsonError({
        status: 409,
        code: "checkout_session_not_cancellable",
        message: "The payment session can no longer be cancelled. Refresh the order before retrying.",
        retryable: false,
      })
    }
  }

  const now = new Date().toISOString()
  const existingAudit = Array.isArray(order.metadata?.lifecycleAudit)
    ? order.metadata.lifecycleAudit.slice(-49)
    : []
  const lifecycleAudit = [
    ...existingAudit,
    { action: "cancelled", actorUserId: userId, at: now, previousStatus: order.status },
  ]
  const { data: updated, error: updateError } = await service
    .from("marketplace_orders")
    .update({
      ...transition.orderPatch,
      metadata: { ...(order.metadata || {}), lifecycleAudit },
    })
    .eq("id", orderId)
    .eq("status", order.status)
    .eq("payment_status", order.payment_status)
    .select("id, status")
    .maybeSingle()

  if (updateError || !updated) {
    return jsonError({ status: 409, code: "order_state_changed", message: "The order changed while cancellation was in progress.", retryable: true })
  }

  const { error: payoutError } = await service
    .from("marketplace_payout_ledger")
    .update(transition.payoutPatch)
    .eq("order_id", orderId)
  if (payoutError) {
    return jsonError({ status: 500, code: "payout_hold_failed", message: "Order cancelled, but payout reconciliation requires review.", retryable: true })
  }

  await service
    .from("marketplace_order_items")
    .update({ fulfillment_status: "cancelled" })
    .eq("order_id", orderId)

  return NextResponse.json({ data: { orderId, status: "cancelled" } })
}
