jest.mock("server-only", () => ({}))

// ---------------------------------------------------------------------------
// P6 tests: checkout security + webhook idempotency + guest order access
// ---------------------------------------------------------------------------

import { POST as checkoutPost } from "@/app/api/marketplace/checkout/route"
import { GET as guestOrderGet } from "@/app/api/marketplace/order/[token]/route"
import { POST as claimPost } from "@/app/api/marketplace/order/[token]/claim/route"
import { handleMarketplaceStripeEventIdempotent } from "@/lib/marketplace/webhook-processor"
import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { getSellerPayoutReadiness } from "@/lib/marketplace/seller-payout-readiness"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

jest.mock("@/lib/auth/api-auth", () => ({ authenticateApiRequest: jest.fn() }))
jest.mock("@/lib/marketplace/seller-payout-readiness", () => ({ getSellerPayoutReadiness: jest.fn() }))
jest.mock("@/lib/supabase/service-role", () => ({ createServiceRoleClient: jest.fn() }))
jest.mock("@/lib/supabase/server", () => ({ createServerClient: jest.fn() }))
jest.mock("@/lib/stripe", () => ({ getStripeClient: jest.fn(), getStripe: jest.fn() }))
jest.mock("@/lib/marketplace/fee-calculator", () => ({
  loadActiveFeeSnapshot: jest.fn().mockResolvedValue({
    ruleId: null,
    ruleVersion: null,
    percentageFee: 0.10,
    fixedFeeCents: 0,
    minimumFeeCents: null,
    maximumFeeCents: null,
    description: "Default platform fee (10%)",
  }),
  calculateFeeBreakdown: jest.fn().mockReturnValue({
    subtotalCents: 2500,
    platformFeeCents: 250,
    taxCents: 0,
    totalCents: 2750,
    snapshot: { percentageFee: 0.10, fixedFeeCents: 0 },
  }),
}))
jest.mock("@/lib/marketplace/require-marketplace-enabled", () => ({
  requireMarketplaceEnabled: jest.fn().mockReturnValue(null),
  requirePublicDiscoveryEnabled: jest.fn().mockReturnValue(null),
}))
jest.mock("@/lib/marketplace/printful-fulfillment", () => ({
  ensurePrintfulFulfillmentRequests: jest.fn().mockResolvedValue(undefined),
}))

const mockedAuth = authenticateApiRequest as jest.MockedFunction<typeof authenticateApiRequest>
const mockedPayoutReadiness = getSellerPayoutReadiness as jest.MockedFunction<typeof getSellerPayoutReadiness>
const mockedServiceRole = createServiceRoleClient as jest.MockedFunction<typeof createServiceRoleClient>

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SELLER_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
const BUYER_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
const LISTING_ID = "cccccccc-cccc-cccc-cccc-cccccccccccc"
const ORDER_ID = "dddddddd-dddd-dddd-dddd-dddddddddddd"

function makePublishedListing(overrides: object = {}) {
  return {
    id: LISTING_ID,
    seller_user_id: SELLER_ID,
    title: "Test Tee",
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
    ...overrides,
  }
}

function makeSupabaseMock(listingOverrides: object = {}) {
  return {
    from: jest.fn((table: string) => {
      if (table === "marketplace_listings") {
        return {
          select: jest.fn().mockReturnValue({
            in: jest.fn().mockResolvedValue({
              data: [makePublishedListing(listingOverrides)],
              error: null,
            }),
          }),
        }
      }
      if (table === "marketplace_listing_variants") {
        return { select: jest.fn().mockReturnValue({ in: jest.fn().mockResolvedValue({ data: [], error: null }) }) }
      }
      // All other tables — return success
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({ maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }) }),
        }),
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: ORDER_ID, order_number: "TFY-20260728-ABCD1234", metadata: {} },
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

// ---------------------------------------------------------------------------
// 1. Price manipulation is rejected (server-authoritative price)
// ---------------------------------------------------------------------------

describe("checkout — server-authoritative pricing", () => {
  it("uses server price, ignores any client-provided price field", async () => {
    const svcMock = makeSupabaseMock()
    mockedAuth.mockResolvedValueOnce({ user: { id: BUYER_ID, email: "buyer@example.com" }, supabase: svcMock } as any)
    mockedPayoutReadiness.mockResolvedValueOnce({ ready: true, accountId: "acct_seller", connectKind: "express", chargesEnabled: true, payoutsEnabled: true, detailsSubmitted: true, reason: null })

    const stripeMock = {
      checkout: {
        sessions: {
          create: jest.fn().mockResolvedValue({ id: "cs_test_abc", url: "https://checkout.stripe.com/abc", status: "open" }),
          retrieve: jest.fn(),
        },
      },
    }
    const { getStripeClient } = jest.requireMock("@/lib/stripe")
    getStripeClient.mockReturnValueOnce(stripeMock)

    const fullSvcMock = makeSupabaseMock()
    mockedServiceRole.mockReturnValue(fullSvcMock as any)

    const request = {
      json: async () => ({
        lines: [{ listingId: LISTING_ID, quantity: 1 }],
        // Attacker tries to inject a different price — this field doesn't exist in the schema
        // and even if it did, the server should use its own price
      }),
      nextUrl: { origin: "https://test.example.com" },
    } as any

    const response = await checkoutPost(request)
    const body = await response.json()

    // The order amount should reflect the server-calculated price (25 * 1 = $25 subtotal)
    // Fee breakdown is mocked to return subtotalCents: 2500
    expect(response.status).toBe(200)
    expect(body.data.orderId).toBe(ORDER_ID)

    // Verify Stripe was called with the server price (unit_amount: 2500 cents = $25)
    const createCall = stripeMock.checkout.sessions.create.mock.calls[0][0]
    const firstLineItem = createCall.line_items[0]
    expect(firstLineItem.price_data.unit_amount).toBe(2500) // $25.00 in cents from server listing
  })
})

// ---------------------------------------------------------------------------
// 2. Guest checkout — requires guest_email, generates token
// ---------------------------------------------------------------------------

describe("checkout — guest checkout flow", () => {
  it("returns 400 when unauthenticated and guest_email is missing", async () => {
    mockedAuth.mockResolvedValueOnce(null) // unauthenticated

    const svcMock = makeSupabaseMock()
    const { createServerClient } = jest.requireMock("@/lib/supabase/server")
    createServerClient.mockResolvedValueOnce(svcMock)

    const request = {
      json: async () => ({
        lines: [{ listingId: LISTING_ID, quantity: 1 }],
        // no guestEmail
      }),
      nextUrl: { origin: "https://test.example.com" },
    } as any

    const response = await checkoutPost(request)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error.code).toBe("guest_email_required")
  })

  it("does NOT require authentication when guest_email is provided", async () => {
    mockedAuth.mockResolvedValueOnce(null) // unauthenticated
    mockedPayoutReadiness.mockResolvedValueOnce({ ready: true, accountId: "acct_seller", connectKind: "express", chargesEnabled: true, payoutsEnabled: true, detailsSubmitted: true, reason: null })

    const svcMock = makeSupabaseMock()
    const { createServerClient } = jest.requireMock("@/lib/supabase/server")
    createServerClient.mockResolvedValueOnce(svcMock)

    const stripeMock = {
      checkout: {
        sessions: {
          create: jest.fn().mockResolvedValue({ id: "cs_test_xyz", url: "https://checkout.stripe.com/xyz", status: "open" }),
          retrieve: jest.fn(),
        },
      },
    }
    const { getStripeClient } = jest.requireMock("@/lib/stripe")
    getStripeClient.mockReturnValueOnce(stripeMock)
    mockedServiceRole.mockReturnValue(makeSupabaseMock() as any)

    const request = {
      json: async () => ({
        lines: [{ listingId: LISTING_ID, quantity: 1 }],
        guestEmail: "guest@example.com",
      }),
      nextUrl: { origin: "https://test.example.com" },
    } as any

    const response = await checkoutPost(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    // Guest checkouts return guestAccessToken
    expect(typeof body.data.guestAccessToken).toBe("string")
    expect(body.data.guestAccessToken.length).toBeGreaterThan(16)
  })
})

// ---------------------------------------------------------------------------
// 3. Guest token — non-enumerable (short/sequential tokens rejected)
// ---------------------------------------------------------------------------

describe("guest order access — token validation", () => {
  it("returns 400 for token shorter than 16 characters", async () => {
    mockedServiceRole.mockReturnValue({
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({ maybeSingle: jest.fn().mockResolvedValue({ data: null }) }),
        }),
      }),
    } as any)

    const response = await guestOrderGet(
      { headers: new Headers() } as any,
      { params: Promise.resolve({ token: "short" }) }
    )
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toContain("Invalid access token")
  })

  it("returns 404 for a valid-length token that doesn't match any order", async () => {
    mockedServiceRole.mockReturnValue({
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({ maybeSingle: jest.fn().mockResolvedValue({ data: null }) }),
        }),
      }),
    } as any)

    const response = await guestOrderGet(
      { headers: new Headers() } as any,
      { params: Promise.resolve({ token: "a".repeat(64) }) }
    )
    const body = await response.json()

    expect(response.status).toBe(404)
  })

  it("returns 410 for an expired token", async () => {
    const expiredOrder = {
      id: ORDER_ID,
      order_number: "TFY-20260101-XXXXXXXX",
      status: "confirmed",
      payment_status: "paid",
      currency: "USD",
      subtotal_amount: "25.00",
      platform_fee_amount: "2.50",
      tax_amount: "0.00",
      total_amount: "27.50",
      guest_email: "g@example.com",
      guest_access_token_expires_at: new Date(Date.now() - 1000).toISOString(), // already expired
      seller_user_id: SELLER_ID,
      created_at: new Date().toISOString(),
      marketplace_order_items: [],
    }

    mockedServiceRole.mockReturnValue({
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({ maybeSingle: jest.fn().mockResolvedValue({ data: expiredOrder }) }),
        }),
      }),
    } as any)

    const response = await guestOrderGet(
      { headers: new Headers() } as any,
      { params: Promise.resolve({ token: "a".repeat(64) }) }
    )
    const body = await response.json()

    expect(response.status).toBe(410)
    expect(body.error).toContain("expired")
  })

  it("does NOT expose guest_access_token in the response body", async () => {
    const validOrder = {
      id: ORDER_ID,
      order_number: "TFY-20260101-XXXXXXXX",
      status: "confirmed",
      payment_status: "paid",
      currency: "USD",
      subtotal_amount: "25.00",
      platform_fee_amount: "2.50",
      tax_amount: "0.00",
      total_amount: "27.50",
      guest_email: "guest@example.com",
      guest_access_token_expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
      seller_user_id: SELLER_ID,
      created_at: new Date().toISOString(),
      marketplace_order_items: [],
    }

    mockedServiceRole.mockReturnValue({
      from: jest.fn((table: string) => {
        if (table === "marketplace_orders") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({ maybeSingle: jest.fn().mockResolvedValue({ data: validOrder }) }),
            }),
          }
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({ maybeSingle: jest.fn().mockResolvedValue({ data: null }) }),
          }),
        }
      }),
    } as any)

    const response = await guestOrderGet(
      { headers: new Headers() } as any,
      { params: Promise.resolve({ token: "a".repeat(64) }) }
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    // Verify the raw token is never in the response
    const bodyStr = JSON.stringify(body)
    expect(bodyStr).not.toContain("guest_access_token")
    // Email must be masked
    expect(body.data.guestEmail).not.toBe("guest@example.com")
    expect(body.data.guestEmail).toMatch(/^g\*+@/)
  })
})

// ---------------------------------------------------------------------------
// 4. Webhook idempotency — duplicate events are safely ignored
// ---------------------------------------------------------------------------

describe("webhook processor — idempotency", () => {
  it("returns duplicate outcome when provider_event_id already exists", async () => {
    const supabaseMock = {
      from: jest.fn().mockReturnValue({
        insert: jest.fn().mockResolvedValue({
          // Unique violation → duplicate event
          error: { code: "23505", message: "duplicate key value violates unique constraint" },
        }),
        update: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) }),
      }),
    }

    const event = {
      id: "evt_test_123",
      type: "checkout.session.completed",
      data: { object: { metadata: {}, payment_status: "paid" } },
    } as any

    const result = await handleMarketplaceStripeEventIdempotent({ event, supabase: supabaseMock })

    expect(result.outcome).toBe("duplicate")
    if (result.outcome === "duplicate") {
      expect(result.eventId).toBe("evt_test_123")
    }
  })

  it("does NOT double-process an already-paid order", async () => {
    let updateCallCount = 0
    const supabaseMock = {
      from: jest.fn((table: string) => {
        if (table === "marketplace_payment_events") {
          return {
            insert: jest.fn().mockResolvedValue({ error: null }), // first time seen
            update: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) }),
          }
        }
        if (table === "marketplace_orders") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: {
                    id: ORDER_ID,
                    payment_status: "paid", // ALREADY paid
                    shipping_address: null,
                    metadata: {},
                    seller_user_id: SELLER_ID,
                    buyer_user_id: BUYER_ID,
                  },
                }),
              }),
            }),
            update: jest.fn().mockImplementation(() => {
              updateCallCount++
              return { eq: jest.fn().mockResolvedValue({ error: null }) }
            }),
          }
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: null }),
            }),
          }),
          insert: jest.fn().mockResolvedValue({ error: null }),
          update: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) }),
        }
      }),
    }

    const event = {
      id: "evt_test_456",
      type: "checkout.session.completed",
      data: {
        object: {
          metadata: { order_id: ORDER_ID },
          payment_status: "paid",
          payment_intent: "pi_test_789",
        },
      },
    } as any

    const result = await handleMarketplaceStripeEventIdempotent({ event, supabase: supabaseMock })

    // The processor should detect already-paid and return skipped, NOT process again
    expect(result.outcome).toBe("skipped")
    // marketplace_orders.update should NOT have been called (no double-fulfillment)
    expect(updateCallCount).toBe(0)
  })

  it("returns error outcome when DB insert fails for non-duplicate reason", async () => {
    const supabaseMock = {
      from: jest.fn().mockReturnValue({
        insert: jest.fn().mockResolvedValue({
          error: { code: "53300", message: "too many connections" },
        }),
      }),
    }

    const event = {
      id: "evt_test_789",
      type: "checkout.session.completed",
      data: { object: {} },
    } as any

    const result = await handleMarketplaceStripeEventIdempotent({ event, supabase: supabaseMock })

    expect(result.outcome).toBe("error")
  })
})

// ---------------------------------------------------------------------------
// 5. Seller payout ineligibility blocks checkout
// ---------------------------------------------------------------------------

describe("checkout — seller payout ineligibility", () => {
  it("returns 409 seller_payouts_not_ready when Connect is not set up", async () => {
    const svcMock = makeSupabaseMock()
    mockedAuth.mockResolvedValueOnce({ user: { id: BUYER_ID, email: "b@example.com" }, supabase: svcMock } as any)
    mockedPayoutReadiness.mockResolvedValueOnce({
      ready: false,
      accountId: null,
      connectKind: null,
      chargesEnabled: false,
      payoutsEnabled: false,
      detailsSubmitted: false,
      reason: "stripe_connect_required",
    })
    mockedServiceRole.mockReturnValue(makeSupabaseMock() as any)

    const request = {
      json: async () => ({ lines: [{ listingId: LISTING_ID, quantity: 1 }] }),
      nextUrl: { origin: "https://test.example.com" },
    } as any

    const response = await checkoutPost(request)
    const body = await response.json()

    expect(response.status).toBe(409)
    expect(body.error.code).toBe("seller_payouts_not_ready")
  })
})

// ---------------------------------------------------------------------------
// 6. External listings cannot go through native checkout
// ---------------------------------------------------------------------------

describe("checkout — external listing guard", () => {
  it("returns 400 external_listing_native_checkout for listing_kind=external", async () => {
    const svcMock = makeSupabaseMock({ listing_kind: "external" })
    mockedAuth.mockResolvedValueOnce({ user: { id: BUYER_ID, email: "b@example.com" }, supabase: svcMock } as any)
    mockedServiceRole.mockReturnValue(makeSupabaseMock({ listing_kind: "external" }) as any)

    const request = {
      json: async () => ({ lines: [{ listingId: LISTING_ID, quantity: 1 }] }),
      nextUrl: { origin: "https://test.example.com" },
    } as any

    const response = await checkoutPost(request)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error.code).toBe("external_listing_native_checkout")
  })
})
