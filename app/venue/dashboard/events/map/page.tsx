"use client"

import { useState } from "react"
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

export default function EventMapPage() {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [distance, setDistance] = useState([50])
  const [showMyEventsOnly, setShowMyEventsOnly] = useState(false)
  const [activeTab, setActiveTab] = useState("map")
  const [selectedGenres, setSelectedGenres] = useState<string[]>([])
  const [dateRange, setDateRange] = useState<string>("all")

  // Mock data for events
  const events = [
    {
      id: "event-1",
      title: "Summer Jam Festival",
      description: "Annual music festival featuring top artists across multiple genres.",
      venue: "Central Park",
      location: "New York, NY",
      date: "2025-06-15T14:00:00",
      endDate: "2025-06-15T23:00:00",
      organizer: "NYC Events",
      attendees: 1250,
      capacity: 2000,
      genres: ["rock", "pop", "hip-hop"],
      ticketPrice: 75,
      image: "/placeholder.svg?height=200&width=400&text=Summer+Jam",
      latitude: 40.785091,
      longitude: -73.968285,
      isMyEvent: true,
    },
    {
      id: "event-2",
      title: "Jazz Night",
      description: "An evening of smooth jazz with local and international artists.",
      venue: "Blue Note Jazz Club",
      location: "New York, NY",
      date: "2025-05-20T19:30:00",
      endDate: "2025-05-20T23:00:00",
      organizer: "Blue Note",
      attendees: 120,
      capacity: 150,
      genres: ["jazz"],
      ticketPrice: 45,
      image: "/placeholder.svg?height=200&width=400&text=Jazz+Night",
      latitude: 40.73061,
      longitude: -73.935242,
      isMyEvent: false,
    },
    {
      id: "event-3",
      title: "Electronic Dance Party",
      description: "All-night dance party featuring top DJs and electronic music producers.",
      venue: "Warehouse 33",
      location: "Los Angeles, CA",
      date: "2025-05-25T22:00:00",
      endDate: "2025-05-26T06:00:00",
      organizer: "LA Nightlife",
      attendees: 850,
      capacity: 1000,
      genres: ["electronic", "dance"],
      ticketPrice: 60,
      image: "/placeholder.svg?height=200&width=400&text=EDM+Party",
      latitude: 34.052235,
      longitude: -118.243683,
      isMyEvent: false,
    },
    {
      id: "event-4",
      title: "Acoustic Sessions",
      description: "Intimate acoustic performances by singer-songwriters.",
      venue: "The Listening Room",
      location: "Nashville, TN",
      date: "2025-06-05T19:00:00",
      endDate: "2025-06-05T22:00:00",
      organizer: "Nashville Music",
      attendees: 75,
      capacity: 100,
      genres: ["folk", "acoustic"],
      ticketPrice: 30,
      image: "/placeholder.svg?height=200&width=400&text=Acoustic+Sessions",
      latitude: 36.162664,
      longitude: -86.781602,
      isMyEvent: true,
    },
    {
      id: "event-5",
      title: "Hip-Hop Showcase",
      description: "Showcasing the best up-and-coming hip-hop artists.",
      venue: "The Fillmore",
      location: "Miami, FL",
      date: "2025-07-10T20:00:00",
      endDate: "2025-07-11T01:00:00",
      organizer: "Miami Beats",
      attendees: 450,
      capacity: 600,
      genres: ["hip-hop", "rap"],
      ticketPrice: 50,
      image: "/placeholder.svg?height=200&width=400&text=Hip-Hop+Showcase",
      latitude: 25.761681,
      longitude: -80.191788,
      isMyEvent: false,
    },
  ]

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
