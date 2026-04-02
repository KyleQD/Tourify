"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { VirtualTable, VirtualList } from "./virtual-scroll"
import { ErrorBoundary } from "./error-boundary"
import { HelpSystem, useHelpSystem } from "./help-system"
import { KeyboardShortcutsHelp, useKeyboardShortcutsHelp } from "./keyboard-shortcuts-help"
import { RealTimeStatusBar } from "@/components/admin/real-time-indicator"
import AnalyticsDashboard from "./analytics-dashboard"
import DataLoadingStatus from "./data-loading-status"
import DashboardCalendar from "./dashboard-calendar"
import { 
  Globe, 
  Calendar, 
  DollarSign, 
  Users, 
  Music, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  Bell, 
  RefreshCw, 
  Database, 
  Keyboard, 
  HelpCircle, 
  ArrowRight,
  Target,
  Eye,
  MoreHorizontal,
} from "lucide-react"
import Link from "next/link"
import { useMultiAccount } from "@/hooks/use-multi-account"
import { getOrganizationPublicProfilePath } from "@/lib/utils/public-profile-routes"
import { WidgetsRow } from "./apple-widgets"
import { AdminStatCard } from "./admin-stat-card"
import { statusBadgeClass } from "./admin-badge-utils"
import type { AdminDashboardStats } from "@/types/admin"
import { formatSafeDate, normalizeAdminEvent } from "@/lib/events/admin-event-normalization"
import { formatSafeCurrency } from "@/lib/format/number-format"

type DashboardStats = AdminDashboardStats

export default function OptimizedDashboardClient() {
  const router = useRouter()
  const { currentAccount } = useMultiAccount()
  const [organizerPublicPath, setOrganizerPublicPath] = useState<string | null>(null)

  // State for data
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [tours, setTours] = useState<any[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [notifications, setNotifications] = useState<any[]>([])
  
  // Loading states
  const [statsLoading, setStatsLoading] = useState(true)
  const [toursLoading, setToursLoading] = useState(true)
  const [eventsLoading, setEventsLoading] = useState(true)
  const [notificationsLoading, setNotificationsLoading] = useState(true)
  
  // Error states
  const [statsError, setStatsError] = useState<string | null>(null)
  const [toursError, setToursError] = useState<string | null>(null)
  const [eventsError, setEventsError] = useState<string | null>(null)
  const [notificationsError, setNotificationsError] = useState<string | null>(null)

  // UI state
  const [activeTab, setActiveTab] = useState('overview')
  const [showDataStatus, setShowDataStatus] = useState(false)

  useEffect(() => {
    if (currentAccount?.account_type !== 'admin') {
      setOrganizerPublicPath(null)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/profile/current', { credentials: 'include' })
        if (!res.ok || cancelled) return
        const data = await res.json()
        const customUrl = data?.profile?.custom_url as string | undefined
        const username = data?.profile?.username as string | undefined
        const slug = customUrl || username

        if (!cancelled) {
          if (!slug || slug === 'user') {
            setOrganizerPublicPath(null)
          } else {
            setOrganizerPublicPath(getOrganizationPublicProfilePath(slug))
          }
        }
      } catch {
        if (!cancelled) setOrganizerPublicPath(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [currentAccount?.account_type])

  // Help system
  const { isOpen: helpOpen, openHelp, closeHelp } = useHelpSystem()
  const { isOpen: shortcutsOpen, openHelp: openShortcuts, closeHelp: closeShortcuts } = useKeyboardShortcutsHelp()

  // Fetch data only when organizer mode is active (avoids admin API calls with wrong account context)
  useEffect(() => {
    if (currentAccount?.account_type !== 'admin') {
      setStatsLoading(false)
      setToursLoading(false)
      setEventsLoading(false)
      setNotificationsLoading(false)
      return
    }

    const fetchData = async () => {
      try {
        // Fetch stats
        const statsResponse = await fetch('/api/admin/dashboard/stats', {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        })
        
        if (statsResponse.ok) {
          const statsData = await statsResponse.json()
          setStats(statsData.stats)
        } else {
          setStatsError(`Stats API failed: ${statsResponse.status}`)
        }
      } catch (error) {
        setStatsError('Failed to load stats')
        console.error('Stats fetch error:', error)
      } finally {
        setStatsLoading(false)
      }

      try {
        // Fetch tours
        const toursResponse = await fetch('/api/admin/tours', {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        })
        
        if (toursResponse.ok) {
          const toursData = await toursResponse.json()
          setTours(toursData.tours || [])
        } else {
          setToursError(`Tours API failed: ${toursResponse.status}`)
        }
      } catch (error) {
        setToursError('Failed to load tours')
        console.error('Tours fetch error:', error)
      } finally {
        setToursLoading(false)
      }

      try {
        // Fetch events
        const eventsResponse = await fetch('/api/admin/events', {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        })
        
        if (eventsResponse.ok) {
          const eventsData = await eventsResponse.json()
          setEvents(eventsData.events || [])
        } else {
          setEventsError(`Events API failed: ${eventsResponse.status}`)
        }
      } catch (error) {
        setEventsError('Failed to load events')
        console.error('Events fetch error:', error)
      } finally {
        setEventsLoading(false)
      }

      try {
        // Fetch notifications
        const notificationsResponse = await fetch('/api/admin/notifications', {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        })
        
        if (notificationsResponse.ok) {
          const notificationsData = await notificationsResponse.json()
          setNotifications(notificationsData.notifications || [])
        } else {
          setNotificationsError(`Notifications API failed: ${notificationsResponse.status}`)
        }
      } catch (error) {
        setNotificationsError('Failed to load notifications')
        console.error('Notifications fetch error:', error)
      } finally {
        setNotificationsLoading(false)
      }
    }

    fetchData()
  }, [currentAccount?.account_type])

  // Real-time subscriptions for live updates
  useEffect(() => {
    // Import Supabase client dynamically to avoid SSR issues
    const setupRealTimeSubscriptions = async () => {
      try {
        const { createClient } = await import('./lib/supabase-browser')
        const supabase = createClient()

        // Subscribe to tours changes
        const toursSubscription = supabase
          .channel('tours-changes')
          .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'tours' },
            (payload) => {
              fetch('/api/admin/tours', {
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' }
              })
              .then(response => response.json())
              .then(data => setTours(data.tours || []))
              .catch(error => console.error('Error refreshing tours:', error))
            }
          )
          .subscribe()

        // Subscribe to events changes
        const eventsSubscription = supabase
          .channel('events-changes')
          .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'events' },
            (payload) => {
              fetch('/api/admin/events', {
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' }
              })
              .then(response => response.json())
              .then(data => setEvents(data.events || []))
              .catch(error => console.error('Error refreshing events:', error))
            }
          )
          .subscribe()

        // Subscribe to ticket sales changes
        const ticketSalesSubscription = supabase
          .channel('ticket-sales-changes')
          .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'ticket_sales' },
            (payload) => {
              fetch('/api/admin/dashboard/stats', {
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' }
              })
              .then(response => response.json())
              .then(data => setStats(data.stats))
              .catch(error => console.error('Error refreshing stats:', error))
            }
          )
          .subscribe()

        // Subscribe to staff changes
        const staffSubscription = supabase
          .channel('staff-changes')
          .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'staff_profiles' },
            (payload) => {
              fetch('/api/admin/dashboard/stats', {
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' }
              })
              .then(response => response.json())
              .then(data => setStats(data.stats))
              .catch(error => console.error('Error refreshing stats:', error))
            }
          )
          .subscribe()

        // Cleanup function
        return () => {
          toursSubscription.unsubscribe()
          eventsSubscription.unsubscribe()
          ticketSalesSubscription.unsubscribe()
          staffSubscription.unsubscribe()
        }
      } catch (error) {
        console.error('Error setting up real-time subscriptions:', error)
      }
    }

    const cleanup = setupRealTimeSubscriptions()
    return () => {
      cleanup.then(cleanupFn => cleanupFn?.())
    }
  }, [])

  const recentTours = useMemo(() => {
    if (!tours || tours.length === 0) return []
    
    return tours.slice(0, 5).map((tour: any) => {
      const totalShows = tour.total_shows ?? tour.totalShows ?? 0
      const completedShows = tour.completed_shows ?? tour.completedShows ?? 0
      return {
        id: tour.id,
        name: tour.name,
        artist: 'TBD',
        status: tour.status,
        progress: totalShows > 0 ? (completedShows / totalShows) * 100 : 0,
        revenue: tour.revenue || 0,
        totalShows,
        completedShows,
        startDate: tour.start_date ?? tour.startDate,
        endDate: tour.end_date ?? tour.endDate
      }
    })
  }, [tours])

  const normalizedEvents = useMemo(() => {
    if (!events || events.length === 0) return []
    return events.map((event: any) => {
      const normalized = normalizeAdminEvent(event)
      return {
        ...event,
        ...normalized,
      }
    })
  }, [events])

  const upcomingEvents = useMemo(() => {
    if (!normalizedEvents || normalizedEvents.length === 0) return []
    
    const now = new Date()
    return normalizedEvents
      .filter((event: any) => {
        if (!event.event_date) return false
        return new Date(event.event_date) > now
      })
      .sort((a: any, b: any) => {
        const dA = new Date(a.event_date ?? 0)
        const dB = new Date(b.event_date ?? 0)
        return dA.getTime() - dB.getTime()
      })
      .slice(0, 5)
      .map((event: any) => {
        return {
          id: event.id,
          name: event.name || event.title || 'Event',
          venue_name: event.venue_name || event.venueName || 'TBD',
          event_date: formatSafeDate(event.event_date),
          tickets_sold: event.tickets_sold ?? event.ticketsSold ?? 0,
          capacity: event.capacity || 0,
          expected_revenue: event.expected_revenue ?? event.expectedRevenue ?? 0,
          status: event.status,
          eventTime: event.event_time ?? event.eventTime
        }
      })
  }, [normalizedEvents])

  const recentNotifications = useMemo(() => {
    if (!notifications || notifications.length === 0) return []
    
    return notifications
      .sort((a: any, b: any) => {
        const tA = a.created_at ?? a.createdAt ?? ''
        const tB = b.created_at ?? b.createdAt ?? ''
        return new Date(tB).getTime() - new Date(tA).getTime()
      })
      .slice(0, 10)
      .map((notification: any) => {
        const ts = notification.created_at ?? notification.createdAt
        return {
          id: notification.id,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          timestamp: ts
            ? new Intl.DateTimeFormat("en-US", {
                year: "numeric",
                month: "numeric",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              }).format(new Date(ts))
            : 'Unknown'
        }
      })
  }, [notifications])

  const [tasks, setTasks] = useState<any[]>([])
  const [tasksLoading, setTasksLoading] = useState(true)

  useEffect(() => {
    if (currentAccount?.account_type !== 'admin') {
      setTasksLoading(false)
      return
    }
    async function fetchTasks() {
      try {
        const res = await fetch('/api/admin/tasks?range=week', {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        })
        if (res.ok) {
          const data = await res.json()
          setTasks(data.tasks || [])
        }
      } catch {
        // Graceful fallback - empty tasks
      } finally {
        setTasksLoading(false)
      }
    }
    fetchTasks()
  }, [currentAccount?.account_type])

  const allMappedTasks = useMemo(() => {
    return tasks
      .filter((t: any) => {
        const due = t.due_date ?? t.dueAt
        return due != null && due !== ''
      })
      .sort((a: any, b: any) => {
        const aDue = a.due_date ?? a.dueAt
        const bDue = b.due_date ?? b.dueAt
        return new Date(aDue).getTime() - new Date(bDue).getTime()
      })
      .map((t: any) => ({
        id: t.id,
        title: t.title,
        description: t.description ?? '',
        priority: t.priority,
        status: t.status,
        dueDate: new Date(t.due_date ?? t.dueAt),
        due_date: t.due_date,
        assignedTo: t.assigned_to ?? t.assignee ?? 'Unassigned',
        assigned_to: t.assigned_to ?? t.assignee,
        type: 'task'
      }))
  }, [tasks])

  const upcomingTasks = useMemo(() => {
    return allMappedTasks.filter(t => t.status !== 'completed').slice(0, 5)
  }, [allMappedTasks])

  // Error handling
  if (statsError && toursError && eventsError) {
    return (
      <div className="p-6">
        <Card className="rounded-sm bg-red-900/40 border-red-700/40 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-6 w-6 text-red-400" />
              <div>
                <h3 className="text-lg font-semibold text-red-400">Error Loading Dashboard</h3>
                <p className="text-red-300 text-sm">
                  {statsError && `Stats: ${statsError}`}
                  {toursError && `Tours: ${toursError}`}
                  {eventsError && `Events: ${eventsError}`}
                  {notificationsError && `Notifications: ${notificationsError}`}
                </p>
              </div>
            </div>
            <div className="mt-4 flex space-x-2">
              <Button onClick={() => window.location.reload()} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
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
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-white">Dashboard Overview</h1>
            <div className="flex items-center space-x-2">
              <div className="h-2 w-2 rounded-full bg-green-400" />
              <span className="text-sm text-slate-400">Live Updates</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
              disabled={statsLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${statsLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-8 w-8" aria-label="More dashboard actions">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {currentAccount?.account_type === 'admin' && (
                  <DropdownMenuItem
                    disabled={!organizerPublicPath}
                    onSelect={() => {
                      if (!organizerPublicPath) return
                      router.push(organizerPublicPath)
                    }}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Public Profile
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onSelect={() => setShowDataStatus((s) => !s)}>
                  <Database className="h-4 w-4 mr-2" />
                  Data Status
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => openShortcuts()}>
                  <Keyboard className="h-4 w-4 mr-2" />
                  Keyboard shortcuts
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => openHelp()}>
                  <HelpCircle className="h-4 w-4 mr-2" />
                  Help
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Apple-inspired Widgets overview */}
        <WidgetsRow tours={tours} events={events} stats={stats} isLoading={statsLoading || toursLoading || eventsLoading} />

        {/* Data Loading Status */}
        <AnimatePresence>
          {showDataStatus && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <DataLoadingStatus
                data={stats}
                dataType="dashboardStats"
                isLoading={statsLoading}
                error={statsError}
                onRetry={() => window.location.reload()}
                onRefresh={() => window.location.reload()}
                showDetails={true}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <AdminStatCard title="Total Tours" value={stats?.totalTours || 0} icon={Globe} color="purple" size="lg" isLoading={statsLoading} />
          <AdminStatCard title="Total Events" value={stats?.totalEvents || 0} icon={Calendar} color="blue" size="lg" isLoading={statsLoading} />
          <AdminStatCard title="Total Revenue" value={formatSafeCurrency(stats?.totalRevenue || 0)} icon={DollarSign} color="green" size="lg" isLoading={statsLoading} />
          <AdminStatCard title="Tickets Sold" value={stats?.ticketsSold || 0} icon={Users} color="cyan" size="lg" isLoading={statsLoading} />
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-slate-800/60 backdrop-blur-sm p-1 rounded-sm border border-slate-700/30 flex overflow-x-auto sm:grid sm:grid-cols-6 w-full gap-1">
            <TabsTrigger value="overview" className="shrink-0 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/10 rounded-sm text-sm transition-all duration-200">Overview</TabsTrigger>
            <TabsTrigger value="tours" className="shrink-0 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/10 rounded-sm text-sm transition-all duration-200">Tours</TabsTrigger>
            <TabsTrigger value="events" className="shrink-0 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/10 rounded-sm text-sm transition-all duration-200">Events</TabsTrigger>
            <TabsTrigger value="calendar" className="shrink-0 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/10 rounded-sm text-sm transition-all duration-200">Calendar</TabsTrigger>
            <TabsTrigger value="analytics" className="shrink-0 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/10 rounded-sm text-sm transition-all duration-200">Analytics</TabsTrigger>
            <TabsTrigger value="notifications" className="shrink-0 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/10 rounded-sm text-sm transition-all duration-200">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Tours */}
              <Card className="rounded-sm bg-slate-900/60 border-slate-700/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-white flex items-center justify-between">
                    <span>Recent Tours</span>
                    <Link href="/admin/dashboard/tours">
                      <Button variant="ghost" size="sm">
                        View All <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    </Link>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <VirtualList
                    items={recentTours}
                    height={300}
                    itemHeight={60}
                    loading={toursLoading}
                    renderItem={(tour, index) => (
                      <div className="flex items-center justify-between p-3 hover:bg-slate-800/60 rounded-sm transition-all duration-200">
                        <div className="flex items-center space-x-3">
                          <div className="h-8 w-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-sm flex items-center justify-center shadow-lg">
                            <Globe className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <p className="font-medium text-white">{tour.name}</p>
                            <p className="text-sm text-slate-400">{tour.artist}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className={`text-xs ${statusBadgeClass(tour.status)}`}>
                            {tour.status}
                          </Badge>
                          <div className="mt-1">
                            <Progress value={tour.progress} className="h-1 w-16" />
                          </div>
                        </div>
                      </div>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Upcoming Events */}
              <Card className="rounded-sm bg-slate-900/60 border-slate-700/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-white flex items-center justify-between">
                    <span>Upcoming Events</span>
                    <Link href="/admin/dashboard/events">
                      <Button variant="ghost" size="sm">
                        View All <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    </Link>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <VirtualList
                    items={upcomingEvents}
                    height={300}
                    itemHeight={60}
                    loading={eventsLoading}
                    renderItem={(event, index) => (
                      <div className="flex items-center justify-between p-3 hover:bg-slate-800/60 rounded-sm transition-all duration-200">
                        <div className="flex items-center space-x-3">
                          <div className="h-8 w-8 bg-gradient-to-r from-blue-500 to-green-500 rounded-sm flex items-center justify-center shadow-lg">
                            <Music className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <p className="font-medium text-white">{event.name}</p>
                            <p className="text-sm text-slate-400">{event.venue_name}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className={`text-xs ${statusBadgeClass(event.status)}`}>
                            {event.status}
                          </Badge>
                          <p className="text-xs text-slate-400 mt-1">{event.event_date}</p>
                        </div>
                      </div>
                    )}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Calendar and Tasks Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Mini Calendar */}
              <Card className="rounded-sm bg-slate-900/60 border-slate-700/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-white flex items-center justify-between">
                    <span>Calendar Overview</span>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setActiveTab('calendar')}
                    >
                      View Full <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Mini Calendar Grid */}
                    <div className="grid grid-cols-7 gap-1">
                      {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                        <div key={`day-header-${index}`} className="text-center text-xs font-medium text-slate-400 py-2">
                          {day}
                        </div>
                      ))}
                      {Array.from({ length: 35 }, (_, i) => {
                        const date = new Date()
                        date.setDate(date.getDate() - date.getDay() + i)
                        const dayEvents = upcomingEvents.filter(event => {
                          const eventDate = event.event_date ? new Date(event.event_date) : null
                          return eventDate && eventDate.toDateString() === date.toDateString()
                        })
                        const dayTasks = upcomingTasks.filter(task => {
                          return task.dueDate.toDateString() === date.toDateString()
                        })
                        
                        return (
                          <div
                            key={i}
                            className={`
                              min-h-[40px] p-1 border border-slate-700/30 rounded text-xs cursor-pointer
                              ${date.toDateString() === new Date().toDateString() ? 'bg-blue-500/20 ring-1 ring-blue-500' : 'bg-slate-800/30'}
                              hover:bg-slate-700/50 transition-colors
                            `}
                          >
                            <div className="text-center text-slate-300 mb-1">
                              {date.getDate()}
                            </div>
                            <div className="space-y-0.5">
                              {dayEvents.slice(0, 2).map((event, idx) => (
                                <div
                                  key={`event-${idx}`}
                                  className="h-1 bg-blue-500 rounded-full"
                                  title={event.name || "Event"}
                                />
                              ))}
                              {dayTasks.slice(0, 2).map((task, idx) => (
                                <div
                                  key={`task-${idx}`}
                                  className={`h-1 rounded-full ${
                                    task.priority === 'urgent' ? 'bg-red-500' :
                                    task.priority === 'high' ? 'bg-orange-500' :
                                    task.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                                  }`}
                                  title={task.title}
                                />
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    
                    {/* Legend */}
                    <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-700/30">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-1">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span>Events</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                          <span>Tasks</span>
                        </div>
                      </div>
                      <div className="text-slate-500">
                        {upcomingEvents.length} events, {upcomingTasks.length} tasks
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Upcoming Tasks */}
              <Card className="rounded-sm bg-slate-900/60 border-slate-700/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-white flex items-center justify-between">
                    <span>Upcoming Tasks</span>
                    <Link href="/admin/dashboard/logistics">
                      <Button variant="ghost" size="sm">
                        View All <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    </Link>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {upcomingTasks && upcomingTasks.length > 0 ? (
                    <div className="space-y-3 max-h-[300px] overflow-y-auto">
                      {upcomingTasks.map((task, index) => (
                        <div key={task.id} className="flex items-start space-x-3 p-3 hover:bg-slate-800/60 rounded-sm transition-all duration-200 border border-slate-700/20">
                          <div className={`h-8 w-8 rounded-sm flex items-center justify-center flex-shrink-0 ${
                            task.priority === 'urgent' ? 'bg-red-500/20' :
                            task.priority === 'high' ? 'bg-orange-500/20' :
                            task.priority === 'medium' ? 'bg-yellow-500/20' : 'bg-green-500/20'
                          }`}>
                            <Target className={`h-4 w-4 ${
                              task.priority === 'urgent' ? 'text-red-400' :
                              task.priority === 'high' ? 'text-orange-400' :
                              task.priority === 'medium' ? 'text-yellow-400' : 'text-green-400'
                            }`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1 min-w-0 pr-3">
                                <p className="font-medium text-white text-sm leading-tight">{task.title}</p>
                                <p className="text-xs text-slate-400 mt-1 leading-relaxed">{task.description}</p>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="text-xs text-slate-400 font-medium">
                                  {formatSafeDate(task.dueDate instanceof Date ? task.dueDate.toISOString() : task.dueDate)}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">
                                  {task.assignedTo}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge className={`text-xs ${
                                task.priority === 'urgent' ? 'bg-red-500/20 text-red-400' :
                                task.priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
                                task.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'
                              }`}>
                                {task.priority}
                              </Badge>
                              <Badge className={`text-xs ${
                                task.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                                task.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-500/20 text-slate-400'
                              }`}>
                                {task.status}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-[300px] text-slate-400">
                      <div className="text-center">
                        <Target className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p className="text-sm">No upcoming tasks</p>
                        <p className="text-xs text-slate-500 mt-1">Tasks will appear here when added</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="tours" className="space-y-6">
            {/* Inline widgets at top of Tours tab for quick context */}
            <WidgetsRow tours={tours} events={events} stats={stats} isLoading={statsLoading || toursLoading || eventsLoading} />
            <Card className="rounded-sm bg-slate-900/60 border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-white">All Tours</CardTitle>
              </CardHeader>
              <CardContent>
                <VirtualTable
                  items={tours || []}
                  height={400}
                  rowHeight={60}
                  loading={toursLoading}
                  columns={[
                    { key: 'name', header: 'Tour Name', width: '30%' },
                    { key: 'artist', header: 'Artist', width: '20%',
                      render: (tour) => {
                        const artistName = tour.artists && tour.artists.length > 0 ? tour.artists[0].name : 'Unknown Artist'
                        return artistName
                      }
                    },
                    { key: 'status', header: 'Status', width: '15%', 
                      render: (tour) => (
                        <Badge className={`text-xs ${statusBadgeClass(tour.status)}`}>
                          {tour.status}
                        </Badge>
                      )
                    },
                    { key: 'totalShows', header: 'Shows', width: '15%',
                      render: (tour) => tour.totalShows || tour.venues?.length || 0
                    },
                    { key: 'revenue', header: 'Revenue', width: '20%',
                      render: (tour) => formatSafeCurrency(tour.revenue || tour.totalRevenue || 0)
                    }
                  ]}
                  onRowClick={(tour) => {
                    window.location.href = `/admin/dashboard/tours/${tour.id}`
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="events" className="space-y-6">
            {/* Inline widgets at top of Events tab for quick context */}
            <WidgetsRow tours={tours} events={events} stats={stats} isLoading={statsLoading || toursLoading || eventsLoading} />
            <Card className="rounded-sm bg-slate-900/60 border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-white">All Events</CardTitle>
              </CardHeader>
              <CardContent>
                <VirtualTable
                  items={normalizedEvents || []}
                  height={400}
                  rowHeight={60}
                  loading={eventsLoading}
                  columns={[
                    { key: 'name', header: 'Event Name', width: '25%' },
                    { key: 'venue_name', header: 'Venue', width: '20%',
                      render: (event) => {
                        const venueName = event.venueName || (event.venue ? event.venue.name : 'Unknown Venue')
                        return venueName
                      }
                    },
                    { key: 'event_date', header: 'Date', width: '15%',
                      render: (event: any) => {
                        const d = event.event_date ?? event.date
                        return formatSafeDate(d)
                      }
                    },
                    { key: 'status', header: 'Status', width: '15%',
                      render: (event) => (
                        <Badge className={`text-xs ${statusBadgeClass(event.status)}`}>
                          {event.status}
                        </Badge>
                      )
                    },
                    { key: 'tickets_sold', header: 'Tickets', width: '15%',
                      render: (event) => `${event.ticketsSold || 0}/${event.capacity || 0}`
                    },
                    { key: 'expected_revenue', header: 'Revenue', width: '10%',
                      render: (event) => formatSafeCurrency(event.expectedRevenue || 0)
                    }
                  ]}
                  onRowClick={(event) => {
                    window.location.href = `/admin/dashboard/events/${event.id}`
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="calendar" className="space-y-6">
            <DashboardCalendar
              tours={tours || []}
              events={events || []}
              tasks={allMappedTasks}
              onItemClick={(item) => {
                if (item.type === 'tour') {
                  router.push(`/admin/dashboard/tours/${item.id.replace('tour-', '')}`)
                } else if (item.type === 'event') {
                  router.push(`/admin/dashboard/events/${item.id.replace('event-', '')}`)
                }
              }}
              onAddItem={(type) => {
                if (type === 'event') {
                  router.push('/admin/dashboard/events/create')
                } else if (type === 'tour') {
                  router.push('/admin/dashboard/tours')
                }
              }}
            />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <AnalyticsDashboard />
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <Card className="rounded-sm bg-slate-900/60 border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-white flex items-center justify-between">
                  <span>Recent Activity</span>
                  <div className="flex items-center space-x-2">
                    <div className="h-2 w-2 rounded-full bg-green-400" />
                    <span className="text-xs text-slate-400">Live</span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <VirtualList
                  items={recentNotifications}
                  height={400}
                  itemHeight={60}
                  loading={notificationsLoading}
                  renderItem={(notification, index) => (
                    <div className="flex items-center space-x-3 p-3 hover:bg-slate-800/60 rounded-sm transition-all duration-200">
                      <div className={`h-8 w-8 rounded-sm flex items-center justify-center ${
                        notification.type === 'success' ? 'bg-green-500/20' :
                        notification.type === 'warning' ? 'bg-yellow-500/20' :
                        notification.type === 'error' ? 'bg-red-500/20' :
                        'bg-blue-500/20'
                      }`}>
                        {notification.type === 'success' ? <CheckCircle className="h-4 w-4 text-green-400" /> :
                         notification.type === 'warning' ? <AlertCircle className="h-4 w-4 text-yellow-400" /> :
                         notification.type === 'error' ? <AlertCircle className="h-4 w-4 text-red-400" /> :
                         <Bell className="h-4 w-4 text-blue-400" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">{notification.title}</p>
                        <p className="text-xs text-slate-400">{notification.message}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500">{notification.timestamp}</p>
                      </div>
                    </div>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Help System */}
        <HelpSystem isOpen={helpOpen} onClose={closeHelp} />
        <KeyboardShortcutsHelp isOpen={shortcutsOpen} onClose={closeShortcuts} />
        
        {/* Real-time Status Bar */}
        <RealTimeStatusBar />
      </div>
    </ErrorBoundary>
  )
} 