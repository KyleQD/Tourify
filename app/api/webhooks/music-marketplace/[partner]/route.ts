import { NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import {
  buildPartnerEventReceipt,
  verifyPartnerWebhookSignature,
} from "@/lib/music/marketplace/partner-adapters"
import { canTransitionOrder, canTransitionSubscription } from "@/lib/music/marketplace/order-state-machine"
import { reconcileSettlement } from "@/lib/music/marketplace/settlement-reconciliation"

export const dynamic = "force-dynamic"

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ partner: string }> },
) {
  try {
    const { partner } = await context.params
    const partnerId = partner?.trim()
    if (!partnerId)
      return NextResponse.json({ error: "partner required" }, { status: 400 })

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

    const payload = JSON.parse(bodyText || "{}") as Record<string, unknown>
    const providerEventId = String(payload.id || payload.event_id || "")
    const eventType = String(payload.type || payload.event_type || "")
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

    const supabase = createServiceRoleClient()
    const { data: existing } = await supabase
      .from("music_marketplace_partner_event_receipts")
      .select("id, processing_status")
      .eq("partner_id", partnerId)
      .eq("provider_event_id", providerEventId)
      .maybeSingle()

    if (existing)
      return NextResponse.json({ data: { id: existing.id, idempotent: true } })

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

    if (error)
      return NextResponse.json({ error: "Event persistence failed" }, { status: 500 })

    const subscriptionId = typeof payload.subscription_id === "string" ? payload.subscription_id : null
    const nextSubStatus = typeof payload.subscription_status === "string" ? payload.subscription_status : null
    if (subscriptionId && nextSubStatus) {
      const { data: sub } = await supabase
        .from("music_marketplace_subscriptions")
        .select("id, status")
        .eq("id", subscriptionId)
        .maybeSingle()
      if (sub && canTransitionSubscription(sub.status as any, nextSubStatus as any)) {
        await supabase
          .from("music_marketplace_subscriptions")
          .update({ status: nextSubStatus, updated_at: new Date().toISOString() })
          .eq("id", sub.id)
        await supabase.from("music_marketplace_subscription_events").insert({
          subscription_id: sub.id,
          from_status: sub.status,
          to_status: nextSubStatus,
          partner_event_id: providerEventId,
          payload,
        })
      }
    }

    const orderId = typeof payload.order_id === "string" ? payload.order_id : null
    const nextOrderStatus = typeof payload.order_status === "string" ? payload.order_status : null
    if (orderId && nextOrderStatus) {
      const { data: order } = await supabase
        .from("music_marketplace_partner_orders")
        .select("id, status")
        .eq("id", orderId)
        .maybeSingle()
      if (order && canTransitionOrder(order.status as any, nextOrderStatus as any)) {
        await supabase
          .from("music_marketplace_partner_orders")
          .update({ status: nextOrderStatus, updated_at: new Date().toISOString() })
          .eq("id", order.id)
      }
    }

    if (eventType === "settlement.confirmed" && Array.isArray(payload.legs)) {
      const reconciliation = reconcileSettlement(
        payload.legs as Array<{ currencyOrAsset: string; expectedMinor: string; actualMinor: string }>,
      )
      await supabase.from("music_marketplace_outbox_events").insert({
        event_type: reconciliation.matched ? "settlement.confirmed" : "settlement.break",
        aggregate_type: "settlement",
        aggregate_id: stored.id,
        payload: { reconciliation, providerEventId },
      })
    }

    await supabase
      .from("music_marketplace_partner_event_receipts")
      .update({ processed_at: new Date().toISOString(), processing_status: "processed" })
      .eq("id", stored.id)

    return NextResponse.json({ data: { id: stored.id, processed: true } })
  } catch (error) {
    console.error("[music-marketplace-webhook]", error)
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
  }
}
