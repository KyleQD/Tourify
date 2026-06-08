"use client"

import { useState, useEffect, useCallback, memo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useSocial } from "@/contexts/social-context"
import { useAuth } from "../../../context/auth-context"
import { format, formatDistanceToNow, isAfter, parseISO, isBefore } from "date-fns"
import {
  Calendar,
  MapPin,
  Users,
  Ticket,
  RefreshCw,
  ThumbsUp,
  Share2,
  Bell,
  BellOff,
  CalendarCheck,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import Image from "next/image"
import { useInView } from "react-intersection-observer"
import { ErrorBoundary } from "../error-boundary"

interface EventUpdate {
  id: string
  title: string
  type: "concert" | "festival" | "workshop" | "networking" | "release"
  creatorId: string
  startDate: string
  endDate?: string
  location: string
  venue?: string
  coverImage?: string
  attendees: number
  interested: number
  ticketLink?: string
  status: "upcoming" | "ongoing" | "past"
  isUserAttending?: boolean
  isUserInterested?: boolean
  isUserNotified?: boolean
}

// Memoized event item component for better performance
const EventItem = memo(
  ({
    event,
    creator,
    index,
    onAttend,
    onInterest,
    onNotify,
  }: {
    event: EventUpdate
    creator: any
    index: number
    onAttend: (id: string) => void
    onInterest: (id: string) => void
    onNotify: (id: string) => void
  }) => {
    const { ref, inView } = useInView({
      triggerOnce: true,
      threshold: 0.1,
    })

    const startDate = parseISO(event.startDate)
    const isUpcoming = isAfter(startDate, new Date())
    const isPast = event.status === "past" || isBefore(startDate, new Date())
    const isToday = format(startDate, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")

    const dateDisplay = isUpcoming
      ? formatDistanceToNow(startDate, { addSuffix: true })
      : formatDateRange(event.startDate, event.endDate)

    // Format date range
    function formatDateRange(startDate: string, endDate?: string) {
      const start = parseISO(startDate)

      if (!endDate) {
        return format(start, "MMM d, yyyy")
      }

      const end = parseISO(endDate)

      if (format(start, "MMM yyyy") === format(end, "MMM yyyy")) {
        if (format(start, "MMM d") === format(end, "MMM d")) {
          // Same day
          return format(start, "MMM d, yyyy")
        }
        // Same month and year
        return `${format(start, "MMM d")}-${format(end, "d, yyyy")}`
      } else if (format(start, "yyyy") === format(end, "yyyy")) {
        // Same year
        return `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`
      }

      // Different years
      return `${format(start, "MMM d, yyyy")} - ${format(end, "MMM d, yyyy")}`
    }

    // Render event type badge
    const renderEventBadge = (type: EventUpdate["type"]) => {
      switch (type) {
        case "concert":
          return <Badge className="bg-gradient-to-r from-blue-600 to-blue-800">Concert</Badge>
        case "festival":
          return <Badge className="bg-gradient-to-r from-purple-600 to-purple-800">Festival</Badge>
        case "workshop":
          return <Badge className="bg-gradient-to-r from-green-600 to-green-800">Workshop</Badge>
        case "networking":
          return <Badge className="bg-gradient-to-r from-amber-600 to-amber-800">Networking</Badge>
        case "release":
          return <Badge className="bg-gradient-to-r from-pink-600 to-pink-800">Release Party</Badge>
        default:
          return null
      }
    }

    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 10 }}
        animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3, delay: index * 0.05 }}
        className={`p-3 hover:bg-gray-800/50 transition-colors rounded-md ${isToday ? "border-l-2 border-purple-500" : ""}`}
      >
        <div className="flex space-x-3">
          <div className="relative group">
            {event.coverImage ? (
              <div className="h-20 w-20 rounded-md overflow-hidden bg-gray-800">
                <Image
                  src={event.coverImage || "/placeholder.svg"}
                  alt={event.title}
                  width={80}
                  height={80}
                  className="object-cover h-full w-full"
                  loading="lazy"
                />
              </div>
            ) : (
              <div className="h-20 w-20 bg-gradient-to-br from-gray-800 to-gray-900 rounded-md flex items-center justify-center">
                <Calendar className="h-8 w-8 text-gray-600" />
              </div>
            )}
            {isToday && (
              <div className="absolute -top-2 -right-2 bg-purple-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                Today
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-medium text-sm group-hover:text-purple-400 transition-colors">{event.title}</h3>
                <Link href={`/profile/${creator.username}`} className="text-xs text-gray-400 hover:underline">
                  Organized by {creator.fullName}
                </Link>

                <div className="flex items-center space-x-2 mt-1">
                  {renderEventBadge(event.type)}
                  <span className="text-xs text-gray-500">{dateDisplay}</span>
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-gray-400">
                  <div className="flex items-center">
                    <MapPin className="h-3 w-3 mr-1" />
                    {event.location}
                    {event.venue && ` • ${event.venue}`}
                  </div>

                  <div className="flex items-center">
                    <Users className="h-3 w-3 mr-1" />
                    {event.attendees} attending
                  </div>
                </div>
              </div>
            </div>

            {isUpcoming && (
              <div className="flex mt-2 space-x-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant={event.isUserAttending ? "default" : "outline"}
                        className={`h-7 text-xs ${
                          event.isUserAttending ? "bg-purple-600 hover:bg-purple-700" : "border-gray-700"
                        }`}
                        onClick={() => onAttend(event.id)}
                      >
                        {event.isUserAttending ? (
                          <>
                            <CalendarCheck className="h-3 w-3 mr-1" /> Attending
                          </>
                        ) : (
                          <>
                            <Calendar className="h-3 w-3 mr-1" /> Attend
                          </>
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{event.isUserAttending ? "Cancel attendance" : "Attend this event"}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => onInterest(event.id)}>
                        <ThumbsUp
                          className={`h-3 w-3 mr-1 ${event.isUserInterested ? "fill-current text-blue-400" : ""}`}
                        />
                        {event.isUserInterested ? "Interested" : "Interest"}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{event.isUserInterested ? "Remove interest" : "Mark as interested"}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => onNotify(event.id)}>
                        {event.isUserNotified ? (
                          <>
                            <BellOff className="h-3 w-3 mr-1" /> Mute
                          </>
                        ) : (
                          <>
                            <Bell className="h-3 w-3 mr-1" /> Notify
                          </>
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{event.isUserNotified ? "Turn off notifications" : "Get notified about this event"}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {event.ticketLink && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="sm" variant="ghost" className="h-7 text-xs" asChild>
                          <Link href={event.ticketLink} target="_blank">
                            <Ticket className="h-3 w-3 mr-1" />
                            Tickets
                          </Link>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Buy tickets</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="sm" variant="ghost" className="h-7 text-xs ml-auto">
                        <Share2 className="h-3 w-3 mr-1" />
                        Share
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Share this event</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    )
  },
)

EventItem.displayName = "EventItem"

export function EventUpdates() {
  const socialContext = useSocial() // Keep for future use but don't destructure non-existent properties
  const { user: currentUser } = useAuth()
  const [events, setEvents] = useState<EventUpdate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<EventUpdate | null>(null)
  const [showEventModal, setShowEventModal] = useState(false)
  const [filter, setFilter] = useState<"all" | "upcoming" | "past">("all")
  const [sortBy, setSortBy] = useState<"date" | "popularity" | "relevance">("date")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [showFilters, setShowFilters] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<string>("all")
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000])
  const [selectedDateRange, setSelectedDateRange] = useState<[Date | null, Date | null]>([null, null])
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [showTagSuggestions, setShowTagSuggestions] = useState(false)
  const [currentTag, setCurrentTag] = useState("")
  const [tagSuggestions] = useState([
    "concert", "festival", "live", "performance", "music", "dance", "comedy", "theater", "sports", "conference"
  ])

  // Mock users since it doesn't exist in social context
  const users: any[] = []
  const getUserById = useCallback(
    (userId: string) => {
      return users.find((u) => u.id === userId)
    },
    [users],
  )

  // Fetch events
  const fetchEvents = useCallback(async (refresh = false) => {
    if (refresh) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }
    setError(null)

    try {
      // In a real app, you would fetch events from an API
      // For now, we'll generate some mock data
      await new Promise((resolve) => setTimeout(resolve, 800))

      const now = new Date()
      const tomorrow = new Date(now)
      tomorrow.setDate(tomorrow.getDate() + 1)

      const nextWeek = new Date(now)
      nextWeek.setDate(nextWeek.getDate() + 7)

      const lastWeek = new Date(now)
      lastWeek.setDate(lastWeek.getDate() - 7)

      const today = new Date(now)
      today.setHours(20, 0, 0, 0) // Set to 8 PM today

      const mockEvents: EventUpdate[] = [
        {
          id: "1",
          title: "Electronic Horizons Festival",
          type: "festival",
          creatorId: "5", // David Rodriguez
          startDate: nextWeek.toISOString(),
          endDate: new Date(nextWeek.getTime() + 1000 * 60 * 60 * 24 * 3).toISOString(), // 3 days after start
          location: "San Diego, CA",
          venue: "Oceanside Amphitheater",
          coverImage: "/placeholder.svg?height=200&width=400&text=Electronic+Horizons",
          attendees: 1200,
          interested: 3500,
          ticketLink: "https://tickets.example.com",
          status: "upcoming",
          isUserInterested: true,
          isUserNotified: true,
        },
        {
          id: "2",
          title: "Production Workshop: Advanced Mixing",
          type: "workshop",
          creatorId: "3", // Mike Williams
          startDate: tomorrow.toISOString(),
          location: "New York, NY",
          venue: "Sound Studio NYC",
          attendees: 45,
          interested: 120,
          ticketLink: "https://tickets.example.com",
          status: "upcoming",
          isUserAttending: true,
          isUserNotified: true,
        },
        {
          id: "5",
          title: "Album Release Party: Midnight Sessions",
          type: "release",
          creatorId: "2", // Sarah Johnson
          startDate: today.toISOString(),
          location: "Chicago, IL",
          venue: "Blue Note Club",
          coverImage: "/placeholder.svg?height=200&width=400&text=Midnight+Sessions",
          attendees: 120,
          interested: 350,
          ticketLink: "https://tickets.example.com",
          status: "upcoming",
          isUserAttending: false,
          isUserInterested: true,
        },
        {
          id: "3",
          title: "Acoustic Sessions Tour",
          type: "concert",
          creatorId: "2", // Sarah Johnson
          startDate: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 14).toISOString(), // 2 weeks from now
          endDate: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 45).toISOString(), // 45 days from now
          location: "Multiple Cities",
          attendees: 5000,
          interested: 12000,
          ticketLink: "https://tickets.example.com",
          status: "upcoming",
        },
        {
          id: "4",
          title: "Industry Networking Mixer",
          type: "networking",
          creatorId: "4", // Jennifer Chen
          startDate: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 2).toISOString(), // 2 days ago
          location: "Los Angeles, CA",
          venue: "The Rooftop Lounge",
          attendees: 85,
          interested: 150,
          status: "past",
          isUserAttending: true,
        },
      ]

      if (refresh) {
        // For refresh, randomize the order of non-past events
        const pastEvents = mockEvents.filter((e) => e.status === "past")
        const upcomingEvents = mockEvents.filter((e) => e.status !== "past").sort(() => Math.random() - 0.5)
        setEvents([...upcomingEvents, ...pastEvents])
      } else {
        setEvents(mockEvents)
      }
    } catch (error) {
      console.error("Error fetching events:", error)
      setError("Failed to load events. Please try again.")
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  // Handle refresh
  const handleRefresh = () => {
    fetchEvents(true)
  }

  // Filter events
  const filteredEvents = events.filter((event) => {
    if (filter === "upcoming") {
      return event.status === "upcoming"
    } else if (filter === "past") {
      return event.status === "past"
    }
    return true
  })

  // Toggle attendance status
  const toggleAttendance = useCallback((eventId: string) => {
    setEvents((prev) =>
      prev.map((event) => {
        if (event.id === eventId) {
          const isAttending = !event.isUserAttending
          return {
            ...event,
            isUserAttending: isAttending,
            isUserInterested: isAttending ? false : event.isUserInterested,
            attendees: isAttending ? event.attendees + 1 : event.attendees - 1,
          }
        }
        return event
      }),
    )
  }, [])

  // Toggle interest status
  const toggleInterest = useCallback((eventId: string) => {
    setEvents((prev) =>
      prev.map((event) => {
        if (event.id === eventId) {
          const isInterested = !event.isUserInterested
          return {
            ...event,
            isUserInterested: isInterested,
            isUserAttending: isInterested ? false : event.isUserAttending,
            interested: isInterested ? event.interested + 1 : event.interested - 1,
          }
        }
        return event
      }),
    )
  }, [])

  // Toggle notification status
  const toggleNotification = useCallback((eventId: string) => {
    setEvents((prev) =>
      prev.map((event) => {
        if (event.id === eventId) {
          return {
            ...event,
            isUserNotified: !event.isUserNotified,
          }
        }
        return event
      }),
    )
  }, [])

  // Loading skeleton
  if (isLoading) {
    return (
      <Card className="bg-gray-900 text-white border-gray-800 shadow-lg">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-md flex items-center">
            <Calendar className="h-4 w-4 mr-2 text-purple-400" />
            Event Updates
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="space-y-4">
            {[1, 2].map((_, i) => (
              <div key={i} className="flex space-x-3">
                <Skeleton className="h-20 w-20 rounded-md bg-gray-800" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3 bg-gray-800" />
                  <Skeleton className="h-3 w-1/2 bg-gray-800" />
                  <Skeleton className="h-3 w-1/3 bg-gray-800" />
                  <Skeleton className="h-3 w-1/4 bg-gray-800" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Error state
  if (error) {
    return (
      <Card className="bg-gray-900 text-white border-gray-800 shadow-lg">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-md flex items-center">
            <Calendar className="h-4 w-4 mr-2 text-purple-400" />
            Event Updates
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="text-center py-4 text-gray-400">
            <p>{error}</p>
            <Button variant="outline" className="mt-2" onClick={() => fetchEvents()}>
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <ErrorBoundary fallback={<div>Something went wrong with the event updates component.</div>}>
      <Card className="bg-gray-900 text-white border-gray-800 shadow-lg">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-md flex items-center">
            <Calendar className="h-4 w-4 mr-2 text-purple-400" />
            Event Updates
          </CardTitle>
          <div className="flex items-center space-x-2">
            <div className="flex bg-gray-800 rounded-md p-0.5">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`px-2 py-1 h-7 text-xs rounded-sm ${filter === "upcoming" ? "bg-gray-700" : ""}`}
                      onClick={() => setFilter("upcoming")}
                    >
                      Upcoming
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Show upcoming events</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`px-2 py-1 h-7 text-xs rounded-sm ${filter === "past" ? "bg-gray-700" : ""}`}
                      onClick={() => setFilter("past")}
                    >
                      Past
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Show past events</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`px-2 py-1 h-7 text-xs rounded-sm ${filter === "all" ? "bg-gray-700" : ""}`}
                      onClick={() => setFilter("all")}
                    >
                      All
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Show all events</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-gray-400 hover:text-white"
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                  >
                    <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Refresh events</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <AnimatePresence>
            {filteredEvents.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <p>No events found</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-800/50">
                {filteredEvents.map((event, index) => {
                  const creator = getUserById(event.creatorId)
                  if (!creator) return null

                  return (
                    <EventItem
                      key={event.id}
                      event={event}
                      creator={creator}
                      index={index}
                      onAttend={toggleAttendance}
                      onInterest={toggleInterest}
                      onNotify={toggleNotification}
                    />
                  )
                })}
              </div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </ErrorBoundary>
  )
}
