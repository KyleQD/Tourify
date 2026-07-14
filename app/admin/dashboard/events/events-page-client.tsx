"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Calendar, Clock, Download, Plus, Ticket, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AdminFilterBar } from "../components/admin-filter-bar"
import { AdminEmptyState } from "../components/admin-empty-state"
import { AdminPageSkeleton } from "../components/admin-page-skeleton"
import { AdminErrorCard } from "../components/admin-error-card"
import { AdminPageHeader } from "../components/admin-page-header"
import { AdminStatCard } from "../components/admin-stat-card"
import { EventOperationsCard } from "@/components/admin/operations/event-operations-card"
import { isUpcomingAdminEvent, normalizeAdminEvent } from "@/lib/events/admin-event-normalization"
import { formatSafeNumber } from "@/lib/format/number-format"
import {
  fetchEventLogisticsBatch,
  type LogisticsMetricsSummary,
} from "@/lib/admin/batch-logistics-metrics"

type EventStatusUi =
  | "scheduled"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "postponed"
  | "draft"

interface Event {
  id: string
  name: string
  description?: string
  tour_id?: string
  venue_name?: string
  event_date: string
  event_time?: string
  status: EventStatusUi
  capacity?: number
  tickets_sold?: number
  ticket_price?: number
  expected_revenue?: number
  actual_revenue?: number
  tour?: { id: string; name: string; artist_id?: string; status?: string }
  tours?: Array<{
    id: string
    name: string
    status?: string | null
    is_primary?: boolean
  }>
}

function buildNoStoreInit(): RequestInit {
  return {
    credentials: "include",
    cache: "no-store",
    headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
  }
}

export default function EventsPage() {
  const router = useRouter()
  const [filterStatus, setFilterStatus] = useState("all")
  const [routeFilter, setRouteFilter] = useState<"all" | "touring" | "standalone">("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [events, setEvents] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [logisticsByEvent, setLogisticsByEvent] = useState<Record<string, LogisticsMetricsSummary>>({})

  const fetchEvents = useCallback(async () => {
    try {
      setIsLoading(true)
      setFetchError(null)
      const params = new URLSearchParams()
      if (filterStatus !== "all") params.append("status", filterStatus)

      const response = await fetch(`/api/admin/events?${params}`, buildNoStoreInit())
      if (!response.ok) throw new Error("Failed to fetch events")

      const data = await response.json()
      const raw = data.events || []
      setEvents(
        raw.map((event: Event) => ({
          ...event,
          ...normalizeAdminEvent(event),
        }))
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load events"
      setFetchError(message)
      setEvents([])
    } finally {
      setIsLoading(false)
    }
  }, [filterStatus])

  useEffect(() => {
    void fetchEvents()
  }, [fetchEvents])

  useEffect(() => {
    if (!events.length) {
      setLogisticsByEvent({})
      return
    }
    let cancelled = false
    void fetchEventLogisticsBatch(events.map((event) => event.id)).then((result) => {
      if (!cancelled) setLogisticsByEvent(result)
    })
    return () => {
      cancelled = true
    }
  }, [events])

  const filteredEvents = events.filter((event) => {
    const matchesStatus = filterStatus === "all" || event.status === filterStatus
    const tourCount = event.tours?.length ?? (event.tour ? 1 : 0)
    const matchesRoute =
      routeFilter === "all" ||
      (routeFilter === "touring" && tourCount > 0) ||
      (routeFilter === "standalone" && tourCount === 0)
    const matchesSearch =
      (event.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (event.venue_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (event.tours || []).some((tour) => (tour.name || "").toLowerCase().includes(searchTerm.toLowerCase()))
    return matchesStatus && matchesRoute && matchesSearch
  })

  const draftEvents = useMemo(
    () => events.filter((event) => String(event.status).toLowerCase() === "draft"),
    [events]
  )
  const upcomingEventsCount = events.filter((event) => isUpcomingAdminEvent(event)).length
  const totalCapacitySum = events.reduce((sum, event) => sum + (event.capacity ?? 0), 0)
  const totalTicketsSold = events.reduce((sum, event) => sum + (event.tickets_sold ?? 0), 0)

  return (
    <div className="container mx-auto space-y-6">
      <AdminPageHeader
        title="Event Management"
        subtitle="Coordinate shows, advance venues, and hand off into logistics, staffing, and day-of ops"
        icon={Calendar}
        actions={
          <>
            <Button
              variant="outline"
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
              onClick={() => {
                const csv = ["Name,Date,Venue,Tours,Status,Capacity,Tickets Sold"]
                  .concat(
                    filteredEvents.map((event) => {
                      const tourNames = (event.tours || []).map((tour) => tour.name).join("; ")
                      return `"${event.name}","${event.event_date || ""}","${event.venue_name || ""}","${tourNames || "Standalone"}","${event.status}","${event.capacity || 0}","${event.tickets_sold || 0}"`
                    })
                  )
                  .join("\n")
                const blob = new Blob([csv], { type: "text/csv" })
                const url = URL.createObjectURL(blob)
                const anchor = document.createElement("a")
                anchor.href = url
                anchor.download = `events-export-${new Date().toISOString().split("T")[0]}.csv`
                anchor.click()
                URL.revokeObjectURL(url)
              }}
            >
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button
              onClick={() => router.push("/admin/dashboard/events/create")}
              className="border-0 bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/20"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Event
            </Button>
          </>
        }
      />

      {draftEvents.length > 0 ? (
        <div className="flex flex-col gap-3 rounded-[1.25rem] border border-cyan-400/20 bg-cyan-400/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-cyan-100">
              {draftEvents.length} draft{draftEvents.length === 1 ? "" : "s"} in progress
            </p>
            <p className="text-xs text-slate-400">Resume a draft in the Event Producer Console.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {draftEvents.slice(0, 3).map((event) => (
              <Button key={event.id} asChild size="sm" variant="outline" className="border-cyan-400/30 text-cyan-100">
                <Link href={`/admin/dashboard/events/create?draft=${event.id}`}>
                  Continue {event.name || "draft"}
                </Link>
              </Button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard title="Total Events" value={events.length} icon={Calendar} color="blue" isLoading={isLoading} />
        <AdminStatCard title="Upcoming" value={upcomingEventsCount} icon={Clock} color="green" isLoading={isLoading} />
        <AdminStatCard title="Capacity" value={formatSafeNumber(totalCapacitySum)} icon={Users} color="orange" isLoading={isLoading} />
        <AdminStatCard title="Tickets" value={formatSafeNumber(totalTicketsSold)} icon={Ticket} color="cyan" isLoading={isLoading} />
      </div>

      <AdminFilterBar
        searchPlaceholder="Search events..."
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        statusOptions={[
          { value: "all", label: "All Status" },
          { value: "draft", label: "Draft" },
          { value: "scheduled", label: "Scheduled" },
          { value: "confirmed", label: "Confirmed" },
          { value: "in_progress", label: "In Progress" },
          { value: "completed", label: "Completed" },
          { value: "cancelled", label: "Cancelled" },
          { value: "postponed", label: "Postponed" },
        ]}
        statusValue={filterStatus}
        onStatusChange={setFilterStatus}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {[
              { value: "all", label: "All routing" },
              { value: "touring", label: "In tours" },
              { value: "standalone", label: "Standalone" },
            ].map((option) => (
              <Button
                key={option.value}
                variant={routeFilter === option.value ? "default" : "outline"}
                size="sm"
                className={routeFilter === option.value ? "h-9" : "h-9 border-slate-700 text-slate-300 hover:bg-slate-800/80"}
                onClick={() => setRouteFilter(option.value as typeof routeFilter)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        }
      />

      {isLoading ? (
        <AdminPageSkeleton />
      ) : fetchError ? (
        <AdminErrorCard title="Could not load events" message={fetchError} onRetry={() => void fetchEvents()} />
      ) : filteredEvents.length === 0 ? (
        <AdminEmptyState
          icon={Calendar}
          title="No events scheduled"
          description="Create an event to get started"
          action={{ label: "Create Event", href: "/admin/dashboard/events/create" }}
          learnMoreArticleId="tour-management"
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredEvents.map((event) => (
            <EventOperationsCard key={event.id} event={event} logistics={logisticsByEvent[event.id]} />
          ))}
        </div>
      )}
    </div>
  )
}
