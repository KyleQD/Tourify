"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { motion, AnimatePresence } from "framer-motion"
import { formatSafeNumber } from "@/lib/format/number-format"
import { 
  Calendar, 
  Users, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Building,
  Music,
  Ticket,
  Clock,
  MapPin,
  Star,
  AlertTriangle,
  CheckCircle,
  Plus,
  ArrowRight,
  Activity,
  Target,
  Zap,
  Eye,
  MessageSquare,
  FileText,
  Settings,
  BarChart3,
  PieChart,
  Sparkles,
  Crown,
  Shield,
  Bell,
  Globe,
  Heart,
  Award,
  Truck,
  Coffee,
  Camera,
  Headphones,
  Mic,
  Radio,
  Volume2
} from "lucide-react"
import { formatSafeDate, mapAdminEventStatus } from "@/lib/events/admin-event-normalization"

interface DashboardStats {
  totalTours: number
  activeTours: number
  totalEvents: number
  upcomingEvents: number
  totalArtists: number
  totalVenues: number
  totalRevenue: number
  monthlyRevenue: number
  ticketsSold: number
  totalCapacity: number
  staffMembers: number
  completedTasks: number
  pendingTasks: number
  averageRating: number
  pendingBookings: number
  confirmedBookings: number
}

interface RecentActivity {
  id: string
  type: 'tour' | 'event' | 'booking' | 'artist' | 'venue' | 'staff'
  title: string
  description: string
  timestamp: string
  status: 'success' | 'warning' | 'error' | 'info'
  user?: string
  avatar?: string
}

interface UpcomingEvent {
  id: string
  title: string
  date: string
  time: string
  venue: string
  location: string
  artist: string
  capacity: number
  ticketsSold: number
  status: 'confirmed' | 'pending' | 'cancelled'
  type: string
  revenue: number
}

interface QuickAction {
  id: string
  title: string
  description: string
  icon: any
  href: string
  color: string
  badge?: string
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalTours: 8,
    activeTours: 3,
    totalEvents: 42,
    upcomingEvents: 12,
    totalArtists: 156,
    totalVenues: 89,
    totalRevenue: 2480000,
    monthlyRevenue: 485000,
    ticketsSold: 18750,
    totalCapacity: 25000,
    staffMembers: 28,
    completedTasks: 147,
    pendingTasks: 23,
    averageRating: 4.7,
    pendingBookings: 15,
    confirmedBookings: 67
  })

  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([
    {
      id: '1',
      type: 'tour',
      title: 'West Coast Summer Tour',
      description: 'New venue added to Los Angeles leg',
      timestamp: '2 hours ago',
      status: 'success',
      user: 'Sarah Johnson',
      avatar: '/placeholder-user.jpg'
    },
    {
      id: '2',
      type: 'booking',
      title: 'Artist Booking Request',
      description: 'The Electric Waves - Madison Square Garden',
      timestamp: '4 hours ago',
      status: 'warning',
      user: 'Mike Chen',
      avatar: '/placeholder-user.jpg'
    },
    {
      id: '3',
      type: 'event',
      title: 'Summer Music Festival',
      description: 'Final sound check completed',
      timestamp: '6 hours ago',
      status: 'success',
      user: 'Alex Rivera',
      avatar: '/placeholder-user.jpg'
    },
    {
      id: '4',
      type: 'venue',
      title: 'Central Park Venue',
      description: 'Equipment installation in progress',
      timestamp: '8 hours ago',
      status: 'info',
      user: 'Lisa Wang',
      avatar: '/placeholder-user.jpg'
    },
    {
      id: '5',
      type: 'artist',
      title: 'DJ Luna',
      description: 'Contract signed for European tour',
      timestamp: '1 day ago',
      status: 'success',
      user: 'David Kim',
      avatar: '/placeholder-user.jpg'
    }
  ])

  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([
    {
      id: '1',
      title: 'Summer Music Festival',
      date: '2025-07-15',
      time: '19:00',
      venue: 'Central Park',
      location: 'New York, NY',
      artist: 'The Electric Waves',
      capacity: 5000,
      ticketsSold: 4200,
      status: 'confirmed',
      type: 'Festival',
      revenue: 210000
    },
    {
      id: '2',
      title: 'Indie Rock Night',
      date: '2025-07-18',
      time: '20:00',
      venue: 'Madison Square Garden',
      location: 'New York, NY',
      artist: 'Acoustic Soul',
      capacity: 20000,
      ticketsSold: 15600,
      status: 'confirmed',
      type: 'Concert',
      revenue: 780000
    },
    {
      id: '3',
      title: 'Electronic Showcase',
      date: '2025-07-22',
      time: '21:00',
      venue: 'Brooklyn Warehouse',
      location: 'Brooklyn, NY',
      artist: 'DJ Luna',
      capacity: 2500,
      ticketsSold: 1800,
      status: 'pending',
      type: 'Club Night',
      revenue: 54000
    }
  ])

  const quickActions: QuickAction[] = [
    {
      id: '1',
      title: 'Create New Tour',
      description: 'Start planning a new multi-city tour',
      icon: Globe,
      href: '/admin/dashboard/tours/create',
      color: 'bg-gradient-to-r from-purple-500 to-blue-500',
      badge: 'Popular'
    },
    {
      id: '2',
      title: 'Add Event',
      description: 'Schedule a new event or performance',
      icon: Calendar,
      href: '/admin/dashboard/events/create',
      color: 'bg-gradient-to-r from-green-500 to-teal-500'
    },
    {
      id: '3',
      title: 'Book Artist',
      description: 'Send booking request to artists',
      icon: Music,
      href: '/admin/dashboard/artists/booking',
      color: 'bg-gradient-to-r from-pink-500 to-red-500'
    },
    {
      id: '4',
      title: 'Manage Venues',
      description: 'Coordinate with venue partners',
      icon: Building,
      href: '/admin/dashboard/venues',
      color: 'bg-gradient-to-r from-yellow-500 to-orange-500'
    },
    {
      id: '5',
      title: 'Team Communication',
      description: 'Send updates to staff and crew',
      icon: MessageSquare,
      href: '/admin/dashboard/communications',
      color: 'bg-gradient-to-r from-indigo-500 to-purple-500'
    },
    {
      id: '6',
      title: 'Analytics Report',
      description: 'View performance metrics and insights',
      icon: BarChart3,
      href: '/admin/dashboard/analytics',
      color: 'bg-gradient-to-r from-cyan-500 to-blue-500'
    }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-400'
      case 'warning': return 'text-yellow-400'
      case 'error': return 'text-red-400'
      case 'info': return 'text-blue-400'
      default: return 'text-gray-400'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4" />
      case 'warning': return <AlertTriangle className="h-4 w-4" />
      case 'error': return <AlertTriangle className="h-4 w-4" />
      case 'info': return <Activity className="h-4 w-4" />
      default: return <Activity className="h-4 w-4" />
    }
  }

  const getEventStatusBadge = (status: string) => {
    if (status === 'pending')
      return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Pending</Badge>

    const normalizedStatus = mapAdminEventStatus(status)
    if (normalizedStatus === 'confirmed')
      return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Confirmed</Badge>
    if (normalizedStatus === 'scheduled')
      return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Scheduled</Badge>
    if (normalizedStatus === 'in_progress')
      return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">In Progress</Badge>
    if (normalizedStatus === 'cancelled')
      return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Cancelled</Badge>
    if (normalizedStatus === 'completed')
      return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">Completed</Badge>

    switch (status) {
      case 'confirmed':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Confirmed</Badge>
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Pending</Badge>
      case 'cancelled':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Cancelled</Badge>
      default:
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">Unknown</Badge>
    }
  }

  const MetricCard = ({ title, value, change, icon: Icon, trend, subtitle, color = "text-purple-400" }: {
    title: string
    value: string | number
    change?: number
    icon: any
    trend?: 'up' | 'down'
    subtitle?: string
    color?: string
  }) => (
    <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm hover:bg-slate-900/70 transition-all duration-300 group">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm text-slate-400 font-medium">{title}</p>
            <p className="text-2xl font-bold text-white">{value}</p>
            {subtitle && (
              <p className="text-xs text-slate-500">{subtitle}</p>
            )}
          </div>
          <div className={`p-3 rounded-full bg-slate-800/50 ${color} group-hover:scale-110 transition-transform`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
        {change !== undefined && (
          <div className="mt-4 flex items-center">
            {trend === 'up' ? (
              <TrendingUp className="h-4 w-4 text-green-400 mr-1" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-400 mr-1" />
            )}
            <span className={`text-sm font-medium ${trend === 'up' ? 'text-green-400' : 'text-red-400'}`}>
              {change > 0 ? '+' : ''}{change}%
            </span>
            <span className="text-sm text-slate-500 ml-1">from last month</span>
          </div>
        )}
      </CardContent>
    </Card>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-purple-950/20 p-6">
      <div className="container mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              Admin Dashboard
            </h1>
            <p className="text-slate-400 mt-2">
              Comprehensive event and tour management platform
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0">
              <Plus className="h-4 w-4 mr-2" />
              Quick Action
            </Button>
            <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Active Tours"
            value={stats.activeTours}
            change={12}
            icon={Globe}
            trend="up"
            subtitle={`${stats.totalTours} total tours`}
            color="text-purple-400"
          />
          <MetricCard
            title="Upcoming Events"
            value={stats.upcomingEvents}
            change={8}
            icon={Calendar}
            trend="up"
            subtitle={`${stats.totalEvents} total events`}
            color="text-green-400"
          />
          <MetricCard
            title="Monthly Revenue"
            value={`$${(stats.monthlyRevenue / 1000).toFixed(0)}K`}
            change={15}
            icon={DollarSign}
            trend="up"
            subtitle={`$${(stats.totalRevenue / 1000000).toFixed(1)}M total`}
            color="text-yellow-400"
          />
          <MetricCard
            title="Ticket Sales"
            value={`${((stats.ticketsSold / stats.totalCapacity) * 100).toFixed(0)}%`}
            change={-3}
            icon={Ticket}
            trend="down"
            subtitle={`${formatSafeNumber(stats.ticketsSold)} / ${formatSafeNumber(stats.totalCapacity)}`}
            color="text-blue-400"
          />
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Artists"
            value={stats.totalArtists}
            icon={Music}
            color="text-pink-400"
            subtitle="Active partnerships"
          />
          <MetricCard
            title="Venues"
            value={stats.totalVenues}
            icon={Building}
            color="text-orange-400"
            subtitle="Partner venues"
          />
          <MetricCard
            title="Staff Members"
            value={stats.staffMembers}
            icon={Users}
            color="text-cyan-400"
            subtitle="Team & crew"
          />
          <MetricCard
            title="Avg Rating"
            value={stats.averageRating}
            icon={Star}
            color="text-yellow-400"
            subtitle="Customer satisfaction"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Activity */}
          <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Activity className="h-5 w-5 mr-2 text-blue-400" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center space-x-3 p-3 rounded-lg hover:bg-slate-800/50 transition-colors"
                  >
                    <div className={`p-2 rounded-full bg-slate-800/50 ${getStatusColor(activity.status)}`}>
                      {getStatusIcon(activity.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {activity.title}
                      </p>
                      <p className="text-xs text-slate-400 truncate">
                        {activity.description}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-slate-500">
                        {activity.timestamp}
                      </span>
                      {activity.user && (
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={activity.avatar} />
                          <AvatarFallback>{activity.user[0]}</AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Events */}
          <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                <div className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2 text-green-400" />
                  Upcoming Events
                </div>
                <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                  <Eye className="h-4 w-4 mr-1" />
                  View All
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {upcomingEvents.map((event) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-lg border border-slate-700/50 hover:bg-slate-800/30 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-white">{event.title}</h4>
                      {getEventStatusBadge(event.status)}
                    </div>
                    <div className="space-y-1 text-sm text-slate-400">
                      <div className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {formatSafeDate(event.date)} at {event.time}
                      </div>
                      <div className="flex items-center">
                        <MapPin className="h-3 w-3 mr-1" />
                        {event.venue}, {event.location}
                      </div>
                      <div className="flex items-center">
                        <Music className="h-3 w-3 mr-1" />
                        {event.artist}
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="text-xs">
                          <span className="text-slate-500">Sold:</span>
                          <span className="text-white ml-1">{formatSafeNumber(event.ticketsSold)}</span>
                        </div>
                        <div className="text-xs">
                          <span className="text-slate-500">Revenue:</span>
                          <span className="text-green-400 ml-1">${(event.revenue / 1000).toFixed(0)}K</span>
                        </div>
                      </div>
                      <Progress 
                        value={(event.ticketsSold / event.capacity) * 100} 
                        className="w-16 h-2"
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Zap className="h-5 w-5 mr-2 text-yellow-400" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {quickActions.map((action) => (
                <motion.div
                  key={action.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    variant="ghost"
                    className="w-full h-auto p-4 text-left hover:bg-slate-800/50 border border-slate-700/50 hover:border-slate-600"
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${action.color}`}>
                        <action.icon className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium text-white">{action.title}</h4>
                          {action.badge && (
                            <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">
                              {action.badge}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-400 mt-1">{action.description}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-400" />
                    </div>
                  </Button>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Performance Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Target className="h-5 w-5 mr-2 text-blue-400" />
                Task Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Completed Tasks</span>
                  <span className="text-sm font-medium text-white">{stats.completedTasks}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Pending Tasks</span>
                  <span className="text-sm font-medium text-yellow-400">{stats.pendingTasks}</span>
                </div>
                <Progress value={(stats.completedTasks / (stats.completedTasks + stats.pendingTasks)) * 100} className="h-2" />
                <div className="text-xs text-slate-500 text-center">
                  {Math.round((stats.completedTasks / (stats.completedTasks + stats.pendingTasks)) * 100)}% completion rate
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Building className="h-5 w-5 mr-2 text-orange-400" />
                Booking Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Confirmed Bookings</span>
                  <span className="text-sm font-medium text-green-400">{stats.confirmedBookings}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Pending Bookings</span>
                  <span className="text-sm font-medium text-yellow-400">{stats.pendingBookings}</span>
                </div>
                <Progress value={(stats.confirmedBookings / (stats.confirmedBookings + stats.pendingBookings)) * 100} className="h-2" />
                <div className="text-xs text-slate-500 text-center">
                  {Math.round((stats.confirmedBookings / (stats.confirmedBookings + stats.pendingBookings)) * 100)}% confirmation rate
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Award className="h-5 w-5 mr-2 text-yellow-400" />
                Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Platform Rating</span>
                  <div className="flex items-center space-x-1">
                    <Star className="h-4 w-4 text-yellow-400 fill-current" />
                    <span className="text-sm font-medium text-white">{stats.averageRating}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Client Satisfaction</span>
                  <span className="text-sm font-medium text-green-400">94%</span>
                </div>
                <Progress value={94} className="h-2" />
                <div className="text-xs text-slate-500 text-center">
                  Excellent performance across all metrics
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
