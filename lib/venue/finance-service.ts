/**
 * VEN-163/165/166 — server-owned Venue finance truth.
 *
 * Every number on the Venue finance surface derives here, from canonical
 * sources:
 *   - venue_manual_transactions  → recorded ledger (actuals)
 *   - venue_booking_requests     → pipeline ESTIMATE vs contracted receivable
 *   - ticket_revenue_allocations + settlements → the Venue's event share
 *
 * Estimates are always labeled as estimates; unavailable values are null with
 * an explicit source marker — never silently coerced to zero.
 */

export type FinanceRowSource = 'manual' | 'booking_pipeline' | 'booking_receivable'

export interface FinanceLedgerRow {
  id: string
  date: string
  type: 'income' | 'expense'
  category: string
  description: string
  amount: number
  status: 'pending' | 'completed'
  source: FinanceRowSource
  eventId: string | null
}

export interface BookingFinanceInput {
  id: string
  status: string
  lifecycle_status?: string | null
  budget_range?: string | null
  expected_attendance?: number | null
  event_id?: string | null
}

export interface VenueShareView {
  event_id: string
  beneficiary_type: 'venue'
  share_type: 'percentage' | 'flat' | 'remainder'
  share_value: number
  /** Settled payout amount when a finalized settlement exists; else null. */
  settled_amount: number | null
  settlement_status: 'unsettled' | 'draft' | 'finalized' | 'paid'
}

export interface FinanceBreakdownEntry {
  category: string
  amount: number
}

export interface FinanceSummary {
  currency: 'usd'
  totals: {
    recorded_income: number
    recorded_expenses: number
    net_recorded: number
    pending_receivable: number
  }
  month: { income: number; expenses: number }
  bookings: {
    pipeline_estimate: number
    contracted_receivable: number
    estimate_note: string
  }
  breakdowns: { income: FinanceBreakdownEntry[]; expenses: FinanceBreakdownEntry[] }
}

const round2 = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100

/**
 * VEN-166 — budget_range is an operator-entered ESTIMATE. Parses the first
 * credible number as the floor of the range; returns null (never zero) when
 * absent. No invented per-head math.
 */
export function parseBudgetEstimate(budgetRange?: string | null): number | null {
  if (!budgetRange) return null
  const cleaned = String(budgetRange).replace(/[$,\s]/g, '')
  const match = cleaned.match(/(\d+(?:\.\d+)?)/)
  if (!match) return null
  const value = Number(match[1])
  return Number.isFinite(value) && value > 0 ? round2(value) : null
}

/** Contracted once approved/confirmed in the lifecycle; otherwise pipeline. */
export function classifyBooking(booking: BookingFinanceInput): 'pipeline' | 'contracted' | null {
  const lifecycle = String(booking.lifecycle_status || '').toLowerCase()
  const status = String(booking.status || '').toLowerCase()
  if (['cancelled', 'canceled', 'rejected', 'declined'].includes(lifecycle) || ['rejected', 'cancelled'].includes(status)) {
    return null
  }
  if (['confirmed', 'accepted', 'completed', 'contracted'].includes(lifecycle) || status === 'approved') {
    return 'contracted'
  }
  if (lifecycle || status) return 'pipeline'
  return null
}

function bucketBookings(bookings: BookingFinanceInput[]) {
  let pipeline = 0
  let contracted = 0
  for (const booking of bookings) {
    const estimate = parseBudgetEstimate(booking.budget_range)
    if (estimate === null) continue // unknown budget stays out of money totals
    const kind = classifyBooking(booking)
    if (kind === 'contracted') contracted = round2(contracted + estimate)
    else if (kind === 'pipeline') pipeline = round2(pipeline + estimate)
  }
  return { pipeline, contracted }
}

function topBreakdown(rows: FinanceLedgerRow[], type: 'income' | 'expense'): FinanceBreakdownEntry[] {
  const byCategory = new Map<string, number>()
  for (const row of rows) {
    if (row.type !== type) continue
    const key = row.category || (type === 'income' ? 'other_income' : 'other_expense')
    byCategory.set(key, round2((byCategory.get(key) || 0) + row.amount))
  }
  return [...byCategory.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)
}

export function buildSummary(
  manualRows: Array<{
    amount: number | string
    type: string
    status: string
    date: string
    category?: string | null
  }>,
  bookings: BookingFinanceInput[],
): FinanceSummary {
  const completed = manualRows.filter((row) => row.status === 'completed')
  const pendingIncome = manualRows
    .filter((row) => row.type === 'income' && row.status === 'pending')
    .reduce((sum, row) => sum + Number(row.amount || 0), 0)

  const recordedIncome = completed
    .filter((row) => row.type === 'income')
    .reduce((sum, row) => sum + Number(row.amount || 0), 0)
  const recordedExpenses = completed
    .filter((row) => row.type === 'expense')
    .reduce((sum, row) => sum + Number(row.amount || 0), 0)

  // Real current-month bucketing from ledger dates (not aliased totals).
  const now = new Date()
  const monthPrefix = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
  const inMonth = (row: { date: string }) => typeof row.date === 'string' && row.date.startsWith(monthPrefix)
  const monthIncome = completed.filter((r) => r.type === 'income' && inMonth(r)).reduce((s, r) => s + Number(r.amount || 0), 0)
  const monthExpenses = completed.filter((r) => r.type === 'expense' && inMonth(r)).reduce((s, r) => s + Number(r.amount || 0), 0)

  const ledgerForBreakdown: FinanceLedgerRow[] = manualRows.map((row, index) => ({
    id: `m-${index}`,
    date: row.date,
    type: row.type === 'expense' ? 'expense' : 'income',
    category: row.category || '',
    description: '',
    amount: Number(row.amount || 0),
    status: row.status === 'pending' ? 'pending' : 'completed',
    source: 'manual',
    eventId: null,
  }))

  return {
    currency: 'usd',
    totals: {
      recorded_income: round2(recordedIncome),
      recorded_expenses: round2(recordedExpenses),
      net_recorded: round2(recordedIncome - recordedExpenses),
      pending_receivable: round2(pendingIncome),
    },
    month: { income: round2(monthIncome), expenses: round2(monthExpenses) },
    bookings: (() => {
      const { pipeline, contracted } = bucketBookings(bookings)
      return {
        pipeline_estimate: pipeline,
        contracted_receivable: contracted,
        estimate_note:
          'Booking figures are operator-entered estimates from booking requests — not received payments. Recorded money appears under ledger totals.',
      }
    })(),
    breakdowns: {
      income: topBreakdown(ledgerForBreakdown, 'income'),
      expenses: topBreakdown(ledgerForBreakdown, 'expense'),
    },
  }
}

/** VEN-167 — deterministic CSV export of the recorded ledger + summary. */
export function buildFinanceCsv(
  rows: FinanceLedgerRow[],
  summary: FinanceSummary,
): string {
  const esc = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`
  const lines: string[] = []
  lines.push('section,date,type,category,description,amount,status,source,event_id')
  for (const row of rows) {
    lines.push(
      ['ledger', row.date, row.type, row.category, row.description, row.amount.toFixed(2), row.status, row.source, row.eventId || '']
        .map(esc)
        .join(','),
    )
  }
  lines.push('')
  lines.push(['summary', '', '', '', 'recorded_income', summary.totals.recorded_income.toFixed(2)].map(esc).join(','))
  lines.push(['summary', '', '', '', 'recorded_expenses', summary.totals.recorded_expenses.toFixed(2)].map(esc).join(','))
  lines.push(['summary', '', '', '', 'net_recorded', summary.totals.net_recorded.toFixed(2)].map(esc).join(','))
  lines.push(['summary', '', '', '', 'pipeline_estimate', summary.bookings.pipeline_estimate.toFixed(2)].map(esc).join(','))
  lines.push(['summary', '', '', '', 'contracted_receivable', summary.bookings.contracted_receivable.toFixed(2)].map(esc).join(','))
  return lines.join('\n') + '\n'
}

/**
 * VEN-167 — share-only viewers see ONLY allocations whose beneficiary is one
 * of their own accounts. Platform/null-beneficiary rows require full view.
 */
export function filterSharesForCaller<T>(
  shares: readonly T[],
  myAccountIds: ReadonlySet<string>,
  canFull: boolean,
): T[] {
  if (canFull) return [...shares]
  return shares.filter((share) => {
    const id = (share as { beneficiary_id?: string | null }).beneficiary_id
    return id !== null && id !== undefined && myAccountIds.has(id)
  })
}
