"use client"

import { useState, useEffect } from "react"
import { useArtist } from "@/contexts/artist-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { 
  Calendar, 
  TrendingUp, 
  Users, 
  DollarSign, 
  MapPin, 
  Clock,
  BarChart,
  PieChart,
  Target,
  Award
} from "lucide-react"
import { LineChart, Line, BarChart as RechartsBarChart, Bar, PieChart as RechartsPieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from "recharts"
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns"

interface Event {
  id: string
  title: string
  type: 'concert' | 'festival' | 'tour' | 'recording' | 'interview' | 'other'
  venue_name?: string
  venue_city?: string
  venue_state?: string
  event_date: string
  status: 'upcoming' | 'in_progress' | 'completed' | 'cancelled' | 'postponed'
  capacity?: number
  expected_attendance?: number
  ticket_price_min?: number
  ticket_price_max?: number
}

interface EventAnalytics {
  totalEvents: number
  completedEvents: number
  upcomingEvents: number
  cancelledEvents: number
  totalRevenue: number
  averageAttendance: number
  topVenues: { name: string; count: number; city?: string }[]
  eventsByType: { type: string; count: number; color: string }[]
  monthlyPerformance: { month: string; events: number; attendance: number; revenue: number }[]
  attendanceByMonth: { month: string; attendance: number }[]
  revenueByMonth: { month: string; revenue: number }[]
}

interface EventAnalyticsProps {
  timeRange?: string
}

export default function EventAnalytics({ timeRange = "12m" }: EventAnalyticsProps) {
  const { user } = useArtist()
  const [events, setEvents] = useState<Event[]>([])
  const [analytics, setAnalytics] = useState<EventAnalytics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange)

  useEffect(() => {
    if (user) {
      loadEvents()
    }
  }, [user, selectedTimeRange])

  useEffect(() => {
    if (events.length > 0) {
      calculateAnalytics()
    }
  }, [events])

  const loadEvents = async () => {
    if (!user) return

    try {
      setIsLoading(true)
      
      // Calculate date range based on selection
      let startDate = new Date()
      switch (selectedTimeRange) {
        case "1m":
          startDate = subMonths(new Date(), 1)
          break
        case "3m":
          startDate = subMonths(new Date(), 3)
          break
        case "6m":
          startDate = subMonths(new Date(), 6)
          break
        case "12m":
          startDate = subMonths(new Date(), 12)
          break
        case "all":
          startDate = new Date(2020, 0, 1) // Far enough back to get all events
          break
      }

      const { data, error } = await supabase
        .from('artist_events')
        .select('*')
        .eq('user_id', user.id)
        .gte('event_date', startDate.toISOString().split('T')[0])
        .order('event_date', { ascending: true })

      if (error) throw error
      setEvents(data || [])
    } catch (error) {
      console.error('Error loading events:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const calculateAnalytics = () => {
    const totalEvents = events.length
    const completedEvents = events.filter(e => e.status === 'completed').length
    const upcomingEvents = events.filter(e => e.status === 'upcoming').length
    const cancelledEvents = events.filter(e => e.status === 'cancelled').length

    // Calculate total revenue (projected for upcoming events, actual for completed)
    const totalRevenue = events.reduce((sum, event) => {
      const revenue = (event.ticket_price_min || 0) * (event.expected_attendance || 0)
      return sum + revenue
    }, 0)

    // Calculate average attendance
    const attendanceEvents = events.filter(e => e.expected_attendance && e.expected_attendance > 0)
    const averageAttendance = attendanceEvents.length > 0
      ? Math.round(attendanceEvents.reduce((sum, e) => sum + (e.expected_attendance || 0), 0) / attendanceEvents.length)
      : 0

    // Top venues
    const venueMap = new Map<string, { count: number; city?: string }>()
    events.forEach(event => {
      if (event.venue_name) {
        const existing = venueMap.get(event.venue_name) || { count: 0 }
        venueMap.set(event.venue_name, {
          count: existing.count + 1,
          city: event.venue_city || existing.city
        })
      }
    })
    const topVenues = Array.from(venueMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // Events by type
    const typeColors = {
      concert: '#8B5CF6',
      festival: '#10B981',
      tour: '#3B82F6',
      recording: '#EF4444',
      interview: '#F59E0B',
      other: '#6B7280'
    }
    
    const typeMap = new Map<string, number>()
    events.forEach(event => {
      typeMap.set(event.type, (typeMap.get(event.type) || 0) + 1)
    })
    const eventsByType = Array.from(typeMap.entries()).map(([type, count]) => ({
      type: type.charAt(0).toUpperCase() + type.slice(1),
      count,
      color: typeColors[type as keyof typeof typeColors] || typeColors.other
    }))

    // Monthly performance data
    const monthlyData = new Map<string, { events: number; attendance: number; revenue: number }>()
    
    events.forEach(event => {
      const monthKey = format(new Date(event.event_date), 'yyyy-MM')
      const existing = monthlyData.get(monthKey) || { events: 0, attendance: 0, revenue: 0 }
      const revenue = (event.ticket_price_min || 0) * (event.expected_attendance || 0)
      
      monthlyData.set(monthKey, {
        events: existing.events + 1,
        attendance: existing.attendance + (event.expected_attendance || 0),
        revenue: existing.revenue + revenue
      })
    })

    const monthlyPerformance = Array.from(monthlyData.entries())
      .map(([month, data]) => ({
        month: format(new Date(month + '-01'), 'MMM yyyy'),
        ...data
      }))
      .sort((a, b) => a.month.localeCompare(b.month))

    const attendanceByMonth = monthlyPerformance.map(({ month, attendance }) => ({ month, attendance }))
    const revenueByMonth = monthlyPerformance.map(({ month, revenue }) => ({ month, revenue }))

    setAnalytics({
      totalEvents,
      completedEvents,
      upcomingEvents,
      cancelledEvents,
      totalRevenue,
      averageAttendance,
      topVenues,
      eventsByType,
      monthlyPerformance,
      attendanceByMonth,
      revenueByMonth
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="bg-slate-900/50 border-slate-700/50 animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-slate-700 rounded w-1/3 mb-4"></div>
              <div className="h-32 bg-slate-700 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!analytics || events.length === 0) {
    return (
      <Card className="bg-slate-900/50 border-slate-700/50">
        <CardContent className="p-12 text-center">
          <BarChart className="h-12 w-12 text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No Analytics Data</h3>
          <p className="text-gray-400">
            Create some events to see performance analytics and insights.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Event Analytics</h2>
        <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
          <SelectTrigger className="w-[180px] bg-slate-800 border-slate-700 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1m">Last 1 Month</SelectItem>
            <SelectItem value="3m">Last 3 Months</SelectItem>
            <SelectItem value="6m">Last 6 Months</SelectItem>
            <SelectItem value="12m">Last 12 Months</SelectItem>
            <SelectItem value="all">All Time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Events</p>
                <p className="text-2xl font-bold text-white">{analytics.totalEvents}</p>
                <p className="text-xs text-gray-500">
                  {analytics.completedEvents} completed, {analytics.upcomingEvents} upcoming
                </p>
              </div>
              <Calendar className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Revenue</p>
                <p className="text-2xl font-bold text-white">${analytics.totalRevenue.toLocaleString()}</p>
                <p className="text-xs text-gray-500">
                  Projected & actual combined
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Avg Attendance</p>
                <p className="text-2xl font-bold text-white">{analytics.averageAttendance.toLocaleString()}</p>
                <p className="text-xs text-gray-500">
                  Per event average
                </p>
              </div>
              <Users className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Success Rate</p>
                <p className="text-2xl font-bold text-white">
                  {analytics.totalEvents > 0 
                    ? Math.round((analytics.completedEvents / analytics.totalEvents) * 100)
                    : 0
                  }%
                </p>
                <p className="text-xs text-gray-500">
                  Events completed vs planned
                </p>
              </div>
              <Target className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Performance */}
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-white">Monthly Event Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.monthlyPerformance}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} />
                  <YAxis stroke="#9CA3AF" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#F3F4F6'
                    }} 
                  />
                  <Area
                    type="monotone"
                    dataKey="events"
                    stroke="#8B5CF6"
                    fill="#8B5CF6"
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Events by Type */}
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-white">Events by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={analytics.eventsByType}
                    dataKey="count"
                    nameKey="type"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label
                  >
                    {analytics.eventsByType.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#F3F4F6'
                    }} 
                  />
                  <Legend />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Trends */}
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-white">Attendance Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.attendanceByMonth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} />
                  <YAxis stroke="#9CA3AF" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#F3F4F6'
                    }} 
                  />
                  <Line
                    type="monotone"
                    dataKey="attendance"
                    stroke="#10B981"
                    strokeWidth={3}
                    dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Revenue Trends */}
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-white">Revenue Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart data={analytics.revenueByMonth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} />
                  <YAxis stroke="#9CA3AF" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#F3F4F6'
                    }} 
                  />
                  <Bar dataKey="revenue" fill="#F59E0B" />
                </RechartsBarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Venues */}
      <Card className="bg-slate-900/50 border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Top Venues
          </CardTitle>
        </CardHeader>
        <CardContent>
          {analytics.topVenues.length === 0 ? (
            <div className="text-center py-8">
              <MapPin className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400">No venue data available</p>
            </div>
          ) : (
            <div className="space-y-4">
              {analytics.topVenues.map((venue, index) => (
                <div key={venue.name} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-600 text-white font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <h4 className="font-medium text-white">{venue.name}</h4>
                      {venue.city && (
                        <p className="text-sm text-gray-400">{venue.city}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-purple-400">{venue.count} events</p>
                    <p className="text-sm text-gray-400">
                      {Math.round((venue.count / analytics.totalEvents) * 100)}% of total
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Performance Summary */}
      <Card className="bg-slate-900/50 border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Award className="h-5 w-5" />
            Performance Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-400 mb-2">
                {analytics.completedEvents}
              </div>
              <div className="text-gray-400">Successful Events</div>
              <div className="text-sm text-gray-500 mt-1">
                {analytics.totalEvents > 0 
                  ? `${Math.round((analytics.completedEvents / analytics.totalEvents) * 100)}% success rate`
                  : 'No events yet'
                }
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-400 mb-2">
                {analytics.totalRevenue > 0 
                  ? `$${Math.round(analytics.totalRevenue / Math.max(analytics.totalEvents, 1)).toLocaleString()}`
                  : '$0'
                }
              </div>
              <div className="text-gray-400">Avg Revenue per Event</div>
              <div className="text-sm text-gray-500 mt-1">
                Based on ticket sales
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-400 mb-2">
                {analytics.eventsByType.length > 0 
                  ? analytics.eventsByType.reduce((max, curr) => curr.count > max.count ? curr : max).type
                  : 'None'
                }
              </div>
              <div className="text-gray-400">Most Common Event Type</div>
              <div className="text-sm text-gray-500 mt-1">
                {analytics.eventsByType.length > 0 
                  ? `${analytics.eventsByType.reduce((max, curr) => curr.count > max.count ? curr : max).count} events`
                  : 'No events yet'
                }
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 