"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { CreateEventForm } from "@/components/admin/create-event-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Calendar, 
  Plus, 
  Search, 
  Filter, 
  MapPin, 
  Users,
  Clock, 
  Music, 
  Ticket,
  TrendingUp,
  PlayCircle,
  BarChart3,
  Eye,
  Settings,
  MoreVertical,
  Edit,
  Trash2,
  Star,
  AlertTriangle,
  CheckCircle,
  Target,
  Download
} from "lucide-react"
import { format } from "date-fns"
import Link from "next/link"
import { AdminEmptyState } from "../components/admin-empty-state"
import { AdminPageSkeleton } from "../components/admin-page-skeleton"
import { AdminErrorCard } from "../components/admin-error-card"
import { AdminPageHeader } from "../components/admin-page-header"
import { AdminStatCard } from "../components/admin-stat-card"
import { statusBadgeClass } from "../components/admin-badge-utils"
import { isUpcomingAdminEvent, normalizeAdminEvent } from "@/lib/events/admin-event-normalization"
import { formatSafeCurrency, formatSafeNumber } from "@/lib/format/number-format"

type EventStatusUi =
  | "scheduled"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "postponed"

interface Event {
  id: string
  name: string
  description?: string
  tour_id?: string
  venue_name?: string
  venue_id?: string
  venue_address?: string
  event_date: string
  event_time?: string
  doors_open?: string
  duration_minutes?: number
  status: EventStatusUi
  capacity?: number
  tickets_sold?: number
  ticket_price?: number
  vip_price?: number
  expected_revenue?: number
  actual_revenue?: number
  expenses?: number
  venue_contact_name?: string
  venue_contact_email?: string
  venue_contact_phone?: string
  created_at?: string
  tour?: {
    id: string
    name: string
    artist_id: string
    status: string
  }
}

export default function EventsPage() {
  const router = useRouter()
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'calendar'>('grid')
  const [filterStatus, setFilterStatus] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [events, setEvents] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Fetch events from API
  const fetchEvents = async () => {
    try {
      setIsLoading(true)
      setFetchError(null)
      const params = new URLSearchParams()
      if (filterStatus !== 'all') {
        params.append('status', filterStatus)
      }
      
      const response = await fetch(`/api/admin/events?${params}`, {
        credentials: "include",
      })
      if (!response.ok) {
        throw new Error('Failed to fetch events')
      }
      
      const data = await response.json()
      const raw = data.events || []
      setEvents(
        raw.map((e: Event) => {
          const normalized = normalizeAdminEvent(e)
          return {
            ...e,
            ...normalized,
          }
        })
      )
    } catch (error) {
      console.error('Error fetching events:', error)
      const message = error instanceof Error ? error.message : 'Failed to load events'
      setFetchError(message)
      setEvents([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchEvents()
  }, [filterStatus])

  const handleEventCreated = () => {
    setIsCreateEventOpen(false)
    fetchEvents() // Refresh the events list
  }

  const filteredEvents = events.filter((event: Event) => {
    const matchesStatus = filterStatus === 'all' || event.status === filterStatus
    const matchesSearch =
      (event.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (event.venue_name || "").toLowerCase().includes(searchTerm.toLowerCase())
    return matchesStatus && matchesSearch
  })

  const upcomingEventsCount = events.filter((e) => isUpcomingAdminEvent(e)).length
  const totalCapacitySum = events.reduce((sum, e) => sum + (e.capacity ?? 0), 0)
  const totalTicketsSold = events.reduce((sum, e) => sum + (e.tickets_sold ?? 0), 0)

  const LogisticsStatus = ({ eventId }: { eventId: string }) => (
    <div className="mt-3 space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-400">Logistics</span>
        <span className="text-white font-medium">—</span>
      </div>
      <div className="w-full bg-slate-700 rounded-full h-1.5">
        <div className="bg-slate-600 h-1.5 rounded-full w-0" />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400">No logistics data linked</span>
        <Link href={`/admin/dashboard/logistics?eventId=${eventId}`}>
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
            <Target className="h-3 w-3 mr-1" />
            Manage
          </Button>
        </Link>
      </div>
    </div>
  )

  const EventCard = ({ event }: { event: Event }) => {
    const capacity = event.capacity != null && event.capacity > 0 ? event.capacity : 0
    const sold = event.tickets_sold ?? 0
    const fillPct =
      capacity > 0 ? Math.min((sold / capacity) * 100, 100) : 0
    const eventDateRaw = event.event_date || ""
    const eventDateLabel = eventDateRaw
      ? (() => {
          try {
            return format(new Date(eventDateRaw), "MMM dd, yyyy")
          } catch {
            return eventDateRaw
          }
        })()
      : "—"

    return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ y: -5 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="rounded-sm bg-slate-900/60 border-slate-700/50 backdrop-blur-sm hover:border-slate-600/50 transition-all duration-300 cursor-pointer group">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1">
              <CardTitle className="text-lg font-semibold text-white group-hover:text-purple-400 transition-colors">
                {event.name}
              </CardTitle>
              <div className="flex items-center text-sm text-slate-400">
                <MapPin className="h-4 w-4 mr-1" />
                {event.venue_name || "Venue not set"}
              </div>
              <div className="flex items-center text-sm text-slate-400">
                <Calendar className="h-4 w-4 mr-1" />
                {eventDateLabel}
                {event.event_time && ` at ${event.event_time}`}
              </div>
            </div>
            <Badge className={statusBadgeClass(event.status)}>
              {event.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Metrics Row */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-sm text-slate-400">Capacity</div>
              <div className="text-lg font-semibold text-white">
                {capacity > 0 ? formatSafeNumber(capacity) : "—"}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-slate-400">Sold</div>
              <div className="text-lg font-semibold text-green-400">
                {formatSafeNumber(sold)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-slate-400">Revenue</div>
              <div className="text-lg font-semibold text-blue-400">
                {formatSafeCurrency(event.actual_revenue ?? 0)}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Tickets Sold</span>
              <span className="text-white">
                {capacity > 0 ? `${fillPct.toFixed(1)}%` : "—"}
              </span>
            </div>
            <div className="w-full bg-slate-700/60 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${fillPct}%` }}
              />
            </div>
          </div>

          {/* Logistics Status */}
          <LogisticsStatus eventId={event.id} />

          {/* Tour Badge */}
          {event.tour && (
            <div className="flex items-center">
              <Badge variant="outline" className="border-purple-500/30 text-purple-400">
                <Music className="h-3 w-3 mr-1" />
                {event.tour.name}
              </Badge>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => router.push(`/admin/dashboard/events/${event.id}`)}
              className="text-slate-400 hover:text-white"
            >
              <Eye className="h-4 w-4 mr-2" />
              Manage Event
            </Button>
            <div className="flex items-center space-x-1">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Edit className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
    )
  }

  return (
    <div className="container mx-auto space-y-6">
        <AdminPageHeader
          title="Event Management"
          subtitle="Coordinate events, manage bookings, and track performance"
          icon={Calendar}
          actions={
            <>
              <Button
                onClick={() => router.push('/admin/dashboard/events/planner')}
                variant="outline"
                className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
              >
                <Settings className="h-4 w-4 mr-2" />
                Event Planner
              </Button>
              <Button
                onClick={() => setIsCreateEventOpen(true)}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0 shadow-lg shadow-purple-500/20 transition-all duration-300"
              >
                <Plus className="h-4 w-4 mr-2" />
                Quick Create
              </Button>
            </>
          }
        />

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <AdminStatCard
            title="Total Events"
            value={events.length}
            icon={Calendar}
            color="blue"
            size="default"
            isLoading={isLoading}
          />
          <AdminStatCard
            title="Upcoming"
            value={upcomingEventsCount}
            icon={Clock}
            color="green"
            size="default"
            isLoading={isLoading}
          />
          <AdminStatCard
            title="Capacity"
            value={formatSafeNumber(totalCapacitySum)}
            icon={Users}
            color="orange"
            size="default"
            isLoading={isLoading}
          />
          <AdminStatCard
            title="Tickets"
            value={formatSafeNumber(totalTicketsSold)}
            icon={Ticket}
            color="cyan"
            size="default"
            isLoading={isLoading}
          />
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <Input
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-800/50 border-slate-700/50 text-white w-64"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40 bg-slate-800/50 border-slate-700/50 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="postponed">Postponed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" className="border-slate-700 text-slate-300 hover:bg-slate-800/80 backdrop-blur-sm transition-all duration-200">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Create Event Form Modal */}
        <AnimatePresence>
          {isCreateEventOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
              onClick={() => setIsCreateEventOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-4xl max-h-[90vh] overflow-y-auto"
              >
                <CreateEventForm
                  onSuccess={handleEventCreated}
                  onCancel={() => setIsCreateEventOpen(false)}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Events Grid */}
        {isLoading ? (
          <AdminPageSkeleton />
        ) : fetchError ? (
          <AdminErrorCard
            title="Could not load events"
            message={fetchError}
            onRetry={() => void fetchEvents()}
          />
        ) : filteredEvents.length === 0 ? (
          <AdminEmptyState
            icon={Calendar}
            title="No events scheduled"
            description="Create an event to get started"
            action={{ label: "Create Event", href: "/admin/dashboard/events/create" }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((event: any) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
    </div>
  )
}
