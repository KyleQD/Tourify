import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { StatusItem } from "./StatusItem"

interface ActiveEvent {
  id: string
  name: string
  ticketSalesPercentage: number
  startDate: string
}

async function ActiveEventsList() {
  let events: ActiveEvent[] = []

  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('events_v2')
      .select('id, title, start_at, capacity')
      .in('status', ['confirmed', 'published', 'active'])
      .gte('start_at', new Date().toISOString())
      .order('start_at', { ascending: true })
      .limit(5)

    if (data) {
      events = data.map((ev: any) => ({
        id: ev.id,
        name: ev.title || 'Untitled Event',
        ticketSalesPercentage: 0,
        startDate: ev.start_at ? new Date(ev.start_at).toISOString().slice(0, 10) : '',
      }))
    }
  } catch {
    // Silently fail — dashboard widget should not block render
  }

  if (events.length === 0)
    return <p className="text-xs text-slate-500">No upcoming events found.</p>

  const colors = ["purple", "pink", "blue", "green", "yellow"]

  return (
    <div className="space-y-3">
      {events.map((event, index) => (
        <Link
          key={event.id}
          href={`/admin/dashboard/events/${event.id}`}
          className="block hover:bg-slate-800/60 p-2 rounded-md transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-900"
        >
          <StatusItem
            label={event.name}
            value={Math.round(event.ticketSalesPercentage)}
            color={colors[index % colors.length]}
          />
        </Link>
      ))}
    </div>
  )
}

export default ActiveEventsList
