import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/auth/api-auth'

export const GET = withAdminAuth(
  async (request: NextRequest, { supabase }, { params }: any = {}) => {
    // Extract id from URL since withAdminAuth HOC doesn't forward params
    const url = new URL(request.url)
    const segments = url.pathname.split('/')
    const idIndex = segments.indexOf('events') + 1
    const id = segments[idIndex]

    if (!id) return NextResponse.json({ error: 'Missing event id' }, { status: 400 })

    const { searchParams } = url
    const range = searchParams.get('range') || '30d'

    const daysBack = range === '7d' ? 7 : range === '90d' ? 90 : range === 'all' ? 3650 : 30
    const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString()

    const [salesResult, financeResult, eventResult] = await Promise.allSettled([
      supabase
        .from('ticket_sales')
        .select('created_at, quantity, total_amount, ticket_type_id')
        .eq('event_id', id)
        .eq('payment_status', 'completed')
        .gte('created_at', since)
        .order('created_at', { ascending: true }),
      supabase
        .from('financial_transactions')
        .select('type, amount, category, created_at')
        .eq('event_id', id),
      supabase
        .from('events_v2')
        .select('capacity, settings')
        .eq('id', id)
        .maybeSingle(),
    ])

    const sales = salesResult.status === 'fulfilled' ? (salesResult.value.data || []) : []
    const transactions = financeResult.status === 'fulfilled' ? (financeResult.value.data || []) : []
    const eventRow = eventResult.status === 'fulfilled' ? eventResult.value.data : null

    // Ticket sales over time — group by date
    const salesByDate: Record<string, { count: number; revenue: number }> = {}
    for (const s of sales) {
      const date = s.created_at.slice(0, 10)
      if (!salesByDate[date]) salesByDate[date] = { count: 0, revenue: 0 }
      salesByDate[date].count += Number(s.quantity) || 0
      salesByDate[date].revenue += Number(s.total_amount) || 0
    }
    const ticketSalesOverTime = Object.entries(salesByDate).map(([date, v]) => ({
      date,
      count: v.count,
      revenue: v.revenue,
    }))

    // Sales by ticket type
    const salesByTypeId: Record<string, { sold: number; revenue: number }> = {}
    for (const s of sales) {
      const tid = s.ticket_type_id || 'unknown'
      if (!salesByTypeId[tid]) salesByTypeId[tid] = { sold: 0, revenue: 0 }
      salesByTypeId[tid].sold += Number(s.quantity) || 0
      salesByTypeId[tid].revenue += Number(s.total_amount) || 0
    }

    // Fetch ticket type names
    let typeNames: Record<string, string> = {}
    const typeIds = Object.keys(salesByTypeId).filter((t) => t !== 'unknown')
    if (typeIds.length > 0) {
      const { data: types } = await supabase
        .from('ticket_types')
        .select('id, name')
        .in('id', typeIds)
      for (const t of types || []) typeNames[t.id] = t.name
    }

    const salesByTier = Object.entries(salesByTypeId).map(([tid, v]) => ({
      tier: typeNames[tid] || 'General',
      sold: v.sold,
      revenue: v.revenue,
    }))

    // Revenue vs expenses
    const totalRevenue = transactions
      .filter((t: any) => t.type === 'income')
      .reduce((s: number, t: any) => s + (Number(t.amount) || 0), 0)
    const totalExpenses = transactions
      .filter((t: any) => t.type === 'expense')
      .reduce((s: number, t: any) => s + (Number(t.amount) || 0), 0)

    // Total ticket revenue from sales
    const ticketRevenue = sales.reduce((s: number, t: any) => s + (Number(t.total_amount) || 0), 0)
    const totalTicketsSold = sales.reduce((s: number, t: any) => s + (Number(t.quantity) || 0), 0)
    const capacity = eventRow?.capacity || 0

    return NextResponse.json({
      ticketSalesOverTime,
      salesByTier,
      revenueVsExpenses: {
        revenue: totalRevenue + ticketRevenue,
        expenses: totalExpenses,
        net: totalRevenue + ticketRevenue - totalExpenses,
      },
      totalTicketsSold,
      attendanceForecast: capacity ? Math.round((totalTicketsSold / capacity) * capacity) : totalTicketsSold,
      conversionRate: capacity > 0 ? Number((totalTicketsSold / capacity).toFixed(4)) : 0,
      range,
    })
  },
)
