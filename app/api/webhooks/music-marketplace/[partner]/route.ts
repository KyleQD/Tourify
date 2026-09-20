import { NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import {
  buildPartnerEventReceipt,
  verifyPartnerWebhookSignature,
} from "@/lib/music/marketplace/partner-adapters"
import { canTransitionOrder, canTransitionSubscription } from "@/lib/music/marketplace/order-state-machine"
import { reconcileSettlement } from "@/lib/music/marketplace/settlement-reconciliation"
import { auditFeatureUnavailable, isAuditFeatureApproved } from "@/lib/config/audit-feature-gates"

export const dynamic = "force-dynamic"

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ partner: string }> },
) {
  if (!isAuditFeatureApproved("advanced_webhooks"))
    return auditFeatureUnavailable("advanced_webhooks")

  let supabase: any = null
  let claimedEventId: string | null = null
  let routePartnerId: string | null = null
  try {
    const { partner } = await context.params
    const partnerId = partner?.trim()
    if (!partnerId)
      return NextResponse.json({ error: "partner required" }, { status: 400 })
    routePartnerId = partnerId

    const bodyText = await request.text()
    const signature = request.headers.get("x-tourify-partner-signature")
    const secret =
      process.env[`MUSIC_MARKETPLACE_WEBHOOK_SECRET_${partnerId.toUpperCase()}`] ||
      process.env.MUSIC_MARKETPLACE_WEBHOOK_SECRET
    const allowUnsigned = process.env.MUSIC_MARKETPLACE_WEBHOOK_ALLOW_UNSIGNED === "true"

    let signatureVerified = false
    if (secret && signature) {
      signatureVerified = verifyPartnerWebhookSignature({ rawBody: bodyText, signature, secret })
      if (!signatureVerified)
        return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    } else if (!allowUnsigned) {
      return NextResponse.json({ error: "Webhook not configured" }, { status: 503 })
    }

    let payload: Record<string, unknown>
    try {
      const parsed = JSON.parse(bodyText || "{}")
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("invalid payload")
      payload = parsed as Record<string, unknown>
    } catch {
      return NextResponse.json({ error: "Invalid event payload" }, { status: 400 })
    }
    const providerEventId = String(payload.id || payload.event_id || "").trim()
    const eventType = String(payload.type || payload.event_type || "").trim()
    if (!providerEventId || !eventType)
      return NextResponse.json({ error: "Invalid event payload" }, { status: 400 })

    const receipt = buildPartnerEventReceipt(
      {
        partnerId,
        providerEventId,
        eventType,
        payload,
        signature,
        rawBody: bodyText,
      },
      signatureVerified,
    )

    supabase = createServiceRoleClient()
    const { data: stored, error } = await supabase
      .from("music_marketplace_partner_event_receipts")
      .insert({
        partner_id: receipt.partnerId,
        provider_event_id: receipt.providerEventId,
        event_type: receipt.eventType,
        payload: receipt.payload,
        payload_hash: receipt.payloadHash,
        signature_verified: receipt.signatureVerified,
        processing_status: "received",
      })
      .select("id")
      .single()

    if (error?.code === "23505" || /duplicate key/i.test(error?.message ?? ""))
      return NextResponse.json({ data: { providerEventId, idempotent: true } })
    if (error)
      return NextResponse.json({ error: "Event persistence failed" }, { status: 500 })
    claimedEventId = providerEventId

    const subscriptionId = typeof payload.subscription_id === "string" ? payload.subscription_id : null
    const nextSubStatus = typeof payload.subscription_status === "string" ? payload.subscription_status : null
    if (subscriptionId && nextSubStatus) {
      const { data: sub, error: subscriptionLookupError } = await supabase
        .from("music_marketplace_subscriptions")
        .select("id, status")
        .eq("id", subscriptionId)
        .maybeSingle()
      if (subscriptionLookupError) throw new Error("Subscription lookup failed")
      if (sub && canTransitionSubscription(sub.status as any, nextSubStatus as any)) {
        const { error: subscriptionUpdateError } = await supabase
          .from("music_marketplace_subscriptions")
          .update({ status: nextSubStatus, updated_at: new Date().toISOString() })
          .eq("id", sub.id)
        if (subscriptionUpdateError) throw new Error("Subscription update failed")
        const { error: subscriptionEventError } = await supabase.from("music_marketplace_subscription_events").insert({
          subscription_id: sub.id,
          from_status: sub.status,
          to_status: nextSubStatus,
          partner_event_id: providerEventId,
          payload,
        })
        if (subscriptionEventError) throw new Error("Subscription event persistence failed")
      }
    }

    const orderId = typeof payload.order_id === "string" ? payload.order_id : null
    const nextOrderStatus = typeof payload.order_status === "string" ? payload.order_status : null
    if (orderId && nextOrderStatus) {
      const { data: order, error: orderLookupError } = await supabase
        .from("music_marketplace_partner_orders")
        .select("id, status")
        .eq("id", orderId)
        .maybeSingle()
      if (orderLookupError) throw new Error("Order lookup failed")
      if (order && canTransitionOrder(order.status as any, nextOrderStatus as any)) {
        const { error: orderUpdateError } = await supabase
          .from("music_marketplace_partner_orders")
          .update({ status: nextOrderStatus, updated_at: new Date().toISOString() })
          .eq("id", order.id)
        if (orderUpdateError) throw new Error("Order update failed")
      }
    }

    if (eventType === "settlement.confirmed" && Array.isArray(payload.legs)) {
      const reconciliation = reconcileSettlement(
        payload.legs as Array<{ currencyOrAsset: string; expectedMinor: string; actualMinor: string }>,
      )
      const { error: outboxError } = await supabase.from("music_marketplace_outbox_events").insert({
        event_type: reconciliation.matched ? "settlement.confirmed" : "settlement.break",
        aggregate_type: "settlement",
        aggregate_id: stored.id,
        payload: { reconciliation, providerEventId },
      })
      if (outboxError) throw new Error("Settlement event persistence failed")
    }

    const { error: completionError } = await supabase
      .from("music_marketplace_partner_event_receipts")
      .update({ processed_at: new Date().toISOString(), processing_status: "processed" })
      .eq("id", stored.id)
    if (completionError) throw new Error("Event completion persistence failed")

    return NextResponse.json({ data: { id: stored.id, processed: true } })
  } catch {
    if (supabase && claimedEventId) {
      const { error: failureError } = await supabase
        .from("music_marketplace_partner_event_receipts")
        .update({ processing_status: "failed" })
        .eq("partner_id", routePartnerId)
        .eq("provider_event_id", claimedEventId)
      if (failureError) console.error("[music-marketplace-webhook] failed to record failure", { kind: "internal_error" })
    }
    console.error("[music-marketplace-webhook]", { kind: "internal_error" })
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
  }
}
