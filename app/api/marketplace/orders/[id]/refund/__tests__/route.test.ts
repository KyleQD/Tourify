jest.mock("server-only", () => ({}))

import { POST } from "../route"
import { requireMarketplaceAccount } from "@/lib/marketplace/music-commerce-auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { getStripeClient } from "@/lib/stripe"

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
const mockedStripe = getStripeClient as jest.MockedFunction<typeof getStripeClient>

function sellerAuth() {
  mockedAuth.mockResolvedValue({
    success: true,
    account: { userId: "seller-1", accountType: "artist", profileId: "seller-1", supabase: {} },
  } as any)
}

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

  it("returns the previous refund request for an idempotent retry without another money mutation", async () => {
    sellerAuth()
    const payoutUpdate = jest.fn()
    mockedService.mockReturnValue({
      from: jest.fn((table: string) => {
        if (table === "marketplace_orders") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: {
                    id: "order-1",
                    seller_user_id: "seller-1",
                    status: "confirmed",
                    payment_status: "paid",
                    payment_reference: "pi_1",
                    metadata: {
                      lifecycleAudit: [
                        {
                          action: "refund_requested",
                          idempotencyKey: "refund-key-1",
                          refundId: "re_1",
                        },
                      ],
                    },
                  },
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === "marketplace_payout_ledger") {
          return { update: payoutUpdate }
        }
        throw new Error(`Unexpected table ${table}`)
      }),
    } as any)

    const response = await POST(
      { json: async () => ({ idempotencyKey: "refund-key-1" }) } as any,
      { params: Promise.resolve({ id: "order-1" }) },
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      data: { orderId: "order-1", refundId: "re_1", status: "submitted", alreadyRequested: true },
    })
    expect(payoutUpdate).not.toHaveBeenCalled()
    expect(mockedStripe).not.toHaveBeenCalled()
  })

  it("submits a seller refund with a scoped Stripe idempotency key and payout hold", async () => {
    sellerAuth()
    const orderAuditSelect = jest.fn().mockReturnValue({
      maybeSingle: jest.fn().mockResolvedValue({ data: { id: "order-1" }, error: null }),
    })
    const orderAuditUpdateEqPayment = jest.fn().mockReturnValue({ select: orderAuditSelect })
    const orderAuditUpdateEqId = jest.fn().mockReturnValue({ eq: orderAuditUpdateEqPayment })
    const payoutNeq = jest.fn().mockResolvedValue({ error: null })
    const stripeCreate = jest.fn().mockResolvedValue({ id: "re_2", status: "succeeded" })

    mockedService.mockReturnValue({
      from: jest.fn((table: string) => {
        if (table === "marketplace_orders") {
          return {
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
            update: jest.fn().mockReturnValue({ eq: orderAuditUpdateEqId }),
          }
        }
        if (table === "marketplace_payout_ledger") {
          return {
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({ neq: payoutNeq }),
            }),
          }
        }
        throw new Error(`Unexpected table ${table}`)
      }),
    } as any)
    mockedStripe.mockReturnValue({ refunds: { create: stripeCreate } } as any)

    const response = await POST(
      { json: async () => ({ idempotencyKey: "refund-key-2", reason: "requested_by_customer" }) } as any,
      { params: Promise.resolve({ id: "order-1" }) },
    )

    expect(response.status).toBe(202)
    expect(await response.json()).toMatchObject({ data: { orderId: "order-1", refundId: "re_2", status: "succeeded" } })
    expect(stripeCreate).toHaveBeenCalledWith(
      expect.objectContaining({ payment_intent: "pi_1", reason: "requested_by_customer" }),
      { idempotencyKey: "marketplace-refund:order-1:refund-key-2" },
    )
    expect(payoutNeq).toHaveBeenCalledWith("payout_status", "paid")
    expect(orderAuditUpdateEqPayment).toHaveBeenCalledWith("payment_status", "paid")
    expect(orderAuditSelect).toHaveBeenCalledWith("id")
  })

  it("fails closed when the refund audit write matches no row", async () => {
    sellerAuth()
    // A concurrent transition moved the order off `paid`, so the guarded audit
    // update affects zero rows. Reporting 202 here would tell the seller the
    // idempotency key was recorded when it was not.
    const orderAuditSelect = jest.fn().mockReturnValue({
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    })
    const orderAuditUpdateEqPayment = jest.fn().mockReturnValue({ select: orderAuditSelect })
    const orderAuditUpdateEqId = jest.fn().mockReturnValue({ eq: orderAuditUpdateEqPayment })
    const payoutNeq = jest.fn().mockResolvedValue({ error: null })
    const stripeCreate = jest.fn().mockResolvedValue({ id: "re_3", status: "succeeded" })

    mockedService.mockReturnValue({
      from: jest.fn((table: string) => {
        if (table === "marketplace_orders") {
          return {
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
            update: jest.fn().mockReturnValue({ eq: orderAuditUpdateEqId }),
          }
        }
        if (table === "marketplace_payout_ledger") {
          return {
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({ neq: payoutNeq }),
            }),
          }
        }
        throw new Error(`Unexpected table ${table}`)
      }),
    } as any)
    mockedStripe.mockReturnValue({ refunds: { create: stripeCreate } } as any)

    const response = await POST(
      { json: async () => ({ idempotencyKey: "refund-key-3" }) } as any,
      { params: Promise.resolve({ id: "order-1" }) },
    )

    expect(response.status).toBe(500)
    expect((await response.json()).error.code).toBe("refund_audit_failed")
  })
})
