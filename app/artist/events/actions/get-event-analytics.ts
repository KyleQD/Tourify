"use server"

import { createClient } from "@/lib/supabase/server"

interface EventAnalytics {
  event: {
    id: string
    name: string
    tickets_sold: number
    capacity: number
    revenue: number
    start_date: string
    end_date: string
    location: string
    ticket_types: {
      name: string
      price: number
      quantity: number
      sold: number
    }[]
  }
  salesData: {
    date: string
    tickets: number
    revenue: number
  }[]
}

export async function getEventAnalytics(userId: string, eventId: string): Promise<EventAnalytics> {
  const supabase = await createClient()
  
  // Fetch event details
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select(`
      id,
      name,
      tickets_sold,
      capacity,
      revenue,
      start_date,
      end_date,
      location,
      ticket_types
    `)
    .eq('id', eventId)
    .eq('created_by', userId)
    .single()
  
  if (eventError) {
    console.error('Error fetching event:', eventError)
    throw new Error('Failed to fetch event')
  }
  
  // Fetch sales data
  const { data: sales, error: salesError } = await supabase
    .from('ticket_sales')
    .select('created_at, amount')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true })
  
  if (salesError) {
    console.error('Error fetching sales:', salesError)
    throw new Error('Failed to fetch sales data')
  }
  
  // Process sales data into daily aggregates
  const salesByDate = sales.reduce((acc, sale) => {
    const date = new Date(sale.created_at).toISOString().split('T')[0]
    if (!acc[date]) {
      acc[date] = { tickets: 0, revenue: 0 }
    }
    acc[date].tickets += 1
    acc[date].revenue += sale.amount
    return acc
  }, {} as Record<string, { tickets: number; revenue: number }>)
  
  // Convert to array format for chart
  const salesData = Object.entries(salesByDate).map(([date, data]) => ({
    date,
    tickets: data.tickets,
    revenue: data.revenue
  }))
  
  return {
    event,
    salesData
  }
} 