"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { motion, AnimatePresence } from "framer-motion"
import { formatDistanceToNow } from "date-fns"
import { formatSafeNumber } from "@/lib/format/number-format"
import {
  Activity,
  Bell,
  CheckCircle,
  AlertTriangle,
  Info,
  Clock,
  Users,
  Calendar,
  Globe,
  DollarSign,
  FileText,
  Building,
  Music,
  Truck,
  Settings,
  Search,
  Filter,
  RefreshCw,
  BellRing,
  MessageSquare,
  CheckSquare,
  Upload,
  Download,
  Edit,
  Trash2,
  Plus,
  Eye,
  EyeOff,
  Pause,
  Play,
  Volume2,
  VolumeX
} from "lucide-react"

interface ActivityItem {
  id: string
  type: 'task' | 'tour' | 'event' | 'budget' | 'team' | 'document' | 'venue' | 'system'
  action: 'created' | 'updated' | 'completed' | 'cancelled' | 'approved' | 'rejected' | 'uploaded' | 'deleted'
  title: string
  description: string
  user: {
    id: string
    name: string
    avatar?: string
    role?: string
  }
  timestamp: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  tourId?: string
  tourName?: string
  eventId?: string
  eventName?: string
  url?: string
  metadata?: Record<string, any>
  isRead?: boolean
  isArchived?: boolean
}

interface ActivityFilter {
  types: string[]
  priorities: string[]
  dateRange: 'today' | 'week' | 'month' | 'all'
  tours: string[]
  users: string[]
  isRead?: boolean
}

interface RealtimeActivityFeedProps {
  tourId?: string
  eventId?: string
  userId?: string
  maxItems?: number
  showFilters?: boolean
  showHeader?: boolean
  autoRefresh?: boolean
  onActivityClick?: (activity: ActivityItem) => void
  className?: string
}

export function RealtimeActivityFeed({
  tourId,
  eventId,
  userId,
  maxItems = 50,
  showFilters = true,
  showHeader = true,
  autoRefresh = true,
  onActivityClick,
  className = ""
}: RealtimeActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [filteredActivities, setFilteredActivities] = useState<ActivityItem[]>([])
  const [filters, setFilters] = useState<ActivityFilter>({
    types: [],
    priorities: [],
    dateRange: 'all',
    tours: [],
    users: []
  })
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)
  const [selectedTab, setSelectedTab] = useState("all")

  // Mock activity data - replace with real WebSocket/SSE connection
  const mockActivities: ActivityItem[] = [
    {
      id: "activity-1",
      type: "task",
      action: "completed",
      title: "Sound Check Setup",
      description: "Completed sound check and equipment setup for Summer Music Festival",
      user: {
        id: "user-1",
        name: "Mike Chen",
        avatar: "/placeholder-user.jpg",
        role: "Sound Engineer"
      },
      timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
      priority: "high",
      tourId: "tour-1",
      tourName: "West Coast Summer Tour",
      eventId: "event-1",
      eventName: "Summer Music Festival",
      isRead: false
    },
    {
      id: "activity-2",
      type: "budget",
      action: "updated",
      title: "Budget Allocation Modified",
      description: "Updated transportation budget for European Festival Circuit tour",
      user: {
        id: "user-2",
        name: "Sarah Johnson",
        avatar: "/placeholder-user.jpg",
        role: "Tour Manager"
      },
      timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      priority: "medium",
      tourId: "tour-2",
      tourName: "European Festival Circuit",
      metadata: { previousAmount: 180000, newAmount: 220000 },
      isRead: false
    },
    {
      id: "activity-3",
      type: "event",
      action: "created",
      title: "New Event Added",
      description: "Electronic Showcase event added to Berlin leg of European tour",
      user: {
        id: "user-3",
        name: "Alex Rivera",
        avatar: "/placeholder-user.jpg",
        role: "Event Coordinator"
      },
      timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      priority: "low",
      tourId: "tour-2",
      tourName: "European Festival Circuit",
      eventId: "event-3",
      eventName: "Electronic Showcase",
      isRead: true
    },
    {
      id: "activity-4",
      type: "document",
      action: "uploaded",
      title: "Contract Uploaded",
      description: "Venue contract for Madison Square Garden has been uploaded and requires review",
      user: {
        id: "user-4",
        name: "Lisa Wang",
        avatar: "/placeholder-user.jpg",
        role: "Legal Coordinator"
      },
      timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      priority: "urgent",
      tourId: "tour-1",
      tourName: "West Coast Summer Tour",
      metadata: { documentType: "Venue Contract", fileSize: "2.4 MB" },
      isRead: false
    },
    {
      id: "activity-5",
      type: "team",
      action: "updated",
      title: "Crew Assignment Changed",
      description: "David Kim assigned as backup sound engineer for Indie Rock Night",
      user: {
        id: "user-2",
        name: "Sarah Johnson",
        avatar: "/placeholder-user.jpg",
        role: "Tour Manager"
      },
      timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
      priority: "medium",
      tourId: "tour-1",
      tourName: "West Coast Summer Tour",
      eventId: "event-2",
      eventName: "Indie Rock Night",
      isRead: true
    },
    {
      id: "activity-6",
      type: "venue",
      action: "approved",
      title: "Venue Confirmed",
      description: "The Greek Theatre has confirmed availability for Los Angeles show",
      user: {
        id: "user-5",
        name: "Jennifer Doe",
        avatar: "/placeholder-user.jpg",
        role: "Venue Coordinator"
      },
      timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
      priority: "high",
      tourId: "tour-1",
      tourName: "West Coast Summer Tour",
      metadata: { venue: "The Greek Theatre", capacity: 5900, confirmedDate: "Jul 15, 2025" },
      isRead: true
    },
    {
      id: "activity-7",
      type: "system",
      action: "updated",
      title: "Weather Alert",
      description: "Severe weather warning issued for outdoor venue - contingency plans activated",
      user: {
        id: "system",
        name: "System",
        role: "Automated Alert"
      },
      timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
      priority: "urgent",
      eventId: "event-1",
      eventName: "Summer Music Festival",
      metadata: { alertType: "Weather", severity: "High", actionRequired: true },
      isRead: false
    }
  ]

  // Load activities
  useEffect(() => {
    const loadActivities = async () => {
      setIsLoading(true)
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Filter by context if provided
      let contextActivities = mockActivities
      if (tourId) {
        contextActivities = mockActivities.filter(a => a.tourId === tourId)
      }
      if (eventId) {
        contextActivities = mockActivities.filter(a => a.eventId === eventId)
      }
      if (userId) {
        contextActivities = mockActivities.filter(a => a.user.id === userId)
      }

      setActivities(contextActivities)
      setUnreadCount(contextActivities.filter(a => !a.isRead).length)
      setIsLoading(false)
    }

    loadActivities()
  }, [tourId, eventId, userId])

  // Auto-refresh activities
  useEffect(() => {
    if (!autoRefresh || isPaused) return

    const interval = setInterval(async () => {
      setIsRefreshing(true)
      
      // Simulate new activity
      const newActivity: ActivityItem = {
        id: `activity-${Date.now()}`,
        type: ["task", "tour", "event", "budget"][Math.floor(Math.random() * 4)] as any,
        action: ["created", "updated", "completed"][Math.floor(Math.random() * 3)] as any,
        title: "New Activity",
        description: "This is a simulated real-time activity update",
        user: {
          id: "user-sim",
          name: "Simulated User",
          role: "Demo"
        },
        timestamp: new Date().toISOString(),
        priority: ["low", "medium", "high"][Math.floor(Math.random() * 3)] as any,
        isRead: false
      }

      setActivities(prev => [newActivity, ...prev].slice(0, maxItems))
      setUnreadCount(prev => prev + 1)
      
      // Play notification sound
      if (soundEnabled) {
        // Add audio notification here
      }

      setIsRefreshing(false)
    }, 30000) // Refresh every 30 seconds

    return () => clearInterval(interval)
  }, [autoRefresh, isPaused, maxItems, soundEnabled])

  // Apply filters
  useEffect(() => {
    let filtered = activities

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(a =>
        a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.user.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Type filter
    if (filters.types.length > 0) {
      filtered = filtered.filter(a => filters.types.includes(a.type))
    }

    // Priority filter
    if (filters.priorities.length > 0) {
      filtered = filtered.filter(a => filters.priorities.includes(a.priority))
    }

    // Date range filter
    if (filters.dateRange !== 'all') {
      const now = new Date()
      const filterDate = new Date()
      
      switch (filters.dateRange) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0)
          break
        case 'week':
          filterDate.setDate(now.getDate() - 7)
          break
        case 'month':
          filterDate.setMonth(now.getMonth() - 1)
          break
      }
      
      filtered = filtered.filter(a => new Date(a.timestamp) >= filterDate)
    }

    // Read status filter
    if (selectedTab === 'unread') {
      filtered = filtered.filter(a => !a.isRead)
    } else if (selectedTab === 'read') {
      filtered = filtered.filter(a => a.isRead)
    }

    setFilteredActivities(filtered)
  }, [activities, filters, searchQuery, selectedTab])

  const markAsRead = useCallback((activityId: string) => {
    setActivities(prev => prev.map(a =>
      a.id === activityId ? { ...a, isRead: true } : a
    ))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }, [])

  const markAllAsRead = useCallback(() => {
    setActivities(prev => prev.map(a => ({ ...a, isRead: true })))
    setUnreadCount(0)
  }, [])

  const handleActivityClick = useCallback((activity: ActivityItem) => {
    if (!activity.isRead) {
      markAsRead(activity.id)
    }
    onActivityClick?.(activity)
  }, [markAsRead, onActivityClick])

  const getActivityIcon = (type: string, action: string) => {
    switch (type) {
      case 'task':
        return action === 'completed' ? CheckCircle : CheckSquare
      case 'tour':
        return Globe
      case 'event':
        return Calendar
      case 'budget':
        return DollarSign
      case 'team':
        return Users
      case 'document':
        return action === 'uploaded' ? Upload : FileText
      case 'venue':
        return Building
      case 'system':
        return Settings
      default:
        return Activity
    }
  }

  const getActivityColor = (type: string, priority: string) => {
    if (priority === 'urgent') return 'text-red-400'
    if (priority === 'high') return 'text-orange-400'
    
    switch (type) {
      case 'task': return 'text-green-400'
      case 'tour': return 'text-purple-400'
      case 'event': return 'text-blue-400'
      case 'budget': return 'text-yellow-400'
      case 'team': return 'text-cyan-400'
      case 'document': return 'text-orange-400'
      case 'venue': return 'text-pink-400'
      case 'system': return 'text-gray-400'
      default: return 'text-slate-400'
    }
  }

  const getPriorityBadge = (priority: string) => {
    const colors = {
      urgent: 'bg-red-500/20 text-red-400 border-red-500/30',
      high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      low: 'bg-green-500/20 text-green-400 border-green-500/30'
    }
    return colors[priority as keyof typeof colors] || colors.low
  }

  const refreshActivities = async () => {
    setIsRefreshing(true)
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsRefreshing(false)
  }

  if (isLoading) {
    return (
      <Card className={`bg-slate-900/50 border-slate-700/50 ${className}`}>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-3">
                <div className="h-10 w-10 bg-slate-700 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-700 rounded w-3/4"></div>
                  <div className="h-3 bg-slate-700 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`bg-slate-900/50 border-slate-700/50 ${className}`}>
      {showHeader && (
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center">
              <Activity className="h-5 w-5 mr-2 text-purple-400" />
              Activity Feed
              {unreadCount > 0 && (
                <Badge className="ml-2 bg-red-500/20 text-red-400 border-red-500/30">
                  {unreadCount}
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`text-slate-400 hover:text-white ${soundEnabled ? 'text-white' : ''}`}
              >
                {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsPaused(!isPaused)}
                className={`text-slate-400 hover:text-white ${isPaused ? 'text-yellow-400' : ''}`}
              >
                {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={refreshActivities}
                disabled={isRefreshing}
                className="text-slate-400 hover:text-white"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
      )}

      <CardContent className="p-4 space-y-4">
        {/* Search and Filters */}
        {showFilters && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search activities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-slate-800/50 border-slate-600/50 text-white placeholder:text-slate-400"
              />
            </div>

            <div className="flex items-center space-x-2 overflow-x-auto">
              <Select
                value={filters.dateRange}
                onValueChange={(value) => setFilters(prev => ({ ...prev, dateRange: value as any }))}
              >
                <SelectTrigger className="w-24 bg-slate-800/50 border-slate-600/50 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>

              {unreadCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-xs border-slate-600 text-slate-300 hover:bg-slate-800"
                >
                  Mark All Read
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Activity Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="bg-slate-800/50 p-1 grid grid-cols-3 w-full">
            <TabsTrigger value="all" className="data-[state=active]:bg-slate-700 text-xs">
              All ({activities.length})
            </TabsTrigger>
            <TabsTrigger value="unread" className="data-[state=active]:bg-slate-700 text-xs">
              Unread ({unreadCount})
            </TabsTrigger>
            <TabsTrigger value="read" className="data-[state=active]:bg-slate-700 text-xs">
              Read ({activities.length - unreadCount})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Activity List */}
        <ScrollArea className="h-80">
          <AnimatePresence>
            {filteredActivities.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Activity className="h-12 w-12 mx-auto mb-4 text-slate-600" />
                <p className="text-sm">No activities found</p>
                <p className="text-xs text-slate-500">Try adjusting your filters</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredActivities.map((activity, index) => {
                  const Icon = getActivityIcon(activity.type, activity.action)
                  const iconColor = getActivityColor(activity.type, activity.priority)
                  const timeAgo = formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })

                  return (
                    <motion.div
                      key={activity.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => handleActivityClick(activity)}
                      className={`p-3 rounded-lg cursor-pointer transition-all duration-200 border ${
                        !activity.isRead
                          ? 'bg-purple-600/10 border-purple-500/30 hover:bg-purple-600/20'
                          : 'bg-slate-800/30 border-slate-700/30 hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`p-2 rounded-lg ${activity.isRead ? 'bg-slate-700/50' : 'bg-purple-600/20'}`}>
                          <Icon className={`h-4 w-4 ${iconColor}`} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className={`text-sm font-medium truncate ${
                              activity.isRead ? 'text-slate-300' : 'text-white'
                            }`}>
                              {activity.title}
                            </h4>
                            <div className="flex items-center space-x-2">
                              <Badge className={`text-xs ${getPriorityBadge(activity.priority)}`}>
                                {activity.priority}
                              </Badge>
                              {!activity.isRead && (
                                <div className="h-2 w-2 bg-purple-500 rounded-full"></div>
                              )}
                            </div>
                          </div>

                          <p className="text-sm text-slate-400 mb-2 line-clamp-2">
                            {activity.description}
                          </p>

                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center space-x-2">
                              {activity.user.avatar ? (
                                <Avatar className="h-5 w-5">
                                  <AvatarImage src={activity.user.avatar} />
                                  <AvatarFallback>{activity.user.name[0]}</AvatarFallback>
                                </Avatar>
                              ) : (
                                <div className="h-5 w-5 bg-slate-600 rounded-full flex items-center justify-center">
                                  <span className="text-xs text-slate-300">{activity.user.name[0]}</span>
                                </div>
                              )}
                              <span className="text-slate-400">{activity.user.name}</span>
                              {activity.user.role && (
                                <>
                                  <span className="text-slate-600">•</span>
                                  <span className="text-slate-500">{activity.user.role}</span>
                                </>
                              )}
                            </div>
                            <span className="text-slate-500">{timeAgo}</span>
                          </div>

                          {/* Context Links */}
                          {(activity.tourName || activity.eventName) && (
                            <div className="flex items-center space-x-2 mt-2 text-xs">
                              {activity.tourName && (
                                <div className="flex items-center space-x-1 text-purple-400">
                                  <Globe className="h-3 w-3" />
                                  <span>{activity.tourName}</span>
                                </div>
                              )}
                              {activity.eventName && (
                                <>
                                  {activity.tourName && <span className="text-slate-600">•</span>}
                                  <div className="flex items-center space-x-1 text-blue-400">
                                    <Calendar className="h-3 w-3" />
                                    <span>{activity.eventName}</span>
                                  </div>
                                </>
                              )}
                            </div>
                          )}

                          {/* Metadata */}
                          {activity.metadata && (
                            <div className="mt-2 text-xs text-slate-500">
                              {activity.type === 'budget' && activity.metadata.previousAmount && (
                                <span>
                                  ${(activity.metadata.previousAmount / 1000).toFixed(0)}K → 
                                  ${(activity.metadata.newAmount / 1000).toFixed(0)}K
                                </span>
                              )}
                              {activity.type === 'document' && activity.metadata.documentType && (
                                <span>{activity.metadata.documentType} • {activity.metadata.fileSize}</span>
                              )}
                              {activity.type === 'venue' && activity.metadata.venue && (
                                <span>{activity.metadata.venue} • {formatSafeNumber(activity.metadata.capacity)} capacity</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </AnimatePresence>
        </ScrollArea>

        {/* Footer */}
        {filteredActivities.length > 0 && (
          <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-700/50">
            <span>{filteredActivities.length} of {activities.length} activities</span>
            {isRefreshing && (
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 bg-purple-500 rounded-full animate-pulse"></div>
                <span>Updating...</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
} 