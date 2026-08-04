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

    const body = parsePrintfulWebhookPayload(payload)
    const eventType = typeof body.type === "string" ? body.type : "unknown"
    const order = body.order && typeof body.order === "object" ? (body.order as Record<string, unknown>) : {}
    const sellerUserId = typeof order.seller_user_id === "string" ? order.seller_user_id : null
    const integrationId = typeof order.integration_id === "string" ? order.integration_id : null
    const externalOrderId = typeof order.external_id === "string" ? order.external_id : null
    const externalEventId = firstString(body.id, body.event_id, body.eventId, externalOrderId ? `${externalOrderId}:${eventType}` : null)

    const supabase = createServiceRoleClient()

    if (externalEventId) {
      const { error: eventError } = await supabase.from("marketplace_provider_webhook_events").insert({
        provider: "printful",
        external_event_id: externalEventId,
        integration_id: integrationId,
        seller_user_id: sellerUserId,
        event_type: eventType,
        payload: body,
        processed_at: new Date().toISOString(),
      })
      if (eventError?.code === "23505") return NextResponse.json({ received: true, duplicate: true })
      if (eventError) {
        console.error("Failed to record Printful webhook event", eventError)
        return NextResponse.json({ error: "Failed to record webhook" }, { status: 500 })
      }
    }

    if (integrationId) {
      await supabase
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
    } else if (sellerUserId) {
      await supabase
        .from("marketplace_integrations")
        .update({
          status: "active",
          last_synced_at: new Date().toISOString(),
        })
        .eq("seller_user_id", sellerUserId)
        .eq("provider", "printful")
    }

    if (externalOrderId) {
      await supabase
        .from("marketplace_order_items")
        .update({
          fulfillment_status: mapPrintfulStatusToFulfillment(eventType),
          fulfillment_provider: "printful",
          fulfillment_reference: externalOrderId,
        })
        .eq("fulfillment_reference", externalOrderId)

      const requestPatch: Record<string, unknown> = {
        status: mapPrintfulStatusToRequestStatus(eventType),
        external_reference: externalOrderId,
        response_payload: body,
      }
      if (eventType.includes("delivered") || eventType.includes("fulfilled")) {
        requestPatch.completed_at = new Date().toISOString()
      }
      await supabase
        .from("marketplace_fulfillment_requests")
        .update(requestPatch)
        .eq("external_order_id", externalOrderId)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Unexpected Printful webhook error", error)
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
