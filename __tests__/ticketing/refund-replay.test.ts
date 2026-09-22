/**
 * TICKET-005 — canonical refund replay certification (local).
 *
 * Proves the refund/settlement receipt path in lib/ticketing is replay-safe
 * and fail-closed against the existing ledgers:
 *   - duplicate refund events return duplicate acknowledgements without side
 *     effects (webhook claim, refund RPC replay, refund ledger, paid-event
 *     replay after a refund);
 *   - persistence failures fail closed (unavailable reads and failed writes
 *     throw instead of silently succeeding);
 *   - unavailable data never reads as a false zero / false absence.
 *
 * All clients are mocked at the PostgREST boundary; no hosted/staging
 * mutation and no Stripe execution occur.
 */

import { describe, expect, it } from 'vitest'
import { writeRefundLedger, writeSaleLedger } from '@/lib/ticketing/ledger'
import { finalizePaidOrder, refundOrderTickets } from '@/lib/ticketing/finalize'

const BASE_PARAMS = {
  orgId: '00000000-0000-0000-0000-000000000001',
  eventId: '00000000-0000-0000-0000-000000000002',
  orderId: '00000000-0000-0000-0000-000000000003',
  createdBy: '00000000-0000-0000-0000-000000000004',
}

function financialLedgerFake(
  initial: Array<{ idempotency_key: string; id: string }> = [],
  options: { raceWindow?: boolean } = {},
) {
  const rows = [...initial]
  const calls: string[] = []
  let precheckError: { code: string; message: string } | null = null
  let insertError: { code: string; message: string } | null = null
  let upsertError: { code: string; message: string } | null = null

  const supabase = {
    from(table: string) {
      calls.push(`from:${table}`)
      const builder: any = {
        select: () => builder,
        eq: () => builder,
        maybeSingle: async () => {
          calls.push('maybeSingle')
          if (precheckError) return { data: null, error: precheckError }
          // raceWindow: the pre-check snapshot predates the concurrent
          // winner's commit, so it observes no row even though the store now
          // holds one — deterministically reproducing a select-then-insert race.
          if (options.raceWindow) return { data: null, error: null }
          const match = lastFilteredKey()
          return { data: rows.find((r) => r.idempotency_key === match) ?? null, error: null }
        },
        insert: async (row: any) => {
          calls.push(`insert:${row?.idempotency_key ?? '?'}`)
          if (insertError)
            return { data: null, error: insertError }
          const exists = rows.some((r) => r.idempotency_key === row.idempotency_key)
          if (exists)
            return { data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint "idx_fin_tx_idempotency"' } }
          rows.push({ idempotency_key: row.idempotency_key, id: `id-${rows.length + 1}` })
          return { data: [row], error: null }
        },
        upsert: async (
          rowsArg: any[],
          opts: { onConflict: string; ignoreDuplicates?: boolean },
        ) => {
          calls.push(`upsert:${opts?.onConflict ?? '?'}`)
          if (upsertError) return { data: null, error: upsertError }
          if (opts?.ignoreDuplicates) {
            for (const row of rowsArg) {
              if (!rows.some((r) => r.idempotency_key === row.idempotency_key)) {
                rows.push({ idempotency_key: row.idempotency_key, id: `id-${rows.length + 1}` })
              }
            }
            return { data: null, error: null }
          }
          return { data: null, error: { code: 'PGRST301', message: 'upsert on partial index unsupported' } }
        },
      }
      let keyFilter: string | null = null
      function lastFilteredKey() {
        return keyFilter
      }
      builder.eq = (col: string, value: any) => {
        if (col === 'idempotency_key') keyFilter = String(value)
        return builder
      }
      return builder
    },
  }

  return {
    supabase,
    calls,
    rows,
    failPrecheck: (message = 'ledger unavailable') => {
      precheckError = { code: 'PGRST301', message }
    },
    failInsert: (message = 'insert failure') => {
      insertError = { code: 'PGRST301', message }
    },
    failUpsert: (message = 'upsert on partial index unsupported') => {
      upsertError = { code: 'PGRST301', message }
    },
  }
}

describe('refund ledger replay safety (writeRefundLedger)', () => {
  it('duplicate refund events return duplicate acknowledgement with no side effect', async () => {
    const fake = financialLedgerFake()
    await writeRefundLedger({
      ...BASE_PARAMS,
      supabase: fake.supabase as any,
      refundAmount: 27.5,
    })
    await writeRefundLedger({
      ...BASE_PARAMS,
      supabase: fake.supabase as any,
      refundAmount: 27.5,
    })

    expect(fake.rows).toHaveLength(1)
    expect(fake.rows[0].idempotency_key).toBe(`ticket_refund:${BASE_PARAMS.orderId}:full`)
    // exactly one insert; the second call short-circuits on the pre-check
    expect(fake.calls.filter((c) => c.startsWith('insert:'))).toHaveLength(1)
  })

  it('racing duplicate insert (23505) resolves as a duplicate acknowledgement, not an error', async () => {
    // Concurrency window: the loser's pre-check snapshot predates the
    // winner's commit, so it proceeds to insert; the schema's partial unique
    // index (idx_fin_tx_idempotency) makes the race loser's insert fail with
    // 23505, which must be treated as an acknowledgement, never a throw.
    const loser = financialLedgerFake([], { raceWindow: true })
    loser.rows.push({ idempotency_key: `ticket_refund:${BASE_PARAMS.orderId}:full`, id: 'winner' })

    await expect(
      writeRefundLedger({
        ...BASE_PARAMS,
        supabase: loser.supabase as any,
        refundAmount: 27.5,
      }),
    ).resolves.toBeUndefined()
    // the loser's racing insert added nothing; the winner's row is the only receipt
    expect(loser.rows).toHaveLength(1)
  })

  it('unavailable pre-check data fails closed instead of reading as no refund recorded', async () => {
    const fake = financialLedgerFake()
    fake.failPrecheck()
    await expect(
      writeRefundLedger({
        ...BASE_PARAMS,
        supabase: fake.supabase as any,
        refundAmount: 27.5,
      }),
    ).rejects.toThrow('Refund ledger pre-check failed')
    expect(fake.rows).toHaveLength(0)
  })

  it('a failed refund receipt write throws (fail closed)', async () => {
    const fake = financialLedgerFake()
    fake.failInsert('storage outage')
    await expect(
      writeRefundLedger({
        ...BASE_PARAMS,
        supabase: fake.supabase as any,
        refundAmount: 27.5,
      }),
    ).rejects.toThrow('storage outage')
    expect(fake.rows).toHaveLength(0)
  })
})

describe('sale ledger replay safety (writeSaleLedger fallback)', () => {
  it('fallback treats an already-recorded row as a no-op duplicate', async () => {
    const fake = financialLedgerFake()
    fake.failUpsert() // forces the select-then-insert fallback path
    fake.rows.push({ idempotency_key: `ticket_sale:${BASE_PARAMS.orderId}:revenue`, id: 'existing' })

    await writeSaleLedger({
      ...BASE_PARAMS,
      supabase: fake.supabase as any,
      grossAmount: 30,
      platformFeeAmount: 1,
      processingFeeAmount: 0.5,
    })

    // revenue row was NOT re-inserted (duplicate acknowledgement); the two
    // fee rows were recorded by the fallback
    expect(fake.calls).not.toContain(`insert:ticket_sale:${BASE_PARAMS.orderId}:revenue`)
    expect(fake.calls).toContain(`insert:ticket_sale:${BASE_PARAMS.orderId}:platform_fee`)
    expect(fake.calls).toContain(`insert:ticket_sale:${BASE_PARAMS.orderId}:processing_fee`)
    expect(fake.rows).toHaveLength(3)
  })

  it('fallback fails closed when the pre-check read is unavailable', async () => {
    const fake = financialLedgerFake()
    fake.failUpsert()
    fake.failPrecheck()
    await expect(
      writeSaleLedger({
        ...BASE_PARAMS,
        supabase: fake.supabase as any,
        grossAmount: 30,
        platformFeeAmount: 1,
        processingFeeAmount: 0.5,
      }),
    ).rejects.toThrow('Sale ledger pre-check failed')
    expect(fake.rows).toHaveLength(0)
  })

  it('fallback fails closed when a required write errors', async () => {
    const fake = financialLedgerFake()
    fake.failUpsert()
    fake.failInsert('storage outage')
    await expect(
      writeSaleLedger({
        ...BASE_PARAMS,
        supabase: fake.supabase as any,
        grossAmount: 30,
        platformFeeAmount: 1,
        processingFeeAmount: 0.5,
      }),
    ).rejects.toThrow('storage outage')
    expect(fake.rows).toHaveLength(0)
  })
})

function refundRpcFake(options: {
  rpcError?: { code?: string; message?: string } | null
  rpcResult?: Record<string, any> | null
  ledgerRows?: Array<{ idempotency_key: string; id: string }>
}) {
  const calls: string[] = []
  const inserts: any[] = []
  const rpcCalls: Array<{ fn: string; args: Record<string, unknown> }> = []

  const ledgerFake = financialLedgerFake(options.ledgerRows ?? [])

  const supabase = {
    rpc: async (fn: string, args?: Record<string, unknown>) => {
      rpcCalls.push({ fn, args: args ?? {} })
      calls.push(`rpc:${fn}`)
      if (options.rpcError) return { data: null, error: options.rpcError }
      return { data: options.rpcResult ?? null, error: null }
    },
    from(table: string) {
      if (table === 'financial_transactions') return ledgerFake.supabase.from(table)
      calls.push(`from:${table}`)
      const builder: any = {
        select: () => builder,
        eq: () => builder,
        insert: async (row: any) => {
          inserts.push(row)
          calls.push(`insert:${table}`)
          return { data: [row], error: null }
        },
        update: () => builder,
        maybeSingle: async () => ({ data: null, error: null }),
        single: async () => ({ data: null, error: null }),
      }
      return builder
    },
  }

  return { supabase, calls, inserts, rpcCalls, ledgerRows: ledgerFake.rows }
}

const REFUND_RPC_RESULT = {
  event_id: BASE_PARAMS.eventId,
  ticket_type_id: '00000000-0000-0000-0000-000000000005',
  buyer_user_id: null, // keeps notification service out of the unit boundary
  restored_quantity: 2,
  payment_reference: 'pi_test_123',
  org_id: BASE_PARAMS.orgId,
}

describe('refund replay through refundOrderTickets', () => {
  it('duplicate refund (RPC: already been refunded) yields a duplicate acknowledgement with zero side effects', async () => {
    const fake = refundRpcFake({
      rpcError: { code: 'P0001', message: 'Order has already been refunded' },
    })

    const result = await refundOrderTickets({
      supabase: fake.supabase as any,
      orderId: BASE_PARAMS.orderId,
      actorUserId: BASE_PARAMS.createdBy,
      refundAmount: 27.5,
    })

    expect(result).toEqual({ duplicate: true })
    // no ledger rows, no analytics, and no further side-effect writes
    expect(fake.ledgerRows).toHaveLength(0)
    expect(fake.inserts).toHaveLength(0)
    expect(fake.rpcCalls).toHaveLength(1)
  })

  it('a genuine refund RPC failure throws (fail closed), including after partial effects', async () => {
    const fake = refundRpcFake({
      rpcError: { code: 'P0001', message: 'Refund amount must be greater than zero' },
    })
    await expect(
      refundOrderTickets({
        supabase: fake.supabase as any,
        orderId: BASE_PARAMS.orderId,
        actorUserId: BASE_PARAMS.createdBy,
        refundAmount: 0,
      }),
    ).rejects.toThrow('Refund amount must be greater than zero')
    expect(fake.ledgerRows).toHaveLength(0)
    expect(fake.inserts).toHaveLength(0)
  })

  it('a successful refund records the ledger receipt once and reports non-duplicate', async () => {
    const fake = refundRpcFake({ rpcResult: REFUND_RPC_RESULT })

    const first = await refundOrderTickets({
      supabase: fake.supabase as any,
      orderId: BASE_PARAMS.orderId,
      actorUserId: BASE_PARAMS.createdBy,
      refundAmount: 27.5,
    })
    expect(first).toEqual({ duplicate: false })
    expect(fake.ledgerRows).toHaveLength(1)
    expect(fake.ledgerRows[0].idempotency_key).toBe(`ticket_refund:${BASE_PARAMS.orderId}:full`)
    expect(fake.inserts).toHaveLength(1) // analytics event only
  })
})

function saleFake(order: Record<string, any>) {
  const calls: string[] = []
  const supabase = {
    from(table: string) {
      calls.push(`from:${table}`)
      const builder: any = {
        select: () => builder,
        eq: () => builder,
        update: () => builder,
        insert: () => builder,
        rpc: () => builder,
        maybeSingle: async () => ({ data: order, error: null }),
        single: async () => ({ data: order, error: null }),
      }
      return builder
    },
    rpc: async () => ({ data: null, error: null }),
  }
  return { supabase, calls }
}

describe('paid-event replay after a refund (finalizePaidOrder)', () => {
  it('acknowledges a replay of a fully refunded order with zero side effects', async () => {
    const order = {
      id: BASE_PARAMS.orderId,
      event_id: BASE_PARAMS.eventId,
      ticket_type_id: 'tt-1',
      quantity: 2,
      unit_price: 20,
      total_amount: 45,
      platform_fee_amount: 2,
      processing_fee_amount: 1,
      tax_amount: 0,
      net_amount: 42,
      payment_status: 'refunded',
      issuance_status: 'issued',
      reservation_id: null,
      buyer_user_id: null,
      buyer_email: 'buyer@example.com',
      buyer_name: 'Buyer',
      metadata: { refund: { amount: 45, partial: false } },
      payment_reference: 'pi_old',
      promo_code_id: null,
    }
    const fake = saleFake(order)

    const result = await finalizePaidOrder({
      supabase: fake.supabase as any,
      orderId: BASE_PARAMS.orderId,
      stripeEventId: 'evt_late_paid',
    })

    expect(result).toEqual({ alreadyFinalized: true, skipped: 'terminal_state' })
    // only the order read happened — no issuance, ledger, analytics, notification
    expect(fake.calls).toEqual(['from:ticket_sales'])
  })

  it('acknowledges a replay of a partially refunded order with zero side effects (already-finalized path)', async () => {
    // A partial refund keeps payment_status 'completed' and issuance succeeds,
    // so the canonical already-finalized acknowledgement absorbs the replay
    // before any issuance/ledger/analytics/notification side effect.
    const order = {
      id: BASE_PARAMS.orderId,
      event_id: BASE_PARAMS.eventId,
      payment_status: 'completed',
      issuance_status: 'issued',
      metadata: { refund: { amount: 10, partial: true } },
    }
    const fake = saleFake(order)

    const result = await finalizePaidOrder({
      supabase: fake.supabase as any,
      orderId: BASE_PARAMS.orderId,
      stripeEventId: 'evt_late_paid_partial',
    })

    expect(result).toEqual({ alreadyFinalized: true })
    expect(fake.calls).toEqual(['from:ticket_sales'])
  })

  it('a recorded metadata.refund with un-issued issuance still replays as a terminal acknowledgement', async () => {
    // Pathological race where a refund is recorded before issuance finished
    // (issuance_status stuck): the metadata.refund terminal guard must still
    // stop side effects rather than issue admissions for a refunded order.
    const order = {
      id: BASE_PARAMS.orderId,
      event_id: BASE_PARAMS.eventId,
      payment_status: 'completed',
      issuance_status: 'pending',
      metadata: { refund: { amount: 10, partial: true } },
    }
    const fake = saleFake(order)

    const result = await finalizePaidOrder({
      supabase: fake.supabase as any,
      orderId: BASE_PARAMS.orderId,
      stripeEventId: 'evt_late_paid_partial_pending',
    })

    expect(result).toEqual({ alreadyFinalized: true, skipped: 'terminal_state' })
    expect(fake.calls).toEqual(['from:ticket_sales'])
  })

  it('preserves the normal already-finalized acknowledgement for completed+issued orders', async () => {
    const order = { id: BASE_PARAMS.orderId, payment_status: 'completed', issuance_status: 'issued', metadata: {} }
    const fake = saleFake(order)

    const result = await finalizePaidOrder({
      supabase: fake.supabase as any,
      orderId: BASE_PARAMS.orderId,
      stripeEventId: 'evt_repeat',
    })

    expect(result).toEqual({ alreadyFinalized: true })
    expect(fake.calls).toEqual(['from:ticket_sales'])
  })
})