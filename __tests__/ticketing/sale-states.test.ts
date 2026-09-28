/**
 * VEN-150 — canonical sale-state derivation matrix.
 */

import { describe, expect, it } from 'vitest'
import { deriveSaleState } from '@/lib/ticketing/sale-state'

const NOW = new Date('2026-08-25T12:00:00Z')
const hours = (n: number) => new Date(NOW.getTime() + n * 3600_000).toISOString()

describe('deriveSaleState', () => {
  const base = {
    eventStatus: 'published',
    eventStartAt: hours(48),
    eventEndAt: hours(54),
    ticketingEnabled: true,
    totalInventory: 100,
    totalSold: 10,
    activeTypeCount: 2,
    now: NOW,
  }

  it('maps draft/inquiry event statuses to draft (never "On Sale")', () => {
    expect(deriveSaleState({ ...base, eventStatus: 'inquiry' }).state).toBe('draft')
    expect(deriveSaleState({ ...base, eventStatus: 'draft' }).state).toBe('draft')
  })

  it('maps cancelled events to cancelled regardless of sales', () => {
    expect(deriveSaleState({ ...base, eventStatus: 'cancelled' }).state).toBe('cancelled')
  })

  it('reports scheduled when ticketing not yet enabled and event upcoming', () => {
    const result = deriveSaleState({ ...base, ticketingEnabled: false })
    expect(result.state).toBe('scheduled')
  })

  it('reports ended for past events without ticketing', () => {
    const result = deriveSaleState({
      ...base,
      ticketingEnabled: false,
      eventStartAt: hours(-72),
      eventEndAt: hours(-66),
    })
    expect(result.state).toBe('ended')
  })

  it('honors pause flag over window math', () => {
    expect(deriveSaleState({ ...base, salesPaused: true }).state).toBe('paused')
  })

  it('reports sales_not_open before sale_start', () => {
    const result = deriveSaleState({ ...base, saleStart: hours(24) })
    expect(result.state).toBe('sales_not_open')
  })

  it('reports ended after sale_end even if event is upcoming', () => {
    const result = deriveSaleState({ ...base, saleStart: hours(-48), saleEnd: hours(-1) })
    expect(result.state).toBe('ended')
  })

  it('reports sold_out exactly at inventory boundary', () => {
    expect(deriveSaleState({ ...base, totalSold: 100 }).state).toBe('sold_out')
    expect(deriveSaleState({ ...base, totalSold: 99 }).state).toBe('on_sale')
  })

  it('reports sales_not_open when enabled with zero active types', () => {
    expect(deriveSaleState({ ...base, activeTypeCount: 0 }).state).toBe('sales_not_open')
  })

  it('reports on_sale inside an open window with inventory', () => {
    const result = deriveSaleState({ ...base, saleStart: hours(-1), saleEnd: hours(40) })
    expect(result.state).toBe('on_sale')
  })
})
