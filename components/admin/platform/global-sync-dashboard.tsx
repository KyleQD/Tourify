"use client"

import { useEffect, useState } from 'react'
import { usePlatformSync, usePlatformStatus, usePlatformAnalytics } from '@/hooks/use-platform-sync'
import { useRealTimeCommunications } from '@/hooks/use-real-time-communications'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Activity, 
  Users, 
  Calendar, 
  MapPin, 
  DollarSign,
  Zap,
  Wifi,
  WifiOff,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Circle,
  MessageSquare,
  Radio
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { formatSafeDate } from '@/lib/events/admin-event-normalization'
import { formatSafeCurrency } from '@/lib/format/number-format'

// =============================================================================
// COMPONENT
// =============================================================================

export function GlobalSyncDashboard() {
  // Platform synchronization hooks
  const {
    tours,
    events,
    staff,
    venues,
    refreshAll,
    lastUpdate,
    getPerformanceStats
  } = usePlatformSync()

  const {
    isConnected,
    connectionQuality,
    queryLatency,
    subscriptionCount,
    activeUsers,
    isHealthy
  } = usePlatformStatus()

  const { analytics, refreshAnalytics } = usePlatformAnalytics()

  // Communication system integration
  const {
    announcements,
    channels,
    onlineUsers,
    isConnected: commsConnected
  } = useRealTimeCommunications({ enablePresence: true })

  // Local state for demo
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState(30000) // 30 seconds

  // =============================================================================
  // EFFECTS
  // =============================================================================

  // Auto-refresh data
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      refreshAll()
      refreshAnalytics()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, refreshAll, refreshAnalytics])

  // =============================================================================
  // UTILITY FUNCTIONS
  // =============================================================================

  const getConnectionStatusIcon = () => {
    if (!isConnected || !commsConnected) return <WifiOff className="h-4 w-4 text-red-500" />
    
    switch (connectionQuality) {
      case 'excellent': return <Wifi className="h-4 w-4 text-green-500" />
      case 'good': return <Wifi className="h-4 w-4 text-yellow-500" />
      case 'poor': return <Wifi className="h-4 w-4 text-orange-500" />
      default: return <WifiOff className="h-4 w-4 text-red-500" />
    }
  }

  const getConnectionStatusText = () => {
    if (!isConnected || !commsConnected) return 'Disconnected'
    return connectionQuality.charAt(0).toUpperCase() + connectionQuality.slice(1)
  }

  const getConnectionStatusColor = () => {
    if (!isConnected || !commsConnected) return 'bg-red-500/20 text-red-400 border-red-500/30'
    
    switch (connectionQuality) {
      case 'excellent': return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'good': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'poor': return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
      default: return 'bg-red-500/20 text-red-400 border-red-500/30'
    }
  }

  const performanceStats = getPerformanceStats()

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <div className="space-y-6">
      {/* Global Status Header */}
      <Card className="bg-slate-900/50 border-slate-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl text-white flex items-center">
              <Activity className="mr-2 h-6 w-6" />
              Platform Synchronization Status
            </CardTitle>
            
            <div className="flex items-center space-x-4">
              {/* Connection Status */}
              <Badge variant="outline" className={getConnectionStatusColor()}>
                {getConnectionStatusIcon()}
                <span className="ml-2">{getConnectionStatusText()}</span>
              </Badge>
              
              {/* Auto-refresh Toggle */}
              <Button
                variant={autoRefresh ? "default" : "outline"}
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
              >
                <Radio className={`h-4 w-4 mr-1 ${autoRefresh ? 'animate-pulse' : ''}`} />
                Auto-sync {autoRefresh ? 'ON' : 'OFF'}
              </Button>
              
              {/* Manual Refresh */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  refreshAll()
                  refreshAnalytics()
                }}
              >
                <Zap className="h-4 w-4 mr-1" />
                Refresh All
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {/* Platform Health */}
            <div className="text-center">
              <div className="text-2xl font-bold text-white mb-1">
                {isHealthy ? <CheckCircle className="h-6 w-6 text-green-500 mx-auto" /> : <AlertTriangle className="h-6 w-6 text-red-500 mx-auto" />}
              </div>
              <p className="text-sm text-slate-400">Platform Health</p>
            </div>
            
            {/* Query Latency */}
            <div className="text-center">
              <div className="text-2xl font-bold text-white mb-1">{queryLatency}ms</div>
              <p className="text-sm text-slate-400">Query Latency</p>
            </div>
            
            {/* Active Subscriptions */}
            <div className="text-center">
              <div className="text-2xl font-bold text-white mb-1">{subscriptionCount}</div>
              <p className="text-sm text-slate-400">Subscriptions</p>
            </div>
            
            {/* Online Users */}
            <div className="text-center">
              <div className="text-2xl font-bold text-white mb-1">{activeUsers.length + onlineUsers.length}</div>
              <p className="text-sm text-slate-400">Online Users</p>
            </div>
            
            {/* Last Update */}
            <div className="text-center">
              <div className="text-sm font-bold text-white mb-1">
                {lastUpdate ? formatDistanceToNow(lastUpdate, { addSuffix: true }) : 'Never'}
              </div>
              <p className="text-sm text-slate-400">Last Update</p>
            </div>
            
            {/* Data Freshness */}
            <div className="text-center">
              <div className="text-sm font-bold text-white mb-1">
                <Circle className={`h-4 w-4 mx-auto ${
                  lastUpdate && Date.now() - lastUpdate.getTime() < 30000 
                    ? 'text-green-500 fill-green-500' 
                    : 'text-yellow-500 fill-yellow-500'
                }`} />
              </div>
              <p className="text-sm text-slate-400">Data Fresh</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Real-Time Data Dashboard */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tours">Tours</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Tours Analytics */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-400 flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  Tours
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-2xl font-bold text-white">{analytics.tours.total}</span>
                    <Badge variant="outline" className="text-green-400 border-green-500/30">
                      {analytics.tours.active} active
                    </Badge>
                  </div>
                  <div className="text-sm text-slate-400">
                    {formatSafeCurrency(analytics.tours.revenue_total)} revenue
                  </div>
                  <Progress 
                    value={(analytics.tours.completed / analytics.tours.total) * 100} 
                    className="h-2"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Events Analytics */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-400 flex items-center">
                  <MapPin className="h-4 w-4 mr-2" />
                  Events
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-2xl font-bold text-white">{analytics.events.total}</span>
                    <Badge variant="outline" className="text-blue-400 border-blue-500/30">
                      {analytics.events.upcoming} upcoming
                    </Badge>
                  </div>
                  <div className="text-sm text-slate-400">
                    {Math.round(analytics.events.capacity_utilization * 100)}% capacity
                  </div>
                  <Progress 
                    value={analytics.events.capacity_utilization * 100} 
                    className="h-2"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Staff Analytics */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-400 flex items-center">
                  <Users className="h-4 w-4 mr-2" />
                  Staff
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-2xl font-bold text-white">{analytics.staff.total}</span>
                    <Badge variant="outline" className="text-purple-400 border-purple-500/30">
                      {analytics.staff.active} active
                    </Badge>
                  </div>
                  <div className="text-sm text-slate-400">
                    {Object.keys(analytics.staff.departments).length} departments
                  </div>
                  <div className="flex space-x-1">
                    {Object.entries(analytics.staff.departments).slice(0, 3).map(([dept, count]) => (
                      <Badge key={dept} variant="outline" className="text-xs">
                        {dept}: {count}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Communications Analytics */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-400 flex items-center">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Communications
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-2xl font-bold text-white">{analytics.communications.channels}</span>
                    <Badge variant="outline" className="text-green-400 border-green-500/30">
                      {analytics.communications.active_users} online
                    </Badge>
                  </div>
                  <div className="text-sm text-slate-400">
                    {analytics.communications.messages_today} messages today
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-slate-500">
                    <Circle className="h-2 w-2 fill-green-500 text-green-500" />
                    <span>Real-time active</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity Feed */}
          <Card className="bg-slate-900/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-lg text-white flex items-center">
                <TrendingUp className="mr-2 h-5 w-5" />
                Live Activity Feed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64 w-full">
                <div className="space-y-3">
                  {/* Recent Announcements */}
                  {announcements.slice(0, 3).map(announcement => (
                    <div key={announcement.id} className="flex items-start space-x-3 p-3 bg-slate-800/30 rounded-lg">
                      <div className="mt-1">
                        <Badge className={`text-xs ${
                          announcement.priority === 'emergency' ? 'bg-red-500/20 text-red-400' :
                          announcement.priority === 'urgent' ? 'bg-orange-500/20 text-orange-400' :
                          'bg-blue-500/20 text-blue-400'
                        }`}>
                          {announcement.priority}
                        </Badge>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">{announcement.title}</p>
                        <p className="text-xs text-slate-400 mt-1">
                          {formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                  
                  {/* Recent Data Changes */}
                  <div className="flex items-start space-x-3 p-3 bg-slate-800/30 rounded-lg">
                    <Calendar className="h-4 w-4 text-blue-400 mt-1" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">
                        {tours.filter(t => t.status === 'active').length} active tours updated
                      </p>
                      <p className="text-xs text-slate-400 mt-1">Real-time sync active</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3 p-3 bg-slate-800/30 rounded-lg">
                    <Users className="h-4 w-4 text-green-400 mt-1" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">
                        {activeUsers.length + onlineUsers.length} users online across platform
                      </p>
                      <p className="text-xs text-slate-400 mt-1">Live presence tracking</p>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tours Tab */}
        <TabsContent value="tours" className="space-y-4">
          <Card className="bg-slate-900/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Live Tours Data</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96 w-full">
                <div className="space-y-3">
                  {tours.map(tour => (
                    <div key={tour.id} className="p-4 bg-slate-800/30 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-white">{tour.name}</h4>
                        <Badge variant="outline" className={
                          tour.status === 'active' ? 'text-green-400 border-green-500/30' :
                          tour.status === 'planning' ? 'text-yellow-400 border-yellow-500/30' :
                          'text-slate-400 border-slate-500/30'
                        }>
                          {tour.status}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-slate-400">Shows</p>
                          <p className="text-white">{tour.completed_shows}/{tour.total_shows}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">Revenue</p>
                          <p className="text-white">{formatSafeCurrency(tour.revenue)}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">Updated</p>
                          <p className="text-white">{formatDistanceToNow(new Date(tour.updated_at), { addSuffix: true })}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Events Tab */}
        <TabsContent value="events" className="space-y-4">
          <Card className="bg-slate-900/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Live Events Data</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96 w-full">
                <div className="space-y-3">
                  {events.map(event => (
                    <div key={event.id} className="p-4 bg-slate-800/30 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-white">{event.name}</h4>
                        <Badge variant="outline" className={
                          event.status === 'confirmed' ? 'text-green-400 border-green-500/30' :
                          event.status === 'scheduled' ? 'text-blue-400 border-blue-500/30' :
                          'text-slate-400 border-slate-500/30'
                        }>
                          {event.status}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-slate-400">Venue</p>
                          <p className="text-white">{event.venue_name || 'TBD'}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">Capacity</p>
                          <p className="text-white">{event.tickets_sold}/{event.capacity}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">Date</p>
                          <p className="text-white">{formatSafeDate(event.event_date)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-slate-900/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Query Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(performanceStats.queries || {}).map(([query, stats]: [string, any]) => (
                    <div key={query} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-white">{query}</span>
                        <Badge variant="outline" className="text-xs">
                          {stats.avg?.toFixed(0)}ms avg
                        </Badge>
                      </div>
                      <div className="text-xs text-slate-400 grid grid-cols-3 gap-2">
                        <span>Min: {stats.min}ms</span>
                        <span>Max: {stats.max}ms</span>
                        <span>Count: {stats.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Connection Events</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64 w-full">
                  <div className="space-y-2">
                    {(performanceStats.connectionEvents || []).map((event: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-slate-800/30 rounded">
                        <span className="text-sm text-white capitalize">{event.type}</span>
                        <span className="text-xs text-slate-400">
                          {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                        </span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}