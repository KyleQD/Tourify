import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { evaluateTicketSaleGate, remainingTicketInventory } from '@/lib/ticketing/lifecycle'
import { requireFinalizedInventory } from '@/lib/ticketing/inventory'
import { revokeAndReissueCredential } from '@/lib/ticketing/issuance'

describe('canonical event publication and inventory gates', () => {
  it('requires both a published event and explicit ticketing enablement', () => {
    expect(evaluateTicketSaleGate({ eventStatus: 'draft', ticketingEnabled: true }))
      .toEqual({ allowed: false, code: 'EVENT_NOT_PUBLISHED' })
    expect(evaluateTicketSaleGate({ eventStatus: 'published', ticketingEnabled: null }))
      .toEqual({ allowed: false, code: 'TICKETING_NOT_ENABLED' })
    expect(evaluateTicketSaleGate({ eventStatus: 'published', ticketingEnabled: true }))
      .toEqual({ allowed: true })
  })

  it('enforces sale windows at their boundaries', () => {
    const now = new Date('2026-09-16T12:00:00.000Z')
    expect(evaluateTicketSaleGate({
      eventStatus: 'published',
      ticketingEnabled: true,
      saleStart: '2026-09-16T12:01:00.000Z',
      now,
    })).toEqual({ allowed: false, code: 'SALE_NOT_STARTED' })
    expect(evaluateTicketSaleGate({
      eventStatus: 'published',
      ticketingEnabled: true,
      saleEnd: '2026-09-16T11:59:00.000Z',
      now,
    })).toEqual({ allowed: false, code: 'SALE_ENDED' })
  })

  it('subtracts active holds and never exposes negative availability', () => {
    expect(remainingTicketInventory({ quantityAvailable: 10, quantitySold: 7, quantityReserved: 2 })).toBe(1)
    expect(remainingTicketInventory({ quantityAvailable: 10, quantitySold: 9, quantityReserved: 4 })).toBe(0)
  })
})

describe('inventory consumption', () => {
  it('fails closed when the reservation cannot be consumed', async () => {
    const supabase = {
      rpc: async () => ({ data: false, error: null }),
      from: () => ({}),
    }
    await expect(requireFinalizedInventory({ supabase, reservationId: 'reservation-1' }))
      .rejects.toThrow('Inventory reservation is no longer active')
  })
})

function credentialClient(options: { failReplacement?: boolean } = {}) {
  const state = {
    oldStatus: 'active',
    oldSupersededBy: null as string | null,
    replacementStatus: null as string | null,
  }
  const calls: string[] = []

  const execute = (table: string, action: string | null, payload: any, single: boolean) => {
    if (table === 'ticket_credentials' && action === null)
      return { data: state.oldStatus === 'active' ? { id: 'credential-old' } : null, error: null }

    if (table === 'ticket_credentials' && action === 'update') {
      if (payload.status === 'superseded') {
        calls.push('retire-old')
        if (state.oldStatus !== 'active') return { data: null, error: null }
        state.oldStatus = 'superseded'
        return { data: single ? { id: 'credential-old' } : null, error: null }
      }
      if (payload.status === 'active') {
        calls.push('restore-old')
        state.oldStatus = 'active'
        return { data: null, error: null }
      }
      if (payload.superseded_by) {
        calls.push('link-old')
        state.oldSupersededBy = payload.superseded_by
        return { data: null, error: null }
      }
    }

    if (table === 'ticket_credentials' && action === 'insert') {
      calls.push('insert-new')
      if (options.failReplacement)
        return { data: null, error: { message: 'replacement failed' } }
      state.replacementStatus = payload.status
      return { data: { id: 'credential-new' }, error: null }
    }

    return { data: null, error: null }
  }

  const supabase = {
    from(table: string) {
      let action: string | null = null
      let payload: any = null
      const builder: any = {
        select: () => builder,
        eq: () => builder,
        is: () => builder,
        update(value: any) {
          action = 'update'
          payload = value
          return builder
        },
        insert(value: any) {
          action = 'insert'
          payload = value
          return builder
        },
        maybeSingle: async () => execute(table, action, payload, true),
        single: async () => execute(table, action, payload, true),
        then(resolve: (value: any) => void, reject: (reason: unknown) => void) {
          return Promise.resolve(execute(table, action, payload, false)).then(resolve, reject)
        },
      }
      return builder
    },
  }

  return { supabase, state, calls }
}

describe('credential rotation', () => {
  it('retires the old credential before inserting the one active replacement', async () => {
    const { supabase, state, calls } = credentialClient()
    await revokeAndReissueCredential({ supabase, ticketId: 'ticket-1', reason: 'transfer_accepted' })

    expect(calls.slice(0, 3)).toEqual(['retire-old', 'insert-new', 'link-old'])
    expect(state.oldStatus).toBe('superseded')
    expect(state.oldSupersededBy).toBe('credential-new')
    expect(state.replacementStatus).toBe('active')
  })

  it('restores the old credential when replacement insertion fails', async () => {
    const { supabase, state, calls } = credentialClient({ failReplacement: true })
    await expect(revokeAndReissueCredential({
      supabase,
      ticketId: 'ticket-1',
      reason: 'transfer_accepted',
    })).rejects.toThrow('replacement failed')

    expect(calls).toEqual(['retire-old', 'insert-new', 'restore-old'])
    expect(state.oldStatus).toBe('active')
    expect(state.replacementStatus).toBeNull()
  })
})

describe('route-level lifecycle guards', () => {
  it('authenticates delivery and scopes the service-role read to the buyer', () => {
    const route = readFileSync('app/api/ticketing/delivery/route.ts', 'utf8')
    expect(route).toContain('authenticateApiRequest(request)')
    expect(route).toContain(".eq('buyer_user_id', buyerUserId)")
  })

  it('conditionally claims ticket and legacy sale check-ins', () => {
    const route = readFileSync('app/api/ticketing/check-in/route.ts', 'utf8')
    expect(route).toContain(".in('status', ['valid', 'assigned', 'transferred'])")
    expect(route).toContain(".eq('checked_in', false)")
    expect(route).toContain("code: 'ALREADY_CHECKED_IN'")
  })

  it('returns unavailable rather than false zero when settlement reads fail', () => {
    const route = readFileSync('app/api/ticketing/settlements/route.ts', 'utf8')
    expect(route).toContain('allocationsResult.error || txnsResult.error || settlementResult.error')
    expect(route).toContain("code: 'ticketing_unavailable'")
    expect(route).toContain('status: 503')
  })

  it('rejects expired transfers and conditionally closes pending ones', () => {
    const route = readFileSync('app/api/ticketing/transfers/route.ts', 'utf8')
    expect(route).toContain("status: 'expired'")
    expect(route).toContain("error: 'Transfer has expired'")
    expect(route.match(/\.eq\('status', 'pending'\)/g)?.length).toBeGreaterThanOrEqual(3)
  })
})
