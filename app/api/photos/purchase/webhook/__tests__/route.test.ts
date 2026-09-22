jest.mock("server-only", () => ({}))
jest.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: jest.fn(),
}))
jest.mock("@/lib/stripe", () => ({
  getStripe: jest.fn(),
}))

import { NextRequest } from "next/server"
import { POST } from "../route"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { getStripe } from "@/lib/stripe"

const mockedCreateServiceRoleClient = createServiceRoleClient as jest.MockedFunction<
  typeof createServiceRoleClient
>
const mockedGetStripe = getStripe as jest.MockedFunction<typeof getStripe>

interface MockOptions {
  ledgerInsertError?: { code?: string; message?: string } | null
  claimedRow?: {
    processing_status: string
    processed_at: string | null
    attempts: number
  } | null
  purchaseUpdateError?: { message?: string } | null
  ledgerMarkError?: { message?: string } | null
}

interface PurchaseUpdate {
  row: Record<string, unknown>
  filters: Array<[string, unknown, unknown?]>
}

function buildMockSupabase(opts: MockOptions = {}) {
  const calls = {
    ledgerInserts: [] as Record<string, unknown>[],
    ledgerSelects: 0,
    ledgerMarkProcessed: [] as Record<string, unknown>[],
    purchaseUpdates: [] as PurchaseUpdate[],
  }

  const supabase: any = {
    from: jest.fn((table: string) => {
      if (table === "platform_webhook_events") {
        return {
          insert: jest.fn((row: Record<string, unknown>) => {
            calls.ledgerInserts.push(row)
            return Promise.resolve(
              opts.ledgerInsertError
                ? { data: null, error: opts.ledgerInsertError }
                : { data: row, error: null }
            )
          }),
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => ({
                maybeSingle: jest.fn(() => {
                  calls.ledgerSelects += 1
                  return Promise.resolve({ data: opts.claimedRow ?? null, error: null })
                }),
              })),
            })),
          })),
          update: jest.fn((row: Record<string, unknown>) => {
            calls.ledgerMarkProcessed.push(row)
            return {
              eq: jest.fn(() => ({
                eq: jest.fn(() =>
                  Promise.resolve({ data: null, error: opts.ledgerMarkError ?? null })
                ),
              })),
            }
          }),
        }
      }
      if (table === "photo_purchases") {
        return {
          update: jest.fn((row: Record<string, unknown>) => {
            const entry: PurchaseUpdate = { row, filters: [] }
            calls.purchaseUpdates.push(entry)
            const chain: any = {
              eq: (a: unknown, b: unknown) => {
                entry.filters.push(["eq", a, b])
                return chain
              },
              in: (a: unknown, b: unknown) => {
                entry.filters.push(["in", a, b])
                return Promise.resolve({ data: null, error: opts.purchaseUpdateError ?? null })
              },
              neq: (a: unknown, b: unknown) => {
                entry.filters.push(["neq", a, b])
                return Promise.resolve({ data: null, error: opts.purchaseUpdateError ?? null })
              },
            }
            return chain
          }),
        }
      }
      throw new Error(`Unexpected table ${table}`)
    }),
  }
  return { supabase, calls }
}

function mockConstructEvent(event: any) {
  mockedGetStripe.mockReturnValue({
    webhooks: {
      constructEvent: jest.fn().mockReturnValue(event),
    },
  } as any)
}

function makeRequest() {
  return new NextRequest("http://localhost/api/photos/purchase/webhook", {
    method: "POST",
    headers: { "stripe-signature": "t=12345,v1=sig" },
    body: JSON.stringify({ id: "evt_test" }),
  })
}

function completedSessionEvent() {
  return {
    id: "evt_checkout_1",
    type: "checkout.session.completed",
    data: {
      object: {
        payment_status: "paid",
        payment_intent: "pi_123",
        metadata: { purchase_id: "purchase-1", photo_id: "photo-1" },
      },
    },
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  process.env.STRIPE_WEBHOOK_SECRET_PHOTOS = "whsec_test"
})

afterAll(() => {
  delete process.env.STRIPE_WEBHOOK_SECRET_PHOTOS
})

describe("POST /api/photos/purchase/webhook", () => {
  it("rejects requests without a stripe signature", async () => {
    const request = new NextRequest("http://localhost/api/photos/purchase/webhook", {
      method: "POST",
      body: "{}",
    })
    const response = await POST(request)
    expect(response.status).toBe(400)
  })

  it("fulfills a first-time checkout.session.completed and marks the ledger processed", async () => {
    mockConstructEvent(completedSessionEvent())
    const { supabase, calls } = buildMockSupabase()
    mockedCreateServiceRoleClient.mockReturnValue(supabase)

    const response = await POST(makeRequest())
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual({ received: true, outcome: "processed" })
    expect(calls.ledgerInserts).toHaveLength(1)
    expect(calls.ledgerInserts[0]).toMatchObject({
      provider: "stripe",
      provider_event_id: "evt_checkout_1",
      event_type: "checkout.session.completed",
      processing_status: "processing",
      attempts: 1,
    })
    expect(calls.purchaseUpdates).toHaveLength(1)
    expect(calls.purchaseUpdates[0].row).toMatchObject({
      payment_status: "completed",
      transaction_id: "pi_123",
    })
    expect(calls.purchaseUpdates[0].filters).toEqual([
      ["eq", "id", "purchase-1"],
      ["in", "payment_status", ["pending", "processing"]],
    ])
    expect(calls.ledgerMarkProcessed).toHaveLength(1)
    expect(calls.ledgerMarkProcessed[0]).toMatchObject({
      processing_status: "processed",
      attempts: 1,
    })
  })

  it("acknowledges a duplicate of an already-processed event without re-fulfilling", async () => {
    mockConstructEvent(completedSessionEvent())
    const { supabase, calls } = buildMockSupabase({
      ledgerInsertError: { code: "23505", message: "duplicate key value violates unique constraint" },
      claimedRow: {
        processing_status: "processed",
        processed_at: "2026-09-09T00:00:00.000Z",
        attempts: 1,
      },
    })
    mockedCreateServiceRoleClient.mockReturnValue(supabase)

    const response = await POST(makeRequest())
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual({ received: true, outcome: "duplicate" })
    expect(calls.purchaseUpdates).toHaveLength(0)
    expect(calls.ledgerMarkProcessed).toHaveLength(0)
  })

  it("processes one local replay exactly once", async () => {
    mockConstructEvent(completedSessionEvent())
    const first = buildMockSupabase()
    mockedCreateServiceRoleClient.mockReturnValue(first.supabase)

    const firstResponse = await POST(makeRequest())

    const replay = buildMockSupabase({
      ledgerInsertError: { code: "23505", message: "duplicate key value violates unique constraint" },
      claimedRow: {
        processing_status: "processed",
        processed_at: "2026-09-09T00:00:00.000Z",
        attempts: 1,
      },
    })
    mockedCreateServiceRoleClient.mockReturnValue(replay.supabase)
    const replayResponse = await POST(makeRequest())

    expect(await firstResponse.json()).toEqual({ received: true, outcome: "processed" })
    expect(await replayResponse.json()).toEqual({ received: true, outcome: "duplicate" })
    expect(first.calls.purchaseUpdates).toHaveLength(1)
    expect(replay.calls.purchaseUpdates).toHaveLength(0)
  })

  it("resumes an interrupted claim (duplicate event not yet processed) and completes it once", async () => {
    mockConstructEvent(completedSessionEvent())
    const { supabase, calls } = buildMockSupabase({
      ledgerInsertError: { code: "23505", message: "duplicate key value violates unique constraint" },
      claimedRow: {
        processing_status: "processing",
        processed_at: null,
        attempts: 1,
      },
    })
    mockedCreateServiceRoleClient.mockReturnValue(supabase)

    const response = await POST(makeRequest())
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual({ received: true, outcome: "resumed" })
    expect(calls.purchaseUpdates).toHaveLength(1)
    expect(calls.ledgerMarkProcessed).toHaveLength(1)
    expect(calls.ledgerMarkProcessed[0]).toMatchObject({
      processing_status: "processed",
      attempts: 2,
    })
  })

  it("never re-completes an already-completed purchase: guard is applied on every fulfillment update", async () => {
    mockConstructEvent(completedSessionEvent())
    const { supabase, calls } = buildMockSupabase({
      ledgerInsertError: { code: "23505", message: "duplicate key value violates unique constraint" },
      claimedRow: {
        processing_status: "processing",
        processed_at: null,
        attempts: 2,
      },
    })
    mockedCreateServiceRoleClient.mockReturnValue(supabase)

    // Simulate the purchase already being completed by the interrupted attempt:
    // the guarded update matches 0 rows (no error, no data) — never a re-grant.
    const response = await POST(makeRequest())
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual({ received: true, outcome: "resumed" })
    expect(calls.purchaseUpdates[0].filters).toContainEqual([
      "in",
      "payment_status",
      ["pending", "processing"],
    ])
  })

  it("marks payment failures only for unfinalized purchases", async () => {
    mockConstructEvent({
      id: "evt_payment_failed_1",
      type: "payment_intent.payment_failed",
      data: { object: { id: "pi_123" } },
    })
    const { supabase, calls } = buildMockSupabase()
    mockedCreateServiceRoleClient.mockReturnValue(supabase)

    const response = await POST(makeRequest())
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual({ received: true, outcome: "processed" })
    expect(calls.purchaseUpdates[0].row.payment_status).toBe("failed")
    expect(calls.purchaseUpdates[0].filters).toEqual([
      ["eq", "transaction_id", "pi_123"],
      ["in", "payment_status", ["pending", "processing"]],
    ])
  })

  it("logs refunds without re-applying an existing refunded state", async () => {
    mockConstructEvent({
      id: "evt_refunded_1",
      type: "charge.refunded",
      data: { object: { payment_intent: "pi_123" } },
    })
    const { supabase, calls } = buildMockSupabase()
    mockedCreateServiceRoleClient.mockReturnValue(supabase)

    const response = await POST(makeRequest())
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual({ received: true, outcome: "processed" })
    expect(calls.purchaseUpdates[0].row.payment_status).toBe("refunded")
    expect(calls.purchaseUpdates[0].filters).toEqual([
      ["eq", "transaction_id", "pi_123"],
      ["neq", "payment_status", "refunded"],
    ])
  })

  it("degrades when the ledger table is not provisioned (42P01) and still processes safely", async () => {
    mockConstructEvent(completedSessionEvent())
    const { supabase, calls } = buildMockSupabase({
      ledgerInsertError: { code: "42P01", message: 'relation "platform_webhook_events" does not exist' },
    })
    mockedCreateServiceRoleClient.mockReturnValue(supabase)

    const response = await POST(makeRequest())
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual({ received: true, outcome: "degraded" })
    expect(calls.purchaseUpdates).toHaveLength(1)
    expect(calls.ledgerMarkProcessed).toHaveLength(0)
  })

  it("returns 500 and leaves the claim incomplete when fulfillment fails so Stripe retries", async () => {
    mockConstructEvent(completedSessionEvent())
    const { supabase, calls } = buildMockSupabase({
      purchaseUpdateError: { message: "db unavailable" },
    })
    mockedCreateServiceRoleClient.mockReturnValue(supabase)

    const response = await POST(makeRequest())
    const payload = await response.json()

    expect(response.status).toBe(500)
    expect(payload.error).toBe("Failed to update purchase")
    expect(calls.ledgerMarkProcessed).toHaveLength(0)
  })
})
