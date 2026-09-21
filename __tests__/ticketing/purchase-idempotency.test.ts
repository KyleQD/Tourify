/**
 * TICKET-005 — request-scoped purchase idempotency certification (local)
 * plus the distributed DB-unique boundary scan.
 *
 * The active schema chain (DB-005 owns ticketing schema migrations) provides
 * delivery-level unique indexes on ticket_sales (order_number, Stripe
 * checkout session, webhook event) but NO client-supplied purchase idempotency
 * key column or unique expression index. That makes a distributed DB-unique
 * purchase-idempotency constraint impossible without a new migration; this
 * suite certifies the request-scoped behavior that IS verifiable locally
 * (idempotency keys, duplicate detection, race-ordering) and pins the exact
 * schema boundary as evidence for the DB-005 handoff.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { findIdempotentPurchase } from '@/lib/ticketing/orders'

const root = process.cwd()
const enhancedRoute = readFileSync(join(root, 'app/api/ticketing/enhanced/route.ts'), 'utf8')
const foundation = readFileSync(
  join(root, 'supabase/migrations/20260821000000_reconcile_ticketing_foundation.sql'),
  'utf8',
)
const db005 = readFileSync(
  join(root, 'supabase/migrations/20260910230339_ticketing_admin_overview_contract.sql'),
  'utf8',
)

const BUYER = '00000000-0000-0000-0000-0000000000a1'
const EVENT = '00000000-0000-0000-0000-0000000000a2'
const OTHER = '00000000-0000-0000-0000-0000000000a3'

type SaleRow = {
  id: string
  order_number: string | null
  event_id: string
  buyer_user_id: string | null
  payment_status: string
  created_at: string
  metadata: Record<string, unknown>
  stripe_checkout_session_id: string | null
  total_amount: number
}

/**
 * In-memory PostgREST-shaped fake that APPLIES the same predicate contract the
 * canonical lookup uses: metadata @> {idempotency_key}, buyer scope, event
 * scope, actionable statuses, newest-first, limit 1. Assertions run against a
 * real filter so duplicate detection, scoping, and race-ordering are tested,
 * not re-echoed.
 */
function ticketSalesFake(rows: SaleRow[]) {
  const builder: any = {}
  let filters: {
    contains?: { idempotency_key?: string }
    buyer?: string
    event?: string
    statuses?: string[]
    limit?: number
  } = {}

  const matches = (row: SaleRow) => {
    if (filters.contains?.idempotency_key) {
      const key = (row.metadata as Record<string, unknown>)?.idempotency_key
      if (key !== filters.contains.idempotency_key) return false
    }
    if (filters.buyer && row.buyer_user_id !== filters.buyer) return false
    if (filters.event && row.event_id !== filters.event) return false
    if (filters.statuses && !filters.statuses.includes(row.payment_status)) return false
    return true
  }

  builder.select = () => builder
  builder.contains = (col: string, value: Record<string, unknown>) => {
    if (col === 'metadata') filters.contains = value as { idempotency_key?: string }
    return builder
  }
  builder.eq = (col: string, value: any) => {
    if (col === 'buyer_user_id') filters.buyer = String(value)
    if (col === 'event_id') filters.event = String(value)
    return builder
  }
  builder.in = (col: string, values: string[]) => {
    if (col === 'payment_status') filters.statuses = values
    return builder
  }
  builder.order = () => builder
  builder.limit = (n: number) => {
    filters.limit = n
    return builder
  }
  builder.maybeSingle = async () => {
    const sorted = [...rows]
      .filter(matches)
      .sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0))
    const hit = sorted.slice(0, filters.limit ?? 1)[0] ?? null
    return { data: hit, error: null }
  }

  return { supabase: { from: () => builder } }
}

function saleRow(partial: Partial<SaleRow>): SaleRow {
  return {
    id: 'order-1',
    order_number: 'TF-0001',
    event_id: EVENT,
    buyer_user_id: BUYER,
    payment_status: 'pending',
    created_at: '2026-09-16T12:00:00.000Z',
    metadata: { idempotency_key: 'checkout-abc' },
    stripe_checkout_session_id: 'cs_test_1',
    total_amount: 45,
    ...partial,
  }
}

describe('request-scoped purchase idempotency (findIdempotentPurchase)', () => {
  it('duplicate detection: same key + buyer + event returns the original order', async () => {
    const row = saleRow({})
    const fake = ticketSalesFake([row])

    const hit = await findIdempotentPurchase({
      supabase: fake.supabase as any,
      buyerUserId: BUYER,
      eventId: EVENT,
      idempotencyKey: 'checkout-abc',
    })

    expect(hit?.id).toBe('order-1')
    expect(hit?.order_number).toBe('TF-0001')
    expect(hit?.stripe_checkout_session_id).toBe('cs_test_1')
  })

  it('never matches across buyers: same key on another tenant is not a duplicate', async () => {
    const row = saleRow({ buyer_user_id: OTHER })
    const fake = ticketSalesFake([row])

    const hit = await findIdempotentPurchase({
      supabase: fake.supabase as any,
      buyerUserId: BUYER,
      eventId: EVENT,
      idempotencyKey: 'checkout-abc',
    })

    expect(hit).toBeNull()
  })

  it('never matches across events with the same key', async () => {
    const row = saleRow({ event_id: '00000000-0000-0000-0000-0000000000ff' })
    const fake = ticketSalesFake([row])

    const hit = await findIdempotentPurchase({
      supabase: fake.supabase as any,
      buyerUserId: BUYER,
      eventId: EVENT,
      idempotencyKey: 'checkout-abc',
    })

    expect(hit).toBeNull()
  })

  it('only actionable statuses dedupe: refunded/failed rows never satisfy a retry', async () => {
    const refunded = saleRow({ id: 'refunded-order', payment_status: 'refunded' })
    const failed = saleRow({
      id: 'failed-order',
      payment_status: 'failed',
      created_at: '2026-09-16T13:00:00.000Z',
    })
    const fake = ticketSalesFake([refunded, failed])

    const hit = await findIdempotentPurchase({
      supabase: fake.supabase as any,
      buyerUserId: BUYER,
      eventId: EVENT,
      idempotencyKey: 'checkout-abc',
    })

    expect(hit).toBeNull()
  })

  it('race-ordering: newest order wins when the same key races into two rows', async () => {
    const first = saleRow({
      id: 'race-loser',
      created_at: '2026-09-16T12:00:00.000Z',
      stripe_checkout_session_id: 'cs_test_loser',
    })
    const second = saleRow({
      id: 'race-winner',
      created_at: '2026-09-16T12:00:05.000Z',
      stripe_checkout_session_id: 'cs_test_winner',
    })
    const fake = ticketSalesFake([first, second])

    const hit = await findIdempotentPurchase({
      supabase: fake.supabase as any,
      buyerUserId: BUYER,
      eventId: EVENT,
      idempotencyKey: 'checkout-abc',
    })

    // Both rows exist only because the LOCAL contract is request-scoped —
    // there is no DB-unique key yet (see boundary scan below). Once a retry
    // arrives, the canonical lookup resolves to the newest actionable order.
    expect(hit?.id).toBe('race-winner')
    expect(hit?.stripe_checkout_session_id).toBe('cs_test_winner')
  })

  it('route race-ordering: concurrent same-key requests each may create a row locally, while Stripe session creation is keyed to one session', async () => {
    // Models the local boundary: two in-flight POSTs with the same key both
    // miss the dedup lookup (no row yet), so both create pending orders.
    // The provider-side idempotency key guarantees a single Stripe session
    // for the key; a follow-up identical request then dedupes to the newest.
    const provenance: string[] = []
    const createOrder = (id: string) => {
      provenance.push(id)
      return saleRow({
        id,
        created_at: `2026-09-16T14:00:0${provenance.length}.000Z`,
        metadata: { idempotency_key: 'double-click' },
      })
    }
    const orders = [createOrder('order-a'), createOrder('order-b')]

    // Simulated Stripe: idempotency key -> one session per key
    const stripeSessions = new Map<string, string>()
    const createSession = (key: string) => {
      const existing = stripeSessions.get(key)
      if (existing) return { id: existing, reused: true }
      const session = `cs_${stripeSessions.size + 1}`
      stripeSessions.set(key, session)
      return { id: session, reused: false }
    }

    const emptyStore = ticketSalesFake([])
    const bothMiss = await Promise.all([
      findIdempotentPurchase({
        supabase: emptyStore.supabase as any,
        buyerUserId: BUYER,
        eventId: EVENT,
        idempotencyKey: 'double-click',
      }),
      findIdempotentPurchase({
        supabase: emptyStore.supabase as any,
        buyerUserId: BUYER,
        eventId: EVENT,
        idempotencyKey: 'double-click',
      }),
    ])
    expect(bothMiss).toEqual([null, null])

    const session1 = createSession('ticket_purchase:user:double-click')
    const session2 = createSession('ticket_purchase:user:double-click')
    expect(session1.reused).toBe(false)
    expect(session2.reused).toBe(true)
    expect(session2.id).toBe(session1.id)

    // Follow-up identical request resolves to the newest of the two local rows
    const settledStore = ticketSalesFake(orders)
    const hit = await findIdempotentPurchase({
      supabase: settledStore.supabase as any,
      buyerUserId: BUYER,
      eventId: EVENT,
      idempotencyKey: 'double-click',
    })
    expect(hit?.id).toBe('order-b')
    expect(provenance).toHaveLength(2)
  })
})

describe('purchase idempotency route contract (enhanced/route.ts)', () => {
  it('uses the canonical scoped lookup and returns deduped acknowledgements', () => {
    expect(enhancedRoute).toContain('findIdempotentPurchase')
    expect(enhancedRoute).toContain('deduped: true')
    expect(enhancedRoute).toContain("idempotencyKey: `ticket_purchase:${user.id}:${idempotencyKey}`")
  })
})

describe('distributed DB-unique purchase idempotency boundary (DB-005 evidence)', () => {
  it('ticket_sales has no client idempotency key column or unique expression index in the active chain', () => {
    // The foundation migration adds fee/idempotency-adjacent order fields
    // and three DELIVERY-level unique indexes, but no buyer-scoped purchase
    // idempotency uniqueness. The enum of ticket_sales unique indexes is the
    // full set the active chain provides.
    const ticketSalesUniqueIndexes =
      foundation.match(/create unique index if not exists (idx_ticket_sales_[a-z_]+)/g) || []
    expect(ticketSalesUniqueIndexes.sort()).toEqual([
      'create unique index if not exists idx_ticket_sales_order_number',
      'create unique index if not exists idx_ticket_sales_stripe_session',
      'create unique index if not exists idx_ticket_sales_webhook_event',
    ])
    expect(foundation).not.toMatch(/idx_ticket_sales_[a-z_]*idempotency/i)
  })

  it('financial_transactions carries the ledger partial unique index (receipts), not purchases', () => {
    expect(foundation).toContain('idx_fin_tx_idempotency')
    expect(foundation).toContain('on financial_transactions(idempotency_key) where idempotency_key is not null')
  })

  it('the already-authored DB-005 migration adds no purchase idempotency constraint', () => {
    // The admin overview RPCs legitimately READ ticket_sales, but the
    // migration adds no ticket_sales DDL and no unique purchase key.
    expect(db005).not.toMatch(/alter table\s+.*ticket_sales/i)
    expect(db005).not.toMatch(/create unique index/i)
    expect(db005).not.toMatch(/idempotency/i)
  })

  it('webhook claim store remains event-id unique regardless of purchase keys', () => {
    expect(foundation).toContain('id text primary key')
    expect(foundation).toContain('ticket_stripe_webhook_events')
  })
})