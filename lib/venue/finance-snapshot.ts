/**
 * VEN-163/165 — server-owned Venue finance snapshot aggregation.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  buildSummary,
  classifyBooking,
  parseBudgetEstimate,
  type BookingFinanceInput,
  type FinanceLedgerRow,
  type VenueShareView,
} from './finance-service'

const round2 = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100

export interface VenueFinanceSnapshot {
  transactions: FinanceLedgerRow[]
  summary: ReturnType<typeof buildSummary>
  shares: VenueShareView[]
}

export async function getVenueFinanceSnapshot(
  service: SupabaseClient,
  venueId: string,
): Promise<VenueFinanceSnapshot> {
  const [manualRes, bookingsRes, eventsRes] = await Promise.all([
    service
      .from('venue_manual_transactions')
      .select('id, date, type, category, description, amount, status, event_id')
      .eq('venue_id', venueId)
      .order('date', { ascending: false })
      .limit(500),
    // Booking pipeline/receivables for this venue (canonical lifecycle fields).
    service
      .from('venue_booking_requests')
      .select('id, status, lifecycle_status, budget_range, expected_attendance, event_id')
      .eq('venue_id', venueId)
      .limit(300),
    // Events bound to this venue (settings link or identity bridge mirror).
    service.from('events_v2').select('id, venue_id, settings').contains('settings', { venue_profile_id: venueId }).limit(250),
  ])

  if (manualRes.error) throw new Error(manualRes.error.message)

  let venueEvents: Array<{ id: string }> = (eventsRes.data || []) as any

  // Identity-bridge fallback when settings links are absent.
  try {
    const { data: bridge } = await service
      .from('venue_identity_bridges')
      .select('venues_v2_id')
      .eq('venue_profile_id', venueId)
      .maybeSingle()
    if (bridge?.venues_v2_id && !venueEvents.some((e: any) => e.id === bridge.venues_v2_id)) {
      const { data: bridgedEvents } = await service
        .from('events_v2')
        .select('id')
        .or(`venue_id.eq.${bridge.venues_v2_id},id.eq.${bridge.venues_v2_id}`)
        .limit(250)
      venueEvents = [...venueEvents, ...((bridgedEvents || []) as Array<{ id: string }>)]
    }
  } catch {
    // Bridge table optional in early environments.
  }
  const eventIds = Array.from(new Set(venueEvents.map((e) => e.id)))

  const manualRows = manualRes.data || []
  const bookings = (bookingsRes.error ? [] : bookingsRes.data || []) as BookingFinanceInput[]

  const transactions: FinanceLedgerRow[] = [
    ...manualRows.map((row: any): FinanceLedgerRow => ({
      id: row.id,
      date: row.date,
      type: row.type === 'expense' ? 'expense' : 'income',
      category: row.category || '',
      description: row.description || '',
      amount: Number(row.amount || 0),
      status: row.status === 'pending' ? 'pending' : 'completed',
      source: 'manual',
      eventId: row.event_id ?? null,
    })),
    ...bookings.map((booking): FinanceLedgerRow => {
      const estimate = parseBudgetEstimate(booking.budget_range)
      const kind = classifyBooking(booking)
      return {
        id: `booking-${booking.id}`,
        date: new Date().toISOString().slice(0, 10),
        type: 'income',
        category: kind === 'contracted' ? 'contracted_receivable' : 'pipeline_estimate',
        description:
          kind === 'contracted' ? 'Approved booking (estimated value)' : 'Inquiry / pending booking (estimated value)',
        amount: estimate ?? 0,
        status: 'pending',
        source: kind === 'contracted' ? 'booking_receivable' : 'booking_pipeline',
        eventId: booking.event_id ?? null,
      }
    }),
  ]

  // ── Venue settlement share per event (VEN-167/168) ──────────────────────────
  const shares: VenueShareView[] = []
  if (eventIds.length > 0) {
    const [allocRes, settlementsRes] = await Promise.all([
      service
        .from('ticket_revenue_allocations')
        .select('event_id, beneficiary_type, share_type, share_value, is_active')
        .in('event_id', eventIds)
        .eq('beneficiary_type', 'venue')
        .eq('is_active', true),
      service
        .from('settlements')
        .select('event_id, venue_payout, status')
        .in('event_id', eventIds),
    ])
    const settlementByEvent = new Map<string, { venue_payout: number | null; status: string | null }>()
    for (const row of settlementsRes.data || []) {
      settlementByEvent.set(String((row as any).event_id), row as any)
    }
    for (const alloc of allocRes.data || []) {
      const a = alloc as any
      const settlement = settlementByEvent.get(String(a.event_id))
      const status = (settlement?.status || 'unsettled') as VenueShareView['settlement_status']
      shares.push({
        event_id: String(a.event_id),
        beneficiary_type: 'venue',
        share_type: a.share_type,
        share_value: Number(a.share_value || 0),
        settled_amount: settlement?.venue_payout != null ? round2(Number(settlement.venue_payout)) : null,
        settlement_status: status,
      })
    }
  }

  return {
    transactions,
    summary: buildSummary(
      manualRows.map((row: any) => ({
        amount: row.amount,
        type: row.type,
        status: row.status,
        date: row.date,
        category: row.category,
      })),
      bookings,
    ),
    shares,
  }
}
