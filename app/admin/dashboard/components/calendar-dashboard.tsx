"use client"

import { useState, useMemo, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Globe, 
  Music, 
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Users,
  DollarSign,
  Eye,
  Edit,
  MoreHorizontal
} from "lucide-react"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, isSameMonth, addMonths, subMonths } from "date-fns"
import { mapAdminEventStatus, normalizeAdminEvent } from "@/lib/events/admin-event-normalization"
import { formatSafeCurrency } from "@/lib/format/number-format"

interface CalendarEvent {
  id: string
  title: string
  type: 'tour' | 'event' | 'meeting' | 'deadline'
  date: Date
  startTime?: string
  endTime?: string
  location?: string
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled'
  attendees?: number
  revenue?: number
  color?: string
}

interface CalendarDashboardProps {
  tours?: any[]
  events?: any[]
  onEventClick?: (event: CalendarEvent) => void
  onAddEvent?: () => void
  className?: string
}

function mapCalendarStatus(status?: string): CalendarEvent["status"] {
  const normalizedStatus = mapAdminEventStatus(status)
  if (normalizedStatus === "scheduled") return "scheduled"
  if (normalizedStatus === "confirmed" || normalizedStatus === "in_progress") return "confirmed"
  if (normalizedStatus === "completed") return "completed"
  if (normalizedStatus === "cancelled") return "cancelled"
  return "scheduled"
}

export default function CalendarDashboard({ 
  tours = [], 
  events = [], 
  onEventClick, 
  onAddEvent,
  className = "" 
}: CalendarDashboardProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month')

  // Transform tours and events into calendar events
  const calendarEvents = useMemo(() => {
    const calendarEvents: CalendarEvent[] = []

    // Add tours
    tours.forEach(tour => {
      const startDate = tour.startDate || tour.start_date || tour.start_at
      if (startDate) {
        calendarEvents.push({
          id: `tour-${tour.id}`,
          title: tour.name || tour.title || 'Tour',
          type: 'tour',
          date: new Date(startDate),
          startTime: tour.startTime || tour.start_time,
          endTime: tour.endTime || tour.end_time,
          location: tour.venues?.[0]?.name || 'TBD',
          status: mapCalendarStatus(tour.status),
          attendees: tour.totalCapacity || tour.total_capacity,
          revenue: tour.totalRevenue || tour.total_revenue,
          color: 'bg-purple-500'
        })
      }
    })

    // Add events
    events.forEach(event => {
      const normalizedEvent = normalizeAdminEvent(event)
      if (normalizedEvent.event_date) {
        calendarEvents.push({
          id: `event-${normalizedEvent.id}`,
          title: normalizedEvent.name,
          type: 'event',
          date: new Date(normalizedEvent.event_date),
          startTime: normalizedEvent.event_time || event.startTime || event.start_time,
          endTime: event.endTime || event.end_time,
          location: normalizedEvent.venue_name || event.venueName || 'TBD',
          status: mapCalendarStatus(normalizedEvent.status),
          attendees: normalizedEvent.capacity,
          revenue: normalizedEvent.expected_revenue || event.expectedRevenue || event.actual_revenue,
          color: 'bg-blue-500'
        })
      }
    })

    return calendarEvents.sort((a, b) => a.date.getTime() - b.date.getTime())
  }, [tours, events])

  // Get events for a specific date
  const getEventsForDate = useCallback((date: Date) => {
    return calendarEvents.filter(event => isSameDay(event.date, date))
  }, [calendarEvents])

  // Get month data
  const monthData = useMemo(() => {
    const start = startOfMonth(currentDate)
    const end = endOfMonth(currentDate)
    const days = eachDayOfInterval({ start, end })

    return days.map(day => ({
      date: day,
      events: getEventsForDate(day),
      isCurrentMonth: isSameMonth(day, currentDate),
      isToday: isToday(day)
    }))
  }, [currentDate, getEventsForDate])

  // Navigation
  const goToPreviousMonth = () => setCurrentDate(subMonths(currentDate, 1))
  const goToNextMonth = () => setCurrentDate(addMonths(currentDate, 1))
  const goToToday = () => setCurrentDate(new Date())

  // Event handlers
  const handleDateClick = (date: Date) => {
    setSelectedDate(date)
  }

  const handleEventClick = (event: CalendarEvent) => {
    onEventClick?.(event)
  }

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'tour': return <Globe className="h-3 w-3" />
      case 'event': return <Music className="h-3 w-3" />
      case 'meeting': return <Users className="h-3 w-3" />
      case 'deadline': return <Clock className="h-3 w-3" />
      default: return <CalendarIcon className="h-3 w-3" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-500'
      case 'scheduled': return 'bg-blue-500'
      case 'completed': return 'bg-gray-500'
      case 'cancelled': return 'bg-red-500'
      default: return 'bg-yellow-500'
    }
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold text-white">Calendar</h2>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPreviousMonth}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={goToToday}
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={goToNextMonth}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <span className="text-lg font-medium text-white">
            {format(currentDate, 'MMMM yyyy')}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode('month')}
            className={viewMode === 'month' ? 'bg-blue-600 text-white' : ''}
          >
            Month
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode('week')}
            className={viewMode === 'week' ? 'bg-blue-600 text-white' : ''}
          >
            Week
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode('day')}
            className={viewMode === 'day' ? 'bg-blue-600 text-white' : ''}
          >
            Day
          </Button>
          <Button
            onClick={onAddEvent}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Event
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <Card className="bg-slate-900/50 border-slate-700/50">
        <CardContent className="p-6">
          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-sm font-medium text-slate-400 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1">
            {monthData.map((dayData, index) => (
              <motion.div
                key={index}
                className={`
                  min-h-[120px] p-2 border border-slate-700/50 rounded-lg cursor-pointer
                  ${dayData.isCurrentMonth ? 'bg-slate-800/50' : 'bg-slate-900/30'}
                  ${dayData.isToday ? 'ring-2 ring-blue-500' : ''}
                  ${selectedDate && isSameDay(dayData.date, selectedDate) ? 'ring-2 ring-purple-500' : ''}
                  hover:bg-slate-700/50 transition-colors
                `}
                onClick={() => handleDateClick(dayData.date)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {/* Date Number */}
                <div className={`
                  text-sm font-medium mb-1
                  ${dayData.isCurrentMonth ? 'text-white' : 'text-slate-600'}
                  ${dayData.isToday ? 'text-blue-400' : ''}
                `}>
                  {format(dayData.date, 'd')}
                </div>

                {/* Events */}
                <div className="space-y-1">
                  <AnimatePresence>
                    {dayData.events.slice(0, 3).map((event, eventIndex) => (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className={`
                          ${event.color} text-white text-xs p-1 rounded cursor-pointer
                          hover:opacity-80 transition-opacity
                        `}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEventClick(event)
                        }}
                      >
                        <div className="flex items-center space-x-1">
                          {getEventIcon(event.type)}
                          <span className="truncate">{event.title}</span>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  
                  {dayData.events.length > 3 && (
                    <div className="text-xs text-slate-400 text-center">
                      +{dayData.events.length - 3} more
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Selected Date Events */}
      <AnimatePresence>
        {selectedDate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="bg-slate-900/50 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-white">
                  Events for {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {getEventsForDate(selectedDate).length === 0 ? (
                  <p className="text-slate-400 text-center py-4">No events scheduled for this date</p>
                ) : (
                  <div className="space-y-3">
                    {getEventsForDate(selectedDate).map((event) => (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-lg ${event.color}`}>
                            {getEventIcon(event.type)}
                          </div>
                          <div>
                            <h4 className="font-medium text-white">{event.title}</h4>
                            <div className="flex items-center space-x-4 text-sm text-slate-400">
                              {event.startTime && (
                                <span className="flex items-center space-x-1">
                                  <Clock className="h-3 w-3" />
                                  <span>{event.startTime}</span>
                                </span>
                              )}
                              {event.location && (
                                <span className="flex items-center space-x-1">
                                  <MapPin className="h-3 w-3" />
                                  <span>{event.location}</span>
                                </span>
                              )}
                              {event.attendees && (
                                <span className="flex items-center space-x-1">
                                  <Users className="h-3 w-3" />
                                  <span>{event.attendees}</span>
                                </span>
                              )}
                              {event.revenue && (
                                <span className="flex items-center space-x-1">
                                  <DollarSign className="h-3 w-3" />
                                  <span>{formatSafeCurrency(event.revenue)}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className={`text-xs ${getStatusColor(event.status)}`}>
                            {event.status}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEventClick(event)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upcoming Events Summary */}
      <Card className="bg-slate-900/50 border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-white">Upcoming Events</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {calendarEvents
              .filter(event => event.date > new Date())
              .slice(0, 5)
              .map((event) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between p-3 hover:bg-slate-800/50 rounded-lg transition-colors cursor-pointer"
                  onClick={() => handleEventClick(event)}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${event.color}`}>
                      {getEventIcon(event.type)}
                    </div>
                    <div>
                      <h4 className="font-medium text-white">{event.title}</h4>
                      <p className="text-sm text-slate-400">
                        {format(event.date, 'MMM d, yyyy')}
                        {event.startTime && ` at ${event.startTime}`}
                      </p>
                    </div>
                  </div>
                  <Badge className={`text-xs ${getStatusColor(event.status)}`}>
                    {event.status}
                  </Badge>
                </motion.div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 