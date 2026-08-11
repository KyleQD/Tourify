"use client"

import { useState, useEffect, useMemo, useCallback, Suspense } from "react"
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
import { KeyboardShortcutsHelp, useKeyboardShortcutsHelp } from "./keyboard-shortcuts-help"
import { useProductEducation } from "@/components/product-education/product-education-context"
import { RealTimeStatusBar } from "@/components/admin/real-time-indicator"
import dynamic from "next/dynamic"
import DataLoadingStatus from "./data-loading-status"

const AnalyticsDashboard = dynamic(() => import("./analytics-dashboard"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[240px] items-center justify-center text-sm text-slate-400">
      Loading analytics…
    </div>
  ),
})

const AdminCalendarView = dynamic(
  () => import("@/components/admin/admin-calendar-view").then((mod) => mod.AdminCalendarView),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[200px] items-center justify-center text-sm text-slate-400">
        Loading calendar…
      </div>
    ),
  },
)

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
  Truck,
  UserCheck,
  MessageSquare,
} from "lucide-react"
import Link from "next/link"
import { useMultiAccount } from "@/hooks/use-multi-account"
import { useActingContext } from "@/hooks/use-acting-context"
import { isOrganizationType } from "@/lib/accounts/account-types"
import { hiringEntityFromAccount } from "@/lib/hiring/hiring-entity-from-account"
import { getArtistPublicProfilePath, getOrganizationPublicProfilePath } from "@/lib/utils/public-profile-routes"
import { WidgetsRow } from "./apple-widgets"
import { AdminStatCard } from "./admin-stat-card"
import { statusBadgeClass } from "./admin-badge-utils"
import type { AdminDashboardStats } from "@/types/admin"
import { formatSafeDate, normalizeAdminEvent } from "@/lib/events/admin-event-normalization"
import { formatSafeCurrency } from "@/lib/format/number-format"
import { trackDashboardUxEvent } from "@/lib/analytics/ux-event-client"
import { AdminErrorCard } from "./admin-error-card"
import {
  failedAdminRequest,
  loadingAdminRequest,
  resolvedAdminRequest,
  type AdminRequestState,
} from "@/lib/admin/admin-request-state"
import { AdminDomainHealthGrid } from "./admin-domain-health-grid"

type DashboardStats = AdminDashboardStats

export default function OptimizedDashboardClient() {
  const router = useRouter()
  const { currentAccount } = useMultiAccount()
  const { actingHeaders, actingContextKey, isActingReady } = useActingContext()
  const isOrgAccount = isOrganizationType(currentAccount?.account_type)
  const [organizerPublicPath, setOrganizerPublicPath] = useState<string | null>(null)
  const hiringHubHref = useMemo(() => buildScopedHiringHref("/admin/dashboard/hiring", currentAccount), [currentAccount])
  const staffHref = useMemo(() => buildScopedHiringHref("/admin/dashboard/staff", currentAccount), [currentAccount])

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
  
  type DashboardDomain = 'stats' | 'tours' | 'events' | 'notifications'
  const [requestStates, setRequestStates] = useState<Record<DashboardDomain, AdminRequestState<unknown>>>(() => ({
    stats: loadingAdminRequest(),
    tours: loadingAdminRequest(),
    events: loadingAdminRequest(),
    notifications: loadingAdminRequest(),
  }))
  const statsError = requestStates.stats.status === 'error'
    || requestStates.stats.status === 'denied'
    || requestStates.stats.status === 'unavailable'
    ? requestStates.stats.message
    : null

  // UI state
  const [activeTab, setActiveTab] = useState('overview')
  const [showDataStatus, setShowDataStatus] = useState(false)

  const buildNoStoreInit = useCallback((input?: RequestInit): RequestInit => {
    return {
      credentials: 'include',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
        ...actingHeaders,
        ...(input?.headers || {}),
      },
      ...input,
    }
  }, [actingHeaders])

  function handleTabChange(nextTab: string) {
    setActiveTab(nextTab)
    void trackDashboardUxEvent({
      eventName: "admin_dashboard_tab_changed",
      surface: "admin_dashboard",
      metadata: { tab: nextTab },
    })
  }

  function handleOpenHelp() {
    openHelp()
    void trackDashboardUxEvent({
      eventName: "admin_dashboard_help_opened",
      surface: "admin_dashboard",
    })
  }

  function handleOpenShortcuts() {
    openShortcuts()
    void trackDashboardUxEvent({
      eventName: "admin_dashboard_shortcuts_opened",
      surface: "admin_dashboard",
    })
  }

  useEffect(() => {
    if (!isOrgAccount) {
      setOrganizerPublicPath(null)
      return
    }
    const slug =
      (currentAccount?.profile_data as { url_slug?: string } | undefined)?.url_slug ||
      (currentAccount?.profile_data as { username?: string } | undefined)?.username ||
      null
    const subtype =
      (currentAccount?.profile_data as { subtype?: string; organization_type?: string } | undefined)?.subtype ||
      (currentAccount?.profile_data as { organization_type?: string } | undefined)?.organization_type ||
      null
    setOrganizerPublicPath(
      subtype === "band"
        ? getArtistPublicProfilePath(slug)
        : getOrganizationPublicProfilePath(slug)
    )
  }, [isOrgAccount, currentAccount?.profile_data])

  const { openHelp, startTour } = useProductEducation()
  const { isOpen: shortcutsOpen, openHelp: openShortcuts, closeHelp: closeShortcuts } = useKeyboardShortcutsHelp()

  useEffect(() => {
    function onToggleHelp() {
      openHelp()
    }
    function onShowShortcuts() {
      openShortcuts()
    }
    window.addEventListener("toggleHelp", onToggleHelp)
    window.addEventListener("showKeyboardShortcuts", onShowShortcuts)
    return () => {
      window.removeEventListener("toggleHelp", onToggleHelp)
      window.removeEventListener("showKeyboardShortcuts", onShowShortcuts)
    }
  }, [openHelp, openShortcuts])

  useEffect(() => {
    void trackDashboardUxEvent({
      eventName: "admin_dashboard_viewed",
      surface: "admin_dashboard",
    })
  }, [])

  // Fetch data only when organization / legacy admin mode is active
  useEffect(() => {
    if (!isActingReady || !isOrgAccount) {
      setStats(null)
      setTours([])
      setEvents([])
      setNotifications([])
      setStatsLoading(false)
      setToursLoading(false)
      setEventsLoading(false)
      setNotificationsLoading(false)
      return
    }

    const controller = new AbortController()
    setStats(null)
    setTours([])
    setEvents([])
    setNotifications([])
    setStatsLoading(true)
    setToursLoading(true)
    setEventsLoading(true)
    setNotificationsLoading(true)
    setRequestStates({
      stats: loadingAdminRequest(),
      tours: loadingAdminRequest(),
      events: loadingAdminRequest(),
      notifications: loadingAdminRequest(),
    })

    async function fetchDomain<T>(url: string, extract: (json: any) => T): Promise<T> {
      const res = await fetch(url, buildNoStoreInit({ signal: controller.signal }))
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        const error = new Error(json.error || `Request failed with ${res.status}`) as Error & { status?: number }
        error.status = res.status
        throw error
      }
      return extract(json)
    }

    const fetchData = async () => {
      const [statsData, toursData, eventsData, notificationsData] = await Promise.allSettled([
        fetchDomain('/api/admin/dashboard/stats', (j) => j.stats ?? null),
        fetchDomain('/api/admin/tours', (j) => j.tours ?? []),
        fetchDomain('/api/admin/events', (j) => j.events ?? []),
        fetchDomain('/api/admin/notifications', (j) => j.notifications ?? []),
      ])

      if (controller.signal.aborted) return

      const nextStates: Record<DashboardDomain, AdminRequestState<unknown>> = {
        stats: loadingAdminRequest(),
        tours: loadingAdminRequest(),
        events: loadingAdminRequest(),
        notifications: loadingAdminRequest(),
      }

      if (statsData.status === 'fulfilled') {
        setStats(statsData.value)
        nextStates.stats = resolvedAdminRequest(statsData.value, { empty: !statsData.value })
      } else {
        const error = statsData.reason as Error & { status?: number }
        nextStates.stats = failedAdminRequest(error.status || 500, error.message)
      }
      setStatsLoading(false)

      if (toursData.status === 'fulfilled') {
        const value = toursData.value ?? []
        setTours(value)
        nextStates.tours = resolvedAdminRequest(value, { empty: value.length === 0 })
      } else {
        const error = toursData.reason as Error & { status?: number }
        nextStates.tours = failedAdminRequest(error.status || 500, error.message)
      }
      setToursLoading(false)

      if (eventsData.status === 'fulfilled') {
        const value = eventsData.value ?? []
        setEvents(value)
        nextStates.events = resolvedAdminRequest(value, { empty: value.length === 0 })
      } else {
        const error = eventsData.reason as Error & { status?: number }
        nextStates.events = failedAdminRequest(error.status || 500, error.message)
      }
      setEventsLoading(false)

      if (notificationsData.status === 'fulfilled') {
        const value = notificationsData.value ?? []
        setNotifications(value)
        nextStates.notifications = resolvedAdminRequest(value, { empty: value.length === 0 })
      } else {
        const error = notificationsData.reason as Error & { status?: number }
        nextStates.notifications = failedAdminRequest(error.status || 500, error.message)
      }
      setNotificationsLoading(false)
      setRequestStates(nextStates)
    }

    void fetchData()
    return () => controller.abort()
  }, [isActingReady, isOrgAccount, actingContextKey, buildNoStoreInit])

  // Real-time subscriptions for live updates (organization / legacy admin accounts)
  useEffect(() => {
    if (!isOrgAccount) return

    let cancelled = false
    const subscriptions: Array<{ unsubscribe: () => void }> = []

    const setupRealTimeSubscriptions = async () => {
      try {
        const { supabase } = await import('@/lib/supabase')

        function safeRefresh(url: string, onData: (json: any) => void) {
          if (cancelled) return
          fetch(url, buildNoStoreInit())
            .then(r => r.ok ? r.json() : null)
            .then(data => { if (data && !cancelled) onData(data) })
            .catch(() => {})
        }

        subscriptions.push(
          supabase
            .channel('tours-changes')
            .on('postgres_changes',
              { event: '*', schema: 'public', table: 'tours' },
              () => safeRefresh('/api/admin/tours', (d) => setTours(d.tours || []))
            )
            .subscribe()
        )

        subscriptions.push(
          supabase
            .channel('events-changes')
            .on('postgres_changes',
              { event: '*', schema: 'public', table: 'events' },
              () => safeRefresh('/api/admin/events', (d) => setEvents(d.events || []))
            )
            .subscribe()
        )

        subscriptions.push(
          supabase
            .channel('ticket-sales-changes')
            .on('postgres_changes',
              { event: '*', schema: 'public', table: 'ticket_sales' },
              () => safeRefresh('/api/admin/dashboard/stats', (d) => { if (d.stats) setStats(d.stats) })
            )
            .subscribe()
        )

        subscriptions.push(
          supabase
            .channel('staff-changes')
            .on('postgres_changes',
              { event: '*', schema: 'public', table: 'staff_profiles' },
              () => safeRefresh('/api/admin/dashboard/stats', (d) => { if (d.stats) setStats(d.stats) })
            )
            .subscribe()
        )
      } catch (error) {
        console.warn('Real-time subscriptions unavailable:', error)
      }
    }

    setupRealTimeSubscriptions()
    return () => {
      cancelled = true
      subscriptions.forEach(sub => { try { sub.unsubscribe() } catch {} })
    }
  }, [isOrgAccount, currentAccount?.profile_id, buildNoStoreInit])

  const recentTours = useMemo(() => {
    if (!tours || tours.length === 0) return []
    
    return tours.slice(0, 5).map((tour: any) => {
      const totalShows = tour.total_shows ?? tour.totalShows ?? 0
      const completedShows = tour.completed_shows ?? tour.completedShows ?? 0
      return {
        id: tour.id,
        name: tour.name,
        artist: tour.artist_name || tour.artists?.[0]?.name || tour.artist || '',
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
          event_date_iso: event.event_date || '',
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
    if (!isOrgAccount) {
      setTasksLoading(false)
      return
    }
    async function fetchTasks() {
      try {
        const res = await fetch('/api/admin/tasks?range=week', buildNoStoreInit())
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
  }, [isOrgAccount, currentAccount?.profile_id, buildNoStoreInit])

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

  const isFullyLoaded = !statsLoading && !toursLoading && !eventsLoading && !notificationsLoading
  const hasRequestFailure = Object.values(requestStates).some((state) =>
    state.status === 'error' || state.status === 'denied' || state.status === 'unavailable'
  )
  const hasNoData = isFullyLoaded && !hasRequestFailure && tours.length === 0 && events.length === 0

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
                {isOrgAccount && (
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
                <DropdownMenuItem onSelect={handleOpenShortcuts}>
                  <Keyboard className="h-4 w-4 mr-2" />
                  Keyboard shortcuts
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={handleOpenHelp}>
                  <HelpCircle className="h-4 w-4 mr-2" />
                  Help
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => startTour("admin-dashboard-intro")}>
                  <Target className="h-4 w-4 mr-2" />
                  Guided tour
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {hasRequestFailure && (
          <AdminErrorCard
            title="Some dashboard data could not be loaded"
            message="Unavailable domains are not included in totals. Retry after checking the active organization and your access."
            onRetry={() => window.location.reload()}
          />
        )}

        <AdminDomainHealthGrid />

        {/* Empty state notice */}
        {hasNoData && (
          <Card className="rounded-sm bg-slate-900/60 border-slate-700/50 backdrop-blur-sm">
            <CardContent className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center space-x-3">
                <AlertCircle className="h-5 w-5 shrink-0 text-slate-400" />
                <p className="text-sm text-slate-400">
                  No tours or events yet. Start with a tour or event, then hire crew and open communications from here.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Link href="/admin/dashboard/tours/create">
                  <Button size="sm" className="bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0">
                    Create tour
                  </Button>
                </Link>
                <Link href="/admin/dashboard/events/create">
                  <Button size="sm" variant="outline" className="border-slate-600 text-slate-200">
                    Create event
                  </Button>
                </Link>
                <Link href={hiringHubHref}>
                  <Button size="sm" variant="ghost" className="text-slate-300">
                    Hiring hub
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

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
          <AdminStatCard title="Total Tours" value={statsError ? "Unavailable" : (stats?.totalTours ?? 0)} icon={Globe} color="purple" size="lg" isLoading={statsLoading} />
          <AdminStatCard title="Total Events" value={statsError ? "Unavailable" : (stats?.totalEvents ?? 0)} icon={Calendar} color="blue" size="lg" isLoading={statsLoading} />
          <AdminStatCard title="Total Revenue" value={statsError ? "Unavailable" : formatSafeCurrency(stats?.totalRevenue ?? 0)} icon={DollarSign} color="green" size="lg" isLoading={statsLoading} />
          <AdminStatCard title="Tickets Sold" value={statsError ? "Unavailable" : (stats?.ticketsSold ?? 0)} icon={Users} color="cyan" size="lg" isLoading={statsLoading} />
        </div>

        {/* Quick Integration Row — ops + workforce + messaging */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
          <Link href="/admin/dashboard/logistics" className="block">
            <Card className="rounded-sm bg-slate-900/60 border-slate-700/50 backdrop-blur-sm hover:border-purple-500/30 transition-colors cursor-pointer h-full">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="p-2 bg-purple-500/20 rounded-sm shrink-0">
                    <Truck className="h-4 w-4 text-purple-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white">Logistics</p>
                    <p className="text-xs text-slate-400 truncate">{stats?.completedTasks || 0} completed / {(stats?.completedTasks || 0) + (stats?.pendingTasks || 0)} tasks</p>
                  </div>
                </div>
                <Badge className={stats?.logisticsCompletionRate && stats.logisticsCompletionRate > 50 ? 'bg-green-500/20 text-green-400' : 'bg-slate-500/20 text-slate-400'}>
                  {stats?.logisticsCompletionRate || 0}%
                </Badge>
              </CardContent>
            </Card>
          </Link>
          <Link href="/admin/dashboard/finances" className="block">
            <Card className="rounded-sm bg-slate-900/60 border-slate-700/50 backdrop-blur-sm hover:border-green-500/30 transition-colors cursor-pointer h-full">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="p-2 bg-green-500/20 rounded-sm shrink-0">
                    <DollarSign className="h-4 w-4 text-green-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white">Finances</p>
                    <p className="text-xs text-slate-400 truncate">Monthly: {formatSafeCurrency(stats?.monthlyRevenue || 0)}</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 shrink-0" />
              </CardContent>
            </Card>
          </Link>
          <Link href={staffHref} className="block">
            <Card className="rounded-sm bg-slate-900/60 border-slate-700/50 backdrop-blur-sm hover:border-blue-500/30 transition-colors cursor-pointer h-full">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="p-2 bg-blue-500/20 rounded-sm shrink-0">
                    <Users className="h-4 w-4 text-blue-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white">Staff & Crew</p>
                    <p className="text-xs text-slate-400 truncate">{stats?.staffMembers || 0} team members</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 shrink-0" />
              </CardContent>
            </Card>
          </Link>
          <Link href={hiringHubHref} className="block">
            <Card className="rounded-sm bg-slate-900/60 border-slate-700/50 backdrop-blur-sm hover:border-cyan-500/30 transition-colors cursor-pointer h-full">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="p-2 bg-cyan-500/20 rounded-sm shrink-0">
                    <UserCheck className="h-4 w-4 text-cyan-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white">Hiring Hub</p>
                    <p className="text-xs text-slate-400 truncate">Jobs, applicants, onboarding</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 shrink-0" />
              </CardContent>
            </Card>
          </Link>
          <Link href="/admin/dashboard/communications" className="block">
            <Card className="rounded-sm bg-slate-900/60 border-slate-700/50 backdrop-blur-sm hover:border-amber-500/30 transition-colors cursor-pointer h-full">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="p-2 bg-amber-500/20 rounded-sm shrink-0">
                    <MessageSquare className="h-4 w-4 text-amber-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white">Communications</p>
                    <p className="text-xs text-slate-400 truncate">Inbox and crew threads</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 shrink-0" />
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
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
                          const raw = (event as any).event_date_iso || event.event_date
                          const eventDate = raw ? new Date(raw) : null
                          return eventDate && !isNaN(eventDate.getTime()) && eventDate.toDateString() === date.toDateString()
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
            <Suspense fallback={<div className="text-sm text-slate-400">Loading calendar…</div>}>
              <AdminCalendarView showHeader={false} showSubscribePanel syncUrlState={false} />
            </Suspense>
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
        <KeyboardShortcutsHelp isOpen={shortcutsOpen} onClose={closeShortcuts} />
        
        {/* Real-time Status Bar */}
        <RealTimeStatusBar />
      </div>
    </ErrorBoundary>
  )
}

function buildScopedHiringHref(
  path: string,
  account: ReturnType<typeof useMultiAccount>["currentAccount"],
) {
  const entity = hiringEntityFromAccount(account)
  if (!entity) return path

  const params = new URLSearchParams()
  params.set("entity_type", entity.entityType)
  params.set("entity_id", entity.entityId)
  if (entity.scope?.venueId) params.set("venue_id", entity.scope.venueId)
  if (entity.displayName) params.set("display_name", entity.displayName)
  return `${path}?${params.toString()}`
}
