import crypto from "crypto"

jest.mock("server-only", () => ({}))

describe("shopify marketplace adapter helpers", () => {
  beforeAll(() => {
    process.env.SHOPIFY_CLIENT_SECRET = "shopify-secret"
    process.env.SHOPIFY_CLIENT_ID = "shopify-client"
  })

  it("validates OAuth and webhook HMAC signatures", () => {
    const { verifyShopifyOAuthHmac, verifyShopifyWebhookSignature } = require("../shopify-adapter")

    const params = new URLSearchParams({
      code: "auth-code",
      shop: "artist.myshopify.com",
      state: "nonce",
      timestamp: "12345",
    })
    const message = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join("&")
    params.set("hmac", crypto.createHmac("sha256", "shopify-secret").update(message).digest("hex"))
    expect(verifyShopifyOAuthHmac(params)).toBe(true)

    const rawBody = JSON.stringify({ id: 123, title: "Tour tee" })
    const signature = crypto.createHmac("sha256", "shopify-secret").update(rawBody, "utf8").digest("base64")
    expect(verifyShopifyWebhookSignature({ rawBody, signature })).toBe(true)
    expect(verifyShopifyWebhookSignature({ rawBody, signature: "bad" })).toBe(false)
  })

  it("requires canonical myshopify domains", () => {
    const { normalizeShopifyDomain } = require("../shopify-adapter")
    expect(normalizeShopifyDomain("https://Artist-Shop.myshopify.com/admin")).toBe("artist-shop.myshopify.com")
    expect(() => normalizeShopifyDomain("example.com")).toThrow()
  })
})
