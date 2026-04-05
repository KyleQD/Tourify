"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useCurrentVenue } from "../hooks/useCurrentVenue"
import { venueService } from "@/lib/services/venue.service"
import { LoadingSpinner } from "../components/loading-spinner"
import { useToast } from "@/hooks/use-toast"
import { format, startOfWeek, endOfWeek, isToday, isTomorrow, addDays } from "date-fns"
import { formatSafeCurrency } from "@/lib/format/number-format"
import {
  Calendar,
  Users,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Clock,
  Star,
  MessageSquare,
  FileText,
  Zap,
  Target,
  BarChart3,
  PieChart,
  Activity,
  Bell,
  Settings,
  Plus,
  ArrowRight,
  MapPin,
  Phone,
  Mail,
  Globe,
  Shield,
  Wifi,
  Coffee,
  Utensils,
  Car,
  Music,
  Lightbulb,
  Video,
  Mic,
  Camera,
  RefreshCw,
  Download,
  Upload,
  Share2,
  Eye,
  Filter,
  Search,
  Grid,
  List,
  MoreHorizontal,
  AlertTriangle,
  Info,
  Sparkles,
  ChevronRight,
  ExternalLink,
} from "lucide-react"

interface VenueOverviewData {
  stats: {
    totalRevenue: number
    monthlyRevenue: number
    totalBookings: number
    activeBookings: number
    averageRating: number
    totalReviews: number
    profileViews: number
    responseRate: number
  }
  quickStats: {
    todayEvents: number
    pendingRequests: number
    unreadMessages: number
    upcomingDeadlines: number
    equipmentIssues: number
    teamOnline: number
  }
  upcomingEvents: Array<{
    id: string
    name: string
    artist: string
    date: string
    time: string
    attendees: number
    status: "confirmed" | "pending" | "setup"
    priority: "high" | "medium" | "low"
  }>
  recentActivity: Array<{
    id: string
    type: "booking" | "message" | "review" | "payment" | "team" | "system"
    title: string
    description: string
    timestamp: string
    priority: "high" | "medium" | "low"
    actionRequired: boolean
  }>
  alerts: Array<{
    id: string
    type: "warning" | "info" | "success" | "error"
    title: string
    message: string
    action?: string
    actionUrl?: string
  }>
  insights: Array<{
    id: string
    category: "performance" | "opportunities" | "efficiency" | "revenue"
    title: string
    value: string
    change: number
    insight: string
    recommendation: string
  }>
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "confirmed": return "text-green-500 bg-green-500/10 border-green-500/20"
    case "pending": return "text-yellow-500 bg-yellow-500/10 border-yellow-500/20"
    case "setup": return "text-blue-500 bg-blue-500/10 border-blue-500/20"
    default: return "text-gray-500 bg-gray-500/10 border-gray-500/20"
  }
}

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "high": return "text-red-500"
    case "medium": return "text-yellow-500"
    case "low": return "text-green-500"
    default: return "text-gray-500"
  }
}

const getActivityIcon = (type: string) => {
  switch (type) {
    case "booking": return Calendar
    case "message": return MessageSquare
    case "review": return Star
    case "payment": return DollarSign
    case "team": return Users
    case "system": return Settings
    default: return Activity
  }
}

export default function VenueOverviewPage() {
  const { venue, isLoading: venueLoading } = useCurrentVenue()
  const { toast } = useToast()
  
  const [overviewData, setOverviewData] = useState<VenueOverviewData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedTimeframe, setSelectedTimeframe] = useState("7d")
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (venue?.id) {
      fetchOverviewData()
    }
  }, [venue?.id, selectedTimeframe])

  const fetchOverviewData = async () => {
    if (!venue?.id) return
    
    try {
      setIsLoading(true)
      const days = selectedTimeframe === "24h" ? 1 : selectedTimeframe === "7d" ? 7 : selectedTimeframe === "30d" ? 30 : 90
      const rangeStart = startOfWeek(new Date()).toISOString()
      const rangeEnd = endOfWeek(addDays(new Date(), days)).toISOString()

      const [stats, bookings, reviews, teamMembers, equipment, analytics, events] = await Promise.all([
        venueService.getVenueDashboardStats(venue.id),
        venueService.getVenueBookingRequests(venue.id),
        venueService.getVenueReviews(venue.id),
        venueService.getVenueTeamMembers(venue.id),
        venueService.getVenueEquipment(venue.id),
        venueService.getVenueAnalytics(venue.id, days),
        venueService.getVenueEventsByRange(venue.id, rangeStart, rangeEnd),
      ])

      const approvedBookings = bookings.filter((booking) => booking.status === "approved")
      const pendingBookings = bookings.filter((booking) => booking.status === "pending")
      const estimatedRevenue = approvedBookings.reduce((sum, booking) => {
        const parsedBudget = Number((booking.budget_range || "").replace(/[^0-9.]/g, ""))
        return sum + (Number.isFinite(parsedBudget) ? parsedBudget : 0)
      }, 0)
      const monthlyRevenue = analytics.reduce((sum, item) => sum + (item.revenue || 0), 0)
      const profileViews = analytics.reduce((sum, item) => sum + (item.page_views || 0), 0)
      const eventsToday = events.filter((event) => {
        if (!event.date) return false
        return isToday(new Date(event.date))
      }).length

      const upcomingEvents = events.slice(0, 5).map((event) => ({
        id: String(event.id),
        name: event.title || "Event",
        artist: typeof event.artist_name === "string" ? event.artist_name : "Tourify Booking",
        date: event.date || new Date().toISOString(),
        time: event.date ? format(new Date(event.date), "HH:mm") : "TBD",
        attendees: Number(event.capacity || 0),
        status: event.status === "confirmed" ? "confirmed" as const : event.status === "inquiry" ? "pending" as const : "setup" as const,
        priority: event.status === "confirmed" ? "high" as const : "medium" as const,
      }))

      const recentActivity: VenueOverviewData["recentActivity"] = [
        ...pendingBookings.slice(0, 3).map((booking) => ({
          id: `booking-${booking.id}`,
          type: "booking" as const,
          title: "New Booking Request",
          description: `${booking.event_name} from ${booking.contact_email}`,
          timestamp: booking.requested_at || booking.created_at,
          priority: "high" as const,
          actionRequired: true,
        })),
        ...reviews.slice(0, 2).map((review) => ({
          id: `review-${review.id}`,
          type: "review" as const,
          title: `New ${review.rating}-Star Review`,
          description: review.comment || "A venue review was submitted.",
          timestamp: review.created_at,
          priority: "low" as const,
          actionRequired: false,
        })),
      ].sort((first, second) => new Date(second.timestamp).getTime() - new Date(first.timestamp).getTime())

      const alerts: VenueOverviewData["alerts"] = []
      const maintenanceCount = equipment.filter((item) => item.condition === "needs_repair" || item.condition === "out_of_service").length
      if (maintenanceCount > 0) {
        alerts.push({
          id: "maintenance-alert",
          type: "warning",
          title: "Equipment Requires Attention",
          message: `${maintenanceCount} equipment item(s) need maintenance or are out of service.`,
          action: "Open Equipment",
          actionUrl: "/venue/equipment",
        })
      }
      if (pendingBookings.length > 0) {
        alerts.push({
          id: "booking-alert",
          type: "info",
          title: "Pending Booking Requests",
          message: `You have ${pendingBookings.length} booking request(s) waiting for response.`,
          action: "Review Requests",
          actionUrl: "/venue/bookings",
        })
      }

      const conversionRate = bookings.length > 0 ? (approvedBookings.length / bookings.length) * 100 : 0

      const liveData: VenueOverviewData = {
        stats: {
          totalRevenue: estimatedRevenue + monthlyRevenue,
          monthlyRevenue,
          totalBookings: stats.totalBookings || bookings.length,
          activeBookings: approvedBookings.length,
          averageRating: stats.averageRating || 0,
          totalReviews: stats.totalReviews || reviews.length,
          profileViews,
          responseRate: conversionRate,
        },
        quickStats: {
          todayEvents: eventsToday,
          pendingRequests: pendingBookings.length,
          unreadMessages: 0,
          upcomingDeadlines: maintenanceCount,
          equipmentIssues: maintenanceCount,
          teamOnline: teamMembers.filter((member) => member.status === "active").length,
        },
        upcomingEvents,
        recentActivity: recentActivity.slice(0, 6),
        alerts,
        insights: [
          {
            id: "conversion-insight",
            category: "performance",
            title: "Booking Conversion",
            value: `${conversionRate.toFixed(1)}%`,
            change: conversionRate,
            insight: "Conversion is based on approved vs total booking requests.",
            recommendation: "Respond quickly to pending requests to improve conversion.",
          },
          {
            id: "revenue-insight",
            category: "revenue",
            title: "Revenue in Period",
            value: formatSafeCurrency(monthlyRevenue),
            change: 0,
            insight: "Revenue reflects tracked analytics totals in the selected timeframe.",
            recommendation: "Use analytics trends to identify peak booking windows.",
          },
        ],
      }

      setOverviewData(liveData)
      
    } catch (error) {
      console.error('Error fetching overview data:', error)
      toast({
        title: "Error",
        description: "Failed to load venue overview data",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchOverviewData()
    setRefreshing(false)
    toast({
      title: "Data Refreshed",
      description: "Venue overview data has been updated."
    })
  }

  const getDateLabel = (dateStr: string) => {
    const date = new Date(dateStr)
    if (isToday(date)) return "Today"
    if (isTomorrow(date)) return "Tomorrow"
    return format(date, "MMM d")
  }

  if (venueLoading || isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!venue || !overviewData) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">Unable to Load Overview</h2>
        <Button onClick={fetchOverviewData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Venue Overview</h1>
          <p className="text-muted-foreground">
            Complete management dashboard for {venue.venue_name || venue.name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Live Data</span>
            </div>
            <span>•</span>
            <span>Updated {format(new Date(), "HH:mm")}</span>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Card className="relative overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Today's Events</p>
                <p className="text-2xl font-bold">{overviewData.quickStats.todayEvents}</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
            {overviewData.quickStats.todayEvents > 0 && (
              <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500" />
            )}
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Requests</p>
                <p className="text-2xl font-bold">{overviewData.quickStats.pendingRequests}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500 opacity-50" />
            </div>
            {overviewData.quickStats.pendingRequests > 0 && (
              <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-yellow-500 to-orange-500" />
            )}
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">New Messages</p>
                <p className="text-2xl font-bold">{overviewData.quickStats.unreadMessages}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-green-500 opacity-50" />
            </div>
            {overviewData.quickStats.unreadMessages > 0 && (
              <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-green-500 to-emerald-500" />
            )}
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Deadlines</p>
                <p className="text-2xl font-bold">{overviewData.quickStats.upcomingDeadlines}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-500 opacity-50" />
            </div>
            {overviewData.quickStats.upcomingDeadlines > 0 && (
              <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-red-500 to-pink-500" />
            )}
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Equipment Issues</p>
                <p className="text-2xl font-bold">{overviewData.quickStats.equipmentIssues}</p>
              </div>
              <Zap className="h-8 w-8 text-orange-500 opacity-50" />
            </div>
            {overviewData.quickStats.equipmentIssues > 0 && (
              <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-orange-500 to-red-500" />
            )}
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Team Online</p>
                <p className="text-2xl font-bold">{overviewData.quickStats.teamOnline}</p>
              </div>
              <Users className="h-8 w-8 text-purple-500 opacity-50" />
            </div>
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-purple-500 to-indigo-500" />
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {overviewData.alerts.length > 0 && (
        <div className="space-y-3">
          {overviewData.alerts.map((alert) => (
            <Alert key={alert.id} className={`${
              alert.type === 'warning' ? 'border-yellow-500 bg-yellow-500/5' :
              alert.type === 'error' ? 'border-red-500 bg-red-500/5' :
              alert.type === 'success' ? 'border-green-500 bg-green-500/5' :
              'border-blue-500 bg-blue-500/5'
            }`}>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-2">
                  {alert.type === 'warning' && <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />}
                  {alert.type === 'error' && <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />}
                  {alert.type === 'success' && <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />}
                  {alert.type === 'info' && <Info className="h-4 w-4 text-blue-500 mt-0.5" />}
                  <div>
                    <h4 className="font-medium">{alert.title}</h4>
                    <AlertDescription className="mt-1">{alert.message}</AlertDescription>
                  </div>
                </div>
                {alert.action && (
                  <Button variant="outline" size="sm">
                    {alert.action}
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </Button>
                )}
              </div>
            </Alert>
          ))}
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Stats & Upcoming Events */}
        <div className="lg:col-span-2 space-y-6">
          {/* Performance Stats */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-500">
                  {formatSafeCurrency(overviewData.stats.monthlyRevenue)}
                </div>
                <p className="text-xs text-muted-foreground">
                  of {formatSafeCurrency(overviewData.stats.totalRevenue)} total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Bookings</CardTitle>
                <Calendar className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-500">
                  {overviewData.stats.activeBookings}
                </div>
                <p className="text-xs text-muted-foreground">
                  of {overviewData.stats.totalBookings} total bookings
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
                <Star className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-500">
                  {overviewData.stats.averageRating}
                </div>
                <p className="text-xs text-muted-foreground">
                  from {overviewData.stats.totalReviews} reviews
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Response Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-500">
                  {overviewData.stats.responseRate}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {overviewData.stats.profileViews} profile views
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Upcoming Events */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Upcoming Events</CardTitle>
                <Button variant="outline" size="sm">
                  <Calendar className="h-4 w-4 mr-2" />
                  View Calendar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {overviewData.upcomingEvents.map((event) => (
                  <div key={event.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div className="text-sm font-medium">{getDateLabel(event.date)}</div>
                        <div className="text-xs text-muted-foreground">{event.time}</div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium">{event.name}</h3>
                          <Badge variant="outline" className={getStatusColor(event.status)}>
                            {event.status}
                          </Badge>
                          <div className={`h-2 w-2 rounded-full ${getPriorityColor(event.priority)}`} />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {event.artist} • {event.attendees} attendees
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Activity & Insights */}
        <div className="space-y-6">
          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {overviewData.recentActivity.map((activity) => {
                  const IconComponent = getActivityIcon(activity.type)
                  return (
                    <div key={activity.id} className="flex items-start gap-3">
                      <div className={`p-2 rounded-full ${
                        activity.type === 'booking' ? 'bg-blue-500/10 text-blue-500' :
                        activity.type === 'message' ? 'bg-green-500/10 text-green-500' :
                        activity.type === 'payment' ? 'bg-green-500/10 text-green-500' :
                        activity.type === 'review' ? 'bg-yellow-500/10 text-yellow-500' :
                        'bg-gray-500/10 text-gray-500'
                      }`}>
                        <IconComponent className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-medium">{activity.title}</h4>
                          {activity.actionRequired && (
                            <Badge variant="outline" className="text-xs border-orange-500 text-orange-500">
                              Action Required
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {activity.description}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(activity.timestamp), "h:mm a")}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Smart Insights */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-500" />
                <CardTitle>Smart Insights</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {overviewData.insights.map((insight) => (
                  <div key={insight.id} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium">{insight.title}</h4>
                      <div className={`flex items-center gap-1 ${
                        insight.change > 0 ? 'text-green-500' : insight.change < 0 ? 'text-red-500' : 'text-gray-500'
                      }`}>
                        <span className="text-lg font-bold">{insight.value}</span>
                        {insight.change !== 0 && (
                          <>
                            {insight.change > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                            <span className="text-xs">{Math.abs(insight.change)}%</span>
                          </>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{insight.insight}</p>
                    <p className="text-xs font-medium text-purple-600">
                      💡 {insight.recommendation}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Actions Footer */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Frequently used venue management tools</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <Button variant="outline" className="h-auto p-4 flex-col gap-2">
              <Plus className="h-6 w-6" />
              <span>New Booking</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex-col gap-2">
              <MessageSquare className="h-6 w-6" />
              <span>Send Message</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex-col gap-2">
              <Upload className="h-6 w-6" />
              <span>Upload Documents</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex-col gap-2">
              <BarChart3 className="h-6 w-6" />
              <span>View Analytics</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 