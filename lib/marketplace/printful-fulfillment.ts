import "server-only"

import { resolveIntegrationAccessToken } from "@/lib/marketplace/integration-credentials"
import { submitPrintfulFulfillmentOrder } from "@/lib/marketplace/printful-adapter"

export async function ensurePrintfulFulfillmentRequests({
  supabase,
  orderId,
}: {
  supabase: any
  orderId: string
}) {
  const { data: order } = await supabase
    .from("marketplace_orders")
    .select("id, seller_user_id, shipping_address")
    .eq("id", orderId)
    .maybeSingle()
  if (!order?.shipping_address) return { submitted: 0, skipped: 0, failed: 0 }

  const { data: items } = await supabase
    .from("marketplace_order_items")
    .select("id, order_id, listing_id, variant_id, title, quantity, unit_price, metadata, fulfillment_provider")
    .eq("order_id", orderId)

  const printfulItems = (items || []).filter((item: any) => {
    const metadata = metadataRecord(item.metadata)
    return item.fulfillment_provider === "printful" || metadata.fulfillmentProvider === "printful" || metadata.sourceProvider === "printful"
  })
  if (!printfulItems.length) return { submitted: 0, skipped: 0, failed: 0 }

  let submitted = 0
  let skipped = 0
  let failed = 0

  for (const item of printfulItems) {
    const metadata = metadataRecord(item.metadata)
    const integrationId = typeof metadata.integrationId === "string" ? metadata.integrationId : null
    if (!integrationId) {
      skipped += 1
      continue
    }

    const { data: integration } = await supabase
      .from("marketplace_integrations")
      .select("*")
      .eq("id", integrationId)
      .eq("provider", "printful")
      .maybeSingle()
    const accessToken = resolveIntegrationAccessToken(integration)
    if (!integration || !accessToken) {
      skipped += 1
      continue
    }

    const requestPayload = {
      orderId,
      orderItemId: item.id,
      title: item.title,
      quantity: item.quantity,
      externalProductId: metadata.externalProductId || null,
      externalVariantId: metadata.externalVariantId || null,
      shippingAddress: order.shipping_address,
    }

    const { data: requestRow } = await supabase
      .from("marketplace_fulfillment_requests")
      .upsert(
        {
          order_id: orderId,
          order_item_id: item.id,
          listing_id: item.listing_id,
          integration_id: integration.id,
          seller_user_id: order.seller_user_id,
          provider: "printful",
          status: "pending",
          request_payload: requestPayload,
        },
        { onConflict: "order_item_id,provider" }
      )
      .select("id, status")
      .single()

    if (!requestRow?.id) {
      failed += 1
      continue
    }

    if (requestRow?.status === "submitted" || requestRow?.status === "accepted") {
      skipped += 1
      continue
    }

    try {
      const result = await submitPrintfulFulfillmentOrder({
        accessToken,
        externalAccountId: integration.external_account_id,
        order: { id: `${orderId}:${item.id}` },
        shippingAddress: order.shipping_address,
        items: [
          {
            external_id: item.id,
            quantity: item.quantity,
            name: item.title,
            retail_price: String(item.unit_price),
            catalog_variant_id: toNumberOrNull(metadata.externalVariantId),
          },
        ],
      })
      const responsePayload = result.status === "submitted" ? result.payload : result
      const externalOrderId = extractExternalOrderId(responsePayload) || `${orderId}:${item.id}`

      await supabase
        .from("marketplace_fulfillment_requests")
        .update({
          status: result.status === "submitted" ? "submitted" : "failed",
          external_order_id: externalOrderId,
          external_reference: externalOrderId,
          response_payload: responsePayload,
          error_message: result.status === "submitted" ? null : result.reason,
          submitted_at: result.status === "submitted" ? new Date().toISOString() : null,
        })
        .eq("id", requestRow.id)

      await supabase
        .from("marketplace_order_items")
        .update({
          fulfillment_status: result.status === "submitted" ? "processing" : "pending",
          fulfillment_provider: "printful",
          fulfillment_reference: externalOrderId,
        })
        .eq("id", item.id)

      if (result.status === "submitted") submitted += 1
      else failed += 1
    } catch (error) {
      failed += 1
      await supabase
        .from("marketplace_fulfillment_requests")
        .update({
          status: "failed",
          error_message: error instanceof Error ? error.message : "Printful fulfillment failed",
        })
        .eq("id", requestRow.id)
    }
  }

  return { submitted, skipped, failed }
}

function metadataRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function toNumberOrNull(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const parsed = Number(value.replace(/\D+/g, ""))
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function extractExternalOrderId(value: unknown): string | null {
  const record = metadataRecord(value)
  const data = metadataRecord(record.data)
  const id = data.id || record.id
  return typeof id === "string" || typeof id === "number" ? String(id) : null
}
