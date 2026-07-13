import { MARKETPLACE_PRODUCT_TYPE } from "@/lib/marketplace/catalog"

export interface ExternalStoreVariant {
  externalVariantId: string
  title: string
  sku?: string | null
  price: number
  inventoryCount?: number | null
  optionValues?: Record<string, unknown>
  rawPayload?: Record<string, unknown>
}

export interface ExternalStoreProduct {
  provider: "printful" | "shopify"
  externalProductId: string
  title: string
  description?: string | null
  imageUrl?: string | null
  productType: string
  category: string
  status: "pending" | "imported" | "published" | "ignored" | "error"
  variants: ExternalStoreVariant[]
  rawPayload?: Record<string, unknown>
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim()
    if (typeof value === "number" && Number.isFinite(value)) return String(value)
  }
  return ""
}

function firstNumber(...values: unknown[]) {
  for (const value of values) {
    const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN
    if (Number.isFinite(parsed) && parsed >= 0) return Math.round(parsed * 100) / 100
  }
  return 0
}

function firstNullableNumber(...values: unknown[]) {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue
    const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN
    if (Number.isFinite(parsed) && parsed >= 0) return Math.trunc(parsed)
  }
  return null
}

function normalizeNodes(value: unknown) {
  const record = asRecord(value)
  const edges = asArray(record.edges)
  if (edges.length) return edges.map(edge => asRecord(edge).node).filter(Boolean)
  return asArray(record.nodes || value)
}

export function normalizePrintfulProducts(payload: unknown): ExternalStoreProduct[] {
  const root = asRecord(payload)
  const products = asArray(root.data || payload)

  return products
    .map(item => {
      const product = asRecord(item)
      const externalProductId = firstString(product.id, product.external_id, product.store_product_id)
      if (!externalProductId) return null

      const rawVariants = asArray(product.variants || product.sync_variants || product.items)
      const variants = rawVariants.length
        ? rawVariants.map(variantValue => {
            const variant = asRecord(variantValue)
            const optionValues = asRecord(variant.options || variant.option_values)
            return {
              externalVariantId: firstString(variant.id, variant.external_id, variant.store_variant_id, variant.catalog_variant_id),
              title: firstString(variant.name, variant.title, variant.variant_name, product.name, product.title) || "Default",
              sku: firstString(variant.sku) || null,
              price: firstNumber(variant.retail_price, variant.price, product.retail_price, product.price),
              inventoryCount: firstNullableNumber(variant.quantity, variant.inventory, variant.in_stock),
              optionValues,
              rawPayload: variant,
            }
          })
        : [{
            externalVariantId: externalProductId,
            title: "Default",
            sku: firstString(product.sku) || null,
            price: firstNumber(product.retail_price, product.price),
            inventoryCount: null,
            optionValues: {},
            rawPayload: product,
          }]

      return {
        provider: "printful" as const,
        externalProductId,
        title: firstString(product.name, product.title) || "Printful product",
        description: firstString(product.description) || null,
        imageUrl: firstString(product.thumbnail_url, product.thumbnail, product.preview_url, product.image) || null,
        productType: MARKETPLACE_PRODUCT_TYPE.podPrint,
        category: "merch",
        status: "pending" as const,
        variants: variants.filter(variant => variant.externalVariantId),
        rawPayload: product,
      }
    })
    .filter(Boolean) as ExternalStoreProduct[]
}

export function normalizeShopifyProducts(payload: unknown): ExternalStoreProduct[] {
  const root = asRecord(payload)
  const data = asRecord(root.data)
  const productsContainer = asRecord(data.products || root.products || root)
  const products = normalizeNodes(productsContainer)

  return products
    .map(item => {
      const product = asRecord(item)
      const externalProductId = firstString(product.id, product.legacyResourceId)
      if (!externalProductId) return null

      const featuredMedia = asRecord(product.featuredMedia)
      const image = asRecord(product.image)
      const variantsContainer = asRecord(product.variants)
      const variants = normalizeNodes(variantsContainer).map(variantValue => {
        const variant = asRecord(variantValue)
        const selectedOptions = asArray(variant.selectedOptions)
        const optionValues = Object.fromEntries(
          selectedOptions.map(optionValue => {
            const option = asRecord(optionValue)
            return [firstString(option.name), firstString(option.value)]
          }).filter(([key]) => key)
        )

        return {
          externalVariantId: firstString(variant.id, variant.legacyResourceId),
          title: firstString(variant.title, product.title) || "Default",
          sku: firstString(variant.sku) || null,
          price: firstNumber(variant.price, variant.contextualPricing && asRecord(variant.contextualPricing).price),
          inventoryCount: firstNullableNumber(variant.inventoryQuantity, variant.quantityAvailable),
          optionValues,
          rawPayload: variant,
        }
      }).filter(variant => variant.externalVariantId)

      return {
        provider: "shopify" as const,
        externalProductId,
        title: firstString(product.title) || "Shopify product",
        description: firstString(product.description, product.descriptionHtml) || null,
        imageUrl:
          firstString(asRecord(featuredMedia.preview).image && asRecord(asRecord(featuredMedia.preview).image).url, featuredMedia.previewImage, image.url, product.featuredImage) || null,
        productType: MARKETPLACE_PRODUCT_TYPE.physicalMerch,
        category: "merch",
        status: "pending" as const,
        variants: variants.length ? variants : [{
          externalVariantId: externalProductId,
          title: "Default",
          sku: null,
          price: 0,
          inventoryCount: firstNullableNumber(product.totalInventory),
          optionValues: {},
          rawPayload: product,
        }],
        rawPayload: product,
      }
    })
    .filter(Boolean) as ExternalStoreProduct[]
}
