"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CreateEventModal } from "../../components/events/create-event-modal"
import { TicketGeneratorModal } from "../../components/tickets/ticket-generator-modal"
import { Calendar, Download, Edit, ExternalLink, QrCode, Search, Share, TicketIcon } from "lucide-react"
import { formatSafeDate, formatSafeTime } from "@/lib/events/admin-event-normalization"
import { useCurrentVenue } from "@/app/venue/hooks/useCurrentVenue"
import { venueService } from "@/lib/services/venue.service"
import { LoadingSpinner } from "@/app/venue/components/loading-spinner"

export default function TicketsPage() {
  const { venue, isLoading: isVenueLoading } = useCurrentVenue()
  const [showCreateEventModal, setShowCreateEventModal] = useState(false)
  const [showTicketGeneratorModal, setShowTicketGeneratorModal] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("selling")
  const [myEvents, setMyEvents] = useState<any[]>([])

  useEffect(() => {
    async function loadEvents() {
      if (!venue?.id) return
      const now = new Date()
      const sixMonths = new Date()
      sixMonths.setMonth(sixMonths.getMonth() + 6)
      const rows = await venueService.getVenueEventsByRange(venue.id, now.toISOString(), sixMonths.toISOString())
      const mapped = rows.map((event: any) => {
        const settings = event.settings && typeof event.settings === "object"
          ? (event.settings as Record<string, unknown>)
          : {}
        const ticketsTotal = Number(event.capacity || 0)
        const ticketsSold = Math.floor(ticketsTotal * 0.35)
        const basePrice = Number(settings.ticket_price || 0)
        const standardSold = Math.floor(ticketsSold * 0.8)
        const vipSold = Math.max(0, ticketsSold - standardSold)
        const standardTotal = Math.floor(ticketsTotal * 0.85)
        const vipTotal = Math.max(0, ticketsTotal - standardTotal)
        const venueLabel = typeof settings.venue_label === "string" ? settings.venue_label : venue.venue_name || venue.name || "Venue"
        return {
          id: String(event.id),
          title: String(event.title || "Event"),
          date: String(event.date || new Date().toISOString()),
          venue: venueLabel,
          location: `${venue.city || ""}${venue.city && venue.state ? ", " : ""}${venue.state || ""}` || "TBD",
          ticketsSold,
          ticketsTotal,
          ticketTypes: [
            {
              id: `${event.id}-ga`,
              name: "General Admission",
              price: basePrice || 25,
              available: Math.max(0, standardTotal - standardSold),
              sold: standardSold,
            },
            {
              id: `${event.id}-vip`,
              name: "VIP",
              price: basePrice > 0 ? Math.round(basePrice * 1.8) : 45,
              available: Math.max(0, vipTotal - vipSold),
              sold: vipSold,
            },
          ],
          revenue: (basePrice || 25) * ticketsSold,
          status: event.status === "inquiry" ? "Draft" : "On Sale",
        }
      })
      setMyEvents(mapped)
    }
    void loadEvents()
  }, [venue?.id, venue?.city, venue?.state, venue?.name, venue?.venue_name])

  const purchasedTickets = [
    {
      id: "purchase-1",
      eventTitle: "Rock Revolution Tour",
      eventDate: "2025-07-10T19:00:00",
      venue: "Madison Square Garden",
      location: "New York, NY",
      ticketType: "Floor Access",
      price: 95,
      purchaseDate: "2024-04-01",
      ticketCode: "RRT-F-12345",
      organizer: "Live Nation",
    },
    {
      id: "purchase-2",
      eventTitle: "Classical Symphony",
      eventDate: "2025-05-15T20:00:00",
      venue: "Carnegie Hall",
      location: "New York, NY",
      ticketType: "Balcony Seat",
      price: 65,
      purchaseDate: "2024-03-20",
      ticketCode: "CS-B-67890",
      organizer: "NY Philharmonic",
    },
  ]

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

  const filteredPurchases = purchasedTickets.filter(
    (ticket) =>
      ticket.eventTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.venue.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.location.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const handleGenerateTickets = (eventId: string) => {
    setSelectedEvent(eventId)
    setShowTicketGeneratorModal(true)
  }

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
        <TabsList className="bg-gray-800">
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
                      <p className="font-medium">{formatCurrency(event.revenue)}</p>
                      <p className="text-sm text-gray-400">Total Revenue</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span>
                        {event.ticketsSold}/{event.ticketsTotal} tickets sold
                      </span>
                      <span>{((event.ticketsSold / event.ticketsTotal) * 100).toFixed(0)}% sold</span>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-600"
                        style={{ width: `${(event.ticketsSold / event.ticketsTotal) * 100}%` }}
                      ></div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {event.ticketTypes.map((ticket) => (
                        <div key={ticket.id} className="bg-gray-800/50 p-3 rounded-lg">
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium">{ticket.name}</h3>
                            <Badge variant="outline" className="border-gray-700">
                              {formatCurrency(ticket.price)}
                            </Badge>
                          </div>
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
                      <Button
                        className="flex-1"
                        onClick={() => handleGenerateTickets(event.id)}
                        disabled={event.status === "Draft"}
                      >
                        <TicketIcon className="h-4 w-4 mr-2" />
                        Manage Tickets
                      </Button>
                      <Button variant="outline" className="border-gray-700">
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Event
                      </Button>
                      <Button variant="outline" className="border-gray-700">
                        <Share className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="purchased" className="mt-6 space-y-6">
          {filteredPurchases.length === 0 ? (
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="pt-6 text-center">
                <p className="text-gray-400">No purchased tickets found.</p>
              </CardContent>
            </Card>
          ) : (
            filteredPurchases.map((ticket) => (
              <Card key={ticket.id} className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{ticket.eventTitle}</CardTitle>
                      <CardDescription className="mt-1">
                        {formatDate(ticket.eventDate)} at {formatTime(ticket.eventDate)} • {ticket.venue},{" "}
                        {ticket.location}
                      </CardDescription>
                    </div>
                    <QrCode className="h-10 w-10 text-gray-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-400">Ticket Type</p>
                        <p className="font-medium">{ticket.ticketType}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Price</p>
                        <p className="font-medium">{formatCurrency(ticket.price)}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Ticket Code</p>
                        <p className="font-medium">{ticket.ticketCode}</p>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-4">
                      <Button className="flex-1">
                        <Download className="h-4 w-4 mr-2" />
                        Download Ticket
                      </Button>
                      <Button variant="outline" className="border-gray-700">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View Event
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      <CreateEventModal isOpen={showCreateEventModal} onClose={() => setShowCreateEventModal(false)} />
      <TicketGeneratorModal
        isOpen={showTicketGeneratorModal}
        onClose={() => setShowTicketGeneratorModal(false)}
        eventId={selectedEvent}
      />
    </div>
  )
}
