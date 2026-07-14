import "server-only"

import { createHmac, timingSafeEqual } from "crypto"
import { normalizeShopifyProducts, type ExternalStoreProduct } from "@/lib/marketplace/provider-normalizers"

const DEFAULT_SHOPIFY_SCOPES = ["read_products", "read_inventory", "read_locations"]

export interface ShopifyTokenExchangeResult {
  accessToken: string
  scope: string[]
  rawPayload: Record<string, unknown>
}

export interface ShopifyCatalogSyncResult {
  provider: "shopify"
  status: "connected" | "skipped"
  syncedCount: number
  products: ExternalStoreProduct[]
}

export function normalizeShopifyDomain(input: string) {
  const trimmed = input.trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "").toLowerCase()
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(trimmed)) {
    throw new Error("Enter a valid Shopify shop domain ending in .myshopify.com")
  }
  return trimmed
}

function getShopifyClientId() {
  const clientId = process.env.SHOPIFY_CLIENT_ID
  if (!clientId) throw new Error("SHOPIFY_CLIENT_ID is required")
  return clientId
}

function getShopifyClientSecret() {
  const secret = process.env.SHOPIFY_CLIENT_SECRET
  if (!secret) throw new Error("SHOPIFY_CLIENT_SECRET is required")
  return secret
}

export function getShopifyScopes() {
  const configured = process.env.SHOPIFY_SCOPES?.split(",").map(scope => scope.trim()).filter(Boolean)
  return configured?.length ? configured : DEFAULT_SHOPIFY_SCOPES
}

export function buildShopifyAuthorizationUrl({
  shopDomain,
  redirectUri,
  state,
}: {
  shopDomain: string
  redirectUri: string
  state: string
}) {
  const shop = normalizeShopifyDomain(shopDomain)
  const url = new URL(`https://${shop}/admin/oauth/authorize`)
  url.searchParams.set("client_id", getShopifyClientId())
  url.searchParams.set("scope", getShopifyScopes().join(","))
  url.searchParams.set("redirect_uri", redirectUri)
  url.searchParams.set("state", state)
  return url.toString()
}

export async function exchangeShopifyAuthorizationCode({
  shopDomain,
  code,
}: {
  shopDomain: string
  code: string
}): Promise<ShopifyTokenExchangeResult> {
  const shop = normalizeShopifyDomain(shopDomain)
  const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: getShopifyClientId(),
      client_secret: getShopifyClientSecret(),
      code,
    }),
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok || typeof body.access_token !== "string") {
    throw new Error(typeof body.error_description === "string" ? body.error_description : "Shopify token exchange failed")
  }

  return {
    accessToken: body.access_token,
    scope: typeof body.scope === "string" ? body.scope.split(",").map((scope: string) => scope.trim()).filter(Boolean) : [],
    rawPayload: body,
  }
}

export function verifyShopifyOAuthHmac(searchParams: URLSearchParams, secret = getShopifyClientSecret()) {
  const hmac = searchParams.get("hmac")
  if (!hmac) return false

  const message = Array.from(searchParams.entries())
    .filter(([key]) => key !== "hmac" && key !== "signature")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&")

  const digest = createHmac("sha256", secret).update(message).digest("hex")
  return safeEqual(digest, hmac)
}

export function verifyShopifyWebhookSignature({
  rawBody,
  signature,
  secret = getShopifyClientSecret(),
}: {
  rawBody: string
  signature: string | null
  secret?: string
}) {
  if (!signature) return false
  const digest = createHmac("sha256", secret).update(rawBody, "utf8").digest("base64")
  return safeEqual(digest, signature)
}

export async function syncShopifyCatalog({
  shopDomain,
  accessToken,
}: {
  shopDomain?: string | null
  accessToken?: string | null
}): Promise<ShopifyCatalogSyncResult> {
  if (!shopDomain || !accessToken) {
    return { provider: "shopify", status: "skipped", syncedCount: 0, products: [] }
  }

  const shop = normalizeShopifyDomain(shopDomain)
  const apiVersion = process.env.SHOPIFY_ADMIN_API_VERSION || "2026-07"
  const response = await fetch(`https://${shop}/admin/api/${apiVersion}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": accessToken,
    },
    body: JSON.stringify({
      query: `
        query TourifyImportedProducts {
          products(first: 50) {
            edges {
              node {
                id
                title
                descriptionHtml
                status
                totalInventory
                featuredMedia {
                  preview {
                    image {
                      url
                    }
                  }
                }
                variants(first: 50) {
                  edges {
                    node {
                      id
                      title
                      sku
                      price
                      inventoryQuantity
                      selectedOptions {
                        name
                        value
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `,
    }),
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok || body.errors) {
    const message = Array.isArray(body.errors) ? body.errors[0]?.message : null
    throw new Error(message || "Shopify product sync failed")
  }

  const products = normalizeShopifyProducts(body)
  return {
    provider: "shopify",
    status: "connected",
    syncedCount: products.length,
    products,
  }
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  if (leftBuffer.length !== rightBuffer.length) return false
  return timingSafeEqual(leftBuffer, rightBuffer)
}
