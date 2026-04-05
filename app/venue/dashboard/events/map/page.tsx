"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Calendar, MapPin, Music, Plus, Search, Users } from "lucide-react"
import { CreateEventModal } from "../../../components/events/create-event-modal"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatSafeDate, formatSafeTime } from "@/lib/events/admin-event-normalization"
import { useCurrentVenue } from "@/app/venue/hooks/useCurrentVenue"
import { venueService } from "@/lib/services/venue.service"
import { LoadingSpinner } from "@/app/venue/components/loading-spinner"

interface EventMapItem {
  id: string
  title: string
  description: string
  venue: string
  location: string
  date: string
  endDate: string | null
  organizer: string
  attendees: number
  capacity: number
  genres: string[]
  ticketPrice: number
  image: string
  latitude: number
  longitude: number
  isMyEvent: boolean
}

export default function EventMapPage() {
  const { venue, isLoading: isVenueLoading } = useCurrentVenue()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [distance, setDistance] = useState([50])
  const [showMyEventsOnly, setShowMyEventsOnly] = useState(false)
  const [activeTab, setActiveTab] = useState("map")
  const [selectedGenres, setSelectedGenres] = useState<string[]>([])
  const [dateRange, setDateRange] = useState<string>("all")

  const [events, setEvents] = useState<EventMapItem[]>([])

  useEffect(() => {
    async function loadEvents() {
      if (!venue?.id) return
      const now = new Date()
      const inSixMonths = new Date()
      inSixMonths.setMonth(inSixMonths.getMonth() + 6)
      const rows = await venueService.getVenueEventsByRange(venue.id, now.toISOString(), inSixMonths.toISOString())
      const mapped = rows.map((event: any): EventMapItem => {
        const settings = event.settings && typeof event.settings === "object"
          ? (event.settings as Record<string, unknown>)
          : {}
        const genre = typeof settings.event_type === "string" ? settings.event_type : "other"
        return {
          id: String(event.id),
          title: String(event.title || "Event"),
          description: typeof settings.description === "string" ? settings.description : "Venue event",
          venue: typeof settings.venue_label === "string" ? settings.venue_label : venue.venue_name || venue.name,
          location: `${venue.city || ""}${venue.city && venue.state ? ", " : ""}${venue.state || ""}` || "TBD",
          date: event.date || new Date().toISOString(),
          endDate: event.end_at || null,
          organizer: "Venue Team",
          attendees: 0,
          capacity: Number(event.capacity || 0),
          genres: [genre],
          ticketPrice: Number(settings.ticket_price || 0),
          image: "/placeholder.svg",
          latitude: 0,
          longitude: 0,
          isMyEvent: true,
        }
      })
      setEvents(mapped)
    }
    void loadEvents()
  }, [venue?.id, venue?.city, venue?.state, venue?.name, venue?.venue_name])

  const allGenres = ["rock", "pop", "jazz", "hip-hop", "electronic", "dance", "folk", "acoustic", "rap", "classical"]

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

  const toggleGenre = (genre: string) => {
    if (selectedGenres.includes(genre)) {
      setSelectedGenres(selectedGenres.filter((g) => g !== genre))
    } else {
      setSelectedGenres([...selectedGenres, genre])
    }
  }

  const filteredEvents = events.filter((event) => {
    // Filter by search query
    const matchesSearch =
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.venue.toLowerCase().includes(searchQuery.toLowerCase())

    // Filter by my events only
    const matchesMyEvents = showMyEventsOnly ? event.isMyEvent : true

    // Filter by genres
    const matchesGenres = selectedGenres.length === 0 || selectedGenres.some((genre) => event.genres.includes(genre))

    // Filter by date range
    let matchesDateRange = true
    const eventDate = new Date(event.date)
    const today = new Date()
    const nextWeek = new Date(today)
    nextWeek.setDate(today.getDate() + 7)
    const nextMonth = new Date(today)
    nextMonth.setMonth(today.getMonth() + 1)

    if (dateRange === "today") {
      matchesDateRange =
        eventDate.getDate() === today.getDate() &&
        eventDate.getMonth() === today.getMonth() &&
        eventDate.getFullYear() === today.getFullYear()
    } else if (dateRange === "week") {
      matchesDateRange = eventDate >= today && eventDate <= nextWeek
    } else if (dateRange === "month") {
      matchesDateRange = eventDate >= today && eventDate <= nextMonth
    }

    return matchesSearch && matchesMyEvents && matchesGenres && matchesDateRange
  })

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
          <h1 className="text-2xl font-bold">Event Map</h1>
          <p className="text-gray-400">Discover and create events in your area</p>
        </div>

        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Event
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle>Filters</CardTitle>
              <CardDescription>Refine your event search</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search events..."
                  className="pl-10 bg-gray-800 border-gray-700"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium">Distance</h3>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">0 mi</span>
                  <span className="text-sm text-gray-400">100 mi</span>
                </div>
                <Slider
                  defaultValue={[50]}
                  max={100}
                  step={1}
                  value={distance}
                  onValueChange={setDistance}
                  className="py-2"
                />
                <div className="text-center text-sm">Within {distance[0]} miles</div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium">Date Range</h3>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={dateRange === "today" ? "default" : "outline"}
                    size="sm"
                    className={dateRange !== "today" ? "border-gray-700" : ""}
                    onClick={() => setDateRange("today")}
                  >
                    Today
                  </Button>
                  <Button
                    variant={dateRange === "week" ? "default" : "outline"}
                    size="sm"
                    className={dateRange !== "week" ? "border-gray-700" : ""}
                    onClick={() => setDateRange("week")}
                  >
                    This Week
                  </Button>
                  <Button
                    variant={dateRange === "month" ? "default" : "outline"}
                    size="sm"
                    className={dateRange !== "month" ? "border-gray-700" : ""}
                    onClick={() => setDateRange("month")}
                  >
                    This Month
                  </Button>
                  <Button
                    variant={dateRange === "all" ? "default" : "outline"}
                    size="sm"
                    className={dateRange !== "all" ? "border-gray-700" : ""}
                    onClick={() => setDateRange("all")}
                  >
                    All Dates
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium">Genres</h3>
                <div className="flex flex-wrap gap-2">
                  {allGenres.map((genre) => (
                    <Badge
                      key={genre}
                      variant={selectedGenres.includes(genre) ? "default" : "outline"}
                      className={`cursor-pointer ${
                        selectedGenres.includes(genre) ? "" : "border-gray-700 hover:border-gray-500"
                      }`}
                      onClick={() => toggleGenre(genre)}
                    >
                      {genre}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="myEvents" className="cursor-pointer">
                  Show only my events
                </Label>
                <Switch id="myEvents" checked={showMyEventsOnly} onCheckedChange={setShowMyEventsOnly} />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle>Event Stats</CardTitle>
              <CardDescription>Quick overview</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Total Events</span>
                <Badge variant="outline" className="border-gray-700">
                  {events.length}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">My Events</span>
                <Badge variant="outline" className="border-gray-700">
                  {events.filter((e) => e.isMyEvent).length}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Upcoming Events</span>
                <Badge variant="outline" className="border-gray-700">
                  {events.filter((e) => new Date(e.date) > new Date()).length}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3">
          <Tabs defaultValue="map" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-gray-800 w-full">
              <TabsTrigger value="map">Map View</TabsTrigger>
              <TabsTrigger value="list">List View</TabsTrigger>
            </TabsList>

            <TabsContent value="map" className="mt-6">
              <Card className="bg-gray-900 border-gray-800">
                <CardContent className="p-0 overflow-hidden">
                  <div className="relative w-full h-[500px] bg-gray-800 flex items-center justify-center">
                    <div className="text-center p-6">
                      <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-500" />
                      <h3 className="text-lg font-medium mb-2">Interactive Event Map</h3>
                      <p className="text-gray-400 mb-4">
                        Explore {filteredEvents.length} events in your area on the interactive map
                      </p>
                      <div className="flex flex-wrap justify-center gap-2">
                        {filteredEvents.map((event) => (
                          <Badge key={event.id} variant="outline" className="border-gray-700">
                            {event.title}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="list" className="mt-6 space-y-6">
              {filteredEvents.length === 0 ? (
                <Card className="bg-gray-900 border-gray-800">
                  <CardContent className="pt-6 text-center">
                    <p className="text-gray-400">No events found matching your criteria.</p>
                    <Button className="mt-4" onClick={() => setShowCreateModal(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Event
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                filteredEvents.map((event) => (
                  <Card key={event.id} className="bg-gray-900 border-gray-800 overflow-hidden">
                    <div className="grid grid-cols-1 md:grid-cols-3">
                      <div className="md:col-span-1">
                        <img
                          src={event.image || "/placeholder.svg"}
                          alt={event.title}
                          className="w-full h-full object-cover md:h-full max-h-[200px] md:max-h-none"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <CardTitle>{event.title}</CardTitle>
                                {event.isMyEvent && <Badge className="bg-purple-600">My Event</Badge>}
                                {event.genres.map((genre) => (
                                  <Badge key={genre} variant="outline" className="border-gray-700">
                                    {genre}
                                  </Badge>
                                ))}
                              </div>
                              <CardDescription className="mt-1">{event.description}</CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-4 text-sm mb-4">
                            <div className="flex items-center">
                              <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                              <span>
                                {event.venue}, {event.location}
                              </span>
                            </div>
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                              <span>
                                {formatDate(event.date)} at {formatTime(event.date)}
                              </span>
                            </div>
                            <div className="flex items-center">
                              <Users className="h-4 w-4 mr-1 text-gray-400" />
                              <span>
                                {event.attendees}/{event.capacity} attending
                              </span>
                            </div>
                            <div className="flex items-center">
                              <Music className="h-4 w-4 mr-1 text-gray-400" />
                              <span>By {event.organizer}</span>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Button className="flex-1">Get Tickets - {formatCurrency(event.ticketPrice)}</Button>
                            {event.isMyEvent && (
                              <Button variant="outline" className="border-gray-700">
                                Manage
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <CreateEventModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} />
    </div>
  )
}
