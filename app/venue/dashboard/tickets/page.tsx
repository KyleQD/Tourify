"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CreateEventModal } from "../../components/events/create-event-modal"
import { Calendar, QrCode, Search, TicketIcon } from "lucide-react"
import { formatSafeDate, formatSafeTime } from "@/lib/events/admin-event-normalization"
import { useCurrentVenue } from "@/app/venue/hooks/useCurrentVenue"
import { LoadingSpinner } from "@/app/venue/components/loading-spinner"
import { venueDashboardTabListClass } from "@/app/venue/lib/dashboard-ui"

interface TicketTypeItem {
  id: string
  name: string
  price: number
  allInPrice: number
  mandatoryFees: number
  available: number
  sold: number
}

interface VenueTicketEvent {
  id: string
  title: string
  date: string
  venue: string
  location: string
  ticketsSold: number
  ticketsTotal: number
  ticketTypes: TicketTypeItem[]
  revenue: number
  status: "Draft" | "On Sale"
}

export default function TicketsPage() {
  const { venue, isLoading: isVenueLoading } = useCurrentVenue()
  const [showCreateEventModal, setShowCreateEventModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("selling")
  const [myEvents, setMyEvents] = useState<VenueTicketEvent[]>([])

  useEffect(() => {
    async function loadEvents() {
      if (!venue?.id) return
      const response = await fetch(`/api/venue/ticketing?venue_id=${venue.id}`, {
        credentials: "include",
        cache: "no-store",
      })
      if (!response.ok) {
        setMyEvents([])
        return
      }

      const payload = await response.json()
      const rows = Array.isArray(payload?.summary?.events) ? payload.summary.events : []
      const mapped = rows.map((event: any): VenueTicketEvent => {
        const ticketTypes = Array.isArray(event.ticket_types) ? event.ticket_types : []
        const ticketsTotal =
          ticketTypes.reduce((sum: number, ticket: any) => sum + Number(ticket.quantity_available || 0), 0) ||
          Number(event.capacity || 0)
        const ticketsSold = Number(event.tickets_sold || 0)
        const venueLabel = venue.venue_name || venue.name || "Venue"
        return {
          id: String(event.id),
          title: String(event.title || "Event"),
          date: String(event.start_at || event.date || new Date().toISOString()),
          venue: venueLabel,
          location: `${venue.city || ""}${venue.city && venue.state ? ", " : ""}${venue.state || ""}` || "TBD",
          ticketsSold,
          ticketsTotal,
          ticketTypes: ticketTypes.map((ticket: any) => ({
            id: String(ticket.id),
            name: String(ticket.name || "Ticket"),
            price: Number(ticket.base_price ?? ticket.price ?? 0),
            allInPrice: Number(ticket.all_in_price ?? ticket.price ?? 0),
            mandatoryFees: Number(ticket.mandatory_fees || 0),
            available: Math.max(0, Number(ticket.quantity_available || 0) - Number(ticket.quantity_sold || 0)),
            sold: Number(ticket.quantity_sold || 0),
          })),
          revenue: Number(event.gross_revenue || 0),
          status: event.status === "inquiry" ? "Draft" : "On Sale",
        }
      })
      setMyEvents(mapped)
    }
    void loadEvents()
  }, [venue?.id, venue?.city, venue?.state, venue?.name, venue?.venue_name])

  const formatDate = (dateString: string) => {
    return formatSafeDate(dateString)
  }

  const formatTime = (dateString: string) => {
    return formatSafeTime(dateString)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const filteredEvents = myEvents.filter(
    (event) =>
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.venue.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.location.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  if (isVenueLoading)
    return (
      <div className="flex justify-center items-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    )

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Ticket Management</h1>
          <p className="text-gray-400">Generate and manage tickets for your events</p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="border-gray-700" onClick={() => setShowCreateEventModal(true)}>
            <Calendar className="h-4 w-4 mr-2" />
            Create Event
          </Button>
          <Button>
            <TicketIcon className="h-4 w-4 mr-2" />
            Generate Tickets
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search tickets or events..."
          className="pl-10 bg-gray-800 border-gray-700"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <Tabs defaultValue="selling" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className={venueDashboardTabListClass}>
          <TabsTrigger value="selling">Tickets I'm Selling</TabsTrigger>
          <TabsTrigger value="purchased">Tickets I've Purchased</TabsTrigger>
        </TabsList>

        <TabsContent value="selling" className="mt-6 space-y-6">
          {filteredEvents.length === 0 ? (
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="pt-6 text-center">
                <p className="text-gray-400">No events found. Create an event to start selling tickets!</p>
                <Button className="mt-4" onClick={() => setShowCreateEventModal(true)}>
                  <Calendar className="h-4 w-4 mr-2" />
                  Create Event
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredEvents.map((event) => (
              <Card key={event.id} className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle>{event.title}</CardTitle>
                        <Badge
                          variant={event.status === "Draft" ? "outline" : "default"}
                          className={event.status === "Draft" ? "border-yellow-600 text-yellow-500" : "bg-green-600"}
                        >
                          {event.status}
                        </Badge>
                      </div>
                      <CardDescription className="mt-1">
                        {formatDate(event.date)} at {formatTime(event.date)} • {event.venue}, {event.location}
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{event.ticketsSold} sold</p>
                      <p className="text-sm text-gray-400">Ops summary (finance hidden)</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span>
                        {event.ticketsSold}/{event.ticketsTotal} tickets sold
                      </span>
                      <span>
                        {event.ticketsTotal > 0 ? ((event.ticketsSold / event.ticketsTotal) * 100).toFixed(0) : 0}% sold
                      </span>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-600"
                        style={{
                          width: `${
                            event.ticketsTotal > 0 ? Math.min(100, (event.ticketsSold / event.ticketsTotal) * 100) : 0
                          }%`,
                        }}
                      ></div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {event.ticketTypes.map((ticket) => (
                        <div key={ticket.id} className="bg-gray-800/50 p-3 rounded-lg">
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium">{ticket.name}</h3>
                            <Badge variant="outline" className="border-gray-700">
                              {formatCurrency(ticket.allInPrice)}
                            </Badge>
                          </div>
                          <p className="mt-1 text-xs text-gray-400">
                            {formatCurrency(ticket.price)} base
                            {ticket.mandatoryFees > 0 ? ` + ${formatCurrency(ticket.mandatoryFees)} required fees` : " • no required fees configured"}
                          </p>
                          <div className="flex items-center justify-between mt-2 text-sm">
                            <span>
                              {ticket.sold}/{ticket.sold + ticket.available} sold
                            </span>
                            <span>{ticket.available} available</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2 mt-4">
                      <Button asChild className="flex-1" disabled={event.status === "Draft"}>
                        <Link href={`/admin/dashboard/events/${event.id}/check-in`}>
                          <QrCode className="h-4 w-4 mr-2" />
                          Door check-in
                        </Link>
                      </Button>
                      <Button asChild variant="outline" className="border-gray-700">
                        <Link href={`/tickets/my-tickets`}>
                          <TicketIcon className="h-4 w-4 mr-2" />
                          My wallet
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="purchased" className="mt-6 space-y-6">
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="pt-6 text-center">
              <QrCode className="mx-auto mb-3 h-10 w-10 text-gray-500" />
              <p className="text-gray-300 font-medium">No purchased tickets found</p>
              <p className="mt-1 text-sm text-gray-500">
                Venue ticket purchases will appear here when this account buys tickets as an attendee.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <CreateEventModal isOpen={showCreateEventModal} onClose={() => setShowCreateEventModal(false)} />
    </div>
  )
}
