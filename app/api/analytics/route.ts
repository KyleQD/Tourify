import { NextRequest, NextResponse } from 'next/server'

// Use Supabase as the source of truth
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const period = parseInt(searchParams.get('period') || '7')
    const accountId = searchParams.get('accountId') || ''
    const scope = searchParams.get('scope') || 'dashboard'

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - period)

    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    // Legacy events (organizer scoped)
    let legacyEventsQuery = supabase
      .from('events')
      .select('id, title, start_date, capacity, organizer_id')
      .gte('start_date', startDate.toISOString())
      .order('start_date', { ascending: true })

    if (accountId) legacyEventsQuery = legacyEventsQuery.eq('organizer_id', accountId)

    // Canonical events_v2 (creator scoped)
    let eventsV2Query = supabase
      .from('events_v2')
      .select('id, title, start_at, capacity, created_by')
      .gte('start_at', startDate.toISOString())
      .order('start_at', { ascending: true })

    if (accountId) eventsV2Query = eventsV2Query.eq('created_by', accountId)

    const [legacyEventsResult, eventsV2Result] = await Promise.all([
      legacyEventsQuery,
      eventsV2Query,
    ])

    if (legacyEventsResult.error || eventsV2Result.error) {
      throw (legacyEventsResult.error || eventsV2Result.error)
    }

    const legacyEvents = legacyEventsResult.data || []
    const eventsV2 = (eventsV2Result.data || []).map((event: any) => ({
      id: event.id,
      title: event.title,
      start_date: event.start_at,
      capacity: event.capacity,
    }))
    const events = [...legacyEvents, ...eventsV2]

    const eventIds = events.map((event: any) => event.id)

    // Try bookings/sales if available; fall back gracefully
    let totalBookings = 0
    let statusDistribution: Record<string, number> = {}
    let revenueTrend: Array<{ date: string; revenue: number }> = []
    let totalRevenue = 0
    let averageOccupancy = 0

    try {
      let bookingsQuery = supabase
        .from('bookings')
        .select('id, event_id, status, amount, created_at')
        .gte('created_at', startDate.toISOString())

      if (accountId) bookingsQuery = bookingsQuery.eq('organizer_id', accountId)

      const bookingsResult = await bookingsQuery
      const bookings = bookingsResult.error ? [] : (bookingsResult.data || [])

      const ticketSalesResult = await supabase
        .from('ticket_sales')
        .select('event_id, quantity, total_amount, payment_status, created_at')
        .gte('created_at', startDate.toISOString())
      const ticketSales = ticketSalesResult.error ? [] : (ticketSalesResult.data || [])
      const filteredTicketSales = eventIds.length > 0
        ? ticketSales.filter((sale: any) => eventIds.includes(sale.event_id))
        : ticketSales

      totalBookings =
        (bookings?.length || 0) +
        filteredTicketSales.reduce((sum: number, sale: any) => sum + (Number(sale.quantity) || 0), 0)
      totalRevenue =
        (bookings || []).reduce((sum, b: any) => sum + (b.amount || 0), 0) +
        filteredTicketSales.reduce((sum: number, sale: any) => sum + (Number(sale.total_amount) || 0), 0)

      // Trend by day
      const trendMap: Record<string, number> = (bookings || []).reduce((acc: Record<string, number>, b: any) => {
        const key = new Date(b.created_at).toISOString().split('T')[0]
        acc[key] = (acc[key] || 0) + (b.amount || 0)
        return acc
      }, {})
      for (const sale of filteredTicketSales) {
        const key = new Date(sale.created_at).toISOString().split('T')[0]
        trendMap[key] = (trendMap[key] || 0) + (Number(sale.total_amount) || 0)
      }
      revenueTrend = Object.entries(trendMap).map(([date, revenue]) => ({ date, revenue: revenue as number }))

      // Status distribution
      statusDistribution = (bookings || []).reduce((acc: Record<string, number>, b: any) => {
        const key = String(b.status || 'unknown')
        acc[key] = (acc[key] || 0) + 1
        return acc
      }, {})
      for (const sale of filteredTicketSales) {
        const key = String(sale.payment_status || 'unknown')
        statusDistribution[key] = (statusDistribution[key] || 0) + (Number(sale.quantity) || 1)
      }
    } catch (_) {
      // Bookings not available; keep defaults
      totalBookings = 0
      totalRevenue = 0
      revenueTrend = []
      statusDistribution = {}
    }

    // Average occupancy if capacity exists and bookings can be mapped by event
    try {
      // If we had bookings per event, compute occupancy; otherwise default 0
      const totalCapacity = (events || []).reduce((sum: number, e: any) => sum + (e.capacity || 0), 0)
      averageOccupancy = totalCapacity > 0 ? Math.min(100, Math.round((totalBookings / totalCapacity) * 100)) : 0
    } catch (_) {
      averageOccupancy = 0
    }

    // Popular events: if bookings table exists, count by event
    let popularEvents: Array<{ id: string; title: string; date: string; capacity: number; bookings: number; occupancyRate: number }> = []
    try {
      const { data: bookings } = await supabase
        .from('bookings')
        .select('event_id')
        .gte('created_at', startDate.toISOString())

      const bookingsCountByEvent = (bookings || []).reduce((acc: Record<string, number>, b: any) => {
        acc[b.event_id] = (acc[b.event_id] || 0) + 1
        return acc
      }, {})

      const { data: ticketSales } = await supabase
        .from('ticket_sales')
        .select('event_id, quantity')
        .gte('created_at', startDate.toISOString())
      for (const sale of ticketSales || []) {
        bookingsCountByEvent[sale.event_id] = (bookingsCountByEvent[sale.event_id] || 0) + (Number(sale.quantity) || 0)
      }

      popularEvents = (events || [])
        .map((e: any) => {
          const bookingsCount = bookingsCountByEvent[e.id] || 0
          const capacity = e.capacity || 0
          const occupancyRate = capacity > 0 ? (bookingsCount / capacity) * 100 : 0
          return {
            id: e.id,
            title: e.title,
            date: e.start_date,
            capacity,
            bookings: bookingsCount,
            occupancyRate
          }
        })
        .sort((a, b) => b.bookings - a.bookings)
        .slice(0, 5)
    } catch (_) {
      popularEvents = []
    }

    return NextResponse.json({
      totalRevenue,
      totalEvents: events?.length || 0,
      totalBookings,
      averageOccupancy,
      revenueTrend,
      statusDistribution,
      popularEvents
    })
  } catch (error) {
    console.error('Analytics API Error:', error)
    return NextResponse.json({ error: 'Failed to fetch analytics data' }, { status: 500 })
  }
}