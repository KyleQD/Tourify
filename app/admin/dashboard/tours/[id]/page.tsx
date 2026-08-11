"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Separator } from "@/components/ui/separator"
import { 
  Calendar, 
  MapPin, 
  Users, 
  DollarSign, 
  Clock, 
  Truck, 
  Music, 
  Building, 
  Target, 
  Settings, 
  Plus, 
  Edit, 
  Eye, 
  Download, 
  Upload, 
  CheckCircle, 
  AlertTriangle, 
  Activity, 
  BarChart3, 
  TrendingUp, 
  Star, 
  Award, 
  Crown, 
  Zap, 
  Globe, 
  Plane, 
  Car, 
  Hotel, 
  Coffee, 
  Utensils, 
  Headphones, 
  Mic, 
  Volume2, 
  Camera, 
  Video, 
  Wifi, 
  Shield, 
  Heart, 
  Share, 
  Bookmark, 
  MessageSquare, 
  Bell, 
  Search, 
  Filter, 
  RefreshCw, 
  ArrowUpRight, 
  ArrowDownRight, 
  ChevronRight, 
  ChevronDown, 
  ChevronLeft,
  PlayCircle, 
  PauseCircle, 
  StopCircle, 
  RotateCcw, 
  FileText, 
  Map, 
  Route, 
  Navigation, 
  Compass, 
  Flag, 
  Receipt,
  Trash2,
  Copy,
  ExternalLink,
  MoreHorizontal
} from "lucide-react"
import { toast } from "sonner"
import { formatSafeDate, normalizeAdminEvent } from "@/lib/events/admin-event-normalization"
import { formatSafeCurrency } from "@/lib/format/number-format"
import { SurfaceInput } from "@/components/surface/surface-primitives"
import { AdminSurfaceCard } from "../../components/admin-surface-card"
import {
  OperationsCommandShell,
  OperationsTabPanel,
} from "@/components/admin/operations/operations-command-shell"
import { WorkforceMetricCard, WorkforcePageShell } from "@/components/hiring/workforce-ui"
import { LifecycleStrip } from "@/components/admin/operations/lifecycle-strip"
import { buildAdminHiringHref, buildAdminLogisticsHref, buildAdminRosterHref, buildAdminSiteMapHref } from "@/lib/admin/admin-ops-context"
import {
  TourEventsPanel,
  TourTeamPanel,
  TourGrantAdminsPanel,
  TourVendorPanel,
  TourJobsPanel,
  TourJobPostingPanel,
  TourFinancePanel,
  TourCalendarPanel,
  TourLogisticsPanel,
} from "@/components/admin/tours/panels"
import { LayoutDashboard, Briefcase, Ticket, Wallet, CalendarDays } from "lucide-react"
import { useActingContext } from "@/hooks/use-acting-context"
import { AdminTourSurfaceState } from "../../components/admin-tour-surface-state"
import {
  classifyTourFetchFailure,
  classifyTourSurfaceState,
  type TourSurfaceState,
} from "@/lib/admin/tour-surface-state"
import type { TourCommandCenterDomainAccess } from "@/lib/admin/tour-command-center-summary"
import type { TourHealthSummary } from "@/lib/admin/tour-health-aggregation"
import {
  resolveActiveTourCommandCenterTab,
  resolveTourCommandCenterVisibleTabs,
  shouldLoadTourWorkflowFanout,
  type TourCommandCenterTabId,
} from "@/lib/admin/tour-command-center-tabs"
import { TourDuplicatePreviewDialog } from "@/components/admin/tours/tour-duplicate-preview-dialog"
import { TourArchivePreviewDialog } from "@/components/admin/tours/tour-archive-preview-dialog"
import { TourDeletePreviewDialog } from "@/components/admin/tours/tour-delete-preview-dialog"
import { PublicationShareLinkDialog } from "@/components/admin/publication/publication-share-link-dialog"
import type { TourDuplicatePreview } from "@/lib/admin/tour-duplicate-preview"
import { TourHealthCard } from "@/components/admin/tours/tour-health-card"
import { TourStopsCard } from "@/components/admin/tours/tour-stops-card"

interface Tour {
  id: string
  name: string
  description?: string
  artist_id: string
  status: 'draft' | 'planning' | 'active' | 'on_hold' | 'completed' | 'settled' | 'cancelled' | 'archived'
  start_date: string
  end_date: string
  total_shows: number
  completed_shows: number
  expected_revenue: number
  actual_revenue: number
  expenses: number
  budget: number
  crew_size: number
  transportation: string
  accommodation: string
  equipment_requirements: string
  special_requirements?: string
  created_at: string
  updated_at: string
}

interface Event {
  id: string
  name: string
  description?: string
  tour_id: string
  venue_name: string
  venue_address?: string
  event_date: string
  event_time?: string
  doors_open?: string
  duration_minutes?: number
  status: 'draft' | 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'postponed'
  capacity: number
  tickets_sold: number
  ticket_price?: number
  vip_price?: number
  expected_revenue: number
  actual_revenue: number
  expenses: number
  venue_contact_name?: string
  venue_contact_email?: string
  venue_contact_phone?: string
  sound_requirements?: string
  lighting_requirements?: string
  stage_requirements?: string
  special_requirements?: string
  advance_status?: string
  load_in_time?: string
  sound_check_time?: string
  settings?: Record<string, unknown>
}

interface TourMember {
  id: string
  name: string
  role: string
  email: string
  phone?: string
  avatar?: string
  status: 'confirmed' | 'pending' | 'declined'
  arrival_date?: string
  departure_date?: string
  responsibilities?: string
}

interface TourVendor {
  id: string
  name: string
  type: string
  contact_name: string
  contact_email: string
  contact_phone?: string
  status: 'confirmed' | 'pending' | 'declined'
  services: string[]
  contract_amount?: number
  payment_status: 'paid' | 'partial' | 'pending'
  notes?: string
}

interface TourWorkflowSummary {
  threadId: string | null
  connected: boolean
  tasksTotal: number
  tasksDone: number
  tasksBlocked: number
  messagesTotal: number
  overdueTasks: number
  lastMessageAt: string | null
}

interface WorkflowAuditEvent {
  id: string
  action: string
  entity_type: string
  entity_id: string | null
  created_at: string
}

type WorkflowActivityFilter = 'all' | 'automation' | 'task' | 'participant' | 'message' | 'thread'

function parseWorkflowActivityFilter(value: string | null): WorkflowActivityFilter | null {
  if (!value) return null
  const allowed: WorkflowActivityFilter[] = ['all', 'automation', 'task', 'participant', 'message', 'thread']
  return allowed.includes(value as WorkflowActivityFilter) ? (value as WorkflowActivityFilter) : null
}

function buildNoStoreInit(
  actingHeaders: Record<string, string>,
  input?: RequestInit,
): RequestInit {
  return {
    credentials: 'include',
    cache: 'no-store',
    ...input,
    headers: {
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
      ...actingHeaders,
      ...(input?.headers || {}),
    },
  }
}

const TOUR_TAB_ICONS: Record<TourCommandCenterTabId, typeof LayoutDashboard> = {
  overview: LayoutDashboard,
  events: Calendar,
  team: Users,
  vendors: Truck,
  jobs: Briefcase,
  ticketing: Ticket,
  finances: Wallet,
  logistics: Map,
  "calendar-sync": CalendarDays,
}

export default function TourManagementPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { actingContextKey, actingHeaders, isActingReady } = useActingContext()
  const adminRequest = useCallback(
    (input?: RequestInit) => buildNoStoreInit(actingHeaders, input),
    [actingHeaders],
  )
  const justPublished = searchParams.get('published') === '1' || searchParams.get('published') === 'true'
  const tourId = params.id as string

  const [tour, setTour] = useState<Tour | null>(null)
  const [events, setEvents] = useState<Event[]>([])
  const [members, setMembers] = useState<TourMember[]>([])
  const [vendors, setVendors] = useState<TourVendor[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [surfaceState, setSurfaceState] = useState<TourSurfaceState | null>(null)
  const [domainAccess, setDomainAccess] = useState<TourCommandCenterDomainAccess | null>(null)
  const [tourHealth, setTourHealth] = useState<TourHealthSummary | null>(null)
  const [tourStops, setTourStops] = useState<Array<{
    id: string
    ordinal?: number | null
    name?: string | null
    stop_type?: string | null
    local_date?: string | null
    hold_status?: string | null
    is_protected?: boolean | null
  }>>([])
  const [tourStopsState, setTourStopsState] = useState<"ready" | "empty" | "denied" | "unavailable">("unavailable")
  const [readinessEvaluation, setReadinessEvaluation] = useState<{
    ok: boolean
    blockers: Array<{ id: string; severity: string; message: string; remediationUrl?: string; scope: string }>
    warnings: Array<{ id: string; severity: string; message: string; remediationUrl?: string; scope: string }>
    findings: Array<{ id: string; severity: string; message: string; remediationUrl?: string; scope: string }>
    evaluatedAt?: string
  } | null>(null)
  const [readinessLoading, setReadinessLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<TourCommandCenterTabId>("overview")
  const [financeSeed, setFinanceSeed] = useState<any[] | undefined>(undefined)
  const [isEditing, setIsEditing] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showDuplicatePreview, setShowDuplicatePreview] = useState(false)
  const [archiveDialogMode, setArchiveDialogMode] = useState<"archive" | "restore" | null>(null)

  const [showShareDialog, setShowShareDialog] = useState(false)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [exportSections, setExportSections] = useState({
    tourInfo: true,
    events: true,
    team: true,
    vendors: true,
    finances: true,
  })
  const [tourFinances, setTourFinances] = useState<any[]>([])
  const [workflowSummary, setWorkflowSummary] = useState<TourWorkflowSummary>({
    threadId: null,
    connected: false,
    tasksTotal: 0,
    tasksDone: 0,
    tasksBlocked: 0,
    messagesTotal: 0,
    overdueTasks: 0,
    lastMessageAt: null,
  })
  const [workflowAuditEvents, setWorkflowAuditEvents] = useState<WorkflowAuditEvent[]>([])
  const [isWorkflowSummaryLoading, setIsWorkflowSummaryLoading] = useState(false)
  const [workflowActivityFilter, setWorkflowActivityFilter] = useState<WorkflowActivityFilter>('all')
  const [showWorkflowActivityDialog, setShowWorkflowActivityDialog] = useState(false)
  const [editForm, setEditForm] = useState<Partial<Tour>>({})
  const initialEventId = (searchParams.get('eventId') || undefined) as string | undefined

  useEffect(() => {
    setActiveTab(
      resolveActiveTourCommandCenterTab({
        requested: searchParams.get("tab"),
        domainAccess,
      }),
    )
  }, [domainAccess, searchParams])

  useEffect(() => {
    const workflowFilter = parseWorkflowActivityFilter(searchParams.get('workflowFilter'))
    if (workflowFilter) setWorkflowActivityFilter(workflowFilter)

    const shouldOpenWorkflowDialog = searchParams.get('workflowDialog') === '1'
    setShowWorkflowActivityDialog(shouldOpenWorkflowDialog)
  }, [searchParams])

  useEffect(() => {
    function normalizeEventsPayload(rawEvents: any[]): Event[] {
      return (rawEvents || []).map((event: any) => {
        const normalized = normalizeAdminEvent(event)
        return {
          id: normalized.id || event.id,
          name: normalized.name || event.title || "Untitled",
          description: normalized.description || "",
          tour_id: event.tour_id || tourId,
          venue_name: normalized.venue_name || "Venue TBD",
          venue_address: event.venue_address || "",
          event_date: normalized.event_date,
          event_time: normalized.event_time || "",
          doors_open: event.doors_open || "",
          duration_minutes: Number(event.duration_minutes || 0),
          status: normalized.status,
          capacity: normalized.capacity || 0,
          tickets_sold: normalized.tickets_sold || 0,
          ticket_price: normalized.ticket_price || 0,
          vip_price: Number(event.vip_price || 0),
          expected_revenue: normalized.expected_revenue || 0,
          actual_revenue: normalized.actual_revenue || 0,
          expenses: normalized.expenses || 0,
          venue_contact_name: event.venue_contact_name || "",
          venue_contact_email: event.venue_contact_email || "",
          venue_contact_phone: event.venue_contact_phone || "",
          sound_requirements: event.sound_requirements || "",
          lighting_requirements: event.lighting_requirements || "",
          stage_requirements: event.stage_requirements || "",
          special_requirements: event.special_requirements || "",
          advance_status:
            event.advance_status
            || event.tour?.advance_status
            || "not_started",
          load_in_time: event.load_in_time || "",
          sound_check_time: event.sound_check_time || "",
          settings: event.settings && typeof event.settings === "object" ? event.settings : {},
        } as Event
      })
    }

    const fetchTourData = async () => {
      if (!isActingReady) return
      try {
        setIsLoading(true)
        setSurfaceState(null)
        setTour(null)
        setEvents([])
        setTourHealth(null)
        setTourStops([])
        setTourStopsState("unavailable")

        // TOUR-203 — prefer single summary BFF over 5-request fanout.
        const summaryResponse = await fetch(`/api/admin/tours/${tourId}/summary`, adminRequest())
        if (summaryResponse.ok) {
          const payload = await summaryResponse.json()
          const tourData = payload.tour || payload.summary?.tour
          setTour(tourData)
          setEditForm(tourData || {})
          setEvents(normalizeEventsPayload(payload.events || payload.summary?.events || []))
          setMembers(payload.teamMembers || payload.summary?.teamMembers || [])
          setVendors(payload.vendors || payload.summary?.vendors || [])
          const financeRows =
            payload.financeTransactions || payload.summary?.financeTransactions || []
          setTourFinances(financeRows)
          setFinanceSeed(financeRows)
          setDomainAccess(payload.summary?.domainAccess || payload.domainAccess || null)
          setTourHealth(payload.summary?.health || null)
          setTourStops(Array.isArray(payload.summary?.stops) ? payload.summary.stops : [])
          setTourStopsState(payload.summary?.stopsState || "unavailable")
          setSurfaceState(
            classifyTourSurfaceState({
              ok: true,
              itemCount: 1,
              correlationId: summaryResponse.headers.get("x-correlation-id"),
              isStale: Boolean(
                payload.summary?.freshness?.isStale
                || summaryResponse.headers.get("x-tour-summary-stale") === "1",
              ),
            }),
          )
          void fetch("/api/admin/tours/observability", {
            ...adminRequest({
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                kind: "client_fanout",
                endpoint: "/admin/dashboard/tours/[id]",
                tourId,
                fanoutCount: 1,
              }),
            }),
          }).catch(() => {})
          return
        }

        if (summaryResponse.status === 404 || summaryResponse.status === 403) {
          setSurfaceState(await classifyTourFetchFailure(summaryResponse))
          return
        }

        // Fallback fanout if summary endpoint unavailable.
        const tourResponse = await fetch(`/api/admin/tours/${tourId}`, adminRequest())
        if (tourResponse.ok) {
          const tourPayload = await tourResponse.json()
          const tourData = tourPayload.tour || tourPayload
          setTour(tourData)
          setEditForm(tourData)
          setSurfaceState(
            classifyTourSurfaceState({
              ok: true,
              itemCount: 1,
              correlationId: tourResponse.headers.get("x-correlation-id"),
              isStale: Boolean(tourPayload.stale || tourPayload.freshness === "stale"),
            }),
          )
        } else {
          setTour(null)
          setEditForm({})
          setSurfaceState(await classifyTourFetchFailure(tourResponse))
        }

        const eventsResponse = await fetch(`/api/admin/tours/${tourId}/events`, adminRequest())
        if (eventsResponse.ok) {
          const eventsData = await eventsResponse.json()
          setEvents(normalizeEventsPayload(eventsData.events || []))
        } else {
          setEvents([])
        }

        const teamResponse = await fetch(`/api/admin/tours/team-members?tour_id=${tourId}`, adminRequest())
        if (teamResponse.ok) {
          const teamData = await teamResponse.json()
          setMembers(teamData.data || [])
        } else {
          setMembers([])
        }

        const vendorsResponse = await fetch(`/api/admin/tours/vendors?tour_id=${tourId}`, adminRequest())
        if (vendorsResponse.ok) {
          const vendorsData = await vendorsResponse.json()
          setVendors(vendorsData.data || vendorsData.vendors || [])
        } else {
          setVendors([])
        }

        try {
          const finRes = await fetch(`/api/admin/finances?type=transactions&tour_id=${tourId}`, adminRequest())
          if (finRes.ok) {
            const finData = await finRes.json()
            setTourFinances(finData.recentTransactions || finData.transactions || [])
          }
        } catch { /* best-effort */ }

        void fetch("/api/admin/tours/observability", {
          ...adminRequest({
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              kind: "client_fanout",
              endpoint: "/admin/dashboard/tours/[id]",
              tourId,
              fanoutCount: 5,
            }),
          }),
        }).catch(() => {})
      } catch (error) {
        console.error('Error fetching tour data:', error)
        setTour(null)
        setEditForm({})
        setEvents([])
        setMembers([])
        setVendors([])
        setSurfaceState(
          classifyTourSurfaceState({
            ok: false,
            status: 500,
            message: error instanceof Error ? error.message : "Failed to fetch tour data",
          }),
        )
      } finally {
        setIsLoading(false)
      }
    }

    if (tourId) {
      fetchTourData()
    }
  }, [actingContextKey, adminRequest, isActingReady, tourId])

  useEffect(() => {
    async function loadWorkflowSummary() {
      if (!tourId) return
      // TOUR-204 — workflow fanout only for overview (or activity dialog), not every tab.
      if (
        !shouldLoadTourWorkflowFanout({
          activeTab,
          workflowDialogOpen: showWorkflowActivityDialog,
        })
      ) {
        return
      }

      setIsWorkflowSummaryLoading(true)

      try {
        const threadResponse = await fetch(
          '/api/workflows/threads',
          adminRequest({
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              scope_type: 'tour',
              scope_id: tourId,
              title: 'Tour workflow',
            }),
          })
        )

        if (!threadResponse.ok) {
          setWorkflowSummary((prev) => ({ ...prev, connected: false }))
          return
        }

        const threadPayload = await threadResponse.json()
        const threadId = threadPayload?.thread?.id || null
        if (!threadId) {
          setWorkflowSummary((prev) => ({ ...prev, connected: false }))
          return
        }

        const [tasksResponse, messagesResponse, eventsResponse] = await Promise.all([
          fetch(`/api/workflows/threads/${encodeURIComponent(threadId)}/tasks`, adminRequest()),
          fetch(`/api/workflows/threads/${encodeURIComponent(threadId)}/messages`, adminRequest()),
          fetch(`/api/workflows/threads/${encodeURIComponent(threadId)}/events?limit=120`, adminRequest()),
        ])

        const tasksPayload = tasksResponse.ok ? await tasksResponse.json() : { tasks: [] }
        const messagesPayload = messagesResponse.ok ? await messagesResponse.json() : { messages: [] }
        const eventsPayload = eventsResponse.ok ? await eventsResponse.json() : { events: [] }
        const tasks = Array.isArray(tasksPayload?.tasks) ? tasksPayload.tasks : []
        const messages = Array.isArray(messagesPayload?.messages) ? messagesPayload.messages : []
        const workflowEvents = Array.isArray(eventsPayload?.events) ? eventsPayload.events : []
        const nowMs = Date.now()
        const overdueTasks = tasks.filter((task: any) => {
          if (task.status === 'done') return false
          if (!task.due_at) return false
          const dueAtMs = new Date(task.due_at).getTime()
          if (Number.isNaN(dueAtMs)) return false
          return dueAtMs < nowMs
        }).length

        setWorkflowSummary({
          threadId,
          connected: true,
          tasksTotal: tasks.length,
          tasksDone: tasks.filter((task: any) => task.status === 'done').length,
          tasksBlocked: tasks.filter((task: any) => task.status === 'blocked').length,
          messagesTotal: messages.length,
          overdueTasks,
          lastMessageAt:
            messages.length > 0
              ? String(messages[messages.length - 1]?.created_at || null)
              : null,
        })
        setWorkflowAuditEvents(
          workflowEvents.map((event: any) => ({
            id: String(event.id),
            action: String(event.action || 'unknown'),
            entity_type: String(event.entity_type || 'entity'),
            entity_id: event.entity_id ? String(event.entity_id) : null,
            created_at: String(event.created_at || ''),
          }))
        )
      } catch {
        setWorkflowSummary((prev) => ({ ...prev, connected: false }))
        setWorkflowAuditEvents([])
      } finally {
        setIsWorkflowSummaryLoading(false)
      }
    }

    void loadWorkflowSummary()
  }, [activeTab, adminRequest, showWorkflowActivityDialog, tourId])

  // PLAN-206 / w1-tour-summary-tab — fetch real readiness evaluation for overview tab
  useEffect(() => {
    if (activeTab !== "overview" || !tourId || !isActingReady) return
    let cancelled = false
    setReadinessLoading(true)
    fetch(`/api/admin/tours/${tourId}/readiness`, adminRequest())
      .then(async (res) => {
        if (cancelled) return
        if (!res.ok) { setReadinessLoading(false); return }
        const payload = await res.json()
        if (!cancelled) setReadinessEvaluation(payload.evaluation ?? null)
      })
      .catch(() => { if (!cancelled) setReadinessEvaluation(null) })
      .finally(() => { if (!cancelled) setReadinessLoading(false) })
    return () => { cancelled = true }
  }, [activeTab, adminRequest, isActingReady, tourId])

  const handleStatusChange = async (newStatus: Tour['status']) => {
    try {
      const isPublish = newStatus === 'active' && tour?.status !== 'active'
      const response = await fetch(
        isPublish ? `/api/admin/tours/${tourId}/publish` : `/api/admin/tours/${tourId}`,
        adminRequest({
          method: isPublish ? 'POST' : 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(isPublish
              ? { 'Idempotency-Key': `tour.publish:${tourId}:${crypto.randomUUID()}` }
              : {}),
          },
          body: JSON.stringify(isPublish ? {} : { status: newStatus }),
        })
      )

      if (response.ok) {
        const payload = await response.json().catch(() => ({}))
        if (payload.tour) setTour(payload.tour)
        else setTour(prev => prev ? { ...prev, status: newStatus } : null)
        toast.success(`Tour status updated to ${newStatus}`)
      } else {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error || 'Failed to update tour status')
      }
    } catch (error) {
      console.error('Error updating tour status:', error)
      toast.error('Failed to update tour status')
    }
  }

  const handlePublishTour = async () => {
    try {
      const response = await fetch(
        `/api/admin/tours/${tourId}/publish`,
        adminRequest({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': `tour.publish:${tourId}:${crypto.randomUUID()}`,
          },
          body: JSON.stringify({}),
        })
      )
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to publish tour')
      }
      setTour((prev) => prev ? { ...prev, status: 'active' } : prev)
      toast.success('Tour published', { description: 'Work Mode fanout sent to linked events.' })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to publish tour')
    }
  }

  const handleSaveTour = async () => {
    try {
      const payload = {
        name: editForm.name,
        description: editForm.description,
        status: editForm.status,
        start_date: editForm.start_date,
        end_date: editForm.end_date,
        budget: editForm.budget,
        expenses: editForm.expenses,
        revenue: editForm.expected_revenue ?? editForm.actual_revenue,
        crew_size: editForm.crew_size,
        transportation: editForm.transportation,
        accommodation: editForm.accommodation,
        equipment_requirements: editForm.equipment_requirements,
        main_artist: (editForm as any).main_artist || (editForm as any).artist,
      }

      const response = await fetch(
        `/api/admin/tours/${tourId}`,
        adminRequest({
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      )

      if (response.ok) {
        const result = await response.json()
        const updatedTour = result.tour || result
        setTour(updatedTour)
        setEditForm(updatedTour)
        setIsEditing(false)
        toast.success('Tour updated successfully')
      } else {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to update tour')
      }
    } catch (error) {
      console.error('Error updating tour:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update tour')
    }
  }



  const handleShare = () => {
    setShowShareDialog(true)
  }

  const handleExport = () => {
    setShowExportDialog(true)
  }

  const downloadTourExport = async (format: 'pdf' | 'csv') => {
    try {
      const sections = Object.entries(exportSections)
        .filter(([, enabled]) => enabled)
        .map(([key]) => key)
        .join(',')
      const response = await fetch(
        `/api/admin/tours/${tourId}/export?format=${format}&sections=${encodeURIComponent(sections)}`,
        adminRequest(),
      )
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error || 'Failed to export tour')
      }

      const disposition = response.headers.get('content-disposition') || ''
      const filename = disposition.match(/filename="?([^";]+)"?/i)?.[1] || `tour-report.${format}`
      const blobUrl = URL.createObjectURL(await response.blob())
      const anchor = document.createElement('a')
      anchor.href = blobUrl
      anchor.download = filename
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(blobUrl)
      setShowExportDialog(false)
      toast.success(`${format.toUpperCase()} export downloaded`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to export tour')
    }
  }

  const handleDuplicateTour = () => {
    setShowDuplicatePreview(true)
  }

  const handleConfirmDuplicatePlan = async (preview: TourDuplicatePreview) => {
    try {
      const idempotencyKey =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `dup-${Date.now()}`
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(
          `tour-duplicate-plan:${tourId}`,
          JSON.stringify({
            planToken: preview.planToken,
            selection: preview.selection,
            proposedName: preview.proposedName,
            idempotencyKey,
            savedAt: new Date().toISOString(),
          }),
        )
      }
      // TOUR-206 — resumable idempotent duplication job.
      const response = await fetch(
        `/api/admin/tours/${tourId}/duplicate`,
        adminRequest({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": idempotencyKey,
          },
          body: JSON.stringify({
            planToken: preview.planToken,
            proposedName: preview.proposedName,
            selection: preview.selection,
            idempotencyKey,
            runToCompletion: true,
          }),
        }),
      )

      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || "Failed to execute duplication job")

      const newTourId = result.targetTourId || result.job?.target_tour_id
      const domainStatus = result.domainStatus || result.job?.domain_status || {}
      const completedDomains = Object.values(domainStatus).filter(
        (row: any) => row?.status === "completed",
      ).length
      const failedDomains = Object.values(domainStatus).filter(
        (row: any) => row?.status === "failed",
      ).length

      if (!newTourId) throw new Error("Duplication job did not produce a target tour")

      toast.success(
        failedDomains > 0
          ? `Tour duplicated with ${failedDomains} domain failure(s); ${completedDomains} completed`
          : `Tour duplicated (${completedDomains} domains completed)`,
      )
      setShowDuplicatePreview(false)
      router.push(`/admin/dashboard/tours/${newTourId}`)
    } catch (error) {
      console.error("Error confirming duplicate plan:", error)
      toast.error(error instanceof Error ? error.message : "Failed to confirm duplicate plan")
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/20 text-green-400'
      case 'planning': return 'bg-yellow-500/20 text-yellow-400'
      case 'completed': return 'bg-blue-500/20 text-blue-400'
      case 'cancelled': return 'bg-red-500/20 text-red-400'
      default: return 'bg-slate-500/20 text-slate-400'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <PlayCircle className="h-4 w-4" />
      case 'planning': return <Clock className="h-4 w-4" />
      case 'completed': return <CheckCircle className="h-4 w-4" />
      case 'cancelled': return <StopCircle className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  const getWorkflowActivityCategory = (event: WorkflowAuditEvent): WorkflowActivityFilter => {
    if (event.action.startsWith('automation.')) return 'automation'
    if (event.entity_type === 'task') return 'task'
    if (event.entity_type === 'participant') return 'participant'
    if (event.entity_type === 'message') return 'message'
    return 'thread'
  }

  const filteredWorkflowAuditEvents = workflowAuditEvents.filter((event) => {
    if (workflowActivityFilter === 'all') return true
    return getWorkflowActivityCategory(event) === workflowActivityFilter
  })

  function setWorkflowFilterAndSyncUrl(filter: WorkflowActivityFilter) {
    setWorkflowActivityFilter(filter)
    const params = new URLSearchParams(searchParams.toString())
    params.set('workflowFilter', filter)
    router.replace(`/admin/dashboard/tours/${tourId}?${params.toString()}`)
  }

  function openFilteredWorkflowActivity(filter: WorkflowActivityFilter) {
    setShowWorkflowActivityDialog(true)
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', 'overview')
    params.set('workflowDialog', '1')
    params.set('workflowFilter', filter)
    setWorkflowActivityFilter(filter)
    router.replace(`/admin/dashboard/tours/${tourId}?${params.toString()}`)
  }

  function onWorkflowActivityDialogOpenChange(open: boolean) {
    setShowWorkflowActivityDialog(open)
    const params = new URLSearchParams(searchParams.toString())
    if (open) params.set('workflowDialog', '1')
    else params.delete('workflowDialog')
    params.set('workflowFilter', workflowActivityFilter)
    router.replace(`/admin/dashboard/tours/${tourId}?${params.toString()}`)
  }

  async function exportFilteredWorkflowActivityCsv() {
    if (typeof window === 'undefined') return
    if (filteredWorkflowAuditEvents.length === 0) {
      toast.error('No workflow activity events to export')
      return
    }

    const header = ['event_id', 'action', 'entity_type', 'entity_id', 'category', 'created_at']
    const rows = filteredWorkflowAuditEvents.map((event) => [
      event.id,
      event.action,
      event.entity_type,
      event.entity_id || '',
      getWorkflowActivityCategory(event),
      event.created_at,
    ])

    const csv = [header, ...rows]
      .map((columns) => columns.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const href = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = href
    anchor.download = `tour-${tourId}-workflow-activity-${workflowActivityFilter}.csv`
    anchor.click()
    URL.revokeObjectURL(href)
    toast.success('Workflow activity export generated')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-purple-950/20 p-6">
        <div className="container mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-slate-700 rounded w-1/3"></div>
            <div className="h-4 bg-slate-700 rounded w-1/2"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-32 bg-slate-700 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!tour) {
    const emptyOrError =
      surfaceState
      || classifyTourSurfaceState({
          ok: false,
          status: 404,
          code: "entity_not_found",
          message: "The tour you are looking for does not exist or is not available in this organization.",
        })
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-purple-950/20 p-6">
        <div className="container mx-auto max-w-xl space-y-4">
          <AdminTourSurfaceState
            state={
              emptyOrError.kind === "system_error" && emptyOrError.title === "Not found"
                ? { ...emptyOrError, kind: "system_error", canRetry: true }
                : emptyOrError
            }
            onRetry={() => window.location.reload()}
          />
          {emptyOrError.kind === "system_error" && !surfaceState ? (
            <div className="text-center">
              <h1 className="mb-4 text-2xl font-bold text-white">Tour Not Found</h1>
              <p className="mb-6 text-slate-400">
                The tour you are looking for does not exist or has been deleted.
              </p>
            </div>
          ) : null}
          <div className="text-center">
            <Button onClick={() => router.push('/admin/dashboard/tours')}>
              Back to Tours
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const staleBanner =
    surfaceState?.kind === "stale_snapshot" ? (
      <div className="mb-4">
        <AdminTourSurfaceState
          state={surfaceState}
          onRetry={() => window.location.reload()}
        />
      </div>
    ) : null

  // Safety check to ensure all required fields exist
  const visibleTourTabs = resolveTourCommandCenterVisibleTabs({
    domainAccess,
    icons: TOUR_TAB_ICONS,
  })

  const safeTour = {
    ...tour,
    total_shows: tour.total_shows || 0,
    completed_shows: tour.completed_shows || 0,
    actual_revenue: tour.actual_revenue || 0,
    expected_revenue: tour.expected_revenue || 0,
    expenses: tour.expenses || 0,
    budget: tour.budget || 0,
    crew_size: tour.crew_size || 0
  }

  const progressPercentage = safeTour.total_shows > 0 ? (safeTour.completed_shows / safeTour.total_shows) * 100 : 0
  const profit = safeTour.actual_revenue - safeTour.expenses
  const budgetRemaining = safeTour.budget - safeTour.expenses
  const startDateParsed = new Date(safeTour.start_date)
  const endDateParsed = new Date(safeTour.end_date)
  const hasValidTourRange = !Number.isNaN(startDateParsed.getTime()) && !Number.isNaN(endDateParsed.getTime())
  const durationDays = hasValidTourRange
    ? Math.max(0, Math.ceil((endDateParsed.getTime() - startDateParsed.getTime()) / (1000 * 60 * 60 * 24)))
    : 0

  return (
    <WorkforcePageShell className="px-0 sm:px-0 lg:px-0">
      <div className="container mx-auto space-y-6 px-4 sm:px-6">
        {staleBanner}
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            variant="ghost"
            onClick={() => router.push('/admin/dashboard/tours')}
            className="text-slate-400 hover:text-white"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Tours
          </Button>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleShare} className="border-slate-600 text-slate-300">
              <Share className="h-4 w-4 mr-2" />
              Share
            </Button>
            <Button variant="outline" onClick={handleExport} className="border-slate-600 text-slate-300">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button
              variant="outline"
              onClick={handleDuplicateTour}
              className="border-slate-600 text-slate-300"
              disabled={tour?.status === "archived"}
            >
              <Copy className="h-4 w-4 mr-2" />
              Duplicate
            </Button>
            <TourDuplicatePreviewDialog
              open={showDuplicatePreview}
              onOpenChange={setShowDuplicatePreview}
              tourId={tourId}
              sourceName={tour?.name || "Tour"}
              onConfirmPlan={(preview) => {
                void handleConfirmDuplicatePlan(preview)
              }}
            />
            {tour?.status === "archived" ? (
              <Button
                variant="outline"
                className="border-emerald-600/50 text-emerald-200"
                onClick={() => setArchiveDialogMode("restore")}
              >
                Restore
              </Button>
            ) : ["completed", "settled", "cancelled"].includes(String(tour?.status)) ? (
              <Button
                variant="outline"
                className="border-amber-600/50 text-amber-200"
                onClick={() => setArchiveDialogMode("archive")}
              >
                Archive
              </Button>
            ) : null}
            <TourArchivePreviewDialog
              open={archiveDialogMode !== null}
              onOpenChange={(open) => {
                if (!open) setArchiveDialogMode(null)
              }}
              tourId={tourId}
              mode={archiveDialogMode || "archive"}
              onCompleted={({ toState }) => {
                setTour((prev) => (prev ? { ...prev, status: toState as Tour["status"] } : prev))
                setArchiveDialogMode(null)
              }}
            />
            <Button
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
              disabled={tour?.status === "archived" || tour?.status !== "draft"}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
            <TourDeletePreviewDialog
              open={showDeleteDialog}
              onOpenChange={setShowDeleteDialog}
              tourId={tourId}
              tourName={tour?.name}
              onDeleted={() => router.push("/admin/dashboard/tours")}
            />
          </div>
        </div>

        {isEditing && (
          <AdminSurfaceCard>
            <CardHeader>
              <CardTitle className="text-white">Edit tour</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-slate-400">Name</Label>
                  <SurfaceInput
                    value={editForm.name ?? ''}
                    onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                    className="surface-entry bg-slate-800 border-slate-600 text-white"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-slate-400">Description</Label>
                  <Textarea
                    value={editForm.description ?? ''}
                    onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                    className="bg-slate-800 border-slate-600 text-white min-h-[88px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-400">Start date</Label>
                  <SurfaceInput
                    type="date"
                    value={(editForm.start_date ?? '').slice(0, 10)}
                    onChange={(e) => setEditForm((f) => ({ ...f, start_date: e.target.value }))}
                    className="surface-entry bg-slate-800 border-slate-600 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-400">End date</Label>
                  <SurfaceInput
                    type="date"
                    value={(editForm.end_date ?? '').slice(0, 10)}
                    onChange={(e) => setEditForm((f) => ({ ...f, end_date: e.target.value }))}
                    className="surface-entry bg-slate-800 border-slate-600 text-white"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-slate-400">Transportation</Label>
                  <SurfaceInput
                    value={editForm.transportation ?? ''}
                    onChange={(e) => setEditForm((f) => ({ ...f, transportation: e.target.value }))}
                    className="surface-entry bg-slate-800 border-slate-600 text-white"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-slate-400">Accommodation</Label>
                  <SurfaceInput
                    value={editForm.accommodation ?? ''}
                    onChange={(e) => setEditForm((f) => ({ ...f, accommodation: e.target.value }))}
                    className="surface-entry bg-slate-800 border-slate-600 text-white"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-slate-400">Equipment requirements</Label>
                  <Textarea
                    value={editForm.equipment_requirements ?? ''}
                    onChange={(e) => setEditForm((f) => ({ ...f, equipment_requirements: e.target.value }))}
                    className="bg-slate-800 border-slate-600 text-white min-h-[72px]"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-slate-400">Special requirements</Label>
                  <Textarea
                    value={editForm.special_requirements ?? ''}
                    onChange={(e) => setEditForm((f) => ({ ...f, special_requirements: e.target.value }))}
                    className="bg-slate-800 border-slate-600 text-white min-h-[72px]"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => void handleSaveTour()}
                >
                  Save changes
                </Button>
                <Button
                  variant="outline"
                  className="border-slate-600 text-slate-300"
                  onClick={() => {
                    if (tour) setEditForm(tour)
                    setIsEditing(false)
                  }}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </AdminSurfaceCard>
        )}

        {justPublished ? (
          <div className="rounded-[1.25rem] border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            Tour published successfully. Linked shows received Work Mode fanout.
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <LifecycleStrip kind="tour" status={safeTour.status} />
        </div>

        <OperationsCommandShell
          eyebrow="Tour operations"
          title={safeTour.name}
          description={`Tour management · ${formatSafeDate(safeTour.start_date)} – ${formatSafeDate(safeTour.end_date)}`}
          badge={safeTour.status.replace('_', ' ')}
          tabs={visibleTourTabs}
          activeTab={activeTab}
          onTabChange={(value) => {
            const next = resolveActiveTourCommandCenterTab({
              requested: value,
              domainAccess,
            })
            setActiveTab(next)
            const url = new URL(window.location.href)
            url.searchParams.set('tab', next)
            window.history.replaceState({}, '', url.toString())
          }}
          tabColsClassName="md:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-9"
          metrics={
            <>
              <WorkforceMetricCard label="Shows" value={`${safeTour.completed_shows}/${safeTour.total_shows}`} icon={Calendar} accent="purple" />
              <WorkforceMetricCard label="Revenue" value={formatSafeCurrency(safeTour.actual_revenue)} description={`of ${formatSafeCurrency(safeTour.expected_revenue)}`} icon={DollarSign} accent="green" />
              <WorkforceMetricCard label="Budget left" value={formatSafeCurrency(budgetRemaining)} icon={Wallet} accent="blue" />
              <WorkforceMetricCard label="Crew" value={safeTour.crew_size || members.length} icon={Users} accent="amber" />
            </>
          }
          actions={
            <>
              <Button variant="outline" className="border-slate-600 text-slate-300" onClick={() => router.push(`/admin/dashboard/tours/builder?draft=${tourId}`)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit in Builder
              </Button>
              <Button variant="outline" className="border-slate-600 text-slate-300" onClick={() => router.push(buildAdminLogisticsHref({ tourId }))}>
                <Truck className="h-4 w-4 mr-2" />
                Logistics
              </Button>
              <Button variant="outline" className="border-slate-600 text-slate-300" onClick={() => router.push(buildAdminRosterHref({ tourId }))}>
                <Users className="h-4 w-4 mr-2" />
                Roster
              </Button>
              <Button variant="outline" className="border-slate-600 text-slate-300" onClick={() => router.push(buildAdminHiringHref({ tourId }))}>
                <Briefcase className="h-4 w-4 mr-2" />
                Hiring
              </Button>
              {/* PLAN-206 / w1-tour-readiness-gate — disable publish when hard blockers confirmed */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button
                        className="bg-gradient-to-r from-purple-600 to-blue-600 text-white disabled:opacity-50"
                        disabled={
                          (readinessEvaluation !== null && readinessEvaluation.blockers.length > 0) ||
                          ["archived", "completed", "cancelled", "settled"].includes(String(tour?.status))
                        }
                        onClick={async () => {
                          try {
                            const res = await fetch(
                              `/api/admin/tours/${tourId}/publish`,
                              adminRequest({
                                method: 'POST',
                                headers: {
                                  'Idempotency-Key': `tour.publish:${tourId}:${crypto.randomUUID()}`,
                                },
                              }),
                            )
                            const data = await res.json().catch(() => ({}))
                            if (!res.ok) {
                              const blockers = Array.isArray(data?.readiness?.blockers)
                                ? data.readiness.blockers
                                    .map((item: { label?: string; detail?: string }) => item.label || item.detail)
                                    .filter(Boolean)
                                : []
                              const detail = blockers.length
                                ? blockers.slice(0, 4).join(' · ')
                                : data.error || 'Publish failed'
                              throw new Error(detail)
                            }
                            toast.success('Tour published')
                            router.push(`/admin/dashboard/tours/${tourId}?published=1`)
                          } catch (error: any) {
                            toast.error(error.message || 'Publish failed')
                          }
                        }}
                      >
                        {readinessEvaluation?.blockers.length
                          ? `Blocked (${readinessEvaluation.blockers.length})`
                          : 'Publish'}
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {readinessEvaluation?.blockers.length ? (
                    <TooltipContent side="bottom" className="max-w-xs bg-slate-800 border-slate-700 text-white">
                      <p className="text-xs font-semibold text-red-300 mb-1">
                        {readinessEvaluation.blockers.length} blocker{readinessEvaluation.blockers.length !== 1 ? 's' : ''} must be resolved before publishing
                      </p>
                      <ul className="text-xs text-slate-300 space-y-0.5">
                        {readinessEvaluation.blockers.slice(0, 5).map((b) => (
                          <li key={b.id}>· {b.message}</li>
                        ))}
                      </ul>
                    </TooltipContent>
                  ) : null}
                </Tooltip>
              </TooltipProvider>
            </>
          }
        >

          {/* Overview Tab */}
          <OperationsTabPanel value="overview" className="space-y-6">
            <TourHealthCard health={tourHealth} />
            <TourStopsCard tourId={tourId} stops={tourStops} state={tourStopsState} />
            {/* PLAN-206 / w1-tour-summary-tab — Real readiness engine card */}
            <AdminSurfaceCard>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-white flex items-center gap-2">
                  {readinessLoading ? (
                    <RefreshCw className="h-4 w-4 animate-spin text-slate-400" />
                  ) : readinessEvaluation?.ok ? (
                    <CheckCircle className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                  )}
                  Tour readiness
                </CardTitle>
                {readinessEvaluation && (
                  <Badge className={readinessEvaluation.ok
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                    : readinessEvaluation.blockers.length > 0
                      ? "bg-red-500/20 text-red-300 border-red-500/30"
                      : "bg-amber-500/20 text-amber-300 border-amber-500/30"
                  }>
                    {readinessEvaluation.ok
                      ? "Ready to publish"
                      : readinessEvaluation.blockers.length > 0
                        ? `${readinessEvaluation.blockers.length} blocker${readinessEvaluation.blockers.length !== 1 ? 's' : ''}`
                        : `${readinessEvaluation.warnings.length} warning${readinessEvaluation.warnings.length !== 1 ? 's' : ''}`
                    }
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {readinessLoading && !readinessEvaluation && (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-9 animate-pulse rounded bg-slate-700/50" />
                    ))}
                  </div>
                )}
                {!readinessLoading && !readinessEvaluation && (
                  <p className="text-sm text-slate-400">Readiness evaluation unavailable.</p>
                )}
                {readinessEvaluation && (
                  <>
                    {readinessEvaluation.ok && (
                      <p className="text-sm text-emerald-300">
                        No blockers or warnings — this tour meets all publish requirements.
                      </p>
                    )}
                    {readinessEvaluation.blockers.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-xs font-semibold uppercase tracking-wide text-red-400">Blockers</p>
                        {readinessEvaluation.blockers.map((finding) => (
                          <div key={finding.id} className="flex items-start gap-2 rounded border border-red-500/20 bg-red-500/10 px-3 py-2">
                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm text-red-200">{finding.message}</p>
                              <p className="text-xs text-slate-500">{finding.scope}</p>
                            </div>
                            {finding.remediationUrl && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 shrink-0 px-2 text-xs text-slate-400 hover:text-white"
                                onClick={() => router.push(finding.remediationUrl!)}
                              >
                                Fix
                                <ChevronRight className="ml-0.5 h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {readinessEvaluation.warnings.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-xs font-semibold uppercase tracking-wide text-amber-400">Warnings</p>
                        {readinessEvaluation.warnings.map((finding) => (
                          <div key={finding.id} className="flex items-start gap-2 rounded border border-amber-500/20 bg-amber-500/10 px-3 py-2">
                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm text-amber-200">{finding.message}</p>
                              <p className="text-xs text-slate-500">{finding.scope}</p>
                            </div>
                            {finding.remediationUrl && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 shrink-0 px-2 text-xs text-slate-400 hover:text-white"
                                onClick={() => router.push(finding.remediationUrl!)}
                              >
                                Fix
                                <ChevronRight className="ml-0.5 h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {readinessEvaluation.evaluatedAt && (
                      <p className="text-xs text-slate-500">
                        Evaluated {formatSafeDate(readinessEvaluation.evaluatedAt)}
                      </p>
                    )}
                  </>
                )}
                {/* Domain access summary row */}
                {domainAccess && (
                  <div className="border-t border-slate-700 pt-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Domain access</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(Object.entries(domainAccess) as [string, boolean][]).map(([domain, enabled]) => (
                        <Badge
                          key={domain}
                          className={enabled
                            ? "bg-slate-700 text-slate-200 text-[11px]"
                            : "bg-slate-800 text-slate-500 text-[11px] opacity-50"
                          }
                        >
                          {domain}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </AdminSurfaceCard>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <AdminSurfaceCard>
                <CardHeader>
                  <CardTitle className="text-white">Workflow status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge className={workflowSummary.connected ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700 text-slate-300'}>
                      {isWorkflowSummaryLoading ? 'Syncing...' : workflowSummary.connected ? 'Connected' : 'Not connected'}
                    </Badge>
                    <Badge variant="secondary" className="bg-slate-700 text-slate-100">
                      Tasks {workflowSummary.tasksDone}/{workflowSummary.tasksTotal}
                    </Badge>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="border-slate-700 text-slate-200"
                      onClick={() => openFilteredWorkflowActivity('task')}
                    >
                      Blocked {workflowSummary.tasksBlocked}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="border-slate-700 text-slate-200"
                      onClick={() => openFilteredWorkflowActivity('task')}
                    >
                      Overdue {workflowSummary.overdueTasks}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="border-slate-700 text-slate-200"
                      onClick={() => openFilteredWorkflowActivity('message')}
                    >
                      Messages {workflowSummary.messagesTotal}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="border-slate-700 text-slate-200"
                      onClick={() => openFilteredWorkflowActivity('automation')}
                    >
                      Automation activity
                    </Button>
                  </div>
                  <p className="text-xs text-slate-400">
                    {workflowSummary.lastMessageAt
                      ? `Latest thread activity: ${formatSafeDate(workflowSummary.lastMessageAt)}`
                      : 'No thread activity yet.'}
                  </p>
                  {workflowSummary.threadId ? (
                    <p className="text-xs text-slate-500">thread: {workflowSummary.threadId}</p>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    {(['all', 'automation', 'task', 'participant', 'message', 'thread'] as WorkflowActivityFilter[]).map((filter) => (
                      <Button
                        key={filter}
                        type="button"
                        size="sm"
                        variant={workflowActivityFilter === filter ? 'default' : 'outline'}
                        className={workflowActivityFilter === filter ? 'bg-indigo-600 hover:bg-indigo-700' : 'border-slate-700 text-slate-300'}
                        onClick={() => setWorkflowFilterAndSyncUrl(filter)}
                      >
                        {filter}
                      </Button>
                    ))}
                  </div>
                  <div className="rounded-md border border-slate-700 bg-slate-900/40 p-2">
                    <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">Recent workflow activity</p>
                    <div className="space-y-2">
                      {filteredWorkflowAuditEvents.slice(0, 6).map((event) => (
                        <div key={event.id} className="rounded border border-slate-800 bg-slate-800/40 px-2 py-1">
                          <p className="text-xs text-slate-200">
                            {event.action.replaceAll('_', ' ')} ({event.entity_type})
                          </p>
                          <p className="text-[11px] text-slate-500">{formatSafeDate(event.created_at)}</p>
                        </div>
                      ))}
                      {filteredWorkflowAuditEvents.length === 0 ? (
                        <p className="text-xs text-slate-500">No workflow activity events yet.</p>
                      ) : null}
                    </div>
                  </div>
                  {filteredWorkflowAuditEvents.length > 0 ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="border-slate-700 text-slate-300"
                      onClick={() => setShowWorkflowActivityDialog(true)}
                    >
                      View full activity
                    </Button>
                  ) : null}
                </CardContent>
              </AdminSurfaceCard>

              <AdminSurfaceCard>
                <CardHeader>
                  <CardTitle className="text-white">Tour Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-slate-400">Description</Label>
                    <p className="text-white mt-1">{safeTour.description || 'No description provided'}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-slate-400">Start Date</Label>
                      <p className="text-white mt-1">{formatSafeDate(safeTour.start_date)}</p>
                    </div>
                    <div>
                      <Label className="text-slate-400">End Date</Label>
                      <p className="text-white mt-1">{formatSafeDate(safeTour.end_date)}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-slate-400">Duration</Label>
                      <p className="text-white mt-1">
                        {durationDays} days
                      </p>
                    </div>
                    <div>
                      <Label className="text-slate-400">Status</Label>
                      <Badge className={`mt-1 ${getStatusColor(safeTour.status)}`}>
                        {getStatusIcon(safeTour.status)}
                        <span className="ml-1 capitalize">{safeTour.status}</span>
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </AdminSurfaceCard>

              <AdminSurfaceCard>
                <CardHeader>
                  <CardTitle className="text-white">Financial Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-slate-400">Expected Revenue</Label>
                      <p className="text-white mt-1">{formatSafeCurrency(safeTour.expected_revenue)}</p>
                    </div>
                    <div>
                      <Label className="text-slate-400">Actual Revenue</Label>
                      <p className="text-green-400 mt-1">{formatSafeCurrency(safeTour.actual_revenue)}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-slate-400">Expenses</Label>
                      <p className="text-red-400 mt-1">{formatSafeCurrency(safeTour.expenses)}</p>
                    </div>
                    <div>
                      <Label className="text-slate-400">Budget</Label>
                      <p className="text-white mt-1">{formatSafeCurrency(safeTour.budget)}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-slate-400">Profit</Label>
                      <p className={`mt-1 ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {formatSafeCurrency(profit)}
                      </p>
                    </div>
                    <div>
                      <Label className="text-slate-400">Budget Remaining</Label>
                      <p className={`mt-1 ${budgetRemaining >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {formatSafeCurrency(budgetRemaining)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </AdminSurfaceCard>
            </div>
          </OperationsTabPanel>

          {/* TOUR-204 — mount editor bundles only for the active tab. */}
          <OperationsTabPanel value="events" className="space-y-6">
            {activeTab === "events" ? (
              <>
                <div className="text-sm text-slate-400">Select an event below to view or edit. If you arrived here from the calendar, the targeted event opens automatically.</div>
                <TourEventsPanel
                  tourId={tourId}
                  events={events}
                  onEventsUpdate={setEvents}
                  initialEventId={initialEventId}
                />
              </>
            ) : null}
          </OperationsTabPanel>

          <OperationsTabPanel value="team" className="space-y-6">
            {activeTab === "team" ? (
              <>
                <TourGrantAdminsPanel tourId={tourId} />
                <TourTeamPanel
                  tourId={tourId}
                  members={members}
                  onMembersUpdate={setMembers}
                />
              </>
            ) : null}
          </OperationsTabPanel>

          <OperationsTabPanel value="vendors" className="space-y-6">
            {activeTab === "vendors" ? (
              <TourVendorPanel
                tourId={tourId}
                vendors={vendors}
                onVendorsUpdate={setVendors}
              />
            ) : null}
          </OperationsTabPanel>

          <OperationsTabPanel value="jobs" className="space-y-6">
            {activeTab === "jobs" ? (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-white">Tour Jobs</h2>
                    <p className="text-slate-400">Post jobs to find crew and team members for this tour</p>
                  </div>
                  <TourJobPostingPanel
                    tourId={tourId}
                    tourName={safeTour.name}
                    tourStartDate={safeTour.start_date}
                    tourEndDate={safeTour.end_date}
                    onJobPosted={(job) => {
                      toast.success(`Job "${job.title}" posted successfully!`)
                    }}
                  />
                </div>
                <TourJobsPanel tourId={tourId} />
              </>
            ) : null}
          </OperationsTabPanel>

          <OperationsTabPanel value="ticketing" className="space-y-6">
            {activeTab === "ticketing" ? (
              <AdminSurfaceCard>
                <CardHeader>
                  <CardTitle className="text-white">Tour Ticket Sales</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-400 text-sm mb-4">Aggregate ticket sales across all events in this tour.</p>
                  {events.length === 0 ? (
                    <p className="text-slate-500 text-sm">No events linked to this tour yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {events.map((ev: any) => (
                        <div key={ev.id} className="flex items-center justify-between gap-3 p-3 bg-slate-800/50 rounded-lg">
                          <div>
                            <p className="text-white text-sm font-medium">{ev.name || ev.title}</p>
                            <p className="text-slate-400 text-xs">{ev.event_date || ev.start_at ? new Date(ev.event_date || ev.start_at).toLocaleDateString() : '—'}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="text-white text-sm">{ev.tickets_sold || 0} sold</p>
                              <p className="text-slate-400 text-xs">{formatSafeCurrency(ev.actual_revenue || 0)}</p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-slate-600 text-slate-300"
                              onClick={() => router.push(`/admin/dashboard/events/${ev.id}?tab=tickets`)}
                            >
                              Open tickets
                            </Button>
                          </div>
                        </div>
                      ))}
                      <div className="border-t border-slate-700 pt-3 flex justify-between">
                        <span className="text-slate-300 text-sm font-medium">Tour Total</span>
                        <span className="text-white text-sm font-bold">{formatSafeCurrency(safeTour.actual_revenue)}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </AdminSurfaceCard>
            ) : null}
          </OperationsTabPanel>

          <OperationsTabPanel value="calendar-sync" className="space-y-6">
            {activeTab === "calendar-sync" ? (
              <TourCalendarPanel
                tourId={tourId}
                tourName={safeTour.name}
                initialCalendarToken={
                  typeof (tour as { calendar_token?: string | null } | null)?.calendar_token === "string"
                    ? (tour as { calendar_token?: string }).calendar_token
                    : undefined
                }
              />
            ) : null}
          </OperationsTabPanel>

          <OperationsTabPanel value="finances" className="space-y-6">
            {activeTab === "finances" ? (
              <TourFinancePanel tourId={tourId} initialTransactions={financeSeed} />
            ) : null}
          </OperationsTabPanel>

          <OperationsTabPanel value="logistics" className="space-y-6">
            {activeTab === "logistics" ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <AdminSurfaceCard>
                    <CardHeader>
                      <CardTitle className="text-white">Transportation</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-slate-300">{safeTour.transportation || 'Not specified'}</p>
                    </CardContent>
                  </AdminSurfaceCard>

                  <AdminSurfaceCard>
                    <CardHeader>
                      <CardTitle className="text-white">Accommodation</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-slate-300">{safeTour.accommodation || 'Not specified'}</p>
                    </CardContent>
                  </AdminSurfaceCard>

                  <AdminSurfaceCard>
                    <CardHeader>
                      <CardTitle className="text-white">Equipment Requirements</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-slate-300">{safeTour.equipment_requirements || 'Not specified'}</p>
                    </CardContent>
                  </AdminSurfaceCard>

                  <AdminSurfaceCard>
                    <CardHeader>
                      <CardTitle className="text-white">Special Requirements</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-slate-300">{safeTour.special_requirements || 'No special requirements'}</p>
                    </CardContent>
                  </AdminSurfaceCard>
                </div>

                <TourLogisticsPanel
                  tourId={tourId}
                  enableEditing={true}
                  autoSave={true}
                  showFilters={true}
                />
              </>
            ) : null}
          </OperationsTabPanel>
        </OperationsCommandShell>

        {/* Dialogs */}
        <Dialog open={showWorkflowActivityDialog} onOpenChange={onWorkflowActivityDialogOpenChange}>
          <DialogContent className="max-w-2xl bg-slate-800 border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-white">Workflow activity timeline</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {(['all', 'automation', 'task', 'participant', 'message', 'thread'] as WorkflowActivityFilter[]).map((filter) => (
                  <Button
                    key={filter}
                    type="button"
                    size="sm"
                    variant={workflowActivityFilter === filter ? 'default' : 'outline'}
                    className={workflowActivityFilter === filter ? 'bg-indigo-600 hover:bg-indigo-700' : 'border-slate-700 text-slate-300'}
                    onClick={() => setWorkflowFilterAndSyncUrl(filter)}
                  >
                    {filter}
                  </Button>
                ))}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="border-slate-700 text-slate-300"
                  onClick={() => void exportFilteredWorkflowActivityCsv()}
                >
                  Export CSV
                </Button>
              </div>
              <div className="max-h-[420px] space-y-2 overflow-y-auto rounded-md border border-slate-700 bg-slate-900/50 p-2">
                {filteredWorkflowAuditEvents.map((event) => (
                  <div key={event.id} className="rounded border border-slate-800 bg-slate-800/40 px-3 py-2">
                    <p className="text-sm text-slate-200">
                      {event.action.replaceAll('_', ' ')} ({event.entity_type})
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatSafeDate(event.created_at)}
                      {event.entity_id ? ` · ${event.entity_id}` : ''}
                    </p>
                  </div>
                ))}
                {filteredWorkflowAuditEvents.length === 0 ? (
                  <p className="text-sm text-slate-500">No activity events for this filter.</p>
                ) : null}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <PublicationShareLinkDialog
          open={showShareDialog}
          onOpenChange={setShowShareDialog}
          tourId={tourId}
          title="Share tour publication"
        />

        <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
          <DialogContent className="bg-slate-800 border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-white">Export Tour Data</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-slate-300">Choose what data to export:</p>
              <div className="space-y-2">
                {([
                  ["tourInfo", "Tour Information"],
                  ["events", "Events"],
                  ["team", "Team Members"],
                  ["vendors", "Vendors"],
                  ["finances", "Financial Data"],
                ] as const).map(([key, label]) => (
                  <div key={key} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`export-${key}`}
                      checked={exportSections[key]}
                      onChange={(event) =>
                        setExportSections((current) => ({ ...current, [key]: event.target.checked }))
                      }
                    />
                    <Label htmlFor={`export-${key}`} className="text-slate-300">{label}</Label>
                  </div>
                ))}
              </div>
              <div className="flex space-x-2">
                  <Button
                    className="flex-1 bg-purple-600 hover:bg-purple-700"
                    onClick={() => void downloadTourExport('pdf')}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export as PDF
                  </Button>
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={() => void downloadTourExport('csv')}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export as CSV
                  </Button>
                </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </WorkforcePageShell>
  )
} 
