jest.mock("server-only", () => ({}))

import { POST } from "../route"
import { requireApiUser } from "@/lib/api/route-helpers"
import { getSellerPayoutReadiness } from "@/lib/marketplace/seller-payout-readiness"

jest.mock("@/lib/api/route-helpers", () => ({
  ...jest.requireActual("@/lib/api/route-helpers"),
  requireApiUser: jest.fn(),
}))

jest.mock("@/lib/marketplace/seller-payout-readiness", () => ({
  getSellerPayoutReadiness: jest.fn(),
}))

const mockedRequireApiUser = requireApiUser as jest.MockedFunction<typeof requireApiUser>
const mockedGetSellerPayoutReadiness = getSellerPayoutReadiness as jest.MockedFunction<typeof getSellerPayoutReadiness>

describe("POST /api/marketplace/checkout", () => {
  it("returns structured validation errors for invalid payloads", async () => {
    mockedRequireApiUser.mockResolvedValueOnce({
      success: true,
      auth: {
        user: { id: "buyer-1", email: "buyer@example.com" },
        supabase: {},
      },
    } as any)

    const request = {
      json: async () => ({ lines: [] }),
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
        if (table !== "marketplace_listings") throw new Error(`Unexpected table ${table}`)
        return {
          select: jest.fn().mockReturnValue({
            in: jest.fn().mockResolvedValue({
              data: [
                {
                  id: "11111111-1111-1111-1111-111111111111",
                  seller_user_id: "buyer-1",
                  title: "Track",
                  status: "published",
                  product_type: "digital_asset",
                  currency: "USD",
                  base_price: 5,
                  cover_image_url: null,
                  metadata: {},
                  music_track_id: null,
                },
              ],
              error: null,
            }),
          }),
        }
      }),
    }

    mockedRequireApiUser.mockResolvedValueOnce({
      success: true,
      auth: {
        user: { id: "buyer-1", email: "buyer@example.com" },
        supabase,
      },
    } as any)

    const request = {
      json: async () => ({
        lines: [
          {
            listingId: "11111111-1111-1111-1111-111111111111",
            quantity: 1,
          },
        ],
      }),
    } as any

    const response = await POST(request)
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.error.code).toBe("self_purchase_not_allowed")
  })

  it("blocks checkout when seller Stripe payouts are not ready", async () => {
    const supabase = {
      from: jest.fn((table: string) => {
        if (table !== "marketplace_listings") throw new Error(`Unexpected table ${table}`)
        return {
          select: jest.fn().mockReturnValue({
            in: jest.fn().mockResolvedValue({
              data: [
                {
                  id: "11111111-1111-1111-1111-111111111111",
                  seller_user_id: "seller-1",
                  title: "Tour tee",
                  status: "published",
                  product_type: "physical_merch",
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
                },
              ],
              error: null,
            }),
          }),
        }
      }),
    }

    mockedRequireApiUser.mockResolvedValueOnce({
      success: true,
      auth: {
        user: { id: "buyer-1", email: "buyer@example.com" },
        supabase,
      },
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

    const request = {
      json: async () => ({
        lines: [
          {
            listingId: "11111111-1111-1111-1111-111111111111",
            quantity: 1,
          },
        ],
      }),
    } as any

    const response = await POST(request)
    const payload = await response.json()

    expect(response.status).toBe(409)
    expect(payload.error.code).toBe("seller_payouts_not_ready")
  })

  it("blocks checkout when inventory is insufficient", async () => {
    const supabase = {
      from: jest.fn((table: string) => {
        if (table !== "marketplace_listings") throw new Error(`Unexpected table ${table}`)
        return {
          select: jest.fn().mockReturnValue({
            in: jest.fn().mockResolvedValue({
              data: [
                {
                  id: "11111111-1111-1111-1111-111111111111",
                  seller_user_id: "seller-1",
                  title: "Tour tee",
                  status: "published",
                  product_type: "physical_merch",
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
                },
              ],
              error: null,
            }),
          }),
        }
      }),
    }

    mockedRequireApiUser.mockResolvedValueOnce({
      success: true,
      auth: {
        user: { id: "buyer-1", email: "buyer@example.com" },
        supabase,
      },
    } as any)

    const request = {
      json: async () => ({
        lines: [
          {
            listingId: "11111111-1111-1111-1111-111111111111",
            quantity: 1,
          },
        ],
      }),
    } as any

    const response = await POST(request)
    const payload = await response.json()

    expect(response.status).toBe(409)
    expect(payload.error.code).toBe("insufficient_inventory")
  })
})
