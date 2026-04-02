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
      
      // Mock comprehensive venue overview data
      const mockData: VenueOverviewData = {
        stats: {
          totalRevenue: 45780,
          monthlyRevenue: 12450,
          totalBookings: 127,
          activeBookings: 8,
          averageRating: 4.8,
          totalReviews: 94,
          profileViews: 2340,
          responseRate: 98.5
        },
        quickStats: {
          todayEvents: 2,
          pendingRequests: 5,
          unreadMessages: 3,
          upcomingDeadlines: 2,
          equipmentIssues: 1,
          teamOnline: 4
        },
        upcomingEvents: [
          {
            id: "evt-1",
            name: "Jazz & Blues Night",
            artist: "The Blue Note Quartet",
            date: new Date().toISOString(),
            time: "19:00",
            attendees: 180,
            status: "confirmed",
            priority: "high"
          },
          {
            id: "evt-2", 
            name: "Electronic Showcase",
            artist: "Pulse Productions",
            date: addDays(new Date(), 1).toISOString(),
            time: "21:00",
            attendees: 350,
            status: "setup",
            priority: "high"
          },
          {
            id: "evt-3",
            name: "Acoustic Sessions",
            artist: "Sarah Williams",
            date: addDays(new Date(), 3).toISOString(),
            time: "20:00",
            attendees: 120,
            status: "confirmed",
            priority: "medium"
          }
        ],
        recentActivity: [
          {
            id: "act-1",
            type: "booking",
            title: "New Booking Request",
            description: "Summer Festival by Red Rock Events for August 15th",
            timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
            priority: "high",
            actionRequired: true
          },
          {
            id: "act-2",
            type: "message",
            title: "Message from Blue Note Quartet",
            description: "Updated technical requirements for tonight's show",
            timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
            priority: "medium",
            actionRequired: true
          },
          {
            id: "act-3",
            type: "payment",
            title: "Payment Received",
            description: "$2,500 deposit for Electronic Showcase",
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            priority: "low",
            actionRequired: false
          },
          {
            id: "act-4",
            type: "review",
            title: "New 5-Star Review",
            description: "Excellent venue and professional staff - Jazz Collective",
            timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
            priority: "low",
            actionRequired: false
          }
        ],
        alerts: [
          {
            id: "alert-1",
            type: "warning",
            title: "Equipment Maintenance Due",
            message: "Sound system maintenance is scheduled for tomorrow morning. Please coordinate with technical team.",
            action: "Schedule Maintenance",
            actionUrl: "/venue/equipment"
          },
          {
            id: "alert-2",
            type: "info",
            title: "New Feature Available",
            message: "Advanced analytics dashboard is now available for premium venues.",
            action: "Learn More",
            actionUrl: "/venue/analytics"
          }
        ],
        insights: [
          {
            id: "insight-1",
            category: "revenue",
            title: "Revenue Growth",
            value: "+23%",
            change: 23,
            insight: "Revenue increased by 23% compared to last month",
            recommendation: "Consider raising rates for peak weekend slots"
          },
          {
            id: "insight-2",
            category: "performance",
            title: "Booking Conversion",
            value: "87%",
            change: 12,
            insight: "Booking conversion rate improved by 12%",
            recommendation: "Your quick response time is driving higher conversions"
          },
          {
            id: "insight-3",
            category: "efficiency",
            title: "Average Response Time",
            value: "1.2h",
            change: -30,
            insight: "Response time decreased by 30% (faster responses)",
            recommendation: "Maintain this excellent response rate to boost rankings"
          },
          {
            id: "insight-4",
            category: "opportunities",
            title: "Underutilized Days",
            value: "Tue-Wed",
            change: 0,
            insight: "Tuesday and Wednesday show low booking rates",
            recommendation: "Consider offering midweek discounts or hosting regular events"
          }
        ]
      }
      
      setOverviewData(mockData)
      
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