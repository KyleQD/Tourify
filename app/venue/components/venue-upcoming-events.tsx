import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronRight } from "lucide-react"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"

interface VenueUpcomingEventsProps {
  venue: any
}

export function VenueUpcomingEvents({ venue }: VenueUpcomingEventsProps) {
  // Safely handle upcoming events with fallback data
  const upcomingEvents = venue?.upcomingEvents || []
  const hasEvents = upcomingEvents.length > 0

  // Mock data when no events exist
  const mockEvents = [
    {
      id: "event-1",
      title: "Summer Jam Festival",
      date: "2025-06-15T19:00:00",
      ticketsSold: 450,
      capacity: 850,
      status: "On Sale"
    },
    {
      id: "event-2", 
      title: "Midnight Echo",
      date: "2025-06-22T21:00:00",
      ticketsSold: 325,
      capacity: 850,
      status: "On Sale"
    },
    {
      id: "event-3",
      title: "Jazz Night",
      date: "2025-06-28T20:00:00", 
      ticketsSold: 175,
      capacity: 850,
      status: "On Sale"
    }
  ]

  const eventsToShow = hasEvents ? upcomingEvents.slice(0, 3) : mockEvents

  function resolveEventDate(event: any) {
    return (
      event?.date ||
      event?.event_date ||
      event?.start_at ||
      event?.start_date ||
      null
    )
  }

  function formatEventDate(event: any) {
    const value = resolveEventDate(event)
    return formatSafeDate(value)
  }

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Upcoming Events</CardTitle>
          <img src="/images/tourify-logo-white.png" alt="Tourify" className="h-5" />
        </div>
      </CardHeader>
      <CardContent>
        {eventsToShow.length > 0 ? (
          <div className="space-y-3">
            {eventsToShow.map((event: any) => (
              <div key={event.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors cursor-pointer">
                <div>
                  <h3 className="font-medium text-white">{event.title || event.name || 'Event'}</h3>
                  <p className="text-sm text-gray-400">
                    {formatEventDate(event)} • {event.ticketsSold || event.tickets_sold || 0}/{event.capacity || venue?.capacity || 0} tickets
                  </p>
                </div>
                <Badge variant="outline" className="bg-green-900/20 text-green-400 border-green-800">
                  {event.status || 'Scheduled'}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
              <ChevronRight className="h-6 w-6 text-gray-500" />
            </div>
            <h3 className="text-sm font-medium text-gray-300 mb-1">No upcoming events</h3>
            <p className="text-xs text-gray-500">Create your first event to get started</p>
          </div>
        )}

        <Button variant="outline" className="w-full mt-4 text-purple-400 border-purple-800/50 hover:bg-purple-900/20">
          View Calendar <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </CardContent>
    </Card>
  )
}
