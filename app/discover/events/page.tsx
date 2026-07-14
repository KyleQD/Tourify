"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Search, 
  Filter, 
  MapPin, 
  Calendar, 
  Clock, 
  Users, 
  Music,
  Sparkles,
  Zap,
  TrendingUp,
  Star,
  Eye,
  Heart,
  Share2,
  ExternalLink,
  Loader2
} from "lucide-react"
import { format } from "date-fns"
import Link from "next/link"
import Image from "next/image"
import { formatEventTime } from "@/lib/events/format-event-time"

interface Event {
  id: string
  title: string
  description?: string
  type: string
  venue_name?: string
  venue_city?: string
  venue_state?: string
  event_date: string
  start_time?: string
  end_time?: string
  ticket_url?: string
  ticket_price_min?: number
  ticket_price_max?: number
  capacity?: number
  status: string
  is_public: boolean
  poster_url?: string
  tags?: string[]
  slug: string
  created_at: string
  creator: {
    id: string
    username: string
    full_name: string
    avatar_url?: string
    is_verified: boolean
  }
  attendance: {
    attending: number
    interested: number
    total: number
  }
}

export default function EventsDiscoveryPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedType, setSelectedType] = useState<string>("all")
  const [selectedLocation, setSelectedLocation] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("date")
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    loadEvents()
  }, [])

  useEffect(() => {
    filterEvents()
  }, [events, searchTerm, selectedType, selectedLocation, sortBy])

  const loadEvents = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/events/discover')
      const data = await response.json()
      setEvents(data.events || [])
    } catch (error) {
      console.error('Error loading events:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const filterEvents = () => {
    let filtered = [...events]

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(event =>
        event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.venue_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.venue_city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    // Type filter
    if (selectedType !== "all") {
      filtered = filtered.filter(event => event.type === selectedType)
    }

    // Location filter
    if (selectedLocation !== "all") {
      filtered = filtered.filter(event => 
        event.venue_city?.toLowerCase().includes(selectedLocation.toLowerCase()) ||
        event.venue_state?.toLowerCase().includes(selectedLocation.toLowerCase())
      )
    }

    // Sort
    switch (sortBy) {
      case "date":
        filtered.sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())
        break
      case "popularity":
        filtered.sort((a, b) => b.attendance.total - a.attendance.total)
        break
      case "title":
        filtered.sort((a, b) => a.title.localeCompare(b.title))
        break
    }

    setFilteredEvents(filtered)
  }

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case "concert":
        return <Music className="h-4 w-4" />
      case "festival":
        return <Sparkles className="h-4 w-4" />
      case "tour":
        return <Zap className="h-4 w-4" />
      case "recording":
        return <TrendingUp className="h-4 w-4" />
      case "interview":
        return <Star className="h-4 w-4" />
      default:
        return <Eye className="h-4 w-4" />
    }
  }

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case "concert":
        return "bg-purple-500/20 text-purple-400 border-purple-500/30"
      case "festival":
        return "bg-pink-500/20 text-pink-400 border-pink-500/30"
      case "tour":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30"
      case "recording":
        return "bg-green-500/20 text-green-400 border-green-500/30"
      case "interview":
        return "bg-orange-500/20 text-orange-400 border-orange-500/30"
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30"
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-slate-950 to-black text-white">
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-slate-950 to-black text-white">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-900/50 to-pink-900/50" />
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 px-6 py-12">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center"
            >
              <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent">
                Discover Events
              </h1>
              <p className="text-xl text-white/60 mb-8 max-w-2xl mx-auto">
                Find amazing live music events, concerts, festivals, and more happening near you
              </p>
            </motion.div>

            {/* Search and Filters */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="space-y-4"
            >
              {/* Search Bar */}
              <div className="relative max-w-2xl mx-auto">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/40 h-5 w-5" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search events, venues, artists..."
                  className="pl-12 bg-white/10 backdrop-blur-xl border border-white/20 text-white placeholder:text-white/40 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 h-14 text-lg"
                />
              </div>

              {/* Filter Toggle */}
              <div className="flex justify-center">
                <Button
                  onClick={() => setShowFilters(!showFilters)}
                  variant="outline"
                  className="bg-white/10 backdrop-blur-xl border border-white/20 text-white hover:bg-white/20"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  {showFilters ? 'Hide Filters' : 'Show Filters'}
                </Button>
              </div>

              {/* Filters */}
              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="max-w-4xl mx-auto"
                  >
                    <Card className="bg-white/10 backdrop-blur-xl border border-white/20">
                      <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="text-sm font-medium text-white/80 mb-2 block">Event Type</label>
                            <Select value={selectedType} onValueChange={setSelectedType}>
                              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-900 border-white/20">
                                <SelectItem value="all">All Types</SelectItem>
                                <SelectItem value="concert">Concert</SelectItem>
                                <SelectItem value="festival">Festival</SelectItem>
                                <SelectItem value="tour">Tour</SelectItem>
                                <SelectItem value="recording">Recording</SelectItem>
                                <SelectItem value="interview">Interview</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <label className="text-sm font-medium text-white/80 mb-2 block">Location</label>
                            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-900 border-white/20">
                                <SelectItem value="all">All Locations</SelectItem>
                                <SelectItem value="new york">New York</SelectItem>
                                <SelectItem value="los angeles">Los Angeles</SelectItem>
                                <SelectItem value="chicago">Chicago</SelectItem>
                                <SelectItem value="miami">Miami</SelectItem>
                                <SelectItem value="nashville">Nashville</SelectItem>
                                <SelectItem value="austin">Austin</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <label className="text-sm font-medium text-white/80 mb-2 block">Sort By</label>
                            <Select value={sortBy} onValueChange={setSortBy}>
                              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-900 border-white/20">
                                <SelectItem value="date">Date</SelectItem>
                                <SelectItem value="popularity">Popularity</SelectItem>
                                <SelectItem value="title">Title</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Events Grid */}
      <div className="px-6 py-12">
        <div className="max-w-7xl mx-auto">
          {/* Results Count */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mb-8"
          >
            <p className="text-white/60">
              Found {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''}
              {searchTerm && ` matching "${searchTerm}"`}
            </p>
          </motion.div>

          {/* Events Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredEvents.map((event, index) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <Card className="bg-white/5 backdrop-blur-xl border border-white/10 hover:border-white/20 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/10 group">
                    {/* Event Image */}
                    <div className="relative h-48 overflow-hidden rounded-t-lg">
                      {event.poster_url ? (
                        <Image
                          src={event.poster_url}
                          alt={event.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-r from-purple-900/50 to-pink-900/50 flex items-center justify-center">
                          <Music className="h-12 w-12 text-white/40" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/30" />
                      
                      {/* Event Type Badge */}
                      <div className="absolute top-4 left-4">
                        <Badge className={`${getEventTypeColor(event.type)} border`}>
                          {getEventTypeIcon(event.type)}
                          <span className="ml-1 capitalize">{event.type}</span>
                        </Badge>
                      </div>

                      {/* Attendance Badge */}
                      <div className="absolute top-4 right-4">
                        <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                          <Users className="h-3 w-3 mr-1" />
                          {event.attendance.total}
                        </Badge>
                      </div>
                    </div>

                    <CardContent className="p-6">
                      {/* Event Title */}
                      <Link href={`/events/${event.slug}`}>
                        <h3 className="text-xl font-bold text-white mb-2 group-hover:text-purple-300 transition-colors duration-300">
                          {event.title}
                        </h3>
                      </Link>

                      {/* Event Details */}
                      <div className="space-y-3 mb-4">
                        <div className="flex items-center gap-2 text-white/60">
                          <Calendar className="h-4 w-4" />
                          <span>{format(new Date(event.event_date), 'EEEE, MMMM d, yyyy')}</span>
                        </div>

                        {event.start_time && formatEventTime(event.start_time) && (
                          <div className="flex items-center gap-2 text-white/60">
                            <Clock className="h-4 w-4" />
                            <span>{formatEventTime(event.start_time)}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-2 text-white/60">
                          <MapPin className="h-4 w-4" />
                          <span>
                            {event.venue_name}
                            {event.venue_city && `, ${event.venue_city}`}
                            {event.venue_state && `, ${event.venue_state}`}
                          </span>
                        </div>
                      </div>

                      {/* Event Description */}
                      {event.description && (
                        <p className="text-white/70 text-sm mb-4 line-clamp-2">
                          {event.description}
                        </p>
                      )}

                      {/* Tags */}
                      {event.tags && event.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {event.tags.slice(0, 3).map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs bg-white/10 border-white/20 text-white/70">
                              #{tag}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Creator Info */}
                      <div className="flex items-center gap-3 mb-4">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={event.creator.avatar_url} />
                          <AvatarFallback className="bg-purple-500/20 text-purple-300">
                            {event.creator.full_name?.charAt(0) || event.creator.username?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium text-white">
                            {event.creator.full_name}
                            {event.creator.is_verified && (
                              <Badge variant="secondary" className="ml-1 text-xs">✓</Badge>
                            )}
                          </p>
                          <p className="text-xs text-white/60">@{event.creator.username}</p>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <Button asChild className="flex-1 bg-purple-600 hover:bg-purple-700">
                          <Link href={`/events/${event.slug}`}>
                            View Event
                          </Link>
                        </Button>
                        {event.ticket_url && (
                          <Button asChild variant="outline" size="sm">
                            <a href={event.ticket_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* No Results */}
          {filteredEvents.length === 0 && !isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <div className="max-w-md mx-auto">
                <Music className="h-16 w-16 text-white/20 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No events found</h3>
                <p className="text-white/60 mb-4">
                  Try adjusting your search terms or filters to find more events.
                </p>
                <Button
                  onClick={() => {
                    setSearchTerm("")
                    setSelectedType("all")
                    setSelectedLocation("all")
                  }}
                  variant="outline"
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  Clear Filters
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
