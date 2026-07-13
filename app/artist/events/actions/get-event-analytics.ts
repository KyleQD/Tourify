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
    ticket_url: string | null
    promoted_event_v2_id: string | null
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

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select(`
      id,
      name,
      title,
      tickets_sold,
      capacity,
      revenue,
      event_date,
      start_time,
      end_time,
      venue_name,
      city,
      ticket_url,
      ticket_price_min,
      ticket_price_max,
      promoted_event_v2_id
    `)
    .eq("id", eventId)
    .eq("artist_id", userId)
    .single()

  if (eventError) {
    console.error("Error fetching event:", eventError)
    throw new Error("Failed to fetch event")
  }

  let ticketTypes: EventAnalytics["event"]["ticket_types"] = []
  let salesData: EventAnalytics["salesData"] = []
  let ticketsSold = Number(event.tickets_sold || 0)
  let revenue = Number(event.revenue || 0)

  if (event.promoted_event_v2_id) {
    const [{ data: types }, { data: sales }] = await Promise.all([
      supabase
        .from("ticket_types")
        .select("name, price, quantity_available, quantity_sold")
        .eq("event_id", event.promoted_event_v2_id),
      supabase
        .from("ticket_sales")
        .select("created_at, total_amount")
        .eq("event_id", event.promoted_event_v2_id)
        .order("created_at", { ascending: true }),
    ])

    ticketTypes = (types || []).map((type: any) => ({
      name: type.name,
      price: Number(type.price || 0),
      quantity: Number(type.quantity_available || 0),
      sold: Number(type.quantity_sold || 0),
    }))

    ticketsSold = ticketTypes.reduce((sum, type) => sum + type.sold, 0)
    revenue = (sales || []).reduce((sum: number, sale: any) => sum + Number(sale.total_amount || 0), 0)

    const salesByDate = (sales || []).reduce((acc: Record<string, { tickets: number; revenue: number }>, sale: any) => {
      const date = new Date(sale.created_at).toISOString().split("T")[0]
      if (!acc[date]) acc[date] = { tickets: 0, revenue: 0 }
      acc[date].tickets += 1
      acc[date].revenue += Number(sale.total_amount || 0)
      return acc
    }, {})

    salesData = Object.entries(salesByDate).map(([date, data]) => ({
      date,
      tickets: data.tickets,
      revenue: data.revenue,
    }))
  } else if (event.ticket_price_min != null || event.ticket_url) {
    ticketTypes = [
      {
        name: "General admission (external)",
        price: Number(event.ticket_price_min || event.ticket_price_max || 0),
        quantity: Number(event.capacity || 0),
        sold: ticketsSold,
      },
    ]
  }

  return {
    event: {
      id: event.id,
      name: event.name || event.title || "Event",
      tickets_sold: ticketsSold,
      capacity: Number(event.capacity || 0),
      revenue,
      start_date: event.event_date || "",
      end_date: event.event_date || "",
      location: [event.venue_name, event.city].filter(Boolean).join(", "),
      ticket_url: event.ticket_url || null,
      promoted_event_v2_id: event.promoted_event_v2_id || null,
      ticket_types: ticketTypes,
    },
    salesData,
  }
}
