import "server-only"

import { type ExternalStoreProduct } from "@/lib/marketplace/provider-normalizers"

interface SyncExternalProductsArgs {
  supabase: any
  sellerUserId: string
  integration: {
    id: string
    provider: "printful" | "shopify" | string
  }
  products: ExternalStoreProduct[]
  dryRun?: boolean
}

export async function syncExternalProductsToMarketplace({
  supabase,
  sellerUserId,
  integration,
  products,
  dryRun = false,
}: SyncExternalProductsArgs) {
  const { data: syncRun } = await supabase
    .from("marketplace_integration_sync_runs")
    .insert({
      integration_id: integration.id,
      seller_user_id: sellerUserId,
      provider: integration.provider,
      status: "started",
      dry_run: dryRun,
      metadata: { productCount: products.length },
    })
    .select("id")
    .maybeSingle()

  let importedCount = 0
  let updatedCount = 0
  let skippedCount = 0

  try {
    if (!dryRun) {
      for (const product of products) {
        if (!product.externalProductId) {
          skippedCount += 1
          continue
        }

        const listing = await upsertMarketplaceListingForExternalProduct({
          supabase,
          sellerUserId,
          integration,
          product,
        })

        if (listing.created) importedCount += 1
        else updatedCount += 1
      }
    }

    await completeSyncRun({
      supabase,
      syncRunId: syncRun?.id,
      status: "completed",
      importedCount,
      updatedCount,
      skippedCount,
    })

    return {
      status: "completed" as const,
      importedCount,
      updatedCount,
      skippedCount,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "External product sync failed"
    await completeSyncRun({
      supabase,
      syncRunId: syncRun?.id,
      status: "failed",
      importedCount,
      updatedCount,
      skippedCount,
      errorMessage: message,
    })
    throw error
  }
}

async function upsertMarketplaceListingForExternalProduct({
  supabase,
  sellerUserId,
  integration,
  product,
}: {
  supabase: any
  sellerUserId: string
  integration: { id: string; provider: string }
  product: ExternalStoreProduct
}) {
  const now = new Date().toISOString()
  const defaultVariant = product.variants[0]
  const basePrice = defaultVariant?.price ?? 0
  const inventoryCount = sumInventory(product.variants)
  const fulfillmentProvider = integration.provider === "printful" ? "printful" : null

  const { data: existing } = await supabase
    .from("marketplace_listings")
    .select("id, status, metadata")
    .eq("seller_user_id", sellerUserId)
    .eq("integration_id", integration.id)
    .eq("external_product_id", product.externalProductId)
    .maybeSingle()

  let listingId = existing?.id as string | undefined
  let created = false

  if (!listingId) {
    const { data: listing, error } = await supabase
      .from("marketplace_listings")
      .insert({
        seller_user_id: sellerUserId,
        title: product.title,
        description: product.description || null,
        category: product.category,
        product_type: product.productType,
        status: "draft",
        currency: "USD",
        base_price: basePrice,
        cover_image_url: product.imageUrl || null,
        media_urls: product.imageUrl ? [product.imageUrl] : [],
        inventory_count: inventoryCount,
        has_unlimited_inventory: inventoryCount === null,
        metadata: {
          sourceProvider: integration.provider,
          externalProductId: product.externalProductId,
          importedAt: now,
          providerPayload: product.rawPayload || {},
        },
        integration_id: integration.id,
        source_provider: integration.provider,
        external_product_id: product.externalProductId,
        sync_status: "synced",
        last_external_synced_at: now,
        fulfillment_provider: fulfillmentProvider,
        fulfillment_profile: {
          provider: integration.provider,
          externalProductId: product.externalProductId,
        },
      })
      .select("id")
      .single()
    if (error || !listing) throw new Error(error?.message || "Failed to create imported listing")
    listingId = listing.id
    created = true
  } else {
    const existingMetadata =
      existing.metadata && typeof existing.metadata === "object" ? existing.metadata as Record<string, unknown> : {}
    const updatePayload: Record<string, unknown> = {
      sync_status: "synced",
      last_external_synced_at: now,
      source_provider: integration.provider,
      external_product_id: product.externalProductId,
      integration_id: integration.id,
      fulfillment_provider: fulfillmentProvider,
      fulfillment_profile: {
        provider: integration.provider,
        externalProductId: product.externalProductId,
      },
      metadata: {
        ...existingMetadata,
        sourceProvider: integration.provider,
        externalProductId: product.externalProductId,
        lastExternalSyncAt: now,
        providerPayload: product.rawPayload || {},
      },
    }

    if (existing.status !== "published") {
      updatePayload.title = product.title
      updatePayload.description = product.description || null
      updatePayload.base_price = basePrice
      updatePayload.cover_image_url = product.imageUrl || null
      updatePayload.media_urls = product.imageUrl ? [product.imageUrl] : []
      updatePayload.inventory_count = inventoryCount
      updatePayload.has_unlimited_inventory = inventoryCount === null
    }

    const { error } = await supabase.from("marketplace_listings").update(updatePayload).eq("id", listingId)
    if (error) throw new Error(error.message)
  }

  if (!listingId) throw new Error("Failed to resolve marketplace listing id during sync")

  await upsertIntegrationProductSnapshot({
    supabase,
    sellerUserId,
    integration,
    product,
    listingId,
    now,
  })
  await upsertListingVariants({
    supabase,
    listingId,
    integration,
    product,
    fulfillmentProvider,
    now,
  })

  return { listingId, created }
}

async function upsertIntegrationProductSnapshot({
  supabase,
  sellerUserId,
  integration,
  product,
  listingId,
  now,
}: {
  supabase: any
  sellerUserId: string
  integration: { id: string; provider: string }
  product: ExternalStoreProduct
  listingId: string
  now: string
}) {
  const payload = {
    integration_id: integration.id,
    seller_user_id: sellerUserId,
    provider: integration.provider,
    external_product_id: product.externalProductId,
    title: product.title,
    status: "imported",
    image_url: product.imageUrl || null,
    product_type: product.productType,
    variants_count: product.variants.length,
    imported_listing_id: listingId,
    raw_payload: product.rawPayload || {},
    raw_variants: product.variants.map(variant => variant.rawPayload || {}),
    sync_status: "synced",
    last_synced_at: now,
  }

  const { error } = await supabase
    .from("marketplace_integration_products")
    .upsert(payload, { onConflict: "integration_id,external_product_id" })
  if (error) throw new Error(error.message)
}

async function upsertListingVariants({
  supabase,
  listingId,
  integration,
  product,
  fulfillmentProvider,
  now,
}: {
  supabase: any
  listingId: string
  integration: { id: string; provider: string }
  product: ExternalStoreProduct
  fulfillmentProvider: string | null
  now: string
}) {
  const { data: existingVariants } = await supabase
    .from("marketplace_listing_variants")
    .select("id, external_variant_id")
    .eq("listing_id", listingId)

  const byExternalId = new Map<string, string>(
    (existingVariants || [])
      .filter((variant: any) => variant.external_variant_id)
      .map((variant: any) => [variant.external_variant_id, variant.id])
  )

  for (const [index, variant] of product.variants.entries()) {
    const payload = {
      listing_id: listingId,
      title: variant.title,
      sku: variant.sku || null,
      price: variant.price,
      inventory_count: variant.inventoryCount ?? null,
      is_default: index === 0,
      option_values: variant.optionValues || {},
      metadata: {
        sourceProvider: integration.provider,
        externalProductId: product.externalProductId,
        externalVariantId: variant.externalVariantId,
        providerPayload: variant.rawPayload || {},
      },
      integration_id: integration.id,
      source_provider: integration.provider,
      external_product_id: product.externalProductId,
      external_variant_id: variant.externalVariantId,
      sync_status: "synced",
      last_external_synced_at: now,
      fulfillment_provider: fulfillmentProvider,
      fulfillment_profile: {
        provider: integration.provider,
        externalProductId: product.externalProductId,
        externalVariantId: variant.externalVariantId,
      },
    }

    const existingId = byExternalId.get(variant.externalVariantId)
    const { error } = existingId
      ? await supabase.from("marketplace_listing_variants").update(payload).eq("id", existingId)
      : await supabase.from("marketplace_listing_variants").insert(payload)
    if (error) throw new Error(error.message)
  }
}

async function completeSyncRun({
  supabase,
  syncRunId,
  status,
  importedCount,
  updatedCount,
  skippedCount,
  errorMessage,
}: {
  supabase: any
  syncRunId?: string
  status: "completed" | "failed"
  importedCount: number
  updatedCount: number
  skippedCount: number
  errorMessage?: string
}) {
  if (!syncRunId) return
  await supabase
    .from("marketplace_integration_sync_runs")
    .update({
      status,
      imported_count: importedCount,
      updated_count: updatedCount,
      skipped_count: skippedCount,
      error_message: errorMessage || null,
      completed_at: new Date().toISOString(),
    })
    .eq("id", syncRunId)
}

function sumInventory(variants: Array<{ inventoryCount?: number | null }>) {
  const finite = variants
    .map(variant => variant.inventoryCount)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value))
  if (!finite.length) return null
  return finite.reduce((sum, value) => sum + value, 0)
}
