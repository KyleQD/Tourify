import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { authenticateApiRequest } from '@/lib/auth/api-auth'
import { hasTicketingPermission } from '@/lib/ticketing/permissions'

class TicketingReportUnavailableError extends Error {}

function requiredNumber(value: unknown): number {
  const numeric = Number(value)
  if (value === null || value === undefined || value === '' || !Number.isFinite(numeric)) {
    throw new TicketingReportUnavailableError()
  }
  return numeric
}

function reportUnavailable() {
  return NextResponse.json(
    { error: 'Ticketing report is temporarily unavailable.', code: 'ticketing_unavailable' },
    { status: 503 },
  )
}

/**
 * Event ticketing dashboard metrics from authoritative tables.
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const eventId = new URL(request.url).searchParams.get('event_id')
  if (!eventId) return NextResponse.json({ error: 'event_id required' }, { status: 400 })

  const supabase = await createClient()
  const allowed = await hasTicketingPermission({
    supabase,
    userId: auth.user.id,
    eventId,
    permission: 'view_overview',
  })
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const canFinance = await hasTicketingPermission({
    supabase,
    userId: auth.user.id,
    eventId,
    permission: 'view_full_financials',
  })

  const [
    typesRes,
    ordersRes,
    ticketsRes,
    checkinsRes,
    compsRes,
    analyticsRes,
  ] = await Promise.all([
    supabase.from('ticket_types').select('id, name, quantity_available, quantity_sold, quantity_reserved, price').eq('event_id', eventId),
    supabase.from('ticket_sales').select('id, quantity, total_amount, payment_status, platform_fee_amount, discount_amount, created_at').eq('event_id', eventId).in('payment_status', ['completed', 'refunded']),
    supabase.from('tickets').select('id, status, ticket_type_id, is_complimentary').eq('event_id', eventId),
    supabase.from('ticket_checkins').select('id', { count: 'exact', head: true }).eq('event_id', eventId).eq('result', 'valid').is('reversed_at', null),
    supabase.from('tickets').select('id', { count: 'exact', head: true }).eq('event_id', eventId).eq('is_complimentary', true),
    supabase.from('ticket_analytics_events').select('event_name, created_at, amounts').eq('event_id', eventId).order('created_at', { ascending: false }).limit(100),
  ])

  if (
    typesRes.error ||
    ordersRes.error ||
    ticketsRes.error ||
    checkinsRes.error ||
    compsRes.error ||
    analyticsRes.error ||
    !typesRes.data ||
    !ordersRes.data ||
    !ticketsRes.data ||
    checkinsRes.count === null ||
    compsRes.count === null ||
    !analyticsRes.data
  ) {
    return reportUnavailable()
  }

  const types = typesRes.data
  const orders = ordersRes.data
  const tickets = ticketsRes.data

  try {
    for (const type of types) {
      requiredNumber(type.quantity_available)
      requiredNumber(type.quantity_sold)
      requiredNumber(type.quantity_reserved)
      if (type.name === null || type.name === undefined) throw new TicketingReportUnavailableError()
      if (canFinance) requiredNumber(type.price)
    }

    for (const ticket of tickets) {
      if (ticket.status === null || ticket.status === undefined) throw new TicketingReportUnavailableError()
      if (ticket.ticket_type_id === null || ticket.ticket_type_id === undefined) throw new TicketingReportUnavailableError()
    }

    if (canFinance) {
      for (const order of orders) {
        if (order.payment_status === null || order.payment_status === undefined) throw new TicketingReportUnavailableError()
        requiredNumber(order.total_amount)
        requiredNumber(order.platform_fee_amount)
        requiredNumber(order.discount_amount)
      }
    }
  } catch (error) {
    if (error instanceof TicketingReportUnavailableError) return reportUnavailable()
    throw error
  }

  const ticketsSold = tickets.filter((t: any) => !['refunded', 'canceled', 'void'].includes(t.status)).length
  const ticketsRemaining = types.reduce((sum: number, t: any) => {
    return sum + Math.max(0, requiredNumber(t.quantity_available) - requiredNumber(t.quantity_sold) - requiredNumber(t.quantity_reserved))
  }, 0)

  const completedOrders = orders.filter((o: any) => o.payment_status === 'completed')
  const grossRevenue = canFinance
    ? completedOrders.reduce((sum: number, o: any) => sum + requiredNumber(o.total_amount), 0)
    : 0
  const platformFees = canFinance
    ? completedOrders.reduce((sum: number, o: any) => sum + requiredNumber(o.platform_fee_amount), 0)
    : 0
  const discounts = canFinance
    ? completedOrders.reduce((sum: number, o: any) => sum + requiredNumber(o.discount_amount), 0)
    : 0
  const refundedOrders = orders.filter((o: any) => o.payment_status === 'refunded')
  const refunds = canFinance
    ? refundedOrders.reduce((sum: number, o: any) => sum + requiredNumber(o.total_amount), 0)
    : 0

  const capacity = types.reduce((sum: number, t: any) => sum + requiredNumber(t.quantity_available), 0)
  const sellThrough = capacity > 0 ? Math.round((ticketsSold / capacity) * 100) : 0
  const checkedIn = checkinsRes.count
  const noShows = Math.max(0, ticketsSold - checkedIn)

  const byType = types.map((t: any) => ({
    ticket_type_id: t.id,
    name: t.name,
    sold: t.quantity_sold,
    remaining: Math.max(0, requiredNumber(t.quantity_available) - requiredNumber(t.quantity_sold) - requiredNumber(t.quantity_reserved)),
    revenue: canFinance
      ? tickets.filter((x: any) => x.ticket_type_id === t.id && !['refunded', 'canceled', 'void'].includes(x.status)).length * requiredNumber(t.price)
      : undefined,
  }))

  return NextResponse.json({
    tickets_sold: ticketsSold,
    tickets_remaining: ticketsRemaining,
    sell_through_pct: sellThrough,
    checked_in: checkedIn,
    no_show_estimate: noShows,
    capacity_utilization_pct: capacity > 0 ? Math.round((checkedIn / capacity) * 100) : 0,
    complimentary_issued: compsRes.count,
    by_type: byType,
    recent_analytics: analyticsRes.data || [],
    finances: canFinance
      ? {
          gross_revenue: grossRevenue,
          net_revenue: Math.max(0, grossRevenue - refunds - platformFees),
          refunds,
          platform_fees: platformFees,
          discounts,
        }
      : null,
  })
}
