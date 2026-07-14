"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Calendar, CheckCircle, Clock, DollarSign, Eye, Music, Plus, XCircle } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
  status: "pending" | "accepted" | "declined" | "approved" | "rejected"
  request_type: string
  token?: string
  response_message?: string
  created_at: string
  event_id?: string
  tour_id?: string
}

function getUnifiedStatus(status: BookingRequest["status"]): "pending" | "accepted" | "declined" {
  if (status === "approved" || status === "accepted") return "accepted"
  if (status === "rejected" || status === "declined") return "declined"
  return "pending"
}

export default function ArtistBookingsPage() {
  const router = useRouter()
  const [bookings, setBookings] = React.useState<BookingRequest[]>([])
  const [loading, setLoading] = React.useState(true)
  const [selectedBooking, setSelectedBooking] = React.useState<BookingRequest | null>(null)
  const [responseMessage, setResponseMessage] = React.useState("")
  const [responding, setResponding] = React.useState(false)
  const [loadError, setLoadError] = React.useState<string | null>(null)

  React.useEffect(() => {
    void fetchBookingRequests()
  }, [])

  async function fetchBookingRequests() {
    try {
      setLoadError(null)
      const response = await fetch("/api/booking-requests", { credentials: "include", cache: "no-store" })
      if (!response.ok) throw new Error("Failed to load booking requests")
      const data = await response.json()
      setBookings(data.data || [])
    } catch (error) {
      console.error("Error fetching booking requests:", error)
      setLoadError("Booking requests are temporarily unavailable.")
      toast.error("Failed to load booking requests")
    } finally {
      setLoading(false)
    }
  }

  async function respondToBooking(bookingId: string, status: "accepted" | "declined") {
    setResponding(true)
    try {
      const booking = bookings.find((item) => item.id === bookingId)
      if (!booking?.token) {
        toast.error("This booking is missing a secure token and cannot be updated.")
        return
      }

      const response = await fetch("/api/booking-requests", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: booking.token,
          status,
          responseMessage,
        }),
      })

      if (!response.ok) throw new Error("Failed to respond to booking")

      toast.success(`Booking request ${status}`)
      await fetchBookingRequests()
      setSelectedBooking(null)
      setResponseMessage("")
    } catch (error) {
      toast.error("Failed to send response. Please try again.")
    } finally {
      setResponding(false)
    }
  }

  function createEventFromBooking(booking: BookingRequest) {
    const payload = encodeURIComponent(
      JSON.stringify({
        eventName: booking.booking_details.performanceType,
        eventDate: booking.booking_details.performanceDate,
        booking_details: booking.booking_details,
      }),
    )
    router.push(`/artist/events/create?fromBooking=${payload}`)
  }

  function getStatusBadge(status: BookingRequest["status"]) {
    const unified = getUnifiedStatus(status)
    if (unified === "accepted") return <Badge className="bg-emerald-600">Accepted</Badge>
    if (unified === "declined") return <Badge variant="destructive">Declined</Badge>
    return <Badge variant="outline" className="border-amber-500/40 text-amber-200">Pending</Badge>
  }

  const pendingCount = bookings.filter((booking) => getUnifiedStatus(booking.status) === "pending").length

  return (
    <div className="space-y-6 p-1">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Bookings</h1>
          <p className="text-slate-400">Review hire requests and turn accepted bookings into events.</p>
        </div>
        {pendingCount > 0 ? (
          <Badge variant="outline" className="border-amber-500/40 text-amber-200">
            {pendingCount} pending
          </Badge>
        ) : null}
      </div>

      {loading ? (
        <Card className="border-slate-800 bg-slate-950/50">
          <CardContent className="flex min-h-[220px] items-center justify-center text-slate-300">
            Loading booking requests…
          </CardContent>
        </Card>
      ) : loadError ? (
        <Card className="border-amber-500/20 bg-amber-500/10">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Music className="mb-4 h-12 w-12 text-amber-200" />
            <h3 className="mb-2 text-lg font-medium text-white">Booking requests unavailable</h3>
            <p className="text-center text-amber-100">{loadError}</p>
          </CardContent>
        </Card>
      ) : bookings.length === 0 ? (
        <Card className="border-slate-800 bg-slate-950/50">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Music className="mb-4 h-12 w-12 text-slate-500" />
            <h3 className="mb-2 text-lg font-medium text-white">No booking requests</h3>
            <p className="text-center text-slate-400">
              When someone books you from your public profile, requests show up here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {bookings.map((booking) => (
            <Card key={booking.id} className="border-slate-800 bg-slate-950/50">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-white">
                      <Music className="h-5 w-5 text-cyan-300" />
                      {booking.booking_details.performanceType}
                    </CardTitle>
                    <p className="mt-1 text-sm text-slate-400">
                      {booking.booking_details.venue} · {booking.booking_details.location}
                    </p>
                  </div>
                  {getStatusBadge(booking.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <Calendar className="h-4 w-4 text-slate-500" />
                    {formatSafeDate(booking.booking_details.performanceDate)}
                  </div>
                  {booking.booking_details.performanceTime ? (
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      <Clock className="h-4 w-4 text-slate-500" />
                      {booking.booking_details.performanceTime}
                    </div>
                  ) : null}
                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <DollarSign className="h-4 w-4 text-slate-500" />
                    {booking.booking_details.compensation}
                  </div>
                </div>

                <p className="line-clamp-2 text-sm text-slate-400">{booking.booking_details.description}</p>

                <div className="flex flex-wrap gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-slate-700"
                        onClick={() => setSelectedBooking(booking)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View details
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl border-slate-800 bg-slate-950 text-white">
                      {selectedBooking ? (
                        <>
                          <DialogHeader>
                            <DialogTitle>{selectedBooking.booking_details.performanceType}</DialogTitle>
                            <DialogDescription className="text-slate-400">
                              {selectedBooking.booking_details.venue} · {selectedBooking.booking_details.location}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label>Description</Label>
                              <p className="mt-1 text-sm text-slate-300">{selectedBooking.booking_details.description}</p>
                            </div>
                            {getUnifiedStatus(selectedBooking.status) === "pending" ? (
                              <div className="space-y-3">
                                <div>
                                  <Label htmlFor="responseMessage">Response message</Label>
                                  <Textarea
                                    id="responseMessage"
                                    value={responseMessage}
                                    onChange={(e) => setResponseMessage(e.target.value)}
                                    className="mt-1 border-slate-700 bg-slate-900"
                                    placeholder="Optional note with your response..."
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    className="bg-emerald-600 hover:bg-emerald-700"
                                    disabled={responding}
                                    onClick={() => void respondToBooking(selectedBooking.id, "accepted")}
                                  >
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                    Accept
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    disabled={responding}
                                    onClick={() => void respondToBooking(selectedBooking.id, "declined")}
                                  >
                                    <XCircle className="mr-2 h-4 w-4" />
                                    Decline
                                  </Button>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        </>
                      ) : null}
                    </DialogContent>
                  </Dialog>

                  {getUnifiedStatus(booking.status) === "pending" ? (
                    <>
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700"
                        disabled={responding}
                        onClick={() => void respondToBooking(booking.id, "accepted")}
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={responding}
                        onClick={() => void respondToBooking(booking.id, "declined")}
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Decline
                      </Button>
                    </>
                  ) : null}

                  {getUnifiedStatus(booking.status) === "accepted" ? (
                    <Button size="sm" variant="outline" className="border-cyan-500/40 text-cyan-200" onClick={() => createEventFromBooking(booking)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create event from booking
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
