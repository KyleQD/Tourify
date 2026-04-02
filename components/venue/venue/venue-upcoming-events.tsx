import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronRight } from "lucide-react"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"

interface VenueUpcomingEventsProps {
  venue: any
}

export function VenueUpcomingEvents({ venue }: VenueUpcomingEventsProps) {
  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Upcoming Events</CardTitle>
          <img src="/images/tourify-logo-white.png" alt="Tourify" className="h-5" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {venue.upcomingEvents.map((event: any) => (
            <div key={event.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
              <div>
                <h3 className="font-medium text-white">{event.title}</h3>
                <p className="text-sm text-gray-400">
                  {formatSafeDate(event.date)} • {event.ticketsSold}/{event.capacity} tickets
                </p>
              </div>
              <Badge>{event.status}</Badge>
            </div>
          ))}
        </div>

        <Button variant="outline" className="w-full mt-4 text-purple-400 border-purple-800/50 hover:bg-purple-900/20">
          View Calendar <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </CardContent>
    </Card>
  )
}
