import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { authenticateApiRequest } from '@/lib/auth/api-auth'
import { hasTicketingPermission } from '@/lib/ticketing/permissions'

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

  const types = typesRes.data || []
  const orders = ordersRes.data || []
  const tickets = ticketsRes.data || []

  const ticketsSold = tickets.filter((t: any) => !['refunded', 'canceled', 'void'].includes(t.status)).length
  const ticketsRemaining = types.reduce((sum: number, t: any) => {
    return sum + Math.max(0, (t.quantity_available || 0) - (t.quantity_sold || 0) - (t.quantity_reserved || 0))
  }, 0)

  const completedOrders = orders.filter((o: any) => o.payment_status === 'completed')
  const grossRevenue = completedOrders.reduce((sum: number, o: any) => sum + Number(o.total_amount || 0), 0)
  const platformFees = completedOrders.reduce((sum: number, o: any) => sum + Number(o.platform_fee_amount || 0), 0)
  const discounts = completedOrders.reduce((sum: number, o: any) => sum + Number(o.discount_amount || 0), 0)
  const refundedOrders = orders.filter((o: any) => o.payment_status === 'refunded')
  const refunds = refundedOrders.reduce((sum: number, o: any) => sum + Number(o.total_amount || 0), 0)

  const capacity = types.reduce((sum: number, t: any) => sum + (t.quantity_available || 0), 0)
  const sellThrough = capacity > 0 ? Math.round((ticketsSold / capacity) * 100) : 0
  const checkedIn = checkinsRes.count ?? tickets.filter((t: any) => t.status === 'checked_in').length
  const noShows = Math.max(0, ticketsSold - checkedIn)

  const byType = types.map((t: any) => ({
    ticket_type_id: t.id,
    name: t.name,
    sold: t.quantity_sold,
    remaining: Math.max(0, (t.quantity_available || 0) - (t.quantity_sold || 0) - (t.quantity_reserved || 0)),
    revenue: canFinance
      ? tickets.filter((x: any) => x.ticket_type_id === t.id && !['refunded', 'canceled', 'void'].includes(x.status)).length * Number(t.price || 0)
      : undefined,
  }))

  return NextResponse.json({
    tickets_sold: ticketsSold,
    tickets_remaining: ticketsRemaining,
    sell_through_pct: sellThrough,
    checked_in: checkedIn,
    no_show_estimate: noShows,
    capacity_utilization_pct: capacity > 0 ? Math.round((checkedIn / capacity) * 100) : 0,
    complimentary_issued: compsRes.count ?? 0,
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
