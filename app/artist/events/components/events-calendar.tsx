"use client"

import { useState, useEffect } from "react"
import { useArtist } from "@/contexts/artist-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns"
import { ChevronLeft, ChevronRight, Calendar, MapPin, Clock, Users, Plus } from "lucide-react"
import Link from "next/link"

interface Event {
  id: string
  title: string
  description?: string
  type: 'concert' | 'festival' | 'tour' | 'recording' | 'interview' | 'other'
  venue_name?: string
  venue_city?: string
  venue_state?: string
  event_date: string
  start_time?: string
  status: 'upcoming' | 'in_progress' | 'completed' | 'cancelled' | 'postponed'
  is_public: boolean
  capacity?: number
  expected_attendance?: number
  ticket_price_min?: number
}

interface EventsCalendarProps {
  onCreateEvent?: () => void
}

export default function EventsCalendar({ onCreateEvent }: EventsCalendarProps) {
  const { user } = useArtist()
  const [events, setEvents] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  useEffect(() => {
    if (user) {
      loadEvents()
    }
  }, [user, currentDate])

  const loadEvents = async () => {
    if (!user) return

    try {
      setIsLoading(true)
      
      // Load events for the current month view
      const monthStart = startOfMonth(currentDate)
      const monthEnd = endOfMonth(currentDate)
      
      const { data, error } = await supabase
        .from('artist_events')
        .select('*')
        .eq('user_id', user.id)
        .gte('event_date', monthStart.toISOString().split('T')[0])
        .lte('event_date', monthEnd.toISOString().split('T')[0])
        .order('event_date', { ascending: true })

      if (error) throw error
      setEvents(data || [])
    } catch (error) {
      console.error('Error loading events:', error)
      toast.error('Failed to load events')
    } finally {
      setIsLoading(false)
    }
  }

  const getDaysInMonth = () => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    return eachDayOfInterval({ start: monthStart, end: monthEnd })
  }

  const getEventsForDate = (date: Date) => {
    return events.filter(event => 
      isSameDay(new Date(event.event_date), date)
    )
  }

  const getStatusColor = (status: Event['status']) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-500/20 text-blue-300 border-blue-500/30'
      case 'in_progress': return 'bg-green-500/20 text-green-300 border-green-500/30'
      case 'completed': return 'bg-gray-500/20 text-gray-300 border-gray-500/30'
      case 'cancelled': return 'bg-red-500/20 text-red-300 border-red-500/30'
      case 'postponed': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30'
    }
  }

  const getTypeColor = (type: Event['type']) => {
    switch (type) {
      case 'concert': return 'bg-purple-500'
      case 'festival': return 'bg-green-500'
      case 'tour': return 'bg-blue-500'
      case 'recording': return 'bg-red-500'
      case 'interview': return 'bg-yellow-500'
      default: return 'bg-gray-500'
    }
  }

  const previousMonth = () => {
    setCurrentDate(prev => subMonths(prev, 1))
  }

  const nextMonth = () => {
    setCurrentDate(prev => addMonths(prev, 1))
  }

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : []

  return (
    <div className="space-y-6">
      <Card className="bg-slate-900/50 border-slate-700/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Events Calendar
            </CardTitle>
            {onCreateEvent && (
              <Button onClick={onCreateEvent} size="sm" className="bg-purple-600 hover:bg-purple-700">
                <Plus className="h-4 w-4 mr-2" />
                Add Event
              </Button>
            )}
          </div>
          
          {/* Month Navigation */}
          <div className="flex items-center justify-between mt-4">
            <Button variant="ghost" onClick={previousMonth} size="sm">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-xl font-semibold text-white">
              {format(currentDate, 'MMMM yyyy')}
            </h2>
            <Button variant="ghost" onClick={nextMonth} size="sm">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          {isLoading ? (
            <div className="animate-pulse">
              <div className="grid grid-cols-7 gap-2 mb-4">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="h-8 bg-slate-700 rounded"></div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: 35 }).map((_, i) => (
                  <div key={i} className="h-24 bg-slate-700 rounded"></div>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Calendar Header */}
              <div className="grid grid-cols-7 gap-2 mb-4">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center text-sm font-medium text-gray-400 py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-2">
                {getDaysInMonth().map(day => {
                  const dayEvents = getEventsForDate(day)
                  const isSelected = selectedDate && isSameDay(day, selectedDate)
                  const isCurrentMonth = isSameMonth(day, currentDate)
                  const isToday = isSameDay(day, new Date())

                  return (
                    <div
                      key={day.toString()}
                      onClick={() => setSelectedDate(day)}
                      className={`
                        min-h-[96px] p-2 border border-slate-700 rounded-lg cursor-pointer transition-all
                        ${isSelected ? 'ring-2 ring-purple-500 bg-purple-500/10' : 'hover:bg-slate-800/50'}
                        ${!isCurrentMonth ? 'opacity-50' : ''}
                        ${isToday ? 'bg-blue-500/10 border-blue-500/50' : ''}
                      `}
                    >
                      <div className={`
                        text-sm font-medium mb-1
                        ${isToday ? 'text-blue-300' : isCurrentMonth ? 'text-white' : 'text-gray-500'}
                      `}>
                        {format(day, 'd')}
                      </div>
                      
                      <div className="space-y-1">
                        {dayEvents.slice(0, 2).map(event => (
                          <div
                            key={event.id}
                            className={`
                              text-xs p-1 rounded truncate text-white
                              ${getTypeColor(event.type)}
                            `}
                            title={event.title}
                          >
                            {event.title}
                          </div>
                        ))}
                        
                        {dayEvents.length > 2 && (
                          <div className="text-xs text-gray-400 px-1">
                            +{dayEvents.length - 2} more
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Selected Date Events */}
      {selectedDate && (
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-white">
              Events for {format(selectedDate, 'PPP')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedDateEvents.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400 mb-4">No events scheduled for this date</p>
                {onCreateEvent && (
                  <Button onClick={onCreateEvent} size="sm" className="bg-purple-600 hover:bg-purple-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Event
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {selectedDateEvents.map(event => (
                  <Link key={event.id} href={`/artist/events/${event.id}`}>
                    <div className="p-4 bg-slate-800/50 rounded-lg hover:bg-slate-800/70 transition-colors border border-slate-700/50 hover:border-purple-500/50">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-white mb-1">{event.title}</h3>
                          {event.description && (
                            <p className="text-gray-400 text-sm mb-2">{event.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(event.status)}>
                            {event.status.replace('_', ' ')}
                          </Badge>
                          <Badge variant="outline" className="bg-purple-600/20 text-purple-300 border-purple-500/30">
                            {event.type}
                          </Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        {event.start_time && (
                          <div className="flex items-center gap-2 text-gray-300">
                            <Clock className="h-4 w-4 text-blue-400" />
                            <span>{event.start_time}</span>
                          </div>
                        )}
                        
                        {event.venue_name && (
                          <div className="flex items-center gap-2 text-gray-300">
                            <MapPin className="h-4 w-4 text-red-400" />
                            <span>
                              {event.venue_name}
                              {event.venue_city && `, ${event.venue_city}`}
                            </span>
                          </div>
                        )}
                        
                        {event.expected_attendance && (
                          <div className="flex items-center gap-2 text-gray-300">
                            <Users className="h-4 w-4 text-green-400" />
                            <span>{event.expected_attendance.toLocaleString()} expected</span>
                          </div>
                        )}
                      </div>

                      {event.ticket_price_min && (
                        <div className="mt-3 pt-3 border-t border-slate-700/50">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400 text-sm">Tickets</span>
                            <span className="text-green-400 font-medium">
                              ${event.ticket_price_min}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Upcoming Events Summary */}
      <Card className="bg-slate-900/50 border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-white">Upcoming Events Summary</CardTitle>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400 mb-4">No events scheduled for this month</p>
              {onCreateEvent && (
                <Button onClick={onCreateEvent} className="bg-purple-600 hover:bg-purple-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Event
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-slate-800/50 rounded-lg">
                <div className="text-2xl font-bold text-blue-400">{events.length}</div>
                <div className="text-sm text-gray-400">Total Events</div>
              </div>
              
              <div className="text-center p-4 bg-slate-800/50 rounded-lg">
                <div className="text-2xl font-bold text-green-400">
                  {events.filter(e => e.status === 'upcoming').length}
                </div>
                <div className="text-sm text-gray-400">Upcoming</div>
              </div>
              
              <div className="text-center p-4 bg-slate-800/50 rounded-lg">
                <div className="text-2xl font-bold text-purple-400">
                  {events.reduce((sum, e) => sum + (e.expected_attendance || 0), 0).toLocaleString()}
                </div>
                <div className="text-sm text-gray-400">Expected Attendance</div>
              </div>
              
              <div className="text-center p-4 bg-slate-800/50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-400">
                  ${events.reduce((sum, e) => sum + ((e.ticket_price_min || 0) * (e.expected_attendance || 0)), 0).toLocaleString()}
                </div>
                <div className="text-sm text-gray-400">Projected Revenue</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 