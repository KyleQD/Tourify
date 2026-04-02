import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronRight } from "lucide-react"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"

interface VenueBookingRequestsProps {
  venue: any
}

export function VenueBookingRequests({ venue }: VenueBookingRequestsProps) {
  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Recent Booking Requests</CardTitle>
          <img src="/images/tourify-logo-white.png" alt="Tourify" className="h-5" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {venue.bookingRequests.slice(0, 3).map((request: any) => (
            <div key={request.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
              <div>
                <h3 className="font-medium text-white">{request.eventName}</h3>
                <p className="text-sm text-gray-400">
                  {formatSafeDate(request.date)} • {request.attendees} attendees
                </p>
              </div>
              <Badge variant="outline" className="bg-yellow-900/20 text-yellow-400 border-yellow-800">
                Pending
              </Badge>
            </div>
          ))}
        </div>

        <Button variant="outline" className="w-full mt-4 text-purple-400 border-purple-800/50 hover:bg-purple-900/20">
          View All Requests <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </CardContent>
    </Card>
  )
}
