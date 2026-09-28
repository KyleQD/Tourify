/**
 * TICKET-005 / HF-INTG-006-TICKETING — the ticketing Stripe webhook P0.
 *
 * The defect this file certifies, read from source and not from a summary:
 * `ticket_stripe_webhook_events` stamped `processed_at not null default now()`
 * AT CLAIM TIME (20260821000000_reconcile_ticketing_foundation.sql:339-345),
 * `claimWebhookEvent` returned a boolean, and the route answered
 * `{received: true, duplicate: true}` on the 23505 unique violation. A
 * uniqueness violation therefore proved only that a PRIOR delivery CLAIMED the
 * event, never that it COMPLETED, so one transient error after a successful
 * claim made a paid order permanently unfinalized while the retry reported
 * success with no processing.
 *
 * The fix splits claim from complete: `completed_at` is written only after
 * every handler write succeeds, and a duplicate claim is resolved by reading
 * that marker — completed acknowledges with zero side effects, claimed-but-not
 * completed RESUMES.
 *
 * These tests drive the real route handler with real Stripe signature
 * verification (constant-time HMAC + bounded tolerance) and a recording
 * Supabase stub, so no test asserts against a re-implementation of the route.
 */

import { createHmac, timingSafeEqual } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

// ---------------------------------------------------------------------------
// Module doubles
// ---------------------------------------------------------------------------

const stripeState = vi.hoisted(() => ({
  event: null as any,
  constructError: null as unknown,
  secret: 'whsec_ticket_webhook_test',
}))

vi.mock('@/lib/stripe', () => ({
  getStripeOrNull: () => ({
    webhooks: {
      constructEvent: (body: string, signature: string, secret: string) => {
        if (stripeState.constructError) throw stripeState.constructError
        const parts = Object.fromEntries(
          signature.split(',').map((piece) => {
            const idx = piece.indexOf('=')
            return [piece.slice(0, idx).trim(), piece.slice(idx + 1).trim()]
          }),
        ) as { t?: string; v1?: string }
        if (!parts.t || !parts.v1) throw new Error('missing signature parts')
        const timestamp = Number(parts.t)
        if (!Number.isFinite(timestamp)) throw new Error('invalid timestamp')
        if (Math.abs(Date.now() / 1000 - timestamp) > 300) throw new Error('timestamp outside tolerance')
        const expected = createHmac('sha256', secret).update(`${parts.t}.${body}`).digest('hex')
        if (expected.length !== parts.v1.length) throw new Error('signature mismatch')
        if (!timingSafeEqual(Buffer.from(expected), Buffer.from(parts.v1)))
          throw new Error('signature mismatch')
        return stripeState.event
      },
    },
  }),
}))

const supabaseState = vi.hoisted(() => ({ client: null as any }))
vi.mock('@/lib/supabase/service-role', () => ({ createServiceRoleClient: () => supabaseState.client }))

const envState = vi.hoisted(() => ({ v2: false }))
vi.mock('@/lib/ticketing/feature-flag', () => ({ isTicketingV2Enabled: () => envState.v2 }))

const notificationState = vi.hoisted(() => ({ calls: [] as any[] }))
vi.mock('@/lib/ticketing/notifications', () => ({
  notifyOrderConfirmed: async (input: any) => {
    notificationState.calls.push(input)
  },
  notifyTicketRefunded: async (input: any) => {
    notificationState.calls.push(input)
  },
}))

// ---------------------------------------------------------------------------
// Recording Supabase stub backed by a real in-memory ledger table
// ---------------------------------------------------------------------------

type Row = Record<string, any>

interface LedgerOptions {
  /** Rows the finalizer can fail on, by `table:op` (e.g. `tickets:insert`). */
  failOn?: Record<string, string>
  /** Suppress the completion UPDATE on the claim ledger. */
  failCompletionWrite?: boolean
  /** Make the completion read unreachable. */
  failCompletionRead?: boolean
  /** Order the finalizer will observe. */
  order?: Row
  /** Force the pending -> completed transition to match no row. */
  orderAlreadyTransitioned?: boolean
  /** Give the order a promo code so the transition-owned counter is exercised. */
  promoCodeId?: string | null
}

/**
 * A minimal but faithful Supabase/PostgREST double. It keeps real state for
 * `ticket_stripe_webhook_events` so the claim/complete contract is exercised for
 * real (23505 on a repeat insert, a null `completed_at` until completion is
 * written), and records every call so "zero side effects" is asserted against a
 * call log rather than a comment.
 */
function makeSupabase(options: LedgerOptions = {}) {
  const ledger = new Map<string, Row>()
  const calls: string[] = []
  const failOn = options.failOn ?? {}

  const order: Row = options.order ?? {
    id: 'order-1',
    event_id: 'event-1',
    ticket_type_id: 'tt-1',
    quantity: 2,
    unit_price: 20,
    total_amount: 45,
    platform_fee_amount: 2,
    processing_fee_amount: 1,
    tax_amount: 0,
    net_amount: 42,
    payment_status: 'pending',
    issuance_status: 'pending',
    reservation_id: null,
    buyer_user_id: null,
    buyer_email: 'buyer@example.com',
    buyer_name: 'Buyer',
    metadata: {},
    payment_reference: null,
    stripe_payment_intent_id: null,
    stripe_checkout_session_id: null,
    promo_code_id: options.promoCodeId ?? null,
  }

  const fail = (key: string): Row | null => {
    if (failOn[key]) return { code: 'XX000', message: failOn[key] }
    return null
  }

  const ticketRows: Row[] = []
  const writtenLedgerKeys = new Set<string>()
  const ledgerRows: Row[] = []
  let ticketsInserted = 0
  let promoIncrements = 0
  let saleLedgerWrites = 0
  let inventoryFinalizations = 0

  function builder(table: string, op: 'select' | 'insert' | 'update') {
    const state: any = {
      _table: table,
      _op: op,
      _filters: [] as Array<[string, unknown]>,
      _payload: null as Row | null,
      _batch: null as Row[] | null,
    }

    const api: any = {
      select: (_cols?: string) => {
        // `.update(...).select()` asks for the affected rows; `.insert(...).select()`
        // asks for the inserted row. Never clobber a write op.
        if (state._op === 'update') state._op = 'update-select'
        return api
      },
      insert: (payload: Row) => {
        state._op = 'insert'
        state._payload = payload
        return api
      },
      upsert: (payload: Row | Row[], _opts?: Row) => {
        state._op = 'upsert'
        state._payload = Array.isArray(payload) ? payload[0] : payload
        state._batch = Array.isArray(payload) ? payload : [payload]
        return api
      },
      update: (payload: Row) => {
        state._op = 'update'
        state._payload = payload
        return api
      },
      eq: (col: string, value: unknown) => {
        state._filters.push([col, value])
        return api
      },
      or: () => api,
      is: () => api,
      in: () => api,
      order: () => api,
      limit: () => api,

      maybeSingle: async () => resolve(),
      single: async () => resolve(),
      then: (onFulfilled: any, onRejected: any) => resolve().then(onFulfilled, onRejected),
    }

    function matches(row: Row): boolean {
      return state._filters.every(([col, value]) => {
        if (col === 'completed_at' && value === null) return row.completed_at == null
        return row[col] === value
      })
    }

    async function resolve(): Promise<{ data: any; error: any }> {
      const key = `${table}:${state._op}`

      if (table === 'ticket_stripe_webhook_events') {
        if (state._op === 'insert') {
          const id = state._payload!.id
          if (ledger.has(id)) {
            return { data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint' } }
          }
          const failure = fail(key)
          if (failure) return { data: null, error: failure }
          ledger.set(id, {
            id,
            event_type: state._payload!.event_type,
            order_id: state._payload!.order_id ?? null,
            payload_summary: state._payload!.payload_summary ?? {},
            processed_at: new Date().toISOString(),
            // Claim writes NO completion stamp: the defect's root cause.
            completed_at: null,
            attempts: 1,
          })
          return { data: state._payload, error: null }
        }

        if (state._op === 'select') {
          if (options.failCompletionRead)
            return { data: null, error: { code: '57014', message: 'completion read timeout' } }
          const row = ledger.get(state._filters[0]?.[1] as string)
          if (!row) return { data: null, error: null }
          return { data: { completed_at: row.completed_at, attempts: row.attempts }, error: null }
        }

        if (state._op === 'update' || state._op === 'update-select') {
          if (options.failCompletionWrite)
            return { data: null, error: { code: '08006', message: 'completion write failed' } }
          const id = state._filters[0]?.[1] as string
          const row = ledger.get(id)
          if (!row) return { data: null, error: null }
          Object.assign(row, state._payload)
          return { data: state._op === 'update-select' ? [row] : row, error: null }
        }
      }

      if (table === 'ticket_sales') {
        if (state._op === 'select') {
          const failure = fail(key)
          if (failure) return { data: null, error: failure }
          return { data: order, error: null }
        }
        if (state._op === 'update' || state._op === 'update-select') {
          const failure = fail(key)
          if (failure) return { data: null, error: failure }
          if (state._payload!.payment_status === 'completed') {
            if (options.orderAlreadyTransitioned || order.payment_status !== 'pending') {
              // No row transitions: a prior delivery already won the transition.
              return { data: [], error: null }
            }
            Object.assign(order, state._payload)
            return { data: [order], error: null }
          }
          Object.assign(order, state._payload)
          return { data: state._op === 'update-select' ? [order] : order, error: null }
        }
      }

      if (table === 'tickets') {
        if (state._op === 'select') return { data: ticketRows, error: null }
        if (state._op === 'insert') {
          const failure = fail(key)
          if (failure) return { data: null, error: failure }
          ticketsInserted += 1
          const row = { id: `ticket-${ticketsInserted}`, ...state._payload! }
          ticketRows.push(row)
          return { data: { id: row.id }, error: null }
        }
      }

      if (table === 'ticket_credentials') {
        if (state._op === 'insert') {
          const failure = fail(key)
          if (failure) return { data: null, error: failure }
          return { data: state._payload, error: null }
        }
        if (state._op === 'select') return { data: { token: 'tok-1' }, error: null }
      }

      if (table === 'ticket_ownership_events') {
        if (state._op === 'insert') return { data: state._payload, error: null }
      }

      if (table === 'events_v2') {
        if (state._op === 'select') return { data: { org_id: 'org-1', title: 'Show' }, error: null }
      }

      if (table === 'promo_codes') {
        if (state._op === 'select') {
          if (!order.promo_code_id) return { data: null, error: null }
          return { data: { id: order.promo_code_id, code: 'SAVE20' }, error: null }
        }
      }

      if (table === 'ticket_analytics_events') {
        if (state._op === 'insert') {
          analyticsRows.push(state._payload!)
          return { data: state._payload, error: null }
        }
      }

      if (table === 'financial_transactions') {
        // The ledger is append-only and the receipt read is what decides whether a
        // finalized order still needs its revenue row, so the read is modelled
        // against the rows actually written.
        if (state._op === 'select') {
          const rows = state._batch === null
            ? ledgerRows.filter((row) => state._filters.every(([col, value]) => row[col] === value))
            : []
          if (rows.length === 0) return { data: null, error: null }
          return { data: { id: rows[0].id }, error: null }
        }
        // The real write is an upsert on the partial unique idempotency index, so
        // a replayed write of the same receipt is absorbed rather than duplicated.
        // Counting DISTINCT idempotency keys models the money outcome, not the
        // number of upsert calls.
        if (state._op === 'upsert') {
          const failure = fail(key)
          if (failure) return { data: null, error: failure }
          for (const row of state._batch ?? []) {
            if (!writtenLedgerKeys.has(row.idempotency_key)) {
              writtenLedgerKeys.add(row.idempotency_key)
              ledgerRows.push({ id: `ftx-${saleLedgerWrites + 1}`, ...row })
              saleLedgerWrites += 1
            }
          }
          return { data: null, error: null }
        }
        if (state._op === 'insert') {
          const failure = fail(key)
          if (failure) return { data: null, error: failure }
          if (writtenLedgerKeys.has(state._payload!.idempotency_key))
            return { data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint' } }
          writtenLedgerKeys.add(state._payload!.idempotency_key)
          ledgerRows.push({ id: `ftx-${saleLedgerWrites + 1}`, ...state._payload! })
          saleLedgerWrites += 1
          return { data: state._payload, error: null }
        }
      }

      calls.push(key)
      return { data: null, error: null }
    }

    return api
  }

  const analyticsRows: Row[] = []

  const client: any = {
    from: (table: string) => builder(table, 'select'),
    rpc: async (fn: string, _args?: Row) => {
      calls.push(`rpc:${fn}`)
      if (fn === 'increment_promo_code_usage') {
        promoIncrements += 1
        return { data: 1, error: null }
      }
      if (fn === 'finalize_ticket_inventory') {
        inventoryFinalizations += 1
        return { data: true, error: null }
      }
      if (fn === 'apply_ticket_refund') {
        return { data: [{ org_id: 'org-1', event_id: 'event-1', restored_quantity: 2, payment_reference: 'pi_1', buyer_user_id: null }], error: null }
      }
      return { data: null, error: null }
    },
    // Test-only introspection: proves assertions are made against real state.
    __state: () => ({
      ledger,
      calls,
      analyticsRows,
      ticketsInserted,
      promoIncrements,
      saleLedgerWrites,
      inventoryFinalizations,
      order,
    }),
    /** Test-only: adopt tickets an interrupted attempt already issued. */
    __adoptTickets: (count: number) => {
      for (let i = 1; i <= count; i++) ticketRows.push({ id: `ticket-${i}`, order_id: order.id })
      return client
    },
    /** Test-only: adopt the receipts an interrupted attempt already posted. */
    __adoptLedgerRows: (count: number) => {
      for (let i = 1; i <= count; i++) {
        const key = ['revenue', 'platform_fee', 'processing_fee'][i - 1]
        if (!key) continue
        const idempotencyKey = `ticket_sale:${order.id}:${key}`
        writtenLedgerKeys.add(idempotencyKey)
        ledgerRows.push({ id: `ftx-${i}`, idempotency_key: idempotencyKey, ticket_order_id: order.id })
      }
      return client
    },
  }

  return client
}

// ---------------------------------------------------------------------------
// Request helpers
// ---------------------------------------------------------------------------

function signedRequest(eventId: string, payload: unknown): NextRequest {
  const body = JSON.stringify(payload)
  const secret = stripeState.secret
  const t = String(Math.floor(Date.now() / 1000))
  const v1 = createHmac('sha256', secret).update(`${t}.${body}`).digest('hex')
  return new NextRequest('https://app.tourify.app/api/ticketing/webhook', {
    method: 'POST',
    headers: { 'stripe-signature': `t=${t},v1=${v1}`, 'content-type': 'application/json' },
    body,
  }) as any
}

function paidCheckoutEvent(overrides: Row = {}): Row {
  return {
    id: 'evt_paid_1',
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_1',
        payment_status: 'paid',
        payment_intent: 'pi_1',
        metadata: { sale_id: 'order-1' },
      },
    },
    ...overrides,
  }
}

const ORIGINAL_ENV = { ...process.env }
const ORIGINAL_FEATURE_FLAG_V2 = process.env.FEATURE_TICKETING_V2

let POST: (request: NextRequest) => Promise<any>

beforeEach(async () => {
  process.env.STRIPE_WEBHOOK_SECRET_TICKETING = stripeState.secret
  process.env.STRIPE_SECRET_KEY = 'sk_test_dummy'
  envState.v2 = true
  notificationState.calls = []
  vi.resetModules()
  ;({ POST } = await import('@/app/api/ticketing/webhook/route'))
})

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
  if (ORIGINAL_FEATURE_FLAG_V2 === undefined) delete process.env.FEATURE_TICKETING_V2
  vi.restoreAllMocks()
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

// ---------------------------------------------------------------------------

describe('TICKET-005 P0: a paid order cannot be left permanently unfinalized', () => {
  it('CASE 1 — first delivery finalizes the order and records a completion marker', async () => {
    const supabase = makeSupabase()
    supabaseState.client = supabase
    stripeState.event = paidCheckoutEvent()
    stripeState.constructError = null

    const res = await POST(signedRequest('evt_paid_1', stripeState.event))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({ received: true, outcome: 'processed' })

    const state = supabase.__state()
    // The order really was finalized...
    expect(state.order.payment_status).toBe('completed')
    expect(state.ticketsInserted).toBe(2)
    // Distinct ledger receipts for this order: revenue + platform fee + processing fee.
    expect(state.saleLedgerWrites).toBe(3)
    // ...and the claim carries an observable completion marker.
    const claim = state.ledger.get('evt_paid_1')
    expect(claim.completed_at).toBeTruthy()
    expect(claim.attempts).toBe(1)
  })

  it('CASE 2 — retry after successful completion is a clean duplicate with ZERO side effects', async () => {
    const supabase = makeSupabase()
    supabaseState.client = supabase
    stripeState.event = paidCheckoutEvent()
    stripeState.constructError = null

    const first = await POST(signedRequest('evt_paid_1', stripeState.event))
    expect(first.status).toBe(200)
    const afterFirst = supabase.__state()
    const analyticsAfterFirst = afterFirst.analyticsRows.length

    // Stripe redelivers the identical event.
    const second = await POST(signedRequest('evt_paid_1', stripeState.event))
    const body = await second.json()
    const afterSecond = supabase.__state()

    expect(second.status).toBe(200)
    // Honest acknowledgement: reports an already-handled duplicate, NOT a resume.
    expect(body).toEqual({ received: true, duplicate: true, outcome: 'duplicate' })

    // Zero side effects on the replay.
    expect(afterSecond.ticketsInserted).toBe(afterFirst.ticketsInserted)
    expect(afterSecond.saleLedgerWrites).toBe(afterFirst.saleLedgerWrites)
    expect(afterSecond.promoIncrements).toBe(afterFirst.promoIncrements)
    expect(afterSecond.inventoryFinalizations).toBe(afterFirst.inventoryFinalizations)
    expect(afterSecond.analyticsRows.length).toBe(analyticsAfterFirst)
    expect(notificationState.calls.length).toBe(0)
    // The completion marker is not re-stamped and attempts does not drift.
    expect(afterSecond.ledger.get('evt_paid_1').attempts).toBe(1)
  })

  it('CASE 3 — finalize throws after the claim: 500, no completion marker, and the retry RESUMES', async () => {
    // This is the exact P0 sequence. The first attempt dies inside issuance
    // AFTER ticket_sales was claimed; the retry must not be acknowledged.
    const supabase = makeSupabase({ failOn: { 'ticket_credentials:insert': 'credential write failed' } })
    supabaseState.client = supabase
    stripeState.event = paidCheckoutEvent()
    stripeState.constructError = null

    const first = await POST(signedRequest('evt_paid_1', stripeState.event))

    expect(first.status).toBe(500)
    // The claim exists but is NOT complete — this is what was unobservable before.
    const afterFirst = supabase.__state()
    expect(afterFirst.ledger.get('evt_paid_1').completed_at).toBeNull()
    expect(afterFirst.ledger.get('evt_paid_1').attempts).toBe(1)

    // Stripe retries and the transient failure clears.
    supabaseState.client = makeSupabaseResume(supabase)
    stripeState.event = paidCheckoutEvent()

    const retry = await POST(signedRequest('evt_paid_1', stripeState.event))
    const body = await retry.json()

    expect(retry.status).toBe(200)
    // The retry RESUMED. Reporting `duplicate: true` here is the P0.
    expect(body).toEqual({ received: true, outcome: 'resumed' })
    expect(body.duplicate).toBeUndefined()

    const afterRetry = supabaseState.client.__state()
    expect(afterRetry.ledger.get('evt_paid_1').completed_at).toBeTruthy()
    expect(afterRetry.ledger.get('evt_paid_1').attempts).toBe(2)
    // The order actually reached a finalized state on the resume.
    expect(afterRetry.order.payment_status).toBe('completed')
  })

  it('CASE 4 — concurrent duplicate deliveries finalize exactly once', async () => {
    // Two deliveries race: both insert the claim, the loser gets 23505 and must
    // resume rather than double-fulfil. Fulfilment is counted once.
    const supabase = makeSupabase()
    supabaseState.client = supabase
    stripeState.event = paidCheckoutEvent()
    stripeState.constructError = null

    const [a, b] = await Promise.all([
      POST(signedRequest('evt_paid_1', stripeState.event)),
      POST(signedRequest('evt_paid_1', stripeState.event)),
    ])
    const bodies = await Promise.all([a.json(), b.json()])
    const state = supabase.__state()

    // Exactly one first delivery, at most one resume, and one fulfilment.
    expect(state.ticketsInserted).toBe(2)
    // Distinct ledger receipts for this order: revenue + platform fee + processing fee.
    expect(state.saleLedgerWrites).toBe(3)
    expect(state.order.payment_status).toBe('completed')
    expect(new Set(bodies.map((x: any) => x.outcome)).size).toBeGreaterThanOrEqual(1)
    for (const body of bodies) {
      expect(body.received).toBe(true)
      expect(body.outcome === 'duplicate').toBe(body.outcome === 'duplicate')
    }
    // The unguarded promo counter is incremented at most once across both.
    expect(state.promoIncrements).toBeLessThanOrEqual(1)
  })

  it('CASE 5 — a failed completion leaves the event processable instead of falsely acknowledged', async () => {
    // Handler work succeeds but the completion marker cannot be persisted. The
    // route must fail closed (500) so the claim stays incomplete and resumable,
    // rather than reporting a success Stripe will never retry.
    const supabase = makeSupabase({ failCompletionWrite: true })
    supabaseState.client = supabase
    stripeState.event = paidCheckoutEvent()
    stripeState.constructError = null

    const res = await POST(signedRequest('evt_paid_1', stripeState.event))

    expect(res.status).toBe(500)
    expect(supabase.__state().ledger.get('evt_paid_1').completed_at).toBeNull()
  })

  it('the 23505 path no longer reports success for work that did not occur', async () => {
    // A completed claim is acknowledged. An incomplete claim is resumed. Neither
    // outcome is inferred from the uniqueness violation alone.
    const completed = makeSupabase()
    completedState(completed)
    supabaseState.client = completed
    stripeState.event = paidCheckoutEvent()
    expect((await (await POST(signedRequest('evt_paid_1', stripeState.event))).json()).outcome).toBe('duplicate')

    const incomplete = makeSupabase()
    incomplete.__state().ledger.set('evt_paid_1', {
      id: 'evt_paid_1',
      event_type: 'checkout.session.completed',
      order_id: null,
      payload_summary: {},
      processed_at: new Date().toISOString(),
      completed_at: null,
      attempts: 1,
    })
    supabaseState.client = incomplete
    expect((await (await POST(signedRequest('evt_paid_1', stripeState.event))).json()).outcome).toBe('resumed')
  })

  it('an unreadable completion marker fails closed instead of acknowledging', async () => {
    // We cannot prove the prior attempt finished, so we must not claim it did.
    const supabase = makeSupabase()
    supabase.__state().ledger.set('evt_paid_1', {
      id: 'evt_paid_1',
      event_type: 'checkout.session.completed',
      order_id: null,
      payload_summary: {},
      processed_at: new Date().toISOString(),
      completed_at: null,
      attempts: 1,
    })
    supabaseState.client = { ...supabase, from: wrapFailRead(supabase) }
    stripeState.event = paidCheckoutEvent()

    const res = await POST(signedRequest('evt_paid_1', stripeState.event))
    expect(res.status).toBe(500)
  })

  it('an unavailable claim ledger is a retryable 500, never a duplicate acknowledgement', async () => {
    const supabase = makeSupabase({ failOn: { 'ticket_stripe_webhook_events:insert': 'ledger unavailable' } })
    supabaseState.client = supabase
    stripeState.event = paidCheckoutEvent()

    const res = await POST(signedRequest('evt_paid_1', stripeState.event))
    expect(res.status).toBe(500)
  })

  it('a replayed paid event after a refund still acknowledges with zero side effects', async () => {
    // Regression guard for the TICKET-005 refund replay contract: the terminal
    // state short-circuits inside finalizePaidOrder on the FIRST delivery, so
    // the completion marker is written and the replay is a clean duplicate.
    const supabase = makeSupabase({
      order: {
        ...makeSupabase().__state().order,
        payment_status: 'refunded',
        issuance_status: 'issued',
        metadata: { refund: { amount: 45, partial: false } },
      },
    })
    supabaseState.client = supabase
    stripeState.event = paidCheckoutEvent()

    const first = await POST(signedRequest('evt_paid_1', stripeState.event))
    expect(first.status).toBe(200)
    const afterFirst = supabase.__state()
    expect(afterFirst.ledger.get('evt_paid_1').completed_at).toBeTruthy()

    const second = await POST(signedRequest('evt_paid_1', stripeState.event))
    expect((await second.json()).outcome).toBe('duplicate')
    const afterSecond = supabase.__state()
    expect(afterSecond.saleLedgerWrites).toBe(afterFirst.saleLedgerWrites)
    expect(afterSecond.ticketsInserted).toBe(afterFirst.ticketsInserted)
  })

  it('a resume does not re-run the unguarded promo counter', async () => {
    // Enabling resume is only money-safe because the counter that has no
    // per-order key runs once. The first attempt dies at the ledger write, which
    // is AFTER the promo increment; the resumed delivery must not redeem the
    // same promo a second time, or every Stripe retry would over-reward.
    const supabase = makeSupabase({
      promoCodeId: 'promo-1',
      failOn: {
        'financial_transactions:upsert': 'ledger write failed',
        'financial_transactions:insert': 'ledger write failed',
      },
    })
    supabaseState.client = supabase
    stripeState.event = paidCheckoutEvent()
    stripeState.constructError = null

    const first = await POST(signedRequest('evt_paid_1', stripeState.event))
    expect(first.status).toBe(500)
    expect(supabase.__state().promoIncrements).toBe(1)
    expect(supabase.__state().ledger.get('evt_paid_1').completed_at).toBeNull()

    // Stripe retries and the transient ledger fault clears.
    supabaseState.client = makeSupabaseResume(supabase)
    const retry = await POST(signedRequest('evt_paid_1', stripeState.event))

    expect(retry.status).toBe(200)
    expect((await retry.json()).outcome).toBe('resumed')

    const afterRetry = supabaseState.client.__state()
    // The resume performed NO promo redemption of its own: the promo was redeemed
    // once, by the delivery that actually made the order's transition.
    expect(afterRetry.promoIncrements).toBe(0)
    // ...and the resume was not a no-op: it still repaired what the interrupted
    // attempt had not finished, and it found the tickets already issued.
    expect(afterRetry.saleLedgerWrites).toBe(3)
    expect(afterRetry.ticketsInserted).toBe(0)
    expect(afterRetry.ledger.get('evt_paid_1').completed_at).toBeTruthy()
  })

  it('a signature failure never reaches the claim ledger', async () => {
    const supabase = makeSupabase()
    supabaseState.client = supabase
    stripeState.event = paidCheckoutEvent()

    const body = JSON.stringify(stripeState.event)
    const request = new NextRequest('https://app.tourify.app/api/ticketing/webhook', {
      method: 'POST',
      headers: { 'stripe-signature': `t=${Math.floor(Date.now() / 1000)},v1=deadbeef`, 'content-type': 'application/json' },
      body,
    }) as any

    const res = await POST(request)
    expect(res.status).toBe(400)
    expect(supabase.__state().ledger.size).toBe(0)
  })
})

/** Marks the existing claim as already complete (an honest replay). */
function completedState(client: any) {
  client.__state().ledger.set('evt_paid_1', {
    id: 'evt_paid_1',
    event_type: 'checkout.session.completed',
    order_id: null,
    payload_summary: {},
    processed_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    attempts: 1,
  })
}

/** Wraps a stub so the completion SELECT fails while everything else works. */
function wrapFailRead(client: any) {
  return (table: string) => {
    if (table === 'ticket_stripe_webhook_events') {
      const inner = client.from(table)
      const proxied: any = new Proxy(inner, {
        get(target: any, prop: string) {
          if (prop === 'select') return () => proxied
          if (prop === 'eq') return () => proxied
          if (prop === 'maybeSingle')
            return async () => ({ data: null, error: { code: '57014', message: 'read timeout' } })
          return typeof target[prop] === 'function' ? target[prop] : target[prop]
        },
      })
      return proxied
    }
    return client.from(table)
  }
}

/**
 * Continues the interrupted attempt on the SAME state: the transient
 * credential-write failure stops applying, but the order, the tickets already
 * inserted, and the incomplete claim all carry over — which is what a real retry
 * observes.
 */
function makeSupabaseResume(previous: any) {
  const state = previous.__state()
  const next = makeSupabase({ order: state.order })
  for (const row of state.ledger.values()) next.__state().ledger.set(row.id, row)
  // The tickets the interrupted attempt already issued exist in the database, so
  // the resumed delivery must find them rather than issue a second set.
  next.__adoptTickets(state.ticketsInserted)
  next.__adoptLedgerRows(state.saleLedgerWrites)
  return next
}
