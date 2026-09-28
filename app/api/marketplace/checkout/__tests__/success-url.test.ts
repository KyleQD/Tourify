import { marketplaceCheckoutSuccessUrl } from "../success-url"

describe("marketplaceCheckoutSuccessUrl", () => {
  const siteUrl = "https://staging.example.com"
  const orderId = "11111111-1111-1111-1111-111111111111"

  it("returns an authenticated order URL with Stripe session verification", () => {
    expect(marketplaceCheckoutSuccessUrl({ siteUrl, orderId, guestAccessToken: null })).toBe(
      `https://staging.example.com/marketplace/order/${orderId}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    )
  })

  it("retains opaque guest-token order access", () => {
    const guestAccessToken = "a".repeat(64)
    expect(marketplaceCheckoutSuccessUrl({ siteUrl, orderId, guestAccessToken })).toBe(
      `https://staging.example.com/marketplace/order/${guestAccessToken}?checkout=success`,
    )
  })
})
