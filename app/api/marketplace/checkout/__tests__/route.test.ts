jest.mock("server-only", () => ({}))

import { POST } from "../route"
import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { getSellerPayoutReadiness } from "@/lib/marketplace/seller-payout-readiness"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createServerClient } from "@/lib/supabase/server"

jest.mock("@/lib/auth/api-auth", () => ({ authenticateApiRequest: jest.fn() }))
jest.mock("@/lib/marketplace/seller-payout-readiness", () => ({ getSellerPayoutReadiness: jest.fn() }))
jest.mock("@/lib/supabase/service-role", () => ({ createServiceRoleClient: jest.fn() }))
jest.mock("@/lib/supabase/server", () => ({ createServerClient: jest.fn() }))
jest.mock("@/lib/stripe", () => ({ getStripeClient: jest.fn(), getStripe: jest.fn() }))
jest.mock("@/lib/marketplace/fee-calculator", () => ({
  loadActiveFeeSnapshot: jest.fn().mockResolvedValue({
    ruleId: null, ruleVersion: null, percentageFee: 0.10, fixedFeeCents: 0,
    minimumFeeCents: null, maximumFeeCents: null, description: "Default platform fee (10%)",
  }),
  calculateFeeBreakdown: jest.fn().mockReturnValue({
    subtotalCents: 2500, platformFeeCents: 250, taxCents: 0, totalCents: 2750,
    snapshot: { percentageFee: 0.10, fixedFeeCents: 0 },
  }),
}))
jest.mock("@/lib/marketplace/require-marketplace-enabled", () => ({
  requireMarketplaceEnabled: jest.fn().mockReturnValue(null),
}))
jest.mock("@/lib/marketplace/printful-fulfillment", () => ({
  ensurePrintfulFulfillmentRequests: jest.fn().mockResolvedValue(undefined),
}))

const mockedAuth = authenticateApiRequest as jest.MockedFunction<typeof authenticateApiRequest>
const mockedGetSellerPayoutReadiness = getSellerPayoutReadiness as jest.MockedFunction<typeof getSellerPayoutReadiness>
const mockedServiceRole = createServiceRoleClient as jest.MockedFunction<typeof createServiceRoleClient>

const LISTING_ID = "11111111-1111-1111-1111-111111111111"
const SELLER_ID = "seller-user-aaaa-aaaa-aaaa-aaaaaaaaaaaa"

function makeServiceRoleMock(listingOverrides: object = {}) {
  return {
    from: jest.fn((table: string) => {
      if (table === "marketplace_checkout_attempts") {
        return {
          select: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ maybeSingle: jest.fn().mockResolvedValue({ data: null }) }) }),
          upsert: jest.fn().mockResolvedValue({ error: null }),
        }
      }
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({ maybeSingle: jest.fn().mockResolvedValue({ data: null }) }),
        }),
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: "order-id-xxxx", order_number: "TFY-20260728-ABCD1234", metadata: {} },
              error: null,
            }),
          }),
        }),
        update: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) }),
        delete: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) }),
        upsert: jest.fn().mockResolvedValue({ error: null }),
      }
    }),
  }
}

describe("POST /api/marketplace/checkout", () => {
  it("returns structured validation errors for invalid payloads", async () => {
    mockedAuth.mockResolvedValueOnce({
      user: { id: "buyer-1", email: "buyer@example.com" },
      supabase: {},
    } as any)
    mockedServiceRole.mockReturnValue(makeServiceRoleMock() as any)

    const request = {
      json: async () => ({ lines: [] }),
      nextUrl: { origin: "https://test.example.com" },
    } as any

    const response = await POST(request)
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.error.code).toBe("invalid_request")
    expect(Array.isArray(payload.error.issues)).toBe(true)
  })

  it("blocks self-purchase attempts with contract error envelope", async () => {
    const supabase = {
      from: jest.fn((table: string) => {
        if (table === "marketplace_listings") {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({
                data: [{
                  id: LISTING_ID,
                  seller_user_id: "buyer-1",
                  title: "Track",
                  status: "published",
                  product_type: "digital_asset",
                  listing_kind: "native",
                  currency: "USD",
                  base_price: 5,
                  cover_image_url: null,
                  metadata: {},
                  music_track_id: null,
                }],
                error: null,
              }),
            }),
          }
        }
        return { select: jest.fn().mockReturnValue({ in: jest.fn().mockResolvedValue({ data: [], error: null }) }) }
      }),
    }

    mockedAuth.mockResolvedValueOnce({
      user: { id: "buyer-1", email: "buyer@example.com" },
      supabase,
    } as any)
    mockedServiceRole.mockReturnValue(makeServiceRoleMock() as any)

    const request = {
      json: async () => ({ lines: [{ listingId: LISTING_ID, quantity: 1 }] }),
      nextUrl: { origin: "https://test.example.com" },
    } as any

    const response = await POST(request)
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.error.code).toBe("self_purchase_not_allowed")
  })

  it("blocks checkout when seller Stripe payouts are not ready", async () => {
    const supabase = {
      from: jest.fn((table: string) => {
        if (table === "marketplace_listings") {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({
                data: [{
                  id: LISTING_ID,
                  seller_user_id: SELLER_ID,
                  title: "Tour tee",
                  status: "published",
                  product_type: "physical_merch",
                  listing_kind: "native",
                  currency: "USD",
                  base_price: 25,
                  cover_image_url: null,
                  metadata: {},
                  music_track_id: null,
                  integration_id: null,
                  source_provider: null,
                  external_product_id: null,
                  fulfillment_provider: null,
                  fulfillment_profile: {},
                  inventory_count: 10,
                  has_unlimited_inventory: false,
                }],
                error: null,
              }),
            }),
          }
        }
        return { select: jest.fn().mockReturnValue({ in: jest.fn().mockResolvedValue({ data: [], error: null }) }) }
      }),
    }

    mockedAuth.mockResolvedValueOnce({
      user: { id: "buyer-1", email: "buyer@example.com" },
      supabase,
    } as any)
    mockedGetSellerPayoutReadiness.mockResolvedValueOnce({
      ready: false,
      accountId: null,
      connectKind: null,
      chargesEnabled: false,
      payoutsEnabled: false,
      detailsSubmitted: false,
      reason: "stripe_connect_required",
    })
    mockedServiceRole.mockReturnValue(makeServiceRoleMock() as any)

    const request = {
      json: async () => ({ lines: [{ listingId: LISTING_ID, quantity: 1 }] }),
      nextUrl: { origin: "https://test.example.com" },
    } as any

    const response = await POST(request)
    const payload = await response.json()

    expect(response.status).toBe(409)
    expect(payload.error.code).toBe("seller_payouts_not_ready")
  })

  it("blocks checkout when inventory is insufficient", async () => {
    const supabase = {
      from: jest.fn((table: string) => {
        if (table === "marketplace_listings") {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({
                data: [{
                  id: LISTING_ID,
                  seller_user_id: SELLER_ID,
                  title: "Tour tee",
                  status: "published",
                  product_type: "physical_merch",
                  listing_kind: "native",
                  currency: "USD",
                  base_price: 25,
                  cover_image_url: null,
                  metadata: {},
                  music_track_id: null,
                  integration_id: null,
                  source_provider: null,
                  external_product_id: null,
                  fulfillment_provider: null,
                  fulfillment_profile: {},
                  inventory_count: 0,
                  has_unlimited_inventory: false,
                }],
                error: null,
              }),
            }),
          }
        }
        return { select: jest.fn().mockReturnValue({ in: jest.fn().mockResolvedValue({ data: [], error: null }) }) }
      }),
    }

    mockedAuth.mockResolvedValueOnce({
      user: { id: "buyer-1", email: "buyer@example.com" },
      supabase,
    } as any)
    mockedServiceRole.mockReturnValue(makeServiceRoleMock() as any)

    const request = {
      json: async () => ({ lines: [{ listingId: LISTING_ID, quantity: 1 }] }),
      nextUrl: { origin: "https://test.example.com" },
    } as any

    const response = await POST(request)
    const payload = await response.json()

    expect(response.status).toBe(409)
    expect(payload.error.code).toBe("insufficient_inventory")
  })
})
