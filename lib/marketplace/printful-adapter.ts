import "server-only"

import { normalizePrintfulProducts, type ExternalStoreProduct } from "@/lib/marketplace/provider-normalizers"

export interface PrintfulCatalogSyncItem {
  externalProductId: string
  title: string
  variantCount: number
  thumbnailUrl: string | null
}

export interface PrintfulCatalogSyncResult {
  provider: "printful"
  status: "connected" | "skipped"
  syncedCount: number
  items: PrintfulCatalogSyncItem[]
  products: ExternalStoreProduct[]
}

export async function syncPrintfulCatalog({
  accessToken,
  externalAccountId,
}: {
  accessToken?: string | null
  externalAccountId?: string | null
}): Promise<PrintfulCatalogSyncResult> {
  if (!accessToken) {
    return {
      provider: "printful",
      status: "skipped",
      syncedCount: 0,
      items: [],
      products: [],
    }
  }

  const response = await fetch("https://api.printful.com/v2/store/products?limit=100", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(externalAccountId ? { "X-PF-Store-Id": externalAccountId } : {}),
    },
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = typeof body.detail === "string" ? body.detail : typeof body.message === "string" ? body.message : "Printful catalog sync failed"
    throw new Error(message)
  }

  const products = normalizePrintfulProducts(body)
  return {
    provider: "printful",
    status: "connected",
    syncedCount: products.length,
    items: products.map(product => ({
      externalProductId: product.externalProductId,
      title: product.title,
      variantCount: product.variants.length,
      thumbnailUrl: product.imageUrl || null,
    })),
    products,
  }
}

export async function submitPrintfulFulfillmentOrder({
  accessToken,
  externalAccountId,
  order,
  items,
  shippingAddress,
}: {
  accessToken: string
  externalAccountId?: string | null
  order: Record<string, unknown>
  items: Array<Record<string, unknown>>
  shippingAddress: Record<string, unknown> | null
}) {
  if (!shippingAddress || !items.length) {
    return { status: "skipped" as const, reason: "Missing shipping address or order items" }
  }

  const response = await fetch("https://api.printful.com/v2/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...(externalAccountId ? { "X-PF-Store-Id": externalAccountId } : {}),
    },
    body: JSON.stringify({
      external_id: order.id,
      recipient: shippingAddress,
      items,
    }),
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = typeof body.detail === "string" ? body.detail : typeof body.message === "string" ? body.message : "Printful fulfillment request failed"
    throw new Error(message)
  }

  return { status: "submitted" as const, payload: body }
}
