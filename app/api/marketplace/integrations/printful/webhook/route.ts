import { NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { parsePrintfulWebhookPayload, verifyPrintfulWebhookSignature } from "@/lib/marketplace/printful-webhook"
import {
  auditFeatureUnavailable,
  isAuditFeatureApproved,
} from "@/lib/config/audit-feature-gates"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  if (!isAuditFeatureApproved("marketplace_integrations"))
    return auditFeatureUnavailable("marketplace_integrations")
  try {
    const payload = await request.text()
    const signature = request.headers.get("x-printful-signature")
    const validation = verifyPrintfulWebhookSignature({
      payload,
      signature,
      secret: process.env.PRINTFUL_WEBHOOK_SECRET,
    })
    if (!validation.isValid) return NextResponse.json({ error: validation.reason || "Invalid webhook" }, { status: 401 })

    let body: Record<string, unknown>
    try {
      body = parsePrintfulWebhookPayload(payload)
    } catch {
      return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 })
    }
    const eventType = typeof body.type === "string" && body.type.trim() ? body.type.trim() : null
    if (!eventType)
      return NextResponse.json({ error: "Missing webhook event type" }, { status: 400 })
    const order = body.order && typeof body.order === "object" ? (body.order as Record<string, unknown>) : {}
    const sellerUserId = typeof order.seller_user_id === "string" ? order.seller_user_id : null
    const integrationId = typeof order.integration_id === "string" ? order.integration_id : null
    const externalOrderId = typeof order.external_id === "string" ? order.external_id : null
    const externalEventId = firstString(body.id, body.event_id, body.eventId)
    if (!externalEventId)
      return NextResponse.json({ error: "Missing webhook event id" }, { status: 400 })

    const supabase = createServiceRoleClient()

    const { error: eventError } = await supabase.from("marketplace_provider_webhook_events").insert({
      provider: "printful",
      external_event_id: externalEventId,
      integration_id: integrationId,
      seller_user_id: sellerUserId,
      event_type: eventType,
      payload: body,
    })
    if (eventError?.code === "23505" || /duplicate key/i.test(eventError?.message ?? ""))
      return NextResponse.json({ received: true, duplicate: true })
    if (eventError) {
      console.error("Failed to record Printful webhook event", { kind: "internal_error" })
      return NextResponse.json({ error: "Failed to record webhook" }, { status: 500 })
    }

    if (integrationId) {
      const { error: integrationError } = await supabase
        .from("marketplace_integrations")
        .update({
          status: "active",
          last_synced_at: new Date().toISOString(),
          last_sync_status: "webhook_received",
          metadata: {
            lastWebhookType: eventType,
            lastWebhookAt: new Date().toISOString(),
          },
        })
        .eq("id", integrationId)
      if (integrationError) throw new Error("Failed to update Printful integration")
    } else if (sellerUserId) {
      const { error: integrationError } = await supabase
        .from("marketplace_integrations")
        .update({
          status: "active",
          last_synced_at: new Date().toISOString(),
        })
        .eq("seller_user_id", sellerUserId)
        .eq("provider", "printful")
      if (integrationError) throw new Error("Failed to update Printful integration")
    }

    if (externalOrderId) {
      const { error: itemError } = await supabase
        .from("marketplace_order_items")
        .update({
          fulfillment_status: mapPrintfulStatusToFulfillment(eventType),
          fulfillment_provider: "printful",
          fulfillment_reference: externalOrderId,
        })
        .eq("fulfillment_reference", externalOrderId)
      if (itemError) throw new Error("Failed to update Printful order item")

      const requestPatch: Record<string, unknown> = {
        status: mapPrintfulStatusToRequestStatus(eventType),
        external_reference: externalOrderId,
        response_payload: body,
      }
      if (eventType.includes("delivered") || eventType.includes("fulfilled")) {
        requestPatch.completed_at = new Date().toISOString()
      }
      const { error: fulfillmentError } = await supabase
        .from("marketplace_fulfillment_requests")
        .update(requestPatch)
        .eq("external_order_id", externalOrderId)
      if (fulfillmentError) throw new Error("Failed to update Printful fulfillment")
    }

    const { error: completionError } = await supabase
      .from("marketplace_provider_webhook_events")
      .update({ processed_at: new Date().toISOString() })
      .eq("provider", "printful")
      .eq("external_event_id", externalEventId)
    if (completionError) throw new Error("Failed to complete Printful webhook")

    return NextResponse.json({ received: true })
  } catch {
    console.error("Unexpected Printful webhook error", { kind: "internal_error" })
    return NextResponse.json({ error: "Unexpected Printful webhook error" }, { status: 500 })
  }
}

function mapPrintfulStatusToFulfillment(eventType: string) {
  if (eventType.includes("shipped")) return "shipped"
  if (eventType.includes("delivered")) return "delivered"
  if (eventType.includes("fulfilled")) return "completed"
  if (eventType.includes("failed")) return "cancelled"
  return "processing"
}

function mapPrintfulStatusToRequestStatus(eventType: string) {
  if (eventType.includes("shipped")) return "shipped"
  if (eventType.includes("delivered")) return "delivered"
  if (eventType.includes("fulfilled")) return "delivered"
  if (eventType.includes("failed")) return "failed"
  if (eventType.includes("cancel")) return "cancelled"
  return "accepted"
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim()
  }
  return null
}
