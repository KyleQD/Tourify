"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { AlertTriangle, Calendar, Clock, Download, Plus, Ticket } from "lucide-react"
import { useActingContext } from "@/hooks/use-acting-context"
import { Button } from "@/components/ui/button"
import { AdminFilterBar } from "../components/admin-filter-bar"
import { AdminOperationsIndexShell } from "../components/admin-operations-index-shell"
import { EventOperationsCard } from "@/components/admin/operations/event-operations-card"
import { normalizeAdminEvent } from "@/lib/events/admin-event-normalization"
import { formatSafeNumber } from "@/lib/format/number-format"
import {
  fetchEventLogisticsBatch,
  type LogisticsMetricsSummary,
} from "@/lib/admin/batch-logistics-metrics"
import type { AttentionIssueDTO } from "@/lib/admin/admin-operations-contracts"

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
  settings?: Record<string, unknown>
  is_quick_start_placeholder?: boolean
}

function buildNoStoreInit(actingHeaders?: Record<string, string>): RequestInit {
  return {
    credentials: "include",
    cache: "no-store",
    headers: { "Cache-Control": "no-cache", Pragma: "no-cache", ...actingHeaders },
  }
}

export default function EventsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { actingContextKey, actingHeaders, isActingReady } = useActingContext()
  const [filterStatus, setFilterStatus] = useState(() => searchParams.get("status") || "all")
  const [routeFilter, setRouteFilter] = useState<"all" | "touring" | "standalone">(
    () => (searchParams.get("route") as "all" | "touring" | "standalone" | null) || "all",
  )
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get("q") || "")
  const [events, setEvents] = useState<Event[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [summary, setSummary] = useState({
    totalCount: 0,
    thisWeekCount: 0,
    needsAttentionCount: 0,
    missingVenueCount: 0,
    staffingGapCount: 0,
    capacity: 0,
    ticketsSold: 0,
  })
  const [attention, setAttention] = useState<AttentionIssueDTO[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [logisticsByEvent, setLogisticsByEvent] = useState<Record<string, LogisticsMetricsSummary>>({})

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    if (filterStatus === "all") params.delete("status")
    else params.set("status", filterStatus)
    if (routeFilter === "all") params.delete("route")
    else params.set("route", routeFilter)
    if (searchTerm.trim()) params.set("q", searchTerm.trim())
    else params.delete("q")
    const next = params.toString()
    const current = searchParams.toString()
    if (next !== current) {
      router.replace(next ? `/admin/dashboard/events?${next}` : "/admin/dashboard/events", { scroll: false })
    }
  }, [filterStatus, routeFilter, router, searchParams, searchTerm])

  const fetchEvents = useCallback(async () => {
    if (!isActingReady) return
    try {
      setIsLoading(true)
      setFetchError(null)
      const params = new URLSearchParams()
      if (filterStatus !== "all") params.append("status", filterStatus)
      if (routeFilter !== "all") params.append("route", routeFilter)
      if (searchTerm.trim()) params.append("q", searchTerm.trim())
      params.set("limit", "100")
      params.set("sort", "start_at")
      params.set("order", "asc")

      const response = await fetch(`/api/admin/events?${params}`, buildNoStoreInit(actingHeaders))
      if (!response.ok) throw new Error("Failed to fetch events")

      const data = await response.json()
      const raw = data.items || data.events || []
      setEvents(
        raw.map((event: Event) => ({
          ...event,
          ...normalizeAdminEvent(event),
        }))
      )
      setTotalCount(Number(data.page?.totalCount ?? raw.length))
      setSummary({
        totalCount: Number(data.summary?.totalCount ?? data.page?.totalCount ?? raw.length),
        thisWeekCount: Number(data.summary?.thisWeekCount ?? 0),
        needsAttentionCount: Number(data.summary?.needsAttentionCount ?? 0),
        missingVenueCount: Number(data.summary?.missingVenueCount ?? 0),
        staffingGapCount: Number(data.summary?.staffingGapCount ?? 0),
        capacity: Number(data.summary?.capacity ?? 0),
        ticketsSold: Number(data.summary?.ticketsSold ?? 0),
      })
      setAttention(Array.isArray(data.attention) ? data.attention : [])
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load events"
      setFetchError(message)
      setEvents([])
      setTotalCount(0)
      setAttention([])
    } finally {
      setIsLoading(false)
    }
  }, [actingHeaders, filterStatus, isActingReady, routeFilter, searchTerm])

  useEffect(() => {
    void fetchEvents()
  }, [fetchEvents, actingContextKey])

  useEffect(() => {
    if (!events.length) {
      setLogisticsByEvent({})
      return
    }
    let cancelled = false
    const operationalEventIds = events
      .filter((event) => !event.is_quick_start_placeholder)
      .map((event) => event.id)
    if (!operationalEventIds.length) {
      setLogisticsByEvent({})
      return
    }
    void fetchEventLogisticsBatch(operationalEventIds, 4, actingHeaders).then((result) => {
      if (!cancelled) setLogisticsByEvent(result)
    })
    return () => {
      cancelled = true
    }
  }, [actingHeaders, events])

  const draftEvents = useMemo(
    () => events.filter((event) => String(event.status).toLowerCase() === "draft"),
    [events]
  )
  async function exportEvents() {
    const params = new URLSearchParams()
    if (filterStatus !== "all") params.append("status", filterStatus)
    if (routeFilter !== "all") params.append("route", routeFilter)
    if (searchTerm.trim()) params.append("q", searchTerm.trim())
    const response = await fetch(`/api/admin/events/export?${params}`, buildNoStoreInit(actingHeaders))
    if (!response.ok) {
      setFetchError("Could not export events")
      return
    }
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `events-export-${new Date().toISOString().slice(0, 10)}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <AdminOperationsIndexShell
        title="Event Management"
        subtitle="Coordinate shows, advance venues, and hand off into logistics, staffing, and day-of ops"
        icon={Calendar}
        isActingReady={isActingReady}
        isLoading={isLoading}
        error={fetchError}
        onRetry={() => void fetchEvents()}
        attention={attention}
        summaryCards={[
          { title: "Total Events", value: totalCount, icon: Calendar, color: "blue" },
          { title: "This Week", value: summary.thisWeekCount, icon: Clock, color: "green" },
          {
            title: "Needs Attention",
            value: summary.needsAttentionCount,
            icon: AlertTriangle,
            color: "amber",
            onClick: () => {
              setFilterStatus("all")
              setRouteFilter("all")
            },
          },
          { title: "Tickets", value: formatSafeNumber(summary.ticketsSold), icon: Ticket, color: "cyan" },
        ]}
        empty={
          events.length === 0
            ? totalCount > 0 || searchTerm || filterStatus !== "all" || routeFilter !== "all"
              ? {
                  icon: Calendar,
                  title: "No events match",
                  description: "Try clearing search, status, or routing filters to see your existing events",
                  action: {
                    label: "Clear filters",
                    onClick: () => {
                      setSearchTerm("")
                      setFilterStatus("all")
                      setRouteFilter("all")
                    },
                  },
                }
              : {
                  icon: Calendar,
                  title: "No events scheduled",
                  description: "Create an event to get started",
                  action: { label: "Create Event", href: "/admin/dashboard/events/create" },
                }
            : null
        }
        actions={
          <>
            <Button
              variant="outline"
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
              onClick={() => void exportEvents()}
            >
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button
              asChild
              className="border-0 bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/20"
            >
              <Link href="/admin/dashboard/events/create" prefetch={false}>
                <Plus className="mr-2 h-4 w-4" />
                Create Event
              </Link>
            </Button>
          </>
        }
        filterBar={
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
        }
      >
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
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {events.map((event) => (
          <EventOperationsCard key={event.id} event={event} logistics={logisticsByEvent[event.id]} />
        ))}
      </div>
    </AdminOperationsIndexShell>
  )
}
