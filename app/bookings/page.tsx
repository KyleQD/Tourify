"use client"

import { useState, useEffect } from "react"
import { Plus, Calendar, User, CreditCard, CheckCircle, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@supabase/supabase-js"
import { useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Booking {
  id: string
  event_id: string
  user_id: string
  status: "pending" | "confirmed" | "cancelled"
  ticket_quantity: number
  total_price: number
  created_at: string
  event?: {
    title: string
    date: string
    location: string
  }
  user?: {
    name: string
    email: string
  }
}

interface Event {
  id: string
  title: string
  date: string
  location: string
  price: number
}

export default function BookingsPage() {
  const searchParams = useSearchParams()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newBooking, setNewBooking] = useState({
    event_id: "",
    ticket_quantity: 1,
    status: "pending" as const
  })
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)

  useEffect(() => {
    fetchBookings()
    fetchEvents()

    // Check for payment success/failure
    const success = searchParams.get("success")
    const bookingId = searchParams.get("booking_id")
    const canceled = searchParams.get("canceled")

    const sessionId = searchParams.get("session_id")
    if (success === "true" && bookingId && sessionId) {
      verifyPaymentAndRefresh({ bookingId, sessionId })
    } else if (canceled === "true") {
      toast.error("Payment was canceled. Please try again.")
    }
  }, [searchParams])

  const verifyPaymentAndRefresh = async ({ bookingId, sessionId }: { bookingId: string; sessionId: string }) => {
    try {
      const response = await fetch(`/api/payment?session_id=${encodeURIComponent(sessionId)}&booking_id=${encodeURIComponent(bookingId)}`)
      const payload = await response.json()
      if (!response.ok || !payload?.success) {
        toast.error("Payment could not be verified yet. Please refresh in a moment.")
        return
      }

      toast.success("Payment successful! Your booking has been confirmed.")
      setBookings((current) =>
        current.map((booking) =>
          booking.id === bookingId ? { ...booking, status: "confirmed" } : booking
        )
      )
      fetchBookings()
    } catch (error) {
      console.error("Error verifying payment:", error)
      toast.error("Payment verification failed. Please try again.")
    }
  }

  const fetchBookings = async () => {
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          event:events(title, date, location),
          user:profiles(name, email)
        `)
        .order("created_at", { ascending: false })

      if (error) throw error
      setBookings(data || [])
    } catch (error) {
      console.error("Error fetching bookings:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from("events")
        .select("id, title, date, location, price")
        .eq("status", "published")

      if (error) throw error
      setEvents(data || [])
    } catch (error) {
      console.error("Error fetching events:", error)
    }
  }

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const selectedEvent = events.find(e => e.id === newBooking.event_id)
      if (!selectedEvent) throw new Error("Event not found")

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("User not authenticated")

      const bookingData = {
        ...newBooking,
        total_price: selectedEvent.price * newBooking.ticket_quantity,
        user_id: user.id
      }

      const { data, error } = await supabase
        .from("bookings")
        .insert([bookingData])
        .select()

      if (error) throw error
      
      // Initiate payment
      setIsProcessingPayment(true)
      const response = await fetch("/api/payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bookingId: data[0].id,
          eventId: newBooking.event_id,
          ticketQuantity: newBooking.ticket_quantity,
        }),
      })

      const { url } = await response.json()
      if (url) {
        window.location.href = url
      }
    } catch (error) {
      console.error("Error creating booking:", error)
      toast.error("Error creating booking. Please try again.")
    } finally {
      setIsProcessingPayment(false)
    }
  }

  const handleUpdateBookingStatus = async (id: string, status: Booking["status"]) => {
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status })
        .eq("id", id)

      if (error) throw error
      
      setBookings(bookings.map(booking => 
        booking.id === id ? { ...booking, status } : booking
      ))

      // Send notification based on status
      await fetch("/api/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: status === "confirmed" ? "booking_confirmation" : "booking_cancellation",
          data: { bookingId: id },
        }),
      })

      toast.success(`Booking ${status} successfully`)
    } catch (error) {
      console.error("Error updating booking status:", error)
      toast.error("Error updating booking status")
    }
  }

  const getStatusColor = (status: Booking["status"]) => {
    switch (status) {
      case "confirmed":
        return "text-green-500"
      case "cancelled":
        return "text-red-500"
      default:
        return "text-yellow-500"
    }
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Bookings Management</h1>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Booking
        </Button>
      </div>

      {showCreateForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Create New Booking</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateBooking} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="event">Event</Label>
                  <Select
                    value={newBooking.event_id}
                    onValueChange={(value: string) => setNewBooking({ ...newBooking, event_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select an event" />
                    </SelectTrigger>
                    <SelectContent>
                      {events.map((event) => (
                        <SelectItem key={event.id} value={event.id}>
                          {event.title} - {formatSafeDate(event.date)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ticket_quantity">Number of Tickets</Label>
                  <Input
                    id="ticket_quantity"
                    type="number"
                    min="1"
                    value={newBooking.ticket_quantity}
                    onChange={(e) => setNewBooking({ ...newBooking, ticket_quantity: parseInt(e.target.value) })}
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isProcessingPayment}
                >
                  {isProcessingPayment ? "Processing..." : "Create Booking"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {bookings.map((booking) => (
          <Card key={booking.id}>
            <CardHeader>
              <CardTitle>{booking.event?.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span>{formatSafeDate(booking.event?.date || "")}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span>{booking.user?.name}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CreditCard className="h-4 w-4 text-gray-500" />
                  <span>Total: ${booking.total_price}</span>
                </div>
                <div className="flex items-center space-x-2">
                  {booking.status === "confirmed" ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : booking.status === "cancelled" ? (
                    <XCircle className="h-4 w-4 text-red-500" />
                  ) : (
                    <div className="h-4 w-4 rounded-full bg-yellow-500" />
                  )}
                  <span className={getStatusColor(booking.status)}>
                    Status: {booking.status}
                  </span>
                </div>
              </div>
              <div className="mt-4 flex justify-end space-x-2">
                {booking.status === "pending" && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => handleUpdateBookingStatus(booking.id, "cancelled")}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => handleUpdateBookingStatus(booking.id, "confirmed")}
                    >
                      Confirm
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
