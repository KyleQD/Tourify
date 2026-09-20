jest.mock("server-only", () => ({}))

import { POST } from "../route"
import { requireMarketplaceAccount } from "@/lib/marketplace/music-commerce-auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

jest.mock("@/lib/marketplace/require-marketplace-enabled", () => ({
  requireMarketplaceEnabled: jest.fn().mockReturnValue(null),
}))
jest.mock("@/lib/marketplace/music-commerce-auth", () => ({
  requireMarketplaceAccount: jest.fn(),
}))
jest.mock("@/lib/supabase/service-role", () => ({ createServiceRoleClient: jest.fn() }))
jest.mock("@/lib/stripe", () => ({ getStripeClient: jest.fn() }))

const mockedAuth = requireMarketplaceAccount as jest.MockedFunction<typeof requireMarketplaceAccount>
const mockedService = createServiceRoleClient as jest.MockedFunction<typeof createServiceRoleClient>

function serviceWithOrder(order: Record<string, unknown>) {
  return {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          maybeSingle: jest.fn().mockResolvedValue({ data: order, error: null }),
        }),
      }),
    })),
  }
}

describe("POST /api/marketplace/orders/[id]/cancel", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedAuth.mockResolvedValue({
      success: true,
      account: { userId: "buyer-1", accountType: "general", profileId: "buyer-1", supabase: {} },
    } as any)
  })

  it("denies users who are not an order participant", async () => {
    mockedService.mockReturnValue(serviceWithOrder({
      id: "order-1",
      buyer_user_id: "buyer-2",
      seller_user_id: "seller-1",
      status: "pending",
      payment_status: "processing",
      stripe_checkout_session_id: null,
      metadata: {},
    }) as any)

    const response = await POST({} as any, { params: Promise.resolve({ id: "order-1" }) })
    expect(response.status).toBe(403)
    expect((await response.json()).error.code).toBe("forbidden")
  })

  it("routes paid orders to the refund workflow", async () => {
    mockedService.mockReturnValue(serviceWithOrder({
      id: "order-1",
      buyer_user_id: "buyer-1",
      seller_user_id: "seller-1",
      status: "confirmed",
      payment_status: "paid",
      stripe_checkout_session_id: "cs_1",
      metadata: {},
    }) as any)

    const response = await POST({} as any, { params: Promise.resolve({ id: "order-1" }) })
    expect(response.status).toBe(409)
    expect((await response.json()).error.code).toBe("refund_required")
  })
})
