"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useCurrentVenue } from "../hooks/useCurrentVenue"
import { venueService } from "@/lib/services/venue.service"
import { LoadingSpinner } from "../components/loading-spinner"
import { useToast } from "@/hooks/use-toast"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"
import { formatSafeCurrency, formatSafeNumber } from "@/lib/format/number-format"
import {
  BarChart2,
  Users,
  DollarSign,
  Calendar,
  Download,
  Filter,
  Music,
  Ticket,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  PieChart,
  LineChart,
  TrendingUp,
  Eye,
  Star,
  Activity,
  RefreshCw,
} from "lucide-react"

interface AnalyticsData {
  revenue: { current: number; previous: number; change: number }
  attendance: { current: number; previous: number; change: number }
  ticketSales: { current: number; previous: number; change: number }
  avgDuration: { current: number; previous: number; change: number }
  bookingRequests: number
  conversionRate: number
  topEvents: Array<{
    name: string
    revenue: number
    attendance: number
    type: string
    rating: number
  }>
  monthlyData: Array<{
    month: string
    revenue: number
    attendance: number
    events: number
  }>
  eventTypeData: Array<{
    type: string
    count: number
    revenue: number
    percentage: number
  }>
}

export default function AnalyticsPage() {
  const { venue, isLoading: venueLoading } = useCurrentVenue()
  const { toast } = useToast()
  const [period, setPeriod] = useState("30d")
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (venue?.id) {
      fetchAnalyticsData()
    }
  }, [venue?.id, period])

  const fetchAnalyticsData = async () => {
    if (!venue?.id) return
    
    try {
      setIsLoading(true)
      
      // Get days based on period
      const days = period === "7d" ? 7 : period === "30d" ? 30 : period === "90d" ? 90 : 365
      
      const rangeStart = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
      const rangeEnd = new Date().toISOString()

      const [analytics, bookingRequests, reviews, events] = await Promise.all([
        venueService.getVenueAnalytics(venue.id, days),
        venueService.getVenueBookingRequests(venue.id),
        venueService.getVenueReviews(venue.id),
        venueService.getVenueEventsByRange(venue.id, rangeStart, rangeEnd),
      ])

      // Process analytics data
      const totalRevenue = analytics.reduce((sum, day) => sum + (day.revenue || 0), 0)
      const totalAttendance = analytics.reduce((sum, day) => sum + (day.unique_visitors || day.page_views || 0), 0)
      const totalEvents = analytics.reduce((sum, day) => sum + (day.events_hosted || 0), 0)

      const midpoint = Math.floor(analytics.length / 2)
      const currentSlice = analytics.slice(midpoint)
      const previousSlice = analytics.slice(0, midpoint)
      const previousRevenue = previousSlice.reduce((sum, day) => sum + (day.revenue || 0), 0)
      const previousAttendance = previousSlice.reduce((sum, day) => sum + (day.unique_visitors || day.page_views || 0), 0)
      const currentRevenue = currentSlice.reduce((sum, day) => sum + (day.revenue || 0), 0)
      const currentAttendance = currentSlice.reduce((sum, day) => sum + (day.unique_visitors || day.page_views || 0), 0)
      const approvedBookings = bookingRequests.filter((request) => request.status === "approved")
      const conversionRate = bookingRequests.length > 0 ? (approvedBookings.length / bookingRequests.length) * 100 : 0
      const averageRating = reviews.length > 0
        ? reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length
        : 0

      const monthMap = new Map<string, { month: string; revenue: number; attendance: number; events: number }>()
      analytics.forEach((item) => {
        const month = formatSafeDate(item.date).slice(0, 3)
        const current = monthMap.get(month) || { month, revenue: 0, attendance: 0, events: 0 }
        current.revenue += item.revenue || 0
        current.attendance += item.unique_visitors || item.page_views || 0
        current.events += item.events_hosted || 0
        monthMap.set(month, current)
      })

      const eventTypeMap = new Map<string, { count: number; revenue: number }>()
      events.forEach((event: any) => {
        const settings = event.settings && typeof event.settings === "object"
          ? (event.settings as Record<string, unknown>)
          : {}
        const type = String(settings.event_type || event.type || "other")
        const revenue = Number(settings.ticket_price || 0) * Number(event.capacity || 0)
        const current = eventTypeMap.get(type) || { count: 0, revenue: 0 }
        current.count += 1
        current.revenue += Number.isFinite(revenue) ? revenue : 0
        eventTypeMap.set(type, current)
      })

      const eventTypeData = Array.from(eventTypeMap.entries()).map(([type, data]) => ({
        type,
        count: data.count,
        revenue: data.revenue,
        percentage: events.length > 0 ? Math.round((data.count / events.length) * 100) : 0,
      }))

      const topEvents = events.slice(0, 5).map((event: any) => {
        const settings = event.settings && typeof event.settings === "object"
          ? (event.settings as Record<string, unknown>)
          : {}
        return {
          name: String(event.title || "Event"),
          revenue: Number(settings.ticket_price || 0) * Number(event.capacity || 0),
          attendance: Number(event.capacity || 0),
          type: String(settings.event_type || event.type || "other"),
          rating: Number(averageRating.toFixed(1)),
        }
      })

      const liveData: AnalyticsData = {
        revenue: {
          current: currentRevenue || totalRevenue,
          previous: previousRevenue,
          change: previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0
        },
        attendance: {
          current: currentAttendance || totalAttendance,
          previous: previousAttendance,
          change: previousAttendance > 0 ? ((currentAttendance - previousAttendance) / previousAttendance) * 100 : 0
        },
        ticketSales: {
          current: approvedBookings.reduce((sum, request) => sum + Number(request.expected_attendance || 0), 0),
          previous: Math.max(0, approvedBookings.length > 0 ? approvedBookings.length * 50 : 0),
          change: conversionRate
        },
        avgDuration: {
          current: approvedBookings.length > 0
            ? Number((approvedBookings.reduce((sum, request) => sum + Number(request.event_duration || 0), 0) / approvedBookings.length / 60).toFixed(1))
            : 0,
          previous: 0,
          change: 0
        },
        bookingRequests: bookingRequests.length,
        conversionRate,
        topEvents,
        monthlyData: Array.from(monthMap.values()),
        eventTypeData,
      }

      setAnalyticsData(liveData)
    } catch (error) {
      console.error('Error fetching analytics:', error)
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleExport = () => {
    toast({
      title: "Export Started",
      description: "Your analytics report will be ready for download shortly."
    })
  }

  if (venueLoading || isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!venue) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">No Venue Found</h2>
        <p className="text-muted-foreground">Please set up your venue profile first.</p>
      </div>
    )
  }

  if (!analyticsData) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">Unable to Load Analytics</h2>
        <Button onClick={fetchAnalyticsData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive insights for {venue.venue_name || venue.name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchAnalyticsData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="12m">Last 12 months</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatSafeCurrency(analyticsData.revenue.current)}</div>
            <div className={`flex items-center pt-1 text-xs ${analyticsData.revenue.change > 0 ? 'text-green-500' : 'text-red-500'}`}>
              {analyticsData.revenue.change > 0 ? 
                <ArrowUpRight className="h-3 w-3 mr-1" /> : 
                <ArrowDownRight className="h-3 w-3 mr-1" />
              }
              <span>{Math.abs(analyticsData.revenue.change)}% from last period</span>
            </div>
          </CardContent>
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-green-500 to-blue-500" />
        </Card>

        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Event Attendance</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatSafeNumber(analyticsData.attendance.current)}</div>
            <div className={`flex items-center pt-1 text-xs ${analyticsData.attendance.change > 0 ? 'text-green-500' : 'text-red-500'}`}>
              {analyticsData.attendance.change > 0 ? 
                <ArrowUpRight className="h-3 w-3 mr-1" /> : 
                <ArrowDownRight className="h-3 w-3 mr-1" />
              }
              <span>{Math.abs(analyticsData.attendance.change)}% from last period</span>
            </div>
          </CardContent>
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500" />
        </Card>

        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Booking Requests</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.bookingRequests}</div>
            <div className="flex items-center pt-1 text-xs text-blue-500">
              <Activity className="h-3 w-3 mr-1" />
              <span>{analyticsData.conversionRate.toFixed(1)}% conversion rate</span>
            </div>
          </CardContent>
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-purple-500 to-pink-500" />
        </Card>

        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Event Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.avgDuration.current} hrs</div>
            <div className={`flex items-center pt-1 text-xs ${analyticsData.avgDuration.change > 0 ? 'text-green-500' : 'text-red-500'}`}>
              {analyticsData.avgDuration.change > 0 ? 
                <ArrowUpRight className="h-3 w-3 mr-1" /> : 
                <ArrowDownRight className="h-3 w-3 mr-1" />
              }
              <span>{Math.abs(analyticsData.avgDuration.change)}% from last period</span>
            </div>
          </CardContent>
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-orange-500 to-red-500" />
        </Card>
      </div>

      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Monthly Performance</CardTitle>
                <CardDescription>Revenue and attendance trends over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData.monthlyData.map((month, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-medium">{month.month}</span>
                        </div>
                        <div>
                          <p className="font-medium">{formatSafeCurrency(month.revenue)}</p>
                          <p className="text-sm text-muted-foreground">{month.attendance} attendees</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline">{month.events} events</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Top Performing Events</CardTitle>
                <CardDescription>By revenue and attendance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData.topEvents.map((event, i) => (
                    <div key={i} className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center font-bold text-white text-sm">
                        {i + 1}
                      </div>
                      <div className="ml-4 flex-1">
                        <p className="text-sm font-medium">{event.name}</p>
                        <div className="flex items-center text-xs text-muted-foreground">
                          <Music className="h-3 w-3 mr-1" />
                          <span>{event.type}</span>
                          <span className="mx-2">•</span>
                          <Users className="h-3 w-3 mr-1" />
                          <span>{event.attendance} attendees</span>
                          <span className="mx-2">•</span>
                          <Star className="h-3 w-3 mr-1" />
                          <span>{event.rating}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{formatSafeCurrency(event.revenue)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Event Type Performance</CardTitle>
                <CardDescription>Revenue distribution by category</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {analyticsData.eventTypeData.map((type, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{type.type}</span>
                      <span>{formatSafeCurrency(type.revenue)}</span>
                    </div>
                    <Progress value={type.percentage} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{type.count} events</span>
                      <span>{type.percentage}%</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Booking Conversion</CardTitle>
                <CardDescription>Request to booking conversion rates</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-500">
                    {analyticsData.conversionRate.toFixed(1)}%
                  </div>
                  <p className="text-sm text-muted-foreground">Conversion Rate</p>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Total Requests</span>
                    <span>{analyticsData.bookingRequests}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Approved</span>
                    <span className="text-green-500">
                      {Math.round(analyticsData.bookingRequests * analyticsData.conversionRate / 100)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Pending</span>
                    <span className="text-yellow-500">
                      {Math.round(analyticsData.bookingRequests * 0.3)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Venue Utilization</CardTitle>
                <CardDescription>Capacity and booking efficiency</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Average Capacity</span>
                    <span>73%</span>
                  </div>
                  <Progress value={73} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Prime Time Usage</span>
                    <span>89%</span>
                  </div>
                  <Progress value={89} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Weekend Utilization</span>
                    <span>94%</span>
                  </div>
                  <Progress value={94} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="financial">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Gross Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatSafeCurrency(analyticsData.revenue.current)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  +{analyticsData.revenue.change}% from last period
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Operating Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$18,459</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Staff, utilities, maintenance
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Net Profit</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-500">$26,773</div>
                <p className="text-xs text-muted-foreground mt-1">
                  59.2% profit margin
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Revenue Per Event</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$1,847</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Average across all events
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Revenue Breakdown</CardTitle>
              <CardDescription>Detailed financial analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-4">
                  <h4 className="font-medium">Revenue Sources</h4>
                  <div className="space-y-2">
                    {[
                      { source: "Event Bookings", amount: 38500, percentage: 85 },
                      { source: "Equipment Rental", amount: 4200, percentage: 9 },
                      { source: "Catering Services", amount: 2532, percentage: 6 },
                    ].map((item, i) => (
                      <div key={i} className="flex justify-between items-center">
                        <span className="text-sm">{item.source}</span>
                        <div className="text-right">
                          <span className="text-sm font-medium">{formatSafeCurrency(item.amount)}</span>
                          <div className="text-xs text-muted-foreground">{item.percentage}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-medium">Expense Categories</h4>
                  <div className="space-y-2">
                    {[
                      { category: "Staff Wages", amount: 8500, percentage: 46 },
                      { category: "Utilities", amount: 3200, percentage: 17 },
                      { category: "Equipment Maintenance", amount: 2800, percentage: 15 },
                      { category: "Insurance & Licenses", amount: 1950, percentage: 11 },
                      { category: "Marketing", amount: 2009, percentage: 11 },
                    ].map((item, i) => (
                      <div key={i} className="flex justify-between items-center">
                        <span className="text-sm">{item.category}</span>
                        <div className="text-right">
                          <span className="text-sm font-medium">{formatSafeCurrency(item.amount)}</span>
                          <div className="text-xs text-muted-foreground">{item.percentage}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Total Attendees</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatSafeNumber(analyticsData.attendance.current)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Across all events this period
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Avg. Per Event</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">183</div>
                <p className="text-xs text-muted-foreground mt-1">
                  21.5% capacity utilization
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Peak Attendance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">340</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Jazz Night Vol. 3
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">No-Show Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">8.5%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Industry average: 12%
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="events">
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Event Success Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-500">94.2%</div>
                  <p className="text-sm text-muted-foreground">
                    Events completed successfully
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Average Rating</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">4.6</div>
                  <div className="flex items-center mt-1">
                    {[1,2,3,4,5].map((star) => (
                      <Star key={star} className={`h-4 w-4 ${star <= 4.6 ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Repeat Bookings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">32%</div>
                  <p className="text-sm text-muted-foreground">
                    Return customer rate
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle>Analytics Reports</CardTitle>
              <CardDescription>Generate and download custom reports</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  {
                    title: "Monthly Performance Report",
                    description: "Comprehensive overview of venue performance metrics",
                    lastGenerated: formatSafeDate(new Date().toISOString()),
                    status: "Ready"
                  },
                  {
                    title: "Financial Statement",
                    description: "Detailed revenue and expense breakdown",
                    lastGenerated: formatSafeDate(new Date().toISOString()),
                    status: "Ready"
                  },
                  {
                    title: "Event Analysis Report",
                    description: "Performance analysis of individual events",
                    lastGenerated: formatSafeDate(new Date().toISOString()),
                    status: "Ready"
                  },
                  {
                    title: "Customer Insights",
                    description: "Audience demographics and behavior analysis",
                    lastGenerated: formatSafeDate(new Date().toISOString()),
                    status: "Ready"
                  },
                ].map((report, i) => (
                  <div key={i} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex-1">
                      <h3 className="font-medium">{report.title}</h3>
                      <p className="text-sm text-muted-foreground">{report.description}</p>
                      <div className="flex items-center mt-2 text-xs text-muted-foreground">
                        <span>Last generated: {report.lastGenerated}</span>
                        <Badge variant="secondary" className="ml-2 text-xs">
                          {report.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex space-x-2 ml-4">
                      <Button variant="outline" size="sm">
                        <Calendar className="h-4 w-4 mr-2" />
                        Schedule
                      </Button>
                      <Button size="sm" onClick={handleExport}>
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
