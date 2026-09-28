/**
 * VEN-163/165/166/167/174 — venue finance truth: estimate separation,
 * server summary math, CSV determinism and share-slicing boundaries.
 */

import { describe, expect, it } from 'vitest'
import {
  buildFinanceCsv,
  buildSummary,
  classifyBooking,
  filterSharesForCaller,
  parseBudgetEstimate,
} from '@/lib/venue/finance-service'

describe('parseBudgetEstimate (VEN-166: estimates stay labeled)', () => {
  it('parses operator-entered budget floors', () => {
    expect(parseBudgetEstimate('$1,200')).toBe(1200)
    expect(parseBudgetEstimate('800-1200')).toBe(800)
    expect(parseBudgetEstimate('2500')).toBe(2500)
  })

  it('returns null instead of inventing per-head math', () => {
    expect(parseBudgetEstimate('')).toBeNull()
    expect(parseBudgetEstimate(null)).toBeNull()
    expect(parseBudgetEstimate('TBD')).toBeNull()
    // The old $25/head fallback is gone — attendance alone is not money.
    expect(parseBudgetEstimate('500 attendees')).toBe(500)
  })
})

describe('classifyBooking', () => {
  it('separates contracted receivables from pipeline', () => {
    expect(classifyBooking({ id: 'b1', status: 'approved' })).toBe('contracted')
    expect(classifyBooking({ id: 'b2', status: 'pending', lifecycle_status: 'offer_sent' })).toBe('pipeline')
    expect(classifyBooking({ id: 'b3', status: 'rejected' })).toBeNull()
    expect(classifyBooking({ id: 'b4', status: 'cancelled', lifecycle_status: 'cancelled' })).toBeNull()
  })
})

describe('buildSummary (VEN-163: real ledger math)', () => {
  const rows = [
    { amount: 1000, type: 'income', status: 'completed', date: currentMonth(), category: 'ticket_revenue' },
    { amount: 300, type: 'expense', status: 'completed', date: previousMonth(), category: 'staff_pay' },
    { amount: 500, type: 'income', status: 'pending', date: currentMonth(), category: 'invoice' },
    { amount: 50, type: 'expense', status: 'completed', date: currentMonth(), category: 'equipment' },
  ]
  const bookings = [
    { id: 'k1', status: 'approved', budget_range: '$2,000' },
    { id: 'k2', status: 'pending', budget_range: '800-1200' },
    { id: 'k3', status: 'pending', budget_range: '' },
  ]

  function currentMonth() {
    const now = new Date()
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-15`
  }
  function previousMonth() {
    const now = new Date()
    now.setUTCMonth(now.getUTCMonth() - 1)
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-10`
  }

  it('computes completed-only totals with real month bucketing', () => {
    const summary = buildSummary(rows, [])
    expect(summary.totals.recorded_income).toBe(1000)
    expect(summary.totals.recorded_expenses).toBe(350)
    expect(summary.totals.net_recorded).toBe(650)
    expect(summary.totals.pending_receivable).toBe(500)
    expect(summary.month.income).toBe(1000)
    expect(summary.month.expenses).toBe(50)
  })

  it('keeps booking money out of recorded totals but visible as estimates', () => {
    const summary = buildSummary(rows, bookings)
    expect(summary.bookings.contracted_receivable).toBe(2000)
    expect(summary.bookings.pipeline_estimate).toBe(800)
    expect(summary.totals.recorded_income).toBe(1000)
    expect(summary.bookings.estimate_note).toMatch(/estimates/i)
  })

  it('aggregates breakdowns by category sorted by amount', () => {
    const summary = buildSummary(
      [
        ...rows,
        { amount: 400, type: 'expense', status: 'completed', date: currentMonth(), category: 'marketing' },
      ],
      [],
    )
    expect(summary.breakdowns.expenses[0]).toEqual({ category: 'marketing', amount: 400 })
    expect(summary.breakdowns.income[0]).toEqual({ category: 'ticket_revenue', amount: 1000 })
  })
})

describe('buildFinanceCsv (VEN-170: deterministic export)', () => {
  it('emits ledger rows then a summary block, escaping quotes', () => {
    const rows = [
      {
        id: 'r1',
        date: '2026-08-01',
        type: 'income' as const,
        category: 'door',
        description: 'Door take "night one"',
        amount: 420,
        status: 'completed' as const,
        source: 'manual' as const,
        eventId: null,
      },
    ]
    const csv = buildFinanceCsv(rows, buildSummary([{ amount: 420, type: 'income', status: 'completed', date: '2026-08-01' }], []))
    expect(csv).toContain('"Door take ""night one"""')
    expect(csv.trim().endsWith('contracted_receivable","0.00"')).toBe(true)
    expect(csv.startsWith('section,date,type,category,description,amount,status,source,event_id')).toBe(true)
  })
})

describe('filterSharesForCaller (VEN-167 boundary)', () => {
  const shares = [
    { beneficiary_type: 'venue', beneficiary_id: 'venue-mine' },
    { beneficiary_type: 'artist', beneficiary_id: 'artist-other' },
    { beneficiary_type: 'platform', beneficiary_id: null },
  ]

  it('share-only viewers see exclusively their own beneficiaries', () => {
    const visible = filterSharesForCaller(shares as any, new Set(['venue-mine']), false)
    expect(visible).toHaveLength(1)
    expect(visible[0].beneficiary_id).toBe('venue-mine')
  })

  it('full viewers see everything including platform slices', () => {
    expect(filterSharesForCaller(shares as any, new Set(), true)).toHaveLength(3)
  })
})
