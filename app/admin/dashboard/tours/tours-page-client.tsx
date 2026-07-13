"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { DollarSign, Music, Plus, Route, Users } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { AdminFilterBar } from "../components/admin-filter-bar"
import { AdminEmptyState } from "../components/admin-empty-state"
import { AdminPageSkeleton } from "../components/admin-page-skeleton"
import { AdminErrorCard } from "../components/admin-error-card"
import { AdminPageHeader } from "../components/admin-page-header"
import { AdminStatCard } from "../components/admin-stat-card"
import { TourOperationsCard } from "@/components/admin/operations/tour-operations-card"
import { formatSafeCurrency } from "@/lib/format/number-format"
import {
  fetchTourLogisticsBatch,
  type LogisticsMetricsSummary,
} from "@/lib/admin/batch-logistics-metrics"

interface TourRow {
  id: string
  name: string
  status?: string
  start_date?: string
  end_date?: string
  main_artist?: string
  artist?: string
  event_count?: number
  completed_events?: number
  crew_count?: number
  expected_revenue?: number
  expenses?: number
  revenue?: number
  total_shows?: number
  completed_shows?: number
  logistics?: { crew?: number }
}

function buildNoStoreInit(): RequestInit {
  return {
    credentials: "include",
    cache: "no-store",
    headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
  }
}

function normalizeTour(raw: any): TourRow {
  return {
    id: String(raw.id),
    name: raw.name || "Untitled tour",
    status: raw.status || "planning",
    start_date: raw.start_date || raw.startDate,
    end_date: raw.end_date || raw.endDate,
    main_artist: raw.main_artist || raw.artist || raw.mainArtist,
    artist: raw.artist || raw.main_artist,
    event_count: Number(raw.event_count ?? raw.totalShows ?? raw.total_shows ?? 0),
    completed_events: Number(raw.completed_events ?? raw.completedShows ?? raw.completed_shows ?? 0),
    crew_count: Number(raw.crew_count ?? raw.logistics?.crew ?? 0),
    expected_revenue: Number(raw.expected_revenue ?? raw.revenue ?? 0),
    expenses: Number(raw.expenses ?? 0),
  }
}

export default function ToursPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [filterStatus, setFilterStatus] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [tours, setTours] = useState<TourRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [logisticsByTour, setLogisticsByTour] = useState<Record<string, LogisticsMetricsSummary>>({})

  useEffect(() => {
    if (searchParams.get("published") === "true" || searchParams.get("published") === "1") {
      toast.success("Tour published", { description: "Work Mode fanout completed for linked shows." })
    }
  }, [searchParams])

  const fetchTours = useCallback(async () => {
    try {
      setIsLoading(true)
      setFetchError(null)
      const params = new URLSearchParams()
      if (filterStatus !== "all") params.set("status", filterStatus)
      const response = await fetch(`/api/admin/tours?${params}`, buildNoStoreInit())
      if (!response.ok) throw new Error("Failed to fetch tours")
      const data = await response.json()
      setTours((data.tours || []).map(normalizeTour))
    } catch (error) {
      setFetchError(error instanceof Error ? error.message : "Failed to load tours")
      setTours([])
    } finally {
      setIsLoading(false)
    }
  }, [filterStatus])

  useEffect(() => {
    void fetchTours()
  }, [fetchTours])

  useEffect(() => {
    if (!tours.length) {
      setLogisticsByTour({})
      return
    }
    let cancelled = false
    void fetchTourLogisticsBatch(tours.map((tour) => tour.id)).then((result) => {
      if (!cancelled) setLogisticsByTour(result)
    })
    return () => {
      cancelled = true
    }
  }, [tours])

  const filteredTours = tours.filter((tour) => {
    const matchesStatus = filterStatus === "all" || tour.status === filterStatus
    const haystack = `${tour.name} ${tour.main_artist || ""} ${tour.artist || ""}`.toLowerCase()
    return matchesStatus && haystack.includes(searchTerm.toLowerCase())
  })

  const draftTours = useMemo(
    () => tours.filter((tour) => ["planning", "draft"].includes(String(tour.status || "").toLowerCase())),
    [tours]
  )
  const activeCount = tours.filter((tour) => tour.status === "active").length
  const totalRevenue = tours.reduce((sum, tour) => sum + (tour.expected_revenue || 0), 0)
  const totalShows = tours.reduce((sum, tour) => sum + (tour.event_count || 0), 0)

  return (
    <div className="container mx-auto space-y-6">
      <AdminPageHeader
        title="Tour Management"
        subtitle="Plan routes, attach shows, advance markets, and publish into Work Mode"
        icon={Route}
        actions={
          <Button
            onClick={() => router.push("/admin/dashboard/tours/builder")}
            className="border-0 bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/20"
          >
            <Plus className="mr-2 h-4 w-4" />
            Tour Builder
          </Button>
        }
      />

      {draftTours.length > 0 ? (
        <div className="flex flex-col gap-3 rounded-[1.25rem] border border-cyan-400/20 bg-cyan-400/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-cyan-100">
              {draftTours.length} draft{draftTours.length === 1 ? "" : "s"} in progress
            </p>
            <p className="text-xs text-slate-400">Continue in the Tour Operations Builder.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {draftTours.slice(0, 3).map((tour) => (
              <Button key={tour.id} asChild size="sm" variant="outline" className="border-cyan-400/30 text-cyan-100">
                <Link href={`/admin/dashboard/tours/builder?draft=${tour.id}`}>Continue {tour.name}</Link>
              </Button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard title="Total Tours" value={tours.length} icon={Route} color="blue" isLoading={isLoading} />
        <AdminStatCard title="Active" value={activeCount} icon={Music} color="green" isLoading={isLoading} />
        <AdminStatCard title="Shows" value={totalShows} icon={Users} color="orange" isLoading={isLoading} />
        <AdminStatCard title="Revenue" value={formatSafeCurrency(totalRevenue)} icon={DollarSign} color="cyan" isLoading={isLoading} />
      </div>

      <AdminFilterBar
        searchPlaceholder="Search tours..."
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        statusOptions={[
          { value: "all", label: "All Status" },
          { value: "planning", label: "Planning" },
          { value: "active", label: "Active" },
          { value: "on_hold", label: "On Hold" },
          { value: "completed", label: "Completed" },
          { value: "cancelled", label: "Cancelled" },
        ]}
        statusValue={filterStatus}
        onStatusChange={setFilterStatus}
      />

      {isLoading ? (
        <AdminPageSkeleton />
      ) : fetchError ? (
        <AdminErrorCard title="Could not load tours" message={fetchError} onRetry={() => void fetchTours()} />
      ) : filteredTours.length === 0 ? (
        <AdminEmptyState
          icon={Route}
          title="No tours yet"
          description="Open the Tour Builder to create your first run"
          action={{ label: "Tour Builder", href: "/admin/dashboard/tours/builder" }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredTours.map((tour) => (
            <TourOperationsCard key={tour.id} tour={tour} logistics={logisticsByTour[tour.id]} />
          ))}
        </div>
      )}
    </div>
  )
}
