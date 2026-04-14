import { supabase } from "@/lib/supabase"

export interface EventAnalytics {
  total_views: number
  unique_visitors: number
  conversion_rate: number
  average_ticket_price: number
  total_revenue: number
  daily_metrics: Array<{ date: string; views: number; sales: number }>
  ticket_sales: Array<{ type: string; sold: number }>
}

export async function fetchEventAnalytics({ eventId }: { eventId: string }): Promise<{ data: EventAnalytics | null; error?: string }> {
  if (!eventId) return { data: null, error: 'No eventId provided' }

  try {
    const [eventRes, salesRes] = await Promise.all([
      supabase
        .from('events')
        .select('id, capacity, expected_attendance, ticket_price_min, ticket_price_max')
        .eq('id', eventId)
        .single(),
      supabase
        .from('ticket_sales')
        .select('id, ticket_type, quantity, unit_price, total_amount, created_at')
        .eq('event_id', eventId),
    ])

    const event = eventRes.data
    const sales = salesRes.data ?? []

    const totalSold = sales.reduce((sum, s) => sum + (s.quantity ?? 1), 0)
    const totalRevenue = sales.reduce((sum, s) => sum + (s.total_amount ?? (s.unit_price ?? 0) * (s.quantity ?? 1)), 0)
    const avgPrice = totalSold > 0 ? totalRevenue / totalSold : 0
    const capacity = event?.capacity ?? event?.expected_attendance ?? 0
    const conversionRate = capacity > 0 ? (totalSold / capacity) * 100 : 0

    const dailyMap = new Map<string, { views: number; sales: number }>()
    for (const s of sales) {
      const day = s.created_at ? s.created_at.slice(0, 10) : 'unknown'
      const existing = dailyMap.get(day) ?? { views: 0, sales: 0 }
      existing.sales += s.quantity ?? 1
      dailyMap.set(day, existing)
    }
    const daily_metrics = Array.from(dailyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, m]) => ({ date, views: m.views, sales: m.sales }))

    const typeMap = new Map<string, number>()
    for (const s of sales) {
      const type = s.ticket_type ?? 'General Admission'
      typeMap.set(type, (typeMap.get(type) ?? 0) + (s.quantity ?? 1))
    }
    const ticket_sales = Array.from(typeMap.entries()).map(([type, sold]) => ({ type, sold }))

    return {
      data: {
        total_views: 0,
        unique_visitors: 0,
        conversion_rate: Math.round(conversionRate * 10) / 10,
        average_ticket_price: Math.round(avgPrice * 100) / 100,
        total_revenue: Math.round(totalRevenue * 100) / 100,
        daily_metrics,
        ticket_sales,
      },
    }
  } catch (err) {
    console.error('Error fetching event analytics:', err)
    return {
      data: {
        total_views: 0,
        unique_visitors: 0,
        conversion_rate: 0,
        average_ticket_price: 0,
        total_revenue: 0,
        daily_metrics: [],
        ticket_sales: [],
      },
    }
  }
}
