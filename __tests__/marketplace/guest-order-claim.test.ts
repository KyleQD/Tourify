import { beforeEach, describe, expect, it, vi } from 'vitest'

const { authenticate, createServiceRoleClient } = vi.hoisted(() => ({
  authenticate: vi.fn(),
  createServiceRoleClient: vi.fn(),
}))

vi.mock('@/lib/auth/api-auth', () => ({ authenticateApiRequest: authenticate }))
vi.mock('@/lib/supabase/service-role', () => ({ createServiceRoleClient }))

import { POST as claimPost } from '@/app/api/marketplace/order/[token]/claim/route'

const TOKEN = 'a'.repeat(64)
const ORDER_ID = '11111111-1111-4111-8111-111111111111'
const BUYER_ID = '22222222-2222-4222-8222-222222222222'
const OTHER_ID = '33333333-3333-4333-8333-333333333333'

function guestOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: ORDER_ID,
    guest_email: 'guest@example.com',
    buyer_user_id: null,
    guest_access_token_expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
    payment_status: 'paid',
    ...overrides,
  }
}

interface SupabaseOptions {
  order?: unknown | null
  digitalItemIds?: string[]
  entitlementsLinked?: unknown[]
  orderUpdateError?: unknown | null
  entitlementUpdateError?: unknown | null
  /** Row the guarded claim write reports back. null = another request won the race. */
  claimedOrder?: { id: string; buyer_user_id: string } | null
}

function makeSupabaseMock(options: SupabaseOptions = {}) {
  const order = options.order === undefined ? guestOrder() : options.order
  const digitalItemIds = options.digitalItemIds ?? ['ent-item-order-1']
  const entitlementsLinked = options.entitlementsLinked ?? [{ id: 'ent-1' }]
  const claimedOrder =
    options.claimedOrder === undefined
      ? { id: ORDER_ID, buyer_user_id: BUYER_ID }
      : options.claimedOrder

  const orderTable = {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({ data: order ?? null, error: null }),
      }),
    }),
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        is: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue(
              options.orderUpdateError
                ? { data: null, error: options.orderUpdateError }
                : { data: claimedOrder, error: null }
            ),
          }),
        }),
      }),
    }),
  }

  const orderItemsTable = {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: digitalItemIds.map(id => ({ id })),
          error: null,
        }),
      }),
    }),
  }

  const entitlementsTable = {
    update: vi.fn().mockReturnValue({
      is: vi.fn().mockReturnValue({
        in: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue(
            options.entitlementUpdateError
              ? { data: null, error: options.entitlementUpdateError }
              : { data: entitlementsLinked, error: null }
          ),
        }),
      }),
    }),
  }

  const from = vi.fn((table: string) => {
    if (table === 'marketplace_orders') return orderTable
    if (table === 'marketplace_order_items') return orderItemsTable
    if (table === 'marketplace_entitlements') return entitlementsTable
    throw new Error(`Unexpected table ${table}`)
  })

  return {
    supabase: { from },
    from,
    tables: { orderTable, orderItemsTable, entitlementsTable },
  }
}

function signedInUser(overrides: Record<string, unknown> = {}) {
  return {
    user: {
      id: BUYER_ID,
      email: 'guest@example.com',
      email_confirmed_at: new Date().toISOString(),
      ...overrides,
    },
    supabase: {},
  }
}

function request(token: string): { params: Promise<{ token: string }> } {
  return { params: Promise.resolve({ token }) }
}

describe('guest order claim route', () => {
  beforeEach(() => {
    authenticate.mockReset()
    createServiceRoleClient.mockReset()
  })

  it('rejects a token shorter than 16 characters', async () => {
    const response = await claimPost({} as never, request('short'))
    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ error: 'Invalid access token.' })
  })

  it('requires a signed-in user (401)', async () => {
    authenticate.mockResolvedValueOnce(null)
    createServiceRoleClient.mockReturnValue(makeSupabaseMock().supabase)

    const response = await claimPost({} as never, request(TOKEN))
    expect(response.status).toBe(401)
    expect(await response.json()).toMatchObject({ error: 'Sign in to claim this order.' })
  })

  it('requires a confirmed email (403)', async () => {
    authenticate.mockResolvedValueOnce(signedInUser({ email_confirmed_at: null }))
    createServiceRoleClient.mockReturnValue(makeSupabaseMock().supabase)

    const response = await claimPost({} as never, request(TOKEN))
    expect(response.status).toBe(403)
    expect(await response.json()).toMatchObject({ error: /verify your email/i })
  })

  it('returns 404 when the token matches no order', async () => {
    authenticate.mockResolvedValueOnce(signedInUser())
    createServiceRoleClient.mockReturnValue(makeSupabaseMock({ order: null }).supabase)

    const response = await claimPost({} as never, request(TOKEN))
    expect(response.status).toBe(404)
  })

  it('returns 410 when the access link has expired', async () => {
    authenticate.mockResolvedValueOnce(signedInUser())
    createServiceRoleClient.mockReturnValue(
      makeSupabaseMock({ order: guestOrder({ guest_access_token_expires_at: new Date(Date.now() - 1000).toISOString() }) }).supabase
    )

    const response = await claimPost({} as never, request(TOKEN))
    expect(response.status).toBe(410)
    expect(await response.json()).toMatchObject({ error: /expired/i })
  })

  it('rejects an order already claimed by a different user (409)', async () => {
    authenticate.mockResolvedValueOnce(signedInUser())
    createServiceRoleClient.mockReturnValue(
      makeSupabaseMock({ order: guestOrder({ buyer_user_id: OTHER_ID }) }).supabase
    )

    const response = await claimPost({} as never, request(TOKEN))
    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({ error: 'This order has already been claimed.' })
  })

  it('rejects a user whose email does not match the guest email (403)', async () => {
    authenticate.mockResolvedValueOnce(signedInUser({ email: 'someone-else@example.com' }))
    createServiceRoleClient.mockReturnValue(makeSupabaseMock().supabase)

    const response = await claimPost({} as never, request(TOKEN))
    expect(response.status).toBe(403)
    expect(await response.json()).toMatchObject({ error: /does not match/i })
  })

  it('claims the order and resolves guest digital entitlements to the buyer', async () => {
    const { supabase: svc, tables } = makeSupabaseMock({ digitalItemIds: ['ent-item-order-1', 'ent-item-order-2'] })
    authenticate.mockResolvedValueOnce(signedInUser())
    createServiceRoleClient.mockReturnValue(svc)

    const response = await claimPost({} as never, request(TOKEN))
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.data).toMatchObject({ claimed: true, orderId: ORDER_ID, entitlementsLinked: 1 })

    // The order link update must carry the race guard (.is('buyer_user_id', null)).
    expect(tables.orderTable.update).toHaveBeenCalledWith({ buyer_user_id: BUYER_ID })
    expect(tables.orderTable.update.mock.results[0].value.eq).toHaveBeenCalledWith('id', ORDER_ID)
    expect(tables.orderTable.update.mock.results[0].value.eq.mock.results[0].value.is).toHaveBeenCalledWith(
      'buyer_user_id',
      null
    )

    // Entitlement update must be scoped to this order's digital item ids only.
    expect(tables.entitlementsTable.update).toHaveBeenCalledWith({ buyer_user_id: BUYER_ID })
    const inCall = tables.entitlementsTable.update.mock.results[0].value.is.mock.results[0].value.in
    expect(inCall).toHaveBeenCalledWith('order_item_id', ['ent-item-order-1', 'ent-item-order-2'])
  })

  it('refuses to claim an order whose payment has not settled', async () => {
    authenticate.mockResolvedValueOnce(signedInUser())
    createServiceRoleClient.mockReturnValue(
      makeSupabaseMock({ order: guestOrder({ payment_status: 'pending' }) }).supabase
    )

    const response = await claimPost({} as never, request(TOKEN))
    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({ error: /payment has settled/i })
  })

  it('refuses to claim a failed payment order', async () => {
    authenticate.mockResolvedValueOnce(signedInUser())
    createServiceRoleClient.mockReturnValue(
      makeSupabaseMock({ order: guestOrder({ payment_status: 'failed' }) }).supabase
    )

    const response = await claimPost({} as never, request(TOKEN))
    expect(response.status).toBe(409)
  })

  it('allows claiming a refunded order so the buyer keeps their history', async () => {
    authenticate.mockResolvedValueOnce(signedInUser())
    createServiceRoleClient.mockReturnValue(
      makeSupabaseMock({ order: guestOrder({ payment_status: 'refunded' }) }).supabase
    )

    const response = await claimPost({} as never, request(TOKEN))
    expect(response.status).toBe(200)
  })

  it('returns 409 and resolves no entitlements when a concurrent request won the claim race', async () => {
    const { supabase: svc, tables } = makeSupabaseMock({ claimedOrder: { id: ORDER_ID, buyer_user_id: OTHER_ID } })
    authenticate.mockResolvedValueOnce(signedInUser())
    createServiceRoleClient.mockReturnValue(svc)

    const response = await claimPost({} as never, request(TOKEN))
    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({ error: 'This order has already been claimed.' })
    // The losing request must not backfill entitlements onto its own user id.
    expect(tables.entitlementsTable.update).not.toHaveBeenCalled()
  })

  it('is idempotent for a repeated claim by the same user and still resolves entitlements', async () => {
    const { supabase: svc, tables } = makeSupabaseMock({ order: guestOrder({ buyer_user_id: BUYER_ID }) })
    authenticate.mockResolvedValueOnce(signedInUser())
    createServiceRoleClient.mockReturnValue(svc)

    const response = await claimPost({} as never, request(TOKEN))
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.data).toMatchObject({ claimed: true, entitlementsLinked: 1 })

    // The order must NOT be updated again on the idempotent path.
    expect(tables.orderTable.update).not.toHaveBeenCalled()
    expect(tables.entitlementsTable.update).toHaveBeenCalledWith({ buyer_user_id: BUYER_ID })
  })

  it('reports no linked entitlements when the order has no digital items', async () => {
    const { supabase: svc } = makeSupabaseMock({ digitalItemIds: [] })
    authenticate.mockResolvedValueOnce(signedInUser())
    createServiceRoleClient.mockReturnValue(svc)

    const response = await claimPost({} as never, request(TOKEN))
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.data).toMatchObject({ claimed: true, entitlementsLinked: 0 })
  })

  it('returns 500 when the entitlement backfill fails so the idempotent retry can finish it', async () => {
    const { supabase: svc } = makeSupabaseMock({ entitlementUpdateError: { code: 'PGRST116', message: 'boom' } })
    authenticate.mockResolvedValueOnce(signedInUser())
    createServiceRoleClient.mockReturnValue(svc)

    const response = await claimPost({} as never, request(TOKEN))
    expect(response.status).toBe(500)
    expect(await response.json()).toMatchObject({ error: /digital delivery/i })
  })
})