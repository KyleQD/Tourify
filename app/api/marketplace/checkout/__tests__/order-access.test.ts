jest.mock("server-only", () => ({}))

import { loadMarketplaceOrder } from "@/app/marketplace/order/order-access"
import { createServerClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

jest.mock("@/lib/supabase/server", () => ({ createServerClient: jest.fn() }))
jest.mock("@/lib/supabase/service-role", () => ({ createServiceRoleClient: jest.fn() }))

const orderId = "11111111-1111-1111-1111-111111111111"
const buyerId = "22222222-2222-2222-2222-222222222222"
const order = { id: orderId, buyer_user_id: buyerId, seller_user_id: "seller-1" }

function serviceMock({ guestOrder = null, buyerOrder = order }: { guestOrder?: typeof order | null; buyerOrder?: typeof order | null } = {}) {
  const queries: Array<Record<string, string>> = []
  const from = jest.fn((table: string) => {
    const filters: Record<string, string> = {}
    const query = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn((key: string, value: string) => {
        filters[key] = value
        return query
      }),
      maybeSingle: jest.fn(async () => {
        queries.push({ ...filters })
        if (table === "profiles") return { data: { id: "seller-1", username: "seller" } }
        if (filters.guest_access_token) return { data: guestOrder }
        const allowed = filters.id === orderId && filters.buyer_user_id === buyerId &&
          (!filters.stripe_checkout_session_id || filters.stripe_checkout_session_id === "cs_test_right")
        return { data: allowed ? buyerOrder : null }
      }),
    }
    return query
  })
  return { client: { from }, queries }
}

describe("loadMarketplaceOrder", () => {
  beforeEach(() => jest.clearAllMocks())

  it("loads the signed-in buyer's Stripe return only for the matching session", async () => {
    const service = serviceMock()
    ;(createServiceRoleClient as jest.Mock).mockReturnValue(service.client)
    ;(createServerClient as jest.Mock).mockResolvedValue({ auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: buyerId } }, error: null }) } })

    expect((await loadMarketplaceOrder(orderId, { checkout: "success", sessionId: "cs_test_right" }))?.order?.id).toBe(orderId)
    expect(service.queries).toContainEqual({ id: orderId, buyer_user_id: buyerId, stripe_checkout_session_id: "cs_test_right" })
    expect(await loadMarketplaceOrder(orderId, { checkout: "success", sessionId: "cs_test_wrong" })).toBeNull()
    expect(await loadMarketplaceOrder(orderId, { checkout: "success" })).toBeNull()
  })

  it("denies another signed-in buyer even with the correct session ID", async () => {
    const service = serviceMock()
    ;(createServiceRoleClient as jest.Mock).mockReturnValue(service.client)
    ;(createServerClient as jest.Mock).mockResolvedValue({ auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: "other-buyer" } }, error: null }) } })

    expect(await loadMarketplaceOrder(orderId, { checkout: "success", sessionId: "cs_test_right" })).toBeNull()
    expect(service.queries).toContainEqual({ id: orderId, buyer_user_id: "other-buyer", stripe_checkout_session_id: "cs_test_right" })
  })

  it("allows a verified buyer to reopen an order from purchase history", async () => {
    const service = serviceMock()
    ;(createServiceRoleClient as jest.Mock).mockReturnValue(service.client)
    ;(createServerClient as jest.Mock).mockResolvedValue({ auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: buyerId } }, error: null }) } })

    expect((await loadMarketplaceOrder(orderId))?.order?.id).toBe(orderId)
    expect(service.queries).toContainEqual({ id: orderId, buyer_user_id: buyerId })
  })

  it("denies an unsigned visitor to an account order", async () => {
    const service = serviceMock()
    ;(createServiceRoleClient as jest.Mock).mockReturnValue(service.client)
    ;(createServerClient as jest.Mock).mockResolvedValue({ auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }) } })

    expect(await loadMarketplaceOrder(orderId)).toBeNull()
    expect(service.queries).toEqual([{ guest_access_token: orderId }])
  })

  it("preserves guest token access without signing in", async () => {
    const service = serviceMock({ guestOrder: { ...order, buyer_user_id: null } as any })
    ;(createServiceRoleClient as jest.Mock).mockReturnValue(service.client)
    const guestToken = "a".repeat(64)

    expect((await loadMarketplaceOrder(guestToken, { checkout: "success" }))?.order?.id).toBe(orderId)
    expect(createServerClient).not.toHaveBeenCalled()
  })
})
