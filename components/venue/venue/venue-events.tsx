import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, Ticket } from "lucide-react"
import { formatSafeDate, formatSafeTime } from "@/lib/events/admin-event-normalization"

interface VenueEventsProps {
  venue: any
}

export function VenueEvents({ venue }: VenueEventsProps) {
  const formatDate = (dateString: string) => {
    return formatSafeDate(dateString)
  }

  const formatTime = (dateString: string) => {
    return formatSafeTime(dateString)
  }

  return (
    <>
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-purple-400" /> Upcoming Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {venue.upcomingEvents.map((event: any) => (
              <div key={event.id} className="border border-gray-800 rounded-lg p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-medium text-white">{event.title}</h3>
                    <p className="text-sm text-purple-400">{event.artist}</p>
                    <div className="flex items-center gap-2 text-sm text-gray-400 mt-1">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDate(event.date)}</span>
                      <Clock className="h-3 w-3 ml-2" />
                      <span>{formatTime(event.date)}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Badge>{event.status}</Badge>
                    <Button className="bg-purple-600 hover:bg-purple-700">
                      <Ticket className="h-4 w-4 mr-2" /> Get Tickets
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Button variant="outline" className="w-full mt-4">
            View All Events
          </Button>
        </CardContent>
      </Card>

      {venue.isOwner && (
        <Card className="bg-gray-900 border-gray-800 mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-400" /> Event Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Button className="w-full bg-purple-600 hover:bg-purple-700">
                <Calendar className="h-4 w-4 mr-2" /> Create New Event
              </Button>
              <Button className="w-full" variant="outline">
                <Calendar className="h-4 w-4 mr-2" /> Manage Existing Events
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  )
}
