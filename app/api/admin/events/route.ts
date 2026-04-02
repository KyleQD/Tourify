import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { mapV2StatusToUi, mapIncomingStatusToV2 } from '@/app/api/events/_lib/events-v2-admin'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ events: [] }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const statusFilter = searchParams.get('status')

    let query = supabase
      .from('events_v2')
      .select('id, title, status, start_at, end_at, venue_id, capacity, settings, created_at')
      .order('start_at', { ascending: false })
      .limit(100)

    if (statusFilter && statusFilter !== 'all') {
      const v2Status = mapIncomingStatusToV2(statusFilter)
      query = query.eq('status', v2Status)
    }

    const { data, error } = await query

    if (error) {
      if ((error as any)?.code === '42P01') return NextResponse.json({ events: [] })
      return NextResponse.json({ error: error.message, events: [] }, { status: 400 })
    }

    const rows = data || []
    const venueIds = [...new Set(rows.map(e => e.venue_id).filter(Boolean))]
    const eventIds = rows.map(e => e.id)

    const [venueResult, ticketResult, financeResult, tourLinkResult] = await Promise.allSettled([
      venueIds.length > 0
        ? supabase.from('venues_v2').select('id, name').in('id', venueIds)
        : Promise.resolve({ data: [] }),
      eventIds.length > 0
        ? supabase.from('ticket_sales').select('event_id, quantity, total_amount').in('event_id', eventIds).eq('payment_status', 'completed')
        : Promise.resolve({ data: [] }),
      eventIds.length > 0
        ? supabase.from('financial_transactions').select('event_id, type, amount').in('event_id', eventIds)
        : Promise.resolve({ data: [] }),
      eventIds.length > 0
        ? supabase.from('tour_events').select('event_id, tour_id, tours(id, name)').in('event_id', eventIds)
        : Promise.resolve({ data: [] }),
    ])

    const venueMap: Record<string, string> = {}
    if (venueResult.status === 'fulfilled') {
      const vd = (venueResult.value as any).data || []
      vd.forEach((v: any) => { venueMap[v.id] = v.name })
    }

    const ticketMap: Record<string, { sold: number; revenue: number }> = {}
    if (ticketResult.status === 'fulfilled') {
      const td = (ticketResult.value as any).data || []
      td.forEach((t: any) => {
        if (!ticketMap[t.event_id]) ticketMap[t.event_id] = { sold: 0, revenue: 0 }
        ticketMap[t.event_id].sold += Number(t.quantity) || 0
        ticketMap[t.event_id].revenue += Number(t.total_amount) || 0
      })
    }

    const expenseMap: Record<string, number> = {}
    if (financeResult.status === 'fulfilled') {
      const fd = (financeResult.value as any).data || []
      fd.forEach((f: any) => {
        if (f.type === 'expense') {
          expenseMap[f.event_id] = (expenseMap[f.event_id] || 0) + (Number(f.amount) || 0)
        }
      })
    }

    const tourMap: Record<string, { id: string; name: string }> = {}
    if (tourLinkResult.status === 'fulfilled') {
      const tld = (tourLinkResult.value as any).data || []
      tld.forEach((tl: any) => {
        if (tl.tours) tourMap[tl.event_id] = { id: tl.tours.id, name: tl.tours.name }
      })
    }

    const events = rows.map(e => {
      const settings = (e.settings && typeof e.settings === 'object' ? e.settings : {}) as Record<string, unknown>
      const tix = ticketMap[e.id] || { sold: 0, revenue: 0 }
      return {
        id: e.id,
        name: e.title,
        status: mapV2StatusToUi(e.status),
        event_date: e.start_at,
        end_date: e.end_at,
        venue_id: e.venue_id,
        venue_name: venueMap[e.venue_id] || (settings.venue_label as string) || null,
        capacity: e.capacity || 0,
        tickets_sold: tix.sold,
        actual_revenue: tix.revenue,
        expenses: expenseMap[e.id] || 0,
        tour: tourMap[e.id] || null,
        created_at: e.created_at,
      }
    })

    return NextResponse.json({ events })
  } catch (e: any) {
    return NextResponse.json({ events: [], error: e?.message || 'Unexpected error' }, { status: 500 })
  }
}