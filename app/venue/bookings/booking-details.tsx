import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { format } from "date-fns"
import { Calendar, Clock, Users, MapPin, Tag, Mail, Phone, FileText, User } from "lucide-react"
import { formatSafeDateTime } from "@/lib/events/admin-event-normalization"

interface BookingDetailsProps {
  booking: any
}

export function BookingDetails({ booking }: BookingDetailsProps) {
  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return format(date, "MMMM d, yyyy")
  }

  return (
    <div className="space-y-6 py-2">
      {/* Header with status */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold">{booking.name}</h2>
          <p className="text-sm text-muted-foreground">Booking ID: {booking.id}</p>
        </div>
        <Badge
          variant={
            booking.status === "confirmed" ? "default" : booking.status === "pending" ? "outline" : "destructive"
          }
          className="capitalize text-sm"
        >
          {booking.status}
        </Badge>
      </div>

      <Separator />

      {/* Main details grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Event Details</h3>

          <div className="space-y-2">
            <div className="flex items-start">
              <Calendar className="h-5 w-5 mr-2 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Date</p>
                <p className="text-sm text-muted-foreground">{formatDate(booking.date)}</p>
              </div>
            </div>

            <div className="flex items-start">
              <Clock className="h-5 w-5 mr-2 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Time</p>
                <p className="text-sm text-muted-foreground">
                  {booking.startTime} - {booking.endTime}
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <MapPin className="h-5 w-5 mr-2 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Venue</p>
                <p className="text-sm text-muted-foreground">{booking.venue}</p>
              </div>
            </div>

            <div className="flex items-start">
              <Users className="h-5 w-5 mr-2 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Attendees</p>
                <p className="text-sm text-muted-foreground">{booking.attendees} people</p>
              </div>
            </div>

            <div className="flex items-start">
              <Tag className="h-5 w-5 mr-2 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Event Type</p>
                <p className="text-sm text-muted-foreground">{booking.type}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Client Information</h3>

          <div className="space-y-2">
            <div className="flex items-start">
              <User className="h-5 w-5 mr-2 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Client</p>
                <p className="text-sm text-muted-foreground">{booking.client}</p>
              </div>
            </div>

            <div className="flex items-start">
              <User className="h-5 w-5 mr-2 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Contact Person</p>
                <p className="text-sm text-muted-foreground">{booking.contactPerson}</p>
              </div>
            </div>

            <div className="flex items-start">
              <Mail className="h-5 w-5 mr-2 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Email</p>
                <p className="text-sm text-muted-foreground">{booking.contactEmail}</p>
              </div>
            </div>

            <div className="flex items-start">
              <Phone className="h-5 w-5 mr-2 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Phone</p>
                <p className="text-sm text-muted-foreground">{booking.contactPhone}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Financial details */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Financial Details</h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Total Amount</p>
            <p className="text-2xl font-bold">${booking.totalAmount}</p>
          </div>

          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Deposit</p>
            <p className="text-2xl font-bold">${booking.deposit}</p>
            <p className="text-xs text-muted-foreground mt-1">{booking.depositPaid ? "Paid" : "Not paid"}</p>
          </div>

          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Balance Due</p>
            <p className="text-2xl font-bold">${booking.totalAmount - booking.deposit}</p>
          </div>
        </div>
      </div>

      <Separator />

      {/* Notes */}
      <div className="space-y-2">
        <div className="flex items-start">
          <FileText className="h-5 w-5 mr-2 text-muted-foreground mt-0.5" />
          <div>
            <p className="font-medium">Notes</p>
            <p className="text-sm text-muted-foreground">{booking.notes}</p>
          </div>
        </div>
      </div>

      {/* Booking history */}
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Booking History</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <p>Created</p>
            <p className="text-muted-foreground">{formatSafeDateTime(booking.createdAt)}</p>
          </div>
          <div className="flex justify-between">
            <p>Last Updated</p>
            <p className="text-muted-foreground">{formatSafeDateTime(booking.updatedAt)}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
