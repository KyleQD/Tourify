"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { BookmarkPlus, DollarSign, Layers, Music, Plus, Route, Users } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAuth } from "@/contexts/auth-context"
import { AdminFilterBar } from "../components/admin-filter-bar"
import { AdminEmptyState } from "../components/admin-empty-state"
import { AdminPageSkeleton } from "../components/admin-page-skeleton"
import { AdminPageHeader } from "../components/admin-page-header"
import { AdminStatCard } from "../components/admin-stat-card"
import { AdminTourSurfaceState } from "../components/admin-tour-surface-state"
import { TourOperationsCard } from "@/components/admin/operations/tour-operations-card"
import { formatSafeCurrency } from "@/lib/format/number-format"
import {
  fetchTourLogisticsBatch,
  type LogisticsMetricsSummary,
} from "@/lib/admin/batch-logistics-metrics"
import { useActingContext } from "@/hooks/use-acting-context"
import {
  classifyTourFetchFailure,
  classifyTourSurfaceState,
  type TourSurfaceState,
} from "@/lib/admin/tour-surface-state"
import type { TourSavedViewRecord } from "@/lib/admin/tour-saved-view"
import { TourBulkCommandDialog } from "@/components/admin/tours/tour-bulk-command-dialog"

interface TourTag {
  id: string
  slug: string
  label: string
}

interface TourRow {
  id: string
  name: string
  status?: string
  start_date?: string
  end_date?: string
  main_artist?: string
  artist?: string
  org_id?: string | null
  artist_id?: string | null
  owner_user_id?: string | null
  lead_user_id?: string | null
  tags?: TourTag[]
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

function buildNoStoreInit(actingHeaders: Record<string, string>): RequestInit {
  return {
    credentials: "include",
    cache: "no-store",
    headers: { "Cache-Control": "no-cache", Pragma: "no-cache", ...actingHeaders },
  }
}

function normalizeTour(raw: any): TourRow {
  const orgId = raw.org_id ?? raw.orgId ?? raw.settings?.org_id ?? null
  const artistId = raw.artist_id ?? raw.artistId ?? raw.settings?.artist_id ?? null
  const tags = Array.isArray(raw.tags)
    ? raw.tags.map((tag: any) => ({
        id: String(tag.id),
        slug: String(tag.slug || ""),
        label: String(tag.label || tag.slug || ""),
      }))
    : []
  return {
    id: String(raw.id),
    name: raw.name || "Untitled tour",
    status: raw.status || "planning",
    start_date: raw.start_date || raw.startDate,
    end_date: raw.end_date || raw.endDate,
    main_artist: raw.main_artist || raw.artist || raw.mainArtist,
    artist: raw.artist || raw.main_artist,
    org_id: orgId ? String(orgId) : null,
    artist_id: artistId ? String(artistId) : null,
    owner_user_id: raw.owner_user_id ? String(raw.owner_user_id) : null,
    lead_user_id: raw.lead_user_id ? String(raw.lead_user_id) : null,
    tags,
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
  const { user } = useAuth()
  const userId = user?.id ?? null
  const { actingContextKey, actingHeaders, isActingReady } = useActingContext()
  const [filterStatus, setFilterStatus] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [tagFilter, setTagFilter] = useState("all")
  const [ownerFilter, setOwnerFilter] = useState<"all" | "mine">("all")
  const [tours, setTours] = useState<TourRow[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [orgTags, setOrgTags] = useState<TourTag[]>([])
  const [savedViews, setSavedViews] = useState<TourSavedViewRecord[]>([])
  const [activeViewId, setActiveViewId] = useState<string>("none")
  const [isSavingView, setIsSavingView] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [surfaceState, setSurfaceState] = useState<TourSurfaceState | null>(null)
  const [logisticsByTour, setLogisticsByTour] = useState<Record<string, LogisticsMetricsSummary>>({})
  const [logisticsDegraded, setLogisticsDegraded] = useState(false)
  const [selectedTourIds, setSelectedTourIds] = useState<string[]>([])
  const [bulkOpen, setBulkOpen] = useState(false)

  useEffect(() => {
    if (searchParams.get("published") === "true" || searchParams.get("published") === "1") {
      toast.success("Tour published", { description: "Work Mode fanout completed for linked shows." })
    }
  }, [searchParams])

  const fetchMeta = useCallback(async () => {
    if (!isActingReady) return
    try {
      const [tagsRes, viewsRes] = await Promise.all([
        fetch("/api/admin/tours/tags", buildNoStoreInit(actingHeaders)),
        fetch("/api/admin/tours/saved-views", buildNoStoreInit(actingHeaders)),
      ])
      if (tagsRes.ok) {
        const tagsData = await tagsRes.json()
        setOrgTags(
          (tagsData.tags || []).map((tag: any) => ({
            id: String(tag.id),
            slug: String(tag.slug || ""),
            label: String(tag.label || tag.slug || ""),
          })),
        )
      }
      if (viewsRes.ok) {
        const viewsData = await viewsRes.json()
        const views = (viewsData.views || []) as TourSavedViewRecord[]
        setSavedViews(views)
        const defaultView = views.find((view) => view.is_default)
        if (defaultView && activeViewId === "none") {
          applySavedView(defaultView)
        }
      }
    } catch {
      // Meta is additive — portfolio still loads without tags/views.
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- applySavedView defined below; intentional once on ready
  }, [actingContextKey, actingHeaders, isActingReady])

  function applySavedView(view: TourSavedViewRecord) {
    setActiveViewId(view.id)
    setFilterStatus(view.filters.status || "all")
    setSearchTerm(typeof view.filters.q === "string" ? view.filters.q : "")
    const tag = typeof view.filters.tag === "string" && view.filters.tag
      ? view.filters.tag.split(",")[0]?.trim() || "all"
      : "all"
    setTagFilter(tag || "all")
    if (view.filters.owner && userId && view.filters.owner === userId) setOwnerFilter("mine")
    else setOwnerFilter("all")
  }

  const fetchTours = useCallback(async () => {
    if (!isActingReady) return
    try {
      setIsLoading(true)
      setSurfaceState(null)
      setTours([])
      setLogisticsByTour({})
      setLogisticsDegraded(false)
      const params = new URLSearchParams()
      if (filterStatus !== "all") params.set("status", filterStatus)
      if (searchTerm.trim()) params.set("q", searchTerm.trim())
      if (tagFilter !== "all") params.set("tag", tagFilter)
      if (ownerFilter === "mine" && userId) params.set("owner", userId)
      params.set("limit", "100")
      params.set("sort", "start_date")
      params.set("order", "asc")
      const response = await fetch(`/api/admin/tours?${params}`, buildNoStoreInit(actingHeaders))
      if (!response.ok) {
        setSurfaceState(await classifyTourFetchFailure(response))
        setTours([])
        setTotalCount(0)
        return
      }
      const data = await response.json()
      const normalized = (data.tours || []).map(normalizeTour)
      setTours(normalized)
      setSelectedTourIds((prev) => prev.filter((id) => normalized.some((tour: TourRow) => tour.id === id)))
      // Stats/counts only from server visible page — never invent unauthorized totals.
      setTotalCount(Number(data.page?.totalCount ?? normalized.length))
      const isStale = Boolean(data.page?.filters?.stale || data.stale || data.freshness === "stale")
      setSurfaceState(
        classifyTourSurfaceState({
          ok: true,
          itemCount: normalized.length,
          isStale,
          correlationId: response.headers.get("x-correlation-id"),
        }),
      )
    } catch (error) {
      setTours([])
      setTotalCount(0)
      setSurfaceState(
        classifyTourSurfaceState({
          ok: false,
          status: 500,
          message: error instanceof Error ? error.message : "Failed to load tours",
        }),
      )
    } finally {
      setIsLoading(false)
    }
  }, [
    actingContextKey,
    actingHeaders,
    filterStatus,
    isActingReady,
    ownerFilter,
    searchTerm,
    tagFilter,
    userId,
  ])

  useEffect(() => {
    void fetchMeta()
  }, [fetchMeta])

  useEffect(() => {
    void fetchTours()
  }, [fetchTours])

  useEffect(() => {
    if (!tours.length) {
      setLogisticsByTour({})
      return
    }
    let cancelled = false
    void fetch("/api/admin/tours/observability", {
      ...buildNoStoreInit(actingHeaders),
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...actingHeaders,
      },
      body: JSON.stringify({
        kind: "client_fanout",
        endpoint: "/admin/dashboard/tours",
        fanoutCount: 1 + Math.ceil(tours.length / 4),
      }),
    }).catch(() => {})

    void fetchTourLogisticsBatch(tours.map((tour) => tour.id), 4, actingHeaders)
      .then((result) => {
        if (cancelled) return
        setLogisticsByTour(result)
        const expected = tours.length
        const got = Object.keys(result || {}).length
        setLogisticsDegraded(expected > 0 && got < expected)
      })
      .catch(() => {
        if (!cancelled) setLogisticsDegraded(true)
      })
    return () => {
      cancelled = true
    }
  }, [actingHeaders, tours])

  async function saveCurrentView(scope: "personal" | "organization") {
    const name = window.prompt(
      scope === "organization" ? "Organization view name" : "Personal view name",
      filterStatus !== "all" ? `${filterStatus} tours` : "My tour view",
    )
    if (!name?.trim()) return
    setIsSavingView(true)
    try {
      const response = await fetch("/api/admin/tours/saved-views", {
        ...buildNoStoreInit(actingHeaders),
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...actingHeaders,
        },
        body: JSON.stringify({
          name: name.trim(),
          scope,
          filters: {
            status: filterStatus === "all" ? null : filterStatus,
            q: searchTerm.trim() || null,
            tag: tagFilter === "all" ? null : tagFilter,
            owner: ownerFilter === "mine" && userId ? userId : null,
          },
          columns: ["name", "status", "start_date", "end_date", "owner", "tags", "updated_at"],
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        toast.error(data.error || "Could not save view")
        return
      }
      toast.success("Saved view created")
      setSavedViews((prev) => [data.view, ...prev])
      setActiveViewId(data.view.id)
    } finally {
      setIsSavingView(false)
    }
  }

  const draftTours = useMemo(
    () => tours.filter((tour) => ["planning", "draft"].includes(String(tour.status || "").toLowerCase())),
    [tours],
  )
  // Counts derived only from visible/server-authorized tours.
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
        <AdminStatCard title="Total Tours" value={totalCount} icon={Route} color="blue" isLoading={isLoading} />
        <AdminStatCard title="Active" value={activeCount} icon={Music} color="green" isLoading={isLoading} />
        <AdminStatCard title="Shows" value={totalShows} icon={Users} color="orange" isLoading={isLoading} />
        <AdminStatCard title="Revenue" value={formatSafeCurrency(totalRevenue)} icon={DollarSign} color="cyan" isLoading={isLoading} />
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-sm border border-slate-700/50 bg-slate-900/40 p-3">
        <Select
          value={activeViewId}
          onValueChange={(value) => {
            if (value === "none") {
              setActiveViewId("none")
              return
            }
            const view = savedViews.find((item) => item.id === value)
            if (view) applySavedView(view)
          }}
        >
          <SelectTrigger className="h-9 w-[220px] border-slate-700/50 bg-slate-800/50 text-sm text-white">
            <SelectValue placeholder="Saved views" />
          </SelectTrigger>
          <SelectContent className="border-slate-700 bg-slate-900 text-slate-100">
            <SelectItem value="none">No saved view</SelectItem>
            {savedViews.map((view) => (
              <SelectItem key={view.id} value={view.id}>
                {view.scope === "organization" ? "Org · " : ""}
                {view.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isSavingView}
          onClick={() => void saveCurrentView("personal")}
          className="border-slate-600 text-slate-200"
        >
          <BookmarkPlus className="mr-1.5 h-3.5 w-3.5" />
          Save personal
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isSavingView}
          onClick={() => void saveCurrentView("organization")}
          className="border-slate-600 text-slate-200"
        >
          Save org view
        </Button>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-slate-300"
            disabled={tours.length === 0}
            onClick={() => {
              if (selectedTourIds.length === tours.length) setSelectedTourIds([])
              else setSelectedTourIds(tours.map((tour) => tour.id))
            }}
          >
            {selectedTourIds.length === tours.length && tours.length > 0
              ? "Clear selection"
              : "Select page"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={selectedTourIds.length === 0}
            onClick={() => setBulkOpen(true)}
            className="border-violet-500/40 text-violet-100"
          >
            <Layers className="mr-1.5 h-3.5 w-3.5" />
            Bulk ({selectedTourIds.length})
          </Button>
        </div>
      </div>

      <AdminFilterBar
        searchPlaceholder="Search tours..."
        searchValue={searchTerm}
        onSearchChange={(value) => {
          setSearchTerm(value)
          setActiveViewId("none")
        }}
        statusOptions={[
          { value: "all", label: "All Status" },
          { value: "draft", label: "Draft" },
          { value: "planning", label: "Planning" },
          { value: "ready", label: "Ready" },
          { value: "published", label: "Published" },
          { value: "active", label: "Active" },
          { value: "completed", label: "Completed" },
          { value: "cancelled", label: "Cancelled" },
          { value: "archived", label: "Archived" },
        ]}
        statusValue={filterStatus}
        onStatusChange={(value) => {
          setFilterStatus(value)
          setActiveViewId("none")
        }}
        actions={
          <>
            <Select
              value={tagFilter}
              onValueChange={(value) => {
                setTagFilter(value)
                setActiveViewId("none")
              }}
            >
              <SelectTrigger className="h-9 w-[160px] border-slate-700/50 bg-slate-800/50 text-sm text-white">
                <SelectValue placeholder="All tags" />
              </SelectTrigger>
              <SelectContent className="border-slate-700 bg-slate-900 text-slate-100">
                <SelectItem value="all">All tags</SelectItem>
                {orgTags.map((tag) => (
                  <SelectItem key={tag.id} value={tag.slug || tag.id}>
                    {tag.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={ownerFilter}
              onValueChange={(value: "all" | "mine") => {
                setOwnerFilter(value)
                setActiveViewId("none")
              }}
            >
              <SelectTrigger className="h-9 w-[140px] border-slate-700/50 bg-slate-800/50 text-sm text-white">
                <SelectValue placeholder="Owner" />
              </SelectTrigger>
              <SelectContent className="border-slate-700 bg-slate-900 text-slate-100">
                <SelectItem value="all">All owners</SelectItem>
                <SelectItem value="mine">Owned by me</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
      />

      {logisticsDegraded && !isLoading && surfaceState?.kind === "ready" ? (
        <AdminTourSurfaceState
          state={classifyTourSurfaceState({
            ok: true,
            isStale: true,
            itemCount: tours.length,
            message: "Logistics metrics are incomplete for some tours. Counts may lag.",
          })}
          onRetry={() => void fetchTours()}
        />
      ) : null}

      {isLoading ? (
        <AdminPageSkeleton />
      ) : surfaceState
        && ["permission", "unavailable_dependency", "system_error"].includes(surfaceState.kind) ? (
        <AdminTourSurfaceState state={surfaceState} onRetry={() => void fetchTours()} />
      ) : tours.length === 0 ? (
        totalCount > 0 || searchTerm || filterStatus !== "all" || tagFilter !== "all" || ownerFilter !== "all" ? (
          <AdminEmptyState
            icon={Route}
            title="No tours match"
            description="Try clearing search, tags, owner, or status filters to see your accessible tours"
            action={{
              label: "Clear filters",
              onClick: () => {
                setSearchTerm("")
                setFilterStatus("all")
                setTagFilter("all")
                setOwnerFilter("all")
                setActiveViewId("none")
              },
            }}
          />
        ) : (
          <AdminEmptyState
            icon={Route}
            title="No tours yet"
            description="Open the Tour Builder to create your first run"
            action={{ label: "Tour Builder", href: "/admin/dashboard/tours/builder" }}
          />
        )
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {tours.map((tour) => {
            const isSelected = selectedTourIds.includes(tour.id)
            return (
              <div key={tour.id} className="relative">
                <div className="absolute left-3 top-3 z-10">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => {
                      setSelectedTourIds((prev) => {
                        if (checked) return prev.includes(tour.id) ? prev : [...prev, tour.id]
                        return prev.filter((id) => id !== tour.id)
                      })
                    }}
                    aria-label={`Select ${tour.name}`}
                    className="border-slate-500 bg-slate-950/80"
                  />
                </div>
                <div className={isSelected ? "ring-2 ring-violet-500/50 rounded-xl" : undefined}>
                  <TourOperationsCard tour={tour} logistics={logisticsByTour[tour.id]} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      <TourBulkCommandDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        tourIds={selectedTourIds}
        onCompleted={() => {
          setSelectedTourIds([])
          void fetchTours()
        }}
      />
    </div>
  )
}
