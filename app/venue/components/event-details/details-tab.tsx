import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Event } from "@/app/types/events.types"
import { Separator } from "@/components/ui/separator"
import { Users, DollarSign, MapPin, Clock, Calendar, Tag, Info } from "lucide-react"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"

interface DetailsTabProps {
  event: Event
}

export default function DetailsTab({ event }: DetailsTabProps) {
  return (
    <div className="space-y-6">
      {/* Description */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-medium mb-2">Description</h3>
          <p className="text-muted-foreground">{event.description || "No description provided."}</p>
        </div>

        <div>
          <h3 className="text-lg font-medium mb-2">Notes</h3>
          <p className="text-muted-foreground">{event.notes || "No additional notes."}</p>
        </div>
      </div>

      <Separator />

      {/* Key Information Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Users className="h-4 w-4 mr-2 text-muted-foreground" />
              Capacity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{event.capacity || "N/A"}</p>
            <p className="text-xs text-muted-foreground">Maximum attendees</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <DollarSign className="h-4 w-4 mr-2 text-muted-foreground" />
              Ticket Price
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{event.ticketPrice ? `$${event.ticketPrice}` : "Free"}</p>
            <p className="text-xs text-muted-foreground">Per person</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
              Location
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-medium">{event.location || "Main Venue"}</p>
            <p className="text-xs text-muted-foreground">Event location</p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Additional Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Date</p>
                <p className="text-muted-foreground">
                  {event.date
                    ? formatSafeDate(event.date as any)
                    : "Date TBA"}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Time</p>
                <p className="text-muted-foreground">
                  {event.startTime} - {event.endTime}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Tag className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Event Type</p>
                <p className="text-muted-foreground">{event.type}</p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Info className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Status</p>
                <p className="text-muted-foreground">{event.status}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
