"use client"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { motion, AnimatePresence } from "framer-motion"
import { formatSafeNumber } from "@/lib/format/number-format"
import {
  Globe,
  Calendar,
  Search,
  ChevronDown,
  Clock,
  MapPin,
  Users,
  DollarSign,
  Activity,
  Star,
  Plus,
  Filter,
  MoreHorizontal,
  Play,
  Pause,
  CheckCircle,
  AlertTriangle,
  Radio,
  X
} from "lucide-react"

interface Tour {
  id: string
  name: string
  status: 'planning' | 'active' | 'completed' | 'cancelled'
  startDate: string
  endDate: string
  totalEvents: number
  completedEvents: number
  revenue: number
  progress: number
  artist?: {
    name: string
    avatar?: string
  }
  upcomingEvent?: {
    name: string
    date: string
    venue: string
  }
}

interface TourEvent {
  id: string
  name: string
  tourId: string
  tourName: string
  date: string
  venue: string
  status: 'scheduled' | 'confirmed' | 'live' | 'completed' | 'cancelled'
  progress: number
  capacity?: number
  ticketsSold?: number
  artist?: {
    name: string
    avatar?: string
  }
}

interface TourEventSelectorProps {
  onTourSelect?: (tourId: string) => void
  onEventSelect?: (eventId: string) => void
  className?: string
}

export function TourEventSelector({ onTourSelect, onEventSelect, className = "" }: TourEventSelectorProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [selectedTour, setSelectedTour] = useState<string | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState<"tours" | "events">("tours")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [isLoading, setIsLoading] = useState(true)

  // Mock data - replace with real API calls
  const [tours, setTours] = useState<Tour[]>([
    {
      id: "tour-1",
      name: "West Coast Summer Tour",
      status: "active",
      startDate: "2025-06-01",
      endDate: "2025-08-15",
      totalEvents: 12,
      completedEvents: 5,
      revenue: 485000,
      progress: 42,
      artist: {
        name: "The Electric Waves",
        avatar: "/placeholder-artist.jpg"
      },
      upcomingEvent: {
        name: "Los Angeles Show",
        date: "Jul 15",
        venue: "The Greek Theatre"
      }
    },
    {
      id: "tour-2",
      name: "European Festival Circuit",
      status: "planning",
      startDate: "2025-09-01",
      endDate: "2025-10-30",
      totalEvents: 8,
      completedEvents: 0,
      revenue: 0,
      progress: 15,
      artist: {
        name: "Acoustic Soul",
        avatar: "/placeholder-artist.jpg"
      },
      upcomingEvent: {
        name: "Berlin Festival",
        date: "Sep 10",
        venue: "Tempelhof Sounds"
      }
    },
    {
      id: "tour-3",
      name: "Indie Rock Winter Series",
      status: "completed",
      startDate: "2024-12-01",
      endDate: "2025-02-28",
      totalEvents: 15,
      completedEvents: 15,
      revenue: 720000,
      progress: 100,
      artist: {
        name: "Night Riders",
        avatar: "/placeholder-artist.jpg"
      }
    }
  ])

  const [events, setEvents] = useState<TourEvent[]>([
    {
      id: "event-1",
      name: "Summer Music Festival",
      tourId: "tour-1",
      tourName: "West Coast Summer Tour",
      date: "Today",
      venue: "Central Park",
      status: "live",
      progress: 75,
      capacity: 5000,
      ticketsSold: 4200,
      artist: {
        name: "The Electric Waves",
        avatar: "/placeholder-artist.jpg"
      }
    },
    {
      id: "event-2",
      name: "Indie Rock Night",
      tourId: "tour-1",
      tourName: "West Coast Summer Tour",
      date: "Tomorrow",
      venue: "Madison Square Garden",
      status: "confirmed",
      progress: 90,
      capacity: 8000,
      ticketsSold: 7200,
      artist: {
        name: "The Electric Waves",
        avatar: "/placeholder-artist.jpg"
      }
    },
    {
      id: "event-3",
      name: "Electronic Showcase",
      tourId: "tour-2",
      tourName: "European Festival Circuit",
      date: "Sep 15",
      venue: "Brooklyn Warehouse",
      status: "scheduled",
      progress: 25,
      capacity: 2000,
      ticketsSold: 150,
      artist: {
        name: "DJ Luna",
        avatar: "/placeholder-artist.jpg"
      }
    }
  ])

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => setIsLoading(false), 1000)
    return () => clearTimeout(timer)
  }, [])

  // Auto-detect current tour/event from URL
  useEffect(() => {
    const pathSegments = pathname.split('/')
    const tourIndex = pathSegments.indexOf('tours')
    const eventIndex = pathSegments.indexOf('events')

    if (tourIndex !== -1 && pathSegments[tourIndex + 1]) {
      setSelectedTour(pathSegments[tourIndex + 1])
    }
    if (eventIndex !== -1 && pathSegments[eventIndex + 1]) {
      setSelectedEvent(pathSegments[eventIndex + 1])
    }
  }, [pathname])

  const handleTourSelect = (tourId: string) => {
    setSelectedTour(tourId)
    onTourSelect?.(tourId)
    router.push(`/admin/dashboard/tours/${tourId}`)
  }

  const handleEventSelect = (eventId: string) => {
    setSelectedEvent(eventId)
    onEventSelect?.(eventId)
    router.push(`/admin/dashboard/events/${eventId}`)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live': return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'active': return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'confirmed': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'planning': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'scheduled': return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
      case 'completed': return 'bg-slate-500/20 text-slate-400 border-slate-500/30'
      case 'cancelled': return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'live': return <Radio className="h-3 w-3" />
      case 'active': return <Play className="h-3 w-3" />
      case 'confirmed': return <CheckCircle className="h-3 w-3" />
      case 'planning': return <Clock className="h-3 w-3" />
      case 'scheduled': return <Calendar className="h-3 w-3" />
      case 'completed': return <CheckCircle className="h-3 w-3" />
      case 'cancelled': return <AlertTriangle className="h-3 w-3" />
      default: return <Activity className="h-3 w-3" />
    }
  }

  const filteredTours = tours.filter(tour => {
    const matchesSearch = tour.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         tour.artist?.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || tour.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         event.venue.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         event.tourName.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || event.status === statusFilter
    return matchesSearch && matchesStatus
  })

  if (isLoading) {
    return (
      <Card className={`bg-slate-900/50 border-slate-700/50 ${className}`}>
        <CardContent className="p-4">
          <div className="animate-pulse">
            <div className="h-4 bg-slate-700 rounded w-32 mb-3"></div>
            <div className="h-10 bg-slate-700 rounded mb-2"></div>
            <div className="h-4 bg-slate-700 rounded w-24"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`bg-slate-900/50 border-slate-700/50 ${className}`}>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Globe className="h-5 w-5 text-purple-400" />
              <h3 className="text-sm font-medium text-white">Tour & Event Selector</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-white"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search tours and events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-slate-800/50 border-slate-600/50 text-white placeholder:text-slate-400"
            />
          </div>

          {/* Tabs and Filters */}
          <div className="flex items-center justify-between">
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "tours" | "events")}>
              <TabsList className="bg-slate-800/50 p-1">
                <TabsTrigger value="tours" className="data-[state=active]:bg-slate-700 text-xs">
                  Tours ({filteredTours.length})
                </TabsTrigger>
                <TabsTrigger value="events" className="data-[state=active]:bg-slate-700 text-xs">
                  Events ({filteredEvents.length})
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-24 h-8 bg-slate-800/50 border-slate-600/50 text-xs">
                <Filter className="h-3 w-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="live">Live</SelectItem>
                <SelectItem value="planning">Planning</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Content */}
          <ScrollArea className="h-64">
            <AnimatePresence mode="wait">
              {activeTab === "tours" ? (
                <motion.div
                  key="tours"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-2"
                >
                  {filteredTours.map((tour) => (
                    <motion.div
                      key={tour.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div
                        onClick={() => handleTourSelect(tour.id)}
                        className={`p-3 rounded-lg cursor-pointer transition-all duration-200 border ${
                          selectedTour === tour.id
                            ? 'bg-purple-600/20 border-purple-500/30 text-white'
                            : 'bg-slate-800/30 border-slate-700/30 hover:bg-slate-800/50 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={tour.artist?.avatar} />
                              <AvatarFallback className="text-xs">
                                {tour.artist?.name?.[0] || 'T'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium truncate">{tour.name}</p>
                              <p className="text-xs text-slate-400">{tour.artist?.name}</p>
                            </div>
                          </div>
                          <Badge className={`text-xs ${getStatusColor(tour.status)}`}>
                            {getStatusIcon(tour.status)}
                            <span className="ml-1 capitalize">{tour.status}</span>
                          </Badge>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-400">Progress</span>
                            <span className="text-slate-300">{tour.progress}%</span>
                          </div>
                          <div className="w-full bg-slate-700 rounded-full h-1.5">
                            <div 
                              className="bg-gradient-to-r from-purple-500 to-blue-500 h-1.5 rounded-full transition-all duration-500"
                              style={{ width: `${tour.progress}%` }}
                            />
                          </div>

                          <div className="flex items-center justify-between text-xs text-slate-400">
                            <span>{tour.completedEvents}/{tour.totalEvents} events</span>
                            <span>${(tour.revenue / 1000).toFixed(0)}K revenue</span>
                          </div>

                          {tour.upcomingEvent && (
                            <div className="flex items-center space-x-2 text-xs text-slate-400 pt-1 border-t border-slate-700/50">
                              <Calendar className="h-3 w-3" />
                              <span>Next: {tour.upcomingEvent.name} • {tour.upcomingEvent.date}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  key="events"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-2"
                >
                  {filteredEvents.map((event) => (
                    <motion.div
                      key={event.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div
                        onClick={() => handleEventSelect(event.id)}
                        className={`p-3 rounded-lg cursor-pointer transition-all duration-200 border ${
                          selectedEvent === event.id
                            ? 'bg-purple-600/20 border-purple-500/30 text-white'
                            : 'bg-slate-800/30 border-slate-700/30 hover:bg-slate-800/50 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={event.artist?.avatar} />
                              <AvatarFallback className="text-xs">
                                {event.artist?.name?.[0] || 'E'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium truncate">{event.name}</p>
                              <p className="text-xs text-slate-400">{event.tourName}</p>
                            </div>
                          </div>
                          <Badge className={`text-xs ${getStatusColor(event.status)}`}>
                            {getStatusIcon(event.status)}
                            <span className="ml-1 capitalize">{event.status}</span>
                          </Badge>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center space-x-1">
                              <MapPin className="h-3 w-3 text-slate-400" />
                              <span className="text-slate-400">{event.venue}</span>
                            </div>
                            <span className="text-slate-300">{event.date}</span>
                          </div>

                          {event.capacity && event.ticketsSold && (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-400">Tickets</span>
                                <span className="text-slate-300">
                                  {formatSafeNumber(event.ticketsSold)} / {formatSafeNumber(event.capacity)}
                                </span>
                              </div>
                              <div className="w-full bg-slate-700 rounded-full h-1.5">
                                <div 
                                  className="bg-gradient-to-r from-green-500 to-blue-500 h-1.5 rounded-full transition-all duration-500"
                                  style={{ width: `${(event.ticketsSold / event.capacity) * 100}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </ScrollArea>

          {/* Current Selection Summary */}
          {(selectedTour || selectedEvent) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="border-t border-slate-700/50 pt-3"
            >
              <div className="text-xs text-slate-400 mb-1">Currently Viewing</div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {selectedTour ? (
                    <Globe className="h-4 w-4 text-purple-400" />
                  ) : (
                    <Calendar className="h-4 w-4 text-blue-400" />
                  )}
                  <span className="text-sm text-white">
                    {selectedTour 
                      ? tours.find(t => t.id === selectedTour)?.name 
                      : events.find(e => e.id === selectedEvent)?.name
                    }
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedTour(null)
                    setSelectedEvent(null)
                    router.push('/admin/dashboard')
                  }}
                  className="text-slate-400 hover:text-white h-6 px-2"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </CardContent>
    </Card>
  )
} 