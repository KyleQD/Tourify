import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronRight } from "lucide-react"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"

interface VenueBookingRequestsProps {
  venue: any
}

export function VenueBookingRequests({ venue }: VenueBookingRequestsProps) {
  // Safely handle undefined or empty booking requests
  const bookingRequests = venue?.bookingRequests || []
  const hasRequests = bookingRequests.length > 0

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Recent Booking Requests</CardTitle>
          <img src="/images/tourify-logo-white.png" alt="Tourify" className="h-5" />
        </div>
      </CardHeader>
      <CardContent>
        {hasRequests ? (
          <div className="space-y-3">
            {bookingRequests.slice(0, 3).map((request: any) => (
              <div key={request.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                <div>
                  <h3 className="font-medium text-white">{request.eventName}</h3>
                  <p className="text-sm text-gray-400">
                    {formatSafeDate(request.date)} • {request.attendees} attendees
                  </p>
                </div>
                <Badge variant="outline" className="bg-yellow-900/20 text-yellow-400 border-yellow-800">
                  {request.status === 'pending' ? 'Pending' : request.status}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
              <ChevronRight className="h-6 w-6 text-gray-500" />
            </div>
            <h3 className="text-sm font-medium text-gray-300 mb-1">No booking requests</h3>
            <p className="text-xs text-gray-500">New booking requests will appear here</p>
          </div>
        )}

        <Button variant="outline" className="w-full mt-4 text-purple-400 border-purple-800/50 hover:bg-purple-900/20">
          View All Requests <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </CardContent>
    </Card>
  )
}
