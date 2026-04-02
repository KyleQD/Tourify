"use client"

import { useState, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatSafeCurrency, formatSafeNumber } from "@/lib/format/number-format"
import { 
  BarChart3, 
  TrendingUp, 
  PieChart, 
  Activity,
  Calendar,
  DollarSign,
  Users,
  Ticket,
  Globe,
  Building,
  Music,
  Truck,
  Download,
  Filter,
  RefreshCw,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
  Target,
  Zap,
  Crown,
  Star,
  Clock,
  MapPin,
  BarChart,
  LineChart,
  AreaChart,
  PieChart as PieChartIcon,
  BarChart as BarChartIcon,
  TrendingUp as TrendingUpIcon,
  Activity as ActivityIcon,
  Calendar as CalendarIcon,
  DollarSign as DollarSignIcon,
  Users as UsersIcon,
  Ticket as TicketIcon,
  Globe as GlobeIcon,
  Building as BuildingIcon,
  Music as MusicIcon,
  Truck as TruckIcon,
  Info,
  AlertCircle,
  CheckCircle,
  XCircle,
  Minus,
  Plus,
  Settings,
  Maximize2,
  Minimize2
} from "lucide-react"
import { useDashboardStats, useToursData, useEventsData, useArtistsData, useVenuesData } from "../hooks/use-optimized-data"
import { usePerformanceMonitor } from "../hooks/use-performance-monitor"
import { ErrorBoundary } from "./error-boundary"
import { mapAdminEventStatus } from "@/lib/events/admin-event-normalization"

interface AnalyticsData {
  revenue: {
    total: number
    monthly: number
    growth: number
    trend: 'up' | 'down' | 'stable'
    history: Array<{ date: string; value: number }>
  }
  events: {
    total: number
    upcoming: number
    completed: number
    cancelled: number
    attendance: number
    capacity: number
    utilization: number
  }
  tours: {
    total: number
    active: number
    completed: number
    planning: number
    averageDuration: number
    successRate: number
  }
  artists: {
    total: number
    active: number
    topPerforming: Array<{ name: string; revenue: number; events: number }>
  }
  venues: {
    total: number
    active: number
    averageCapacity: number
    topVenues: Array<{ name: string; events: number; revenue: number }>
  }
  performance: {
    averageRating: number
    customerSatisfaction: number
    repeatBookings: number
    cancellations: number
  }
}

interface ChartData {
  labels: string[]
  datasets: Array<{
    label: string
    data: number[]
    backgroundColor?: string | string[]
    borderColor?: string
    fill?: boolean
  }>
}

export default function AnalyticsDashboard() {
  // Data fetching
  const { data: stats, isLoading: statsLoading, error: statsError } = useDashboardStats()
  const { data: tours, isLoading: toursLoading, error: toursError } = useToursData()
  const { data: events, isLoading: eventsLoading, error: eventsError } = useEventsData()
  const { data: artists, isLoading: artistsLoading, error: artistsError } = useArtistsData()
  const { data: venues, isLoading: venuesLoading, error: venuesError } = useVenuesData()

  // Performance monitoring
  const { metrics: performanceMetrics } = usePerformanceMonitor()

  // Local state
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d')
  const [selectedMetric, setSelectedMetric] = useState<string>('revenue')
  const [chartType, setChartType] = useState<'line' | 'bar' | 'area' | 'pie'>('line')
  const [showDetails, setShowDetails] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Memoized analytics data
  const analyticsData: AnalyticsData = useMemo(() => {
    if (!stats || !tours || !events || !artists || !venues) {
      return {
        revenue: { total: 0, monthly: 0, growth: 0, trend: 'stable', history: [] },
        events: { total: 0, upcoming: 0, completed: 0, cancelled: 0, attendance: 0, capacity: 0, utilization: 0 },
        tours: { total: 0, active: 0, completed: 0, planning: 0, averageDuration: 0, successRate: 0 },
        artists: { total: 0, active: 0, topPerforming: [] },
        venues: { total: 0, active: 0, averageCapacity: 0, topVenues: [] },
        performance: { averageRating: 0, customerSatisfaction: 0, repeatBookings: 0, cancellations: 0 }
      }
    }

    // Calculate revenue metrics
    const totalRevenue = stats.totalRevenue || 0
    const monthlyRevenue = stats.monthlyRevenue || 0
    const revenueGrowth = monthlyRevenue > 0 ? ((monthlyRevenue - (totalRevenue / 12)) / (totalRevenue / 12)) * 100 : 0

    // Calculate event metrics
    const totalEvents = events.length
    const normalizedEvents = events.map((event: any) => ({
      ...event,
      normalized_status: mapAdminEventStatus(event?.status),
    }))
    const upcomingEvents = normalizedEvents.filter((e: any) => e.normalized_status === 'scheduled' || e.normalized_status === 'confirmed').length
    const completedEvents = normalizedEvents.filter((e: any) => e.normalized_status === 'completed').length
    const cancelledEvents = normalizedEvents.filter((e: any) => e.normalized_status === 'cancelled').length
    const totalAttendance = events.reduce((sum: number, e: any) => sum + (e.tickets_sold || 0), 0)
    const totalCapacity = events.reduce((sum: number, e: any) => sum + (e.capacity || 0), 0)
    const utilization = totalCapacity > 0 ? (totalAttendance / totalCapacity) * 100 : 0

    // Calculate tour metrics
    const totalTours = tours.length
    const activeTours = tours.filter((t: any) => t.status === 'active').length
    const completedTours = tours.filter((t: any) => t.status === 'completed').length
    const planningTours = tours.filter((t: any) => t.status === 'planning').length
    const successRate = totalTours > 0 ? (completedTours / totalTours) * 100 : 0

    // Calculate artist metrics
    const totalArtists = artists.length
    const activeArtists = artists.filter((a: any) => a.status === 'active').length
    const topPerformingArtists = artists
      .sort((a: any, b: any) => (b.revenue || 0) - (a.revenue || 0))
      .slice(0, 5)
      .map((a: any) => ({ name: a.name, revenue: a.revenue || 0, events: a.events_count || 0 }))

    // Calculate venue metrics
    const totalVenues = venues.length
    const activeVenues = venues.filter((v: any) => v.status === 'active').length
    const averageCapacity = venues.length > 0 ? venues.reduce((sum: number, v: any) => sum + (v.capacity || 0), 0) / venues.length : 0
    const topVenues = venues
      .sort((a: any, b: any) => (b.events_count || 0) - (a.events_count || 0))
      .slice(0, 5)
      .map((v: any) => ({ name: v.name, events: v.events_count || 0, revenue: v.revenue || 0 }))

    // Generate mock history data
    const history = Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      value: Math.floor(Math.random() * 10000) + 5000
    }))

    return {
      revenue: {
        total: totalRevenue,
        monthly: monthlyRevenue,
        growth: revenueGrowth,
        trend: revenueGrowth > 5 ? 'up' : revenueGrowth < -5 ? 'down' : 'stable',
        history
      },
      events: {
        total: totalEvents,
        upcoming: upcomingEvents,
        completed: completedEvents,
        cancelled: cancelledEvents,
        attendance: totalAttendance,
        capacity: totalCapacity,
        utilization
      },
      tours: {
        total: totalTours,
        active: activeTours,
        completed: completedTours,
        planning: planningTours,
        averageDuration: 45, // Mock data
        successRate
      },
      artists: {
        total: totalArtists,
        active: activeArtists,
        topPerforming: topPerformingArtists
      },
      venues: {
        total: totalVenues,
        active: activeVenues,
        averageCapacity,
        topVenues
      },
      performance: {
        averageRating: 4.2, // Mock data
        customerSatisfaction: 87, // Mock data
        repeatBookings: 65, // Mock data
        cancellations: 3.2 // Mock data
      }
    }
  }, [stats, tours, events, artists, venues])

  // Chart data generation
  const chartData: ChartData = useMemo(() => {
    const colors = {
      primary: 'rgba(99, 102, 241, 0.8)',
      secondary: 'rgba(168, 85, 247, 0.8)',
      success: 'rgba(34, 197, 94, 0.8)',
      warning: 'rgba(251, 191, 36, 0.8)',
      danger: 'rgba(239, 68, 68, 0.8)'
    }

    switch (selectedMetric) {
      case 'revenue':
        return {
          labels: analyticsData.revenue.history.map(h => h.date),
          datasets: [{
            label: 'Revenue',
            data: analyticsData.revenue.history.map(h => h.value),
            backgroundColor: colors.primary,
            borderColor: colors.primary,
            fill: true
          }]
        }
      case 'events':
        return {
          labels: ['Upcoming', 'Completed', 'Cancelled'],
          datasets: [{
            label: 'Events',
            data: [analyticsData.events.upcoming, analyticsData.events.completed, analyticsData.events.cancelled],
            backgroundColor: [colors.success, colors.primary, colors.danger]
          }]
        }
      case 'tours':
        return {
          labels: ['Active', 'Completed', 'Planning'],
          datasets: [{
            label: 'Tours',
            data: [analyticsData.tours.active, analyticsData.tours.completed, analyticsData.tours.planning],
            backgroundColor: [colors.success, colors.primary, colors.warning]
          }]
        }
      case 'artists':
        return {
          labels: analyticsData.artists.topPerforming.map(a => a.name),
          datasets: [{
            label: 'Revenue',
            data: analyticsData.artists.topPerforming.map(a => a.revenue),
            backgroundColor: colors.secondary
          }]
        }
      default:
        return {
          labels: [],
          datasets: []
        }
    }
  }, [selectedMetric, analyticsData])

  // Loading states
  const isLoading = statsLoading || toursLoading || eventsLoading || artistsLoading || venuesLoading
  const hasErrors = statsError || toursError || eventsError || artistsError || venuesError

  // Export functionality
  const exportData = (format: 'csv' | 'json' | 'pdf') => {
    const data = {
      analytics: analyticsData,
      timestamp: new Date().toISOString(),
      timeRange,
      selectedMetric
    }

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `analytics-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } else if (format === 'csv') {
      // Convert to CSV format
      const csvContent = convertToCSV(data)
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `analytics-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  }

  const convertToCSV = (data: any): string => {
    // Simple CSV conversion for analytics data
    const rows = [
      ['Metric', 'Value'],
      ['Total Revenue', data.analytics.revenue.total],
      ['Monthly Revenue', data.analytics.revenue.monthly],
      ['Revenue Growth', `${data.analytics.revenue.growth.toFixed(2)}%`],
      ['Total Events', data.analytics.events.total],
      ['Upcoming Events', data.analytics.events.upcoming],
      ['Completed Events', data.analytics.events.completed],
      ['Total Tours', data.analytics.tours.total],
      ['Active Tours', data.analytics.tours.active],
      ['Success Rate', `${data.analytics.tours.successRate.toFixed(2)}%`]
    ]
    return rows.map(row => row.join(',')).join('\n')
  }

  if (hasErrors) {
    return (
      <div className="space-y-6">
        <Card className="bg-red-900/20 border-red-700/50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-6 w-6 text-red-400" />
              <div>
                <h3 className="text-lg font-semibold text-red-400">Error Loading Analytics</h3>
                <p className="text-red-300 text-sm">
                  {statsError && `Stats: ${statsError}`}
                  {toursError && `Tours: ${toursError}`}
                  {eventsError && `Events: ${eventsError}`}
                  {artistsError && `Artists: ${artistsError}`}
                  {venuesError && `Venues: ${venuesError}`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Analytics Dashboard</h1>
            <p className="text-slate-400">Comprehensive insights and performance metrics</p>
          </div>
          <div className="flex items-center space-x-2">
            <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
              <SelectTrigger className="w-32 bg-slate-800 border-slate-600">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="1y">Last year</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => exportData('csv')}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportData('json')}>
              <Download className="h-4 w-4 mr-2" />
              Export JSON
            </Button>
          </div>
        </div>

        {/* Performance Indicator */}
        {performanceMetrics.renderTime > 100 && (
          <div className="flex items-center space-x-2 text-xs text-yellow-400 bg-yellow-500/10 p-2 rounded-lg">
            <Info className="h-3 w-3" />
            <span>Performance: {performanceMetrics.renderTime.toFixed(0)}ms render time</span>
          </div>
        )}

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 border-blue-700/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-400">Total Revenue</p>
                    <p className="text-2xl font-bold text-white">
                      {isLoading ? '...' : formatSafeCurrency(analyticsData.revenue.total)}
                    </p>
                    <div className="flex items-center space-x-2 mt-2">
                      <Badge className={`text-xs ${
                        analyticsData.revenue.trend === 'up' ? 'bg-green-500/20 text-green-400' :
                        analyticsData.revenue.trend === 'down' ? 'bg-red-500/20 text-red-400' :
                        'bg-slate-500/20 text-slate-400'
                      }`}>
                        {analyticsData.revenue.growth > 0 ? '+' : ''}{analyticsData.revenue.growth.toFixed(1)}%
                      </Badge>
                      <span className="text-xs text-slate-400">vs last month</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-blue-500/20">
                    <DollarSign className="h-6 w-6 text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-gradient-to-br from-green-500/20 to-green-600/20 border-green-700/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-400">Events</p>
                    <p className="text-2xl font-bold text-white">
                      {isLoading ? '...' : analyticsData.events.total}
                    </p>
                    <p className="text-xs text-slate-400 mt-2">
                      {analyticsData.events.upcoming} upcoming, {analyticsData.events.completed} completed
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-green-500/20">
                    <Calendar className="h-6 w-6 text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 border-purple-700/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-400">Tours</p>
                    <p className="text-2xl font-bold text-white">
                      {isLoading ? '...' : analyticsData.tours.total}
                    </p>
                    <p className="text-xs text-slate-400 mt-2">
                      {analyticsData.tours.successRate.toFixed(1)}% success rate
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-purple-500/20">
                    <Globe className="h-6 w-6 text-purple-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="bg-gradient-to-br from-orange-500/20 to-orange-600/20 border-orange-700/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-400">Attendance</p>
                    <p className="text-2xl font-bold text-white">
                      {isLoading ? '...' : formatSafeNumber(analyticsData.events.attendance)}
                    </p>
                    <p className="text-xs text-slate-400 mt-2">
                      {analyticsData.events.utilization.toFixed(1)}% capacity utilization
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-orange-500/20">
                    <Users className="h-6 w-6 text-orange-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Charts Section */}
        <Tabs value={selectedMetric} onValueChange={setSelectedMetric} className="space-y-6">
          <TabsList className="bg-slate-800/60 backdrop-blur-sm p-1 rounded-sm border border-slate-700/30 grid grid-cols-5 w-full max-w-2xl">
            <TabsTrigger value="revenue" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/10 rounded-sm text-sm transition-all duration-200">Revenue</TabsTrigger>
            <TabsTrigger value="events" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/10 rounded-sm text-sm transition-all duration-200">Events</TabsTrigger>
            <TabsTrigger value="tours" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/10 rounded-sm text-sm transition-all duration-200">Tours</TabsTrigger>
            <TabsTrigger value="artists" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/10 rounded-sm text-sm transition-all duration-200">Artists</TabsTrigger>
            <TabsTrigger value="performance" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/10 rounded-sm text-sm transition-all duration-200">Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="revenue" className="space-y-6">
            <Card className="bg-slate-900/50 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-white flex items-center justify-between">
                  <span>Revenue Trends</span>
                  <div className="flex items-center space-x-2">
                    <Select value={chartType} onValueChange={(value: any) => setChartType(value)}>
                      <SelectTrigger className="w-24 bg-slate-800 border-slate-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="line">Line</SelectItem>
                        <SelectItem value="bar">Bar</SelectItem>
                        <SelectItem value="area">Area</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" onClick={() => setShowDetails(!showDetails)}>
                      {showDetails ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-64 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Mock Chart - Replace with actual chart library */}
                    <div className="h-64 bg-slate-800/50 rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <BarChart3 className="h-12 w-12 text-slate-400 mx-auto mb-2" />
                        <p className="text-slate-400">Revenue Chart</p>
                        <p className="text-xs text-slate-500">Chart library integration required</p>
                      </div>
                    </div>
                    
                    {showDetails && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-3 bg-slate-800/50 rounded-lg">
                          <p className="text-xs text-slate-400">Average Daily</p>
                          <p className="text-lg font-semibold text-white">
                            ${(analyticsData.revenue.total / 30).toFixed(0)}
                          </p>
                        </div>
                        <div className="p-3 bg-slate-800/50 rounded-lg">
                          <p className="text-xs text-slate-400">Peak Day</p>
                          <p className="text-lg font-semibold text-white">
                            {formatSafeCurrency(Math.max(...analyticsData.revenue.history.map(h => h.value)))}
                          </p>
                        </div>
                        <div className="p-3 bg-slate-800/50 rounded-lg">
                          <p className="text-xs text-slate-400">Growth Rate</p>
                          <p className="text-lg font-semibold text-white">
                            {analyticsData.revenue.growth.toFixed(1)}%
                          </p>
                        </div>
                        <div className="p-3 bg-slate-800/50 rounded-lg">
                          <p className="text-xs text-slate-400">Trend</p>
                          <p className="text-lg font-semibold text-white capitalize">
                            {analyticsData.revenue.trend}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="events" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-slate-900/50 border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-white">Event Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="h-48 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400"></div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-400">Upcoming</span>
                        <span className="text-sm font-medium text-white">{analyticsData.events.upcoming}</span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full" 
                          style={{ width: `${(analyticsData.events.upcoming / analyticsData.events.total) * 100}%` }}
                        ></div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-400">Completed</span>
                        <span className="text-sm font-medium text-white">{analyticsData.events.completed}</span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full" 
                          style={{ width: `${(analyticsData.events.completed / analyticsData.events.total) * 100}%` }}
                        ></div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-400">Cancelled</span>
                        <span className="text-sm font-medium text-white">{analyticsData.events.cancelled}</span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-2">
                        <div 
                          className="bg-red-500 h-2 rounded-full" 
                          style={{ width: `${(analyticsData.events.cancelled / analyticsData.events.total) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-slate-900/50 border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-white">Capacity Utilization</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="h-48 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-400"></div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="relative inline-flex items-center justify-center w-32 h-32">
                        <svg className="w-32 h-32 transform -rotate-90">
                          <circle
                            cx="64"
                            cy="64"
                            r="56"
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="transparent"
                            className="text-slate-700"
                          />
                          <circle
                            cx="64"
                            cy="64"
                            r="56"
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="transparent"
                            strokeDasharray={`${2 * Math.PI * 56}`}
                            strokeDashoffset={`${2 * Math.PI * 56 * (1 - analyticsData.events.utilization / 100)}`}
                            className="text-orange-500"
                          />
                        </svg>
                        <div className="absolute">
                          <p className="text-2xl font-bold text-white">{analyticsData.events.utilization.toFixed(1)}%</p>
                          <p className="text-sm text-slate-400">Utilization</p>
                        </div>
                      </div>
                      <div className="mt-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Attendance</span>
                          <span className="text-white">{formatSafeNumber(analyticsData.events.attendance)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Capacity</span>
                          <span className="text-white">{formatSafeNumber(analyticsData.events.capacity)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="tours" className="space-y-6">
            <Card className="bg-slate-900/50 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-white">Tour Performance</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-64 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="text-center">
                      <div className="p-4 bg-purple-500/20 rounded-lg mb-3">
                        <Globe className="h-8 w-8 text-purple-400 mx-auto" />
                      </div>
                      <p className="text-2xl font-bold text-white">{analyticsData.tours.total}</p>
                      <p className="text-sm text-slate-400">Total Tours</p>
                    </div>
                    <div className="text-center">
                      <div className="p-4 bg-green-500/20 rounded-lg mb-3">
                        <CheckCircle className="h-8 w-8 text-green-400 mx-auto" />
                      </div>
                      <p className="text-2xl font-bold text-white">{analyticsData.tours.active}</p>
                      <p className="text-sm text-slate-400">Active Tours</p>
                    </div>
                    <div className="text-center">
                      <div className="p-4 bg-blue-500/20 rounded-lg mb-3">
                        <Target className="h-8 w-8 text-blue-400 mx-auto" />
                      </div>
                      <p className="text-2xl font-bold text-white">{analyticsData.tours.successRate.toFixed(1)}%</p>
                      <p className="text-sm text-slate-400">Success Rate</p>
                    </div>
                    <div className="text-center">
                      <div className="p-4 bg-orange-500/20 rounded-lg mb-3">
                        <Clock className="h-8 w-8 text-orange-400 mx-auto" />
                      </div>
                      <p className="text-2xl font-bold text-white">{analyticsData.tours.averageDuration}</p>
                      <p className="text-sm text-slate-400">Avg Duration (days)</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="artists" className="space-y-6">
            <Card className="bg-slate-900/50 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-white">Top Performing Artists</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-64 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-400"></div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {analyticsData.artists.topPerforming.map((artist, index) => (
                      <div key={artist.name} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-medium">{index + 1}</span>
                          </div>
                          <div>
                            <p className="font-medium text-white">{artist.name}</p>
                            <p className="text-sm text-slate-400">{artist.events} events</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-white">{formatSafeCurrency(artist.revenue)}</p>
                          <p className="text-xs text-slate-400">Revenue</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-slate-900/50 border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-white">Customer Satisfaction</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="h-48 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400"></div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="text-center">
                        <div className="text-4xl font-bold text-white mb-2">{analyticsData.performance.averageRating}</div>
                        <div className="flex items-center justify-center space-x-1 mb-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-5 w-5 ${
                                star <= analyticsData.performance.averageRating
                                  ? 'text-yellow-400 fill-current'
                                  : 'text-slate-600'
                              }`}
                            />
                          ))}
                        </div>
                        <p className="text-sm text-slate-400">Average Rating</p>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-400">Customer Satisfaction</span>
                          <span className="text-sm font-medium text-white">{analyticsData.performance.customerSatisfaction}%</span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full" 
                            style={{ width: `${analyticsData.performance.customerSatisfaction}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-slate-900/50 border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-white">Booking Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="h-48 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-green-500/20 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-5 w-5 text-green-400" />
                          <span className="text-sm text-slate-300">Repeat Bookings</span>
                        </div>
                        <span className="text-lg font-semibold text-white">{analyticsData.performance.repeatBookings}%</span>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-red-500/20 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <XCircle className="h-5 w-5 text-red-400" />
                          <span className="text-sm text-slate-300">Cancellations</span>
                        </div>
                        <span className="text-lg font-semibold text-white">{analyticsData.performance.cancellations}%</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Data Loading Status */}
        {isLoading && (
          <div className="fixed bottom-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg">
            <div className="flex items-center space-x-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span className="text-sm">Loading analytics data...</span>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  )
} 