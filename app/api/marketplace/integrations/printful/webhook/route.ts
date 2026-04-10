import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { parsePrintfulWebhookPayload, verifyPrintfulWebhookSignature } from "@/lib/marketplace/printful-webhook"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
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

    const supabase = await createClient()

    if (integrationId) {
      await supabase
        .from("marketplace_integrations")
        .update({
          status: "active",
          last_synced_at: new Date().toISOString(),
          settings: {
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

    const externalOrderId = typeof order.external_id === "string" ? order.external_id : null
    if (externalOrderId) {
      await supabase
        .from("marketplace_order_items")
        .update({
          fulfillment_status: mapPrintfulStatusToFulfillment(eventType),
          fulfillment_provider: "printful",
          fulfillment_reference: externalOrderId,
        })
        .eq("fulfillment_reference", externalOrderId)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Unexpected Printful webhook error", error)
    return NextResponse.json({ error: "Unexpected Printful webhook error" }, { status: 500 })
  }
}

function mapPrintfulStatusToFulfillment(eventType: string) {
  if (eventType.includes("shipped")) return "shipped"
  if (eventType.includes("fulfilled")) return "completed"
  if (eventType.includes("failed")) return "cancelled"
  return "processing"
}
