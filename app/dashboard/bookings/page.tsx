"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog"
import { Music, Calendar, MapPin, Clock, DollarSign, CheckCircle, XCircle, Eye, MessageSquare } from "lucide-react"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"

interface BookingRequest {
  id: string
  booking_details: {
    performanceType: string
    description: string
    performanceDate: string
    soundcheckTime?: string
    performanceTime?: string
    duration?: string
    venue: string
    location: string
    compensation: string
    requirements?: string
    additionalNotes?: string
  }
  status: "pending" | "accepted" | "declined"
  request_type: string
  response_message?: string
  created_at: string
  event_id?: string
  tour_id?: string
}

export default function BookingsPage() {
  const [bookings, setBookings] = React.useState<BookingRequest[]>([])
  const [loading, setLoading] = React.useState(true)
  const [selectedBooking, setSelectedBooking] = React.useState<BookingRequest | null>(null)
  const [responseMessage, setResponseMessage] = React.useState("")
  const [responding, setResponding] = React.useState(false)
  const { toast } = useToast()
  const router = useRouter()

  React.useEffect(() => {
    fetchBookingRequests()
  }, [])

  async function fetchBookingRequests() {
    try {
      // TODO: Replace with actual user ID from auth context
      const userId = "user-id-here" // This should come from auth
      const response = await fetch(`/api/booking-requests?artistId=${userId}`)
      if (response.ok) {
        const data = await response.json()
        setBookings(data.data || [])
      }
    } catch (error) {
      console.error("Error fetching booking requests:", error)
      toast({
        title: "Error",
        description: "Failed to load booking requests",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  async function respondToBooking(bookingId: string, status: "accepted" | "declined") {
    setResponding(true)
    try {
      const response = await fetch("/api/booking-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          status,
          responseMessage
        })
      })

      if (response.ok) {
        toast({
          title: "Response sent",
          description: `Booking request ${status} successfully`
        })
        fetchBookingRequests()
        setSelectedBooking(null)
        setResponseMessage("")
      } else {
        throw new Error("Failed to respond to booking")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send response. Please try again.",
        variant: "destructive"
      })
    } finally {
      setResponding(false)
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "pending":
        return <Badge variant="outline">Pending</Badge>
      case "accepted":
        return <Badge variant="default" className="bg-green-600">Accepted</Badge>
      case "declined":
        return <Badge variant="destructive">Declined</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p>Loading booking requests...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Music className="h-8 w-8" />
          Performance Bookings
        </h1>
        <p className="text-muted-foreground">
          Manage your performance booking requests and opportunities
        </p>
      </div>

      {bookings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Music className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No booking requests</h3>
            <p className="text-muted-foreground text-center">
              You don't have any performance booking requests yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {bookings.map(booking => (
            <Card key={booking.id} className="transition-shadow hover:shadow-md">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Music className="h-5 w-5" />
                      {booking.booking_details.performanceType}
                    </CardTitle>
                    <p className="text-muted-foreground mt-1">
                      {booking.booking_details.venue} • {booking.booking_details.location}
                    </p>
                  </div>
                  {getStatusBadge(booking.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {formatSafeDate(booking.booking_details.performanceDate)}
                    </span>
                  </div>
                  {booking.booking_details.performanceTime && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{booking.booking_details.performanceTime}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{booking.booking_details.compensation}</span>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {booking.booking_details.description}
                </p>

                <div className="flex gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setSelectedBooking(booking)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      {selectedBooking && (
                        <>
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              <Music className="h-5 w-5" />
                              {selectedBooking.booking_details.performanceType}
                            </DialogTitle>
                            <DialogDescription>
                              {selectedBooking.booking_details.venue} • {selectedBooking.booking_details.location}
                            </DialogDescription>
                          </DialogHeader>
                          
                          <div className="space-y-6">
                            {/* Performance Details */}
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label className="text-sm font-medium">Performance Date</Label>
                                <p className="text-sm">
                                  {formatSafeDate(selectedBooking.booking_details.performanceDate)}
                                </p>
                              </div>
                              {selectedBooking.booking_details.performanceTime && (
                                <div>
                                  <Label className="text-sm font-medium">Performance Time</Label>
                                  <p className="text-sm">{selectedBooking.booking_details.performanceTime}</p>
                                </div>
                              )}
                              {selectedBooking.booking_details.soundcheckTime && (
                                <div>
                                  <Label className="text-sm font-medium">Soundcheck Time</Label>
                                  <p className="text-sm">{selectedBooking.booking_details.soundcheckTime}</p>
                                </div>
                              )}
                              {selectedBooking.booking_details.duration && (
                                <div>
                                  <Label className="text-sm font-medium">Duration</Label>
                                  <p className="text-sm">{selectedBooking.booking_details.duration}</p>
                                </div>
                              )}
                              <div>
                                <Label className="text-sm font-medium">Compensation</Label>
                                <p className="text-sm font-semibold text-green-600">
                                  {selectedBooking.booking_details.compensation}
                                </p>
                              </div>
                              <div>
                                <Label className="text-sm font-medium">Status</Label>
                                <div className="mt-1">
                                  {getStatusBadge(selectedBooking.status)}
                                </div>
                              </div>
                            </div>

                            <div>
                              <Label className="text-sm font-medium">Description</Label>
                              <p className="text-sm mt-1">{selectedBooking.booking_details.description}</p>
                            </div>

                            {selectedBooking.booking_details.requirements && (
                              <div>
                                <Label className="text-sm font-medium">Technical Requirements</Label>
                                <p className="text-sm mt-1">{selectedBooking.booking_details.requirements}</p>
                              </div>
                            )}

                            {selectedBooking.booking_details.additionalNotes && (
                              <div>
                                <Label className="text-sm font-medium">Additional Notes</Label>
                                <p className="text-sm mt-1">{selectedBooking.booking_details.additionalNotes}</p>
                              </div>
                            )}

                            {selectedBooking.status === "pending" && (
                              <div className="space-y-4">
                                <div>
                                  <Label htmlFor="responseMessage">Response Message (Optional)</Label>
                                  <Textarea
                                    id="responseMessage"
                                    placeholder="Add a message with your response..."
                                    value={responseMessage}
                                    onChange={e => setResponseMessage(e.target.value)}
                                    className="mt-1"
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    onClick={() => respondToBooking(selectedBooking.id, "accepted")}
                                    disabled={responding}
                                    className="bg-green-600 hover:bg-green-700"
                                  >
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                    Accept Booking
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    onClick={() => respondToBooking(selectedBooking.id, "declined")}
                                    disabled={responding}
                                  >
                                    <XCircle className="mr-2 h-4 w-4" />
                                    Decline Booking
                                  </Button>
                                </div>
                              </div>
                            )}

                            {selectedBooking.response_message && (
                              <div>
                                <Label className="text-sm font-medium">Your Response</Label>
                                <p className="text-sm mt-1 p-3 bg-muted rounded-md">
                                  {selectedBooking.response_message}
                                </p>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </DialogContent>
                  </Dialog>

                  {booking.status === "pending" && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedBooking(booking)
                          respondToBooking(booking.id, "accepted")
                        }}
                        disabled={responding}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Accept
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setSelectedBooking(booking)
                          respondToBooking(booking.id, "declined")
                        }}
                        disabled={responding}
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Decline
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
} 