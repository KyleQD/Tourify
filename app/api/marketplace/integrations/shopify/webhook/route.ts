import { NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { verifyShopifyWebhookSignature } from "@/lib/marketplace/shopify-adapter"
import {
  auditFeatureUnavailable,
  isAuditFeatureApproved,
} from "@/lib/config/audit-feature-gates"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  if (!isAuditFeatureApproved("marketplace_integrations"))
    return auditFeatureUnavailable("marketplace_integrations")
  try {
    const rawBody = await request.text()
    const signature = request.headers.get("x-shopify-hmac-sha256")
    if (!verifyShopifyWebhookSignature({ rawBody, signature })) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    const shopDomain = request.headers.get("x-shopify-shop-domain")
    const topic = request.headers.get("x-shopify-topic") || "unknown"
    const webhookId = request.headers.get("x-shopify-webhook-id") || `${shopDomain}:${topic}:${Date.now()}`
    const payload = JSON.parse(rawBody || "{}")
    const supabase = createServiceRoleClient()

    const { data: integration } = await supabase
      .from("marketplace_integrations")
      .select("id, seller_user_id")
      .eq("provider", "shopify")
      .eq("external_shop_domain", shopDomain)
      .maybeSingle()

    const { error: eventError } = await supabase.from("marketplace_provider_webhook_events").insert({
      provider: "shopify",
      external_event_id: webhookId,
      integration_id: integration?.id || null,
      seller_user_id: integration?.seller_user_id || null,
      event_type: topic,
      payload,
      processed_at: new Date().toISOString(),
    })

    if (eventError && eventError.code !== "23505") {
      console.error("Failed to record Shopify webhook", eventError)
      return NextResponse.json({ error: "Failed to record webhook" }, { status: 500 })
    }
    if (eventError?.code === "23505") return NextResponse.json({ received: true, duplicate: true })

    if (integration?.id) {
      await supabase
        .from("marketplace_integrations")
        .update({
          last_sync_status: "webhook_received",
          last_synced_at: new Date().toISOString(),
          metadata: { lastWebhookTopic: topic, lastWebhookId: webhookId },
        })
        .eq("id", integration.id)

      await applyShopifyWebhookSnapshot({
        supabase,
        integration,
        topic,
        payload,
      })
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Unexpected Shopify webhook error", error)
    return NextResponse.json({ error: "Unexpected webhook error" }, { status: 500 })
  }
}

async function applyShopifyWebhookSnapshot({
  supabase,
  integration,
  topic,
  payload,
}: {
  supabase: any
  integration: { id: string; seller_user_id: string }
  topic: string
  payload: Record<string, unknown>
}) {
  const rawProductId = payload.admin_graphql_api_id || payload.id
  const externalProductId =
    typeof rawProductId === "string" ? rawProductId : rawProductId ? `gid://shopify/Product/${rawProductId}` : null
  if (!externalProductId) return

  if (topic === "products/delete") {
    await supabase
      .from("marketplace_integration_products")
      .update({ status: "ignored", sync_status: "skipped", last_synced_at: new Date().toISOString() })
      .eq("integration_id", integration.id)
      .eq("external_product_id", externalProductId)
    await supabase
      .from("marketplace_listings")
      .update({ sync_status: "skipped", last_external_synced_at: new Date().toISOString() })
      .eq("integration_id", integration.id)
      .eq("external_product_id", externalProductId)
    return
  }

  await supabase
    .from("marketplace_integration_products")
    .upsert(
      {
        integration_id: integration.id,
        seller_user_id: integration.seller_user_id,
        provider: "shopify",
        external_product_id: externalProductId,
        title: typeof payload.title === "string" ? payload.title : "Shopify product",
        status: "imported",
        image_url: Array.isArray(payload.images) && payload.images[0]?.src ? payload.images[0].src : null,
        product_type: "physical_merch",
        variants_count: Array.isArray(payload.variants) ? payload.variants.length : 0,
        raw_payload: payload,
        raw_variants: Array.isArray(payload.variants) ? payload.variants : [],
        sync_status: "synced",
        last_synced_at: new Date().toISOString(),
      },
      { onConflict: "integration_id,external_product_id" }
    )
}
