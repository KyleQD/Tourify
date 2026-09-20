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

describe("POST /api/marketplace/orders/[id]/refund", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedAuth.mockResolvedValue({
      success: true,
      account: { userId: "buyer-1", accountType: "general", profileId: "buyer-1", supabase: {} },
    } as any)
  })

  it("requires a request idempotency key before any money mutation", async () => {
    const response = await POST(
      { json: async () => ({}) } as any,
      { params: Promise.resolve({ id: "order-1" }) },
    )
    expect(response.status).toBe(400)
    expect(mockedService).not.toHaveBeenCalled()
  })

  it("denies a buyer from initiating a seller refund", async () => {
    mockedService.mockReturnValue({
      from: jest.fn(() => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: {
                id: "order-1",
                seller_user_id: "seller-1",
                status: "confirmed",
                payment_status: "paid",
                payment_reference: "pi_1",
                metadata: {},
              },
              error: null,
            }),
          }),
        }),
      })),
    } as any)

    const response = await POST(
      { json: async () => ({ idempotencyKey: "refund-key-1" }) } as any,
      { params: Promise.resolve({ id: "order-1" }) },
    )
    expect(response.status).toBe(403)
    expect((await response.json()).error.code).toBe("forbidden")
  })
})
