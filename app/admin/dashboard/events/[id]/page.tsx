"use client"

import { useState, useEffect, useCallback, type ComponentType, type ReactNode } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { useActingContext } from "@/hooks/use-acting-context"
import { 
  Calendar, 
  Clock, 
  Download, 
  MapPin, 
  Users, 
  DollarSign, 
  ChevronLeft, 
  Share2, 
  Plus, 
  Search,
  Settings,
  BarChart3,
  Ticket,
  Users2,
  Truck,
  FileText,
  Briefcase,
  Bell,
  Edit,
  Trash2,
  Eye,
  Copy,
  ExternalLink,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Play,
  Pause,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Target,
  Zap,
  Star,
  Shield,
  Wifi,
  Music,
  Video,
  Camera,
  Mic,
  MessageSquare,
  Lightbulb,
  Speaker,
  Monitor,
  Smartphone,
  Tablet,
  Laptop,
  Printer,
  Archive,
  BookOpen,
  Clipboard,
  CalendarDays,
  Command,
  Route,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { EventTaskManager } from "@/components/admin/event-task-manager"
import { EventLocationsTab } from "@/components/admin/event-locations-tab"
import { EventParticipantsTab } from "@/components/admin/event-participants-tab"
import { EntityAccessAudit } from "@/components/admin/entity-access-audit"
import { PublicationShareLinkDialog } from "@/components/admin/publication/publication-share-link-dialog"
import { EventVendorRequests } from "@/components/admin/event-vendor-requests"
import { EventSetupCompletenessPanel } from "@/components/admin/event-setup-completeness-panel"
import { EventSiteMapTab } from "./components/event-site-map-tab"
import { EventCommunicationHub } from "@/components/admin/event-communication-hub"
import { LogisticsDynamicManager } from "@/components/admin/logistics-dynamic-manager"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { differenceInDays } from "date-fns"
import {
  formatSafeDate,
  formatSafeDateTime,
  mapAdminEventStatus,
  normalizeAdminEvent,
} from "@/lib/events/admin-event-normalization"
import { formatSafeCurrency, formatSafeNumber } from "@/lib/format/number-format"
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { TravelCoordinationHub } from "@/components/admin/travel-coordination-hub"
import {
  OperationsCommandShell,
  OperationsTabPanel,
} from "@/components/admin/operations/operations-command-shell"
import {
  buildAdminHiringHref,
  buildAdminLogisticsHref,
  buildAdminRosterHref,
  buildAdminSiteMapHref,
  buildAdminStaffHref,
  resolveEmployerFromEventRow,
} from "@/lib/admin/admin-ops-context"
import { EVENT_OPS_TABS, normalizeEventOpsTab, type EventOpsTab } from "@/lib/admin/event-ops-tabs"
import {
  EventStaffPanel,
  EventVendorPanel,
  EventJobsPanel,
  EventJobPostingPanel,
  EventTicketPanel,
  EventFinancePanel,
} from "@/components/admin/events/panels"
import {
  WorkforceEmptyState,
  WorkforceMetricCard,
  WorkforcePageShell,
  WorkforcePanel,
} from "@/components/hiring/workforce-ui"
import { LifecycleStrip } from "@/components/admin/operations/lifecycle-strip"
import { EventPartiesPanel } from "@/components/admin/event-parties-panel"
import { StaffSchedulingTab } from "@/components/admin/staff-scheduling-tab"
import { EventPromoterProgramPanel } from "@/components/admin/event-promoter-program-panel"
import { EventPromoterMembershipPanel } from "@/components/admin/event-promoter-membership-panel"
import { EventPromoterAnalyticsPanel } from "@/components/admin/event-promoter-analytics-panel"
import type { HiringEntity } from "@/types/hiring-entity"

interface Event {
  id: string
  name: string
  description?: string
  tour_id?: string
  org_id?: string | null
  venue_id?: string | null
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
  load_in_time?: string
  sound_check_time?: string
  settings?: Record<string, unknown> | null
  event_version?: number
  tour?: {
    id: string
    name: string
    artist_id: string
    status: string
  }
}

interface Task {
  id: string
  name: string
  description?: string
  status: 'not_started' | 'in_progress' | 'completed' | 'cancelled'
  priority: 'low' | 'medium' | 'high'
  due_date?: string
  assigned_to?: string
  category: 'logistics' | 'marketing' | 'technical' | 'financial' | 'staffing' | 'vendor'
}

interface Staff {
  id: string
  name: string
  role: string
  email: string
  phone?: string
  avatar?: string
  status: 'confirmed' | 'pending' | 'declined'
  arrival_time?: string
  departure_time?: string
}

interface Vendor {
  id: string
  name: string
  type: string
  contact_name: string
  contact_email: string
  contact_phone?: string
  status: 'confirmed' | 'pending' | 'declined'
  arrival_time?: string
  departure_time?: string
  requirements?: string
}

function normalizeEventDetails(input: any, eventId: string): Event {
  const normalized = normalizeAdminEvent(input || {})
  return {
    id: normalized.id || input?.id || eventId,
    name: normalized.name || input?.name || input?.title || "Event",
    description: normalized.description || input?.description || "",
    tour_id: input?.tour_id || undefined,
    org_id: input?.org_id || null,
    venue_id: input?.venue_id || null,
    venue_name: normalized.venue_name || input?.venue_name || "Venue TBD",
    venue_address: input?.venue_address || "",
    event_date: normalized.event_date || input?.event_date || "",
    event_time: normalized.event_time || input?.event_time || "",
    doors_open: input?.doors_open || "",
    duration_minutes: Number(input?.duration_minutes || 0),
    status: mapAdminEventStatus(input?.status) as Event["status"],
    capacity: Number(normalized.capacity || input?.capacity || 0),
    tickets_sold: Number(normalized.tickets_sold || input?.tickets_sold || 0),
    ticket_price: Number(normalized.ticket_price || input?.ticket_price || 0),
    vip_price: Number(input?.vip_price || 0),
    expected_revenue: Number(normalized.expected_revenue || input?.expected_revenue || 0),
    actual_revenue: Number(normalized.actual_revenue || input?.actual_revenue || 0),
    expenses: Number(normalized.expenses || input?.expenses || 0),
    event_version: Number(input?.event_version || 1),
    venue_contact_name: input?.venue_contact_name || "",
    venue_contact_email: input?.venue_contact_email || "",
    venue_contact_phone: input?.venue_contact_phone || "",
    sound_requirements: input?.sound_requirements || "",
    lighting_requirements: input?.lighting_requirements || "",
    stage_requirements: input?.stage_requirements || "",
    special_requirements: input?.special_requirements || "",
    load_in_time: input?.load_in_time || "",
    sound_check_time: input?.sound_check_time || "",
    settings: input?.settings && typeof input.settings === "object" ? input.settings : {},
    tour: input?.tour,
  }
}

// Module-level helper — used only by sub-components (EventIncidentsTab) that don't
// need admin-capability headers. EventManagementPage uses its own adminRequest callback.
function buildNoStoreInit(input?: RequestInit): RequestInit {
  return {
    credentials: 'include',
    cache: 'no-store',
    ...input,
    headers: {
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
      ...(input?.headers || {}),
    },
  }
}

function EventIncidentsTab({ eventId }: { eventId: string }) {
  const [incidents, setIncidents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newIncident, setNewIncident] = useState({ title: '', notes: '', severity: 'info' })

  const fetchIncidents = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/events/${eventId}/incidents`, buildNoStoreInit())
      if (res.ok) {
        const data = await res.json()
        setIncidents(data.incidents || [])
      }
    } catch { /* */ } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => {
    void fetchIncidents()
  }, [fetchIncidents])

  async function handleCreate() {
    if (!newIncident.title.trim()) {
      toast.error('Title is required')
      return
    }
    setCreating(true)
    try {
      const res = await fetch(
        `/api/events/${eventId}/incidents`,
        buildNoStoreInit({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newIncident),
        })
      )
      if (!res.ok) throw new Error()
      toast.success('Incident logged')
      setShowCreate(false)
      setNewIncident({ title: '', notes: '', severity: 'info' })
      await fetchIncidents()
    } catch {
      toast.error('Failed to log incident')
    } finally {
      setCreating(false)
    }
  }

  const severityColor = (s: string) => {
    switch (s) {
      case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'major': return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
      case 'minor': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      default: return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Incident Reports</h3>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <Button onClick={() => setShowCreate(true)} className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
            <Plus className="mr-2 h-4 w-4" /> Log Incident
          </Button>
          <DialogContent className="bg-slate-800 border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-white">Log Incident</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-slate-300">Severity</Label>
                <Select value={newIncident.severity} onValueChange={(v) => setNewIncident(p => ({ ...p, severity: v }))}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600">
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="minor">Minor</SelectItem>
                    <SelectItem value="major">Major</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-slate-300">Title</Label>
                <Input
                  value={newIncident.title}
                  onChange={(e) => setNewIncident(p => ({ ...p, title: e.target.value }))}
                  placeholder="Brief description of the incident"
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div>
                <Label className="text-slate-300">Notes</Label>
                <Textarea
                  value={newIncident.notes}
                  onChange={(e) => setNewIncident(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Details, actions taken, etc."
                  rows={3}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreate(false)} className="border-slate-600 text-slate-300">Cancel</Button>
                <Button onClick={handleCreate} disabled={creating} className="bg-purple-600 hover:bg-purple-700">
                  {creating ? 'Logging...' : 'Log Incident'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-8 text-slate-400">Loading incidents...</div>
      ) : incidents.length === 0 ? (
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <Shield className="h-10 w-10 text-slate-500" />
            <p className="text-lg font-medium text-white">No incidents reported</p>
            <p className="text-sm text-slate-400">Log incidents during the event for records and analysis</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {incidents.map((inc: any) => (
            <Card key={inc.id} className="bg-slate-900/50 border-slate-700/50">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className={`h-5 w-5 flex-shrink-0 ${inc.severity === 'critical' ? 'text-red-400' : inc.severity === 'major' ? 'text-orange-400' : inc.severity === 'minor' ? 'text-yellow-400' : 'text-blue-400'}`} />
                  <div>
                    <p className="text-sm font-medium text-white">{inc.title}</p>
                    {inc.notes && <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{inc.notes}</p>}
                    <p className="text-xs text-slate-500 mt-1">{formatSafeDateTime(inc.created_at)}</p>
                  </div>
                </div>
                <Badge className={severityColor(inc.severity)}>{inc.severity}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function OpsPanel({
  title,
  description,
  icon: Icon,
  action,
  children,
  className = "",
}: {
  title: string
  description?: string
  icon?: ComponentType<{ className?: string }>
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <WorkforcePanel className={`p-5 ${className}`}>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          {Icon ? (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-200">
              <Icon className="h-5 w-5" />
            </span>
          ) : null}
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            {description ? <p className="mt-1 text-sm leading-6 text-slate-400">{description}</p> : null}
          </div>
        </div>
        {action ? <div className="flex shrink-0 flex-wrap gap-2">{action}</div> : null}
      </div>
      {children}
    </WorkforcePanel>
  )
}

function OpsField({ label, value }: { label: string; value?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-950/45 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <div className="mt-2 text-sm font-medium text-slate-100">{value || "TBD"}</div>
    </div>
  )
}

function QuickActionButton({
  icon: Icon,
  children,
  onClick,
}: {
  icon: ComponentType<{ className?: string }>
  children: ReactNode
  onClick: () => void
}) {
  return (
    <Button
      type="button"
      variant="outline"
      className="h-auto w-full justify-start border-slate-700/70 bg-slate-950/35 px-3 py-3 text-left text-slate-200 hover:bg-slate-900/80"
      onClick={onClick}
    >
      <Icon className="mr-2 h-4 w-4 shrink-0 text-cyan-300" />
      <span className="truncate">{children}</span>
    </Button>
  )
}

export default function EventManagementPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const eventId = params.id as string
  const { actingHeaders, isActingReady } = useActingContext()

  // adminRequest wraps every fetch with the acting-org headers so withAdminCapability
  // can resolve the org without relying on the server-side session alone.
  const adminRequest = useCallback((input?: RequestInit): RequestInit => ({
    credentials: 'include',
    cache: 'no-store',
    ...input,
    headers: {
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
      ...actingHeaders,
      ...(input?.headers || {}),
    },
  }), [actingHeaders])
  
  // State management
  const [event, setEvent] = useState<Event | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<EventOpsTab>("overview")

  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  
  // Quick actions state
  const [showAddTaskDialog, setShowAddTaskDialog] = useState(false)
  const [showTicketsDialog, setShowTicketsDialog] = useState(false)
  const [showShareDialog, setShowShareDialog] = useState(false)
  const [showExportDialog, setShowExportDialog] = useState(false)
  
  // Edit event state
  const [editForm, setEditForm] = useState<Partial<Event>>({})
  const [versionConflict, setVersionConflict] = useState<{
    message: string
    currentVersion: number | null
    event: Record<string, unknown> | null
    changedFields: string[]
  } | null>(null)
  
  // Event data state
  const [tasks, setTasks] = useState<Task[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [advancingSummary, setAdvancingSummary] = useState<any>(null)
  const [daySheetSummary, setDaySheetSummary] = useState<any>(null)
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [ticketSales, setTicketSales] = useState<any[]>([])
  const [expenses, setExpenses] = useState<any[]>([])
  const [notifications, setNotifications] = useState<any[]>([])

  // Analytics state
  const [analyticsData, setAnalyticsData] = useState<any>(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [analyticsRange, setAnalyticsRange] = useState('30d')

  useEffect(() => {
    const tab = searchParams.get("tab")
    if (tab) setActiveTab(normalizeEventOpsTab(tab))
  }, [searchParams])

  const handleEventTabChange = useCallback((value: string) => {
    const next = normalizeEventOpsTab(value)
    setActiveTab(next)
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", next)
    router.replace(`/admin/dashboard/events/${eventId}?${params.toString()}`, { scroll: false })
  }, [eventId, router, searchParams])

  // Fetch event data — gated on isActingReady so headers are populated before the first call
  useEffect(() => {
    if (!isActingReady) return
    const fetchEventData = async () => {
      try {
        setIsLoading(true)
        
        // Fetch event details
        const response = await fetch(`/api/admin/events/${eventId}`, adminRequest())
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}))
          throw new Error(errData?.error || `Failed to fetch event data (${response.status})`)
        }
        
        const data = await response.json()
        const normalizedEvent = normalizeEventDetails(data.event, eventId)
        setEvent(normalizedEvent)
        setEditForm(normalizedEvent)

        const [tasksRes, staffRes, vendorsRes, financesRes, advancingRes, daySheetRes] = await Promise.allSettled([
          fetch(`/api/events/${eventId}/tasks`, adminRequest()).then(r => r.json()),
          fetch(`/api/events/${eventId}/staff`, adminRequest()).then(r => r.json()),
          fetch(`/api/events/${eventId}/vendors`, adminRequest()).then(r => r.json()),
          fetch(`/api/events/${eventId}/finances`, adminRequest()).then(r => r.json()),
          fetch(`/api/admin/events/${eventId}/advancing`, adminRequest()).then(r => r.json()),
          fetch(`/api/admin/events/${eventId}/day-sheet`, adminRequest()).then(r => r.json()),
        ])

        if (advancingRes.status === 'fulfilled' && advancingRes.value?.advancing) {
          setAdvancingSummary(advancingRes.value.advancing)
        }
        if (daySheetRes.status === 'fulfilled' && (daySheetRes.value?.day_sheet || daySheetRes.value?.daySheet)) {
          setDaySheetSummary(daySheetRes.value.day_sheet || daySheetRes.value.daySheet)
        }

        if (tasksRes.status === 'fulfilled' && tasksRes.value?.tasks) {
          setTasks(tasksRes.value.tasks.map((t: any) => ({
            id: t.id,
            name: t.title || t.name,
            description: t.description,
            status: t.status === 'todo' ? 'not_started' : t.status === 'doing' ? 'in_progress' : t.status === 'done' ? 'completed' : t.status === 'blocked' ? 'cancelled' : 'not_started',
            priority: t.priority === 'critical' ? 'high' : t.priority || 'medium',
            due_date: t.due_at,
            assigned_to: t.assignee_id,
            category: (t.labels && t.labels[0]) || 'logistics',
          })))
        }

        if (staffRes.status === 'fulfilled' && staffRes.value?.shifts) {
          setStaff(staffRes.value.shifts.map((s: any) => ({
            id: s.id,
            name: s.staff_name || s.role || 'Staff',
            role: s.role || 'crew',
            email: s.staff_email || '',
            phone: s.phone || undefined,
            avatar: undefined,
            status: s.status === 'assigned' ? 'confirmed' : s.status === 'declined' ? 'declined' : 'pending',
            arrival_time: s.start_time,
            departure_time: s.end_time,
          })))
        }

        if (vendorsRes.status === 'fulfilled' && vendorsRes.value?.vendors) {
          setVendors(vendorsRes.value.vendors.map((v: any) => ({
            id: v.id,
            name: v.vendor_name || v.name,
            type: v.service_type || v.type || 'general',
            contact_name: v.contact_email || v.contact_name || '',
            contact_email: v.contact_email || '',
            contact_phone: v.contact_phone || undefined,
            status: v.status === 'confirmed' ? 'confirmed' : v.status === 'declined' ? 'declined' : 'pending',
            requirements: v.requirements || v.notes,
          })))
        }

        if (financesRes.status === 'fulfilled' && financesRes.value?.summary) {
          setExpenses(financesRes.value.summary.recent_transactions || [])
          setTicketSales([])
        }

        // Fetch event-scoped notifications
        fetch(`/api/admin/notifications?event_id=${eventId}&limit=10`, adminRequest())
          .then(async (res) => {
            if (res.ok) {
              const d = await res.json()
              setNotifications(d.notifications || [])
            }
          })
          .catch(() => {})
        
      } catch (error) {
        console.error('Error fetching event data:', error)
        toast.error("Failed to load event data")
      } finally {
        setIsLoading(false)
      }
    }

    if (eventId) {
      fetchEventData()
    }
  }, [eventId, isActingReady, adminRequest])

  // Fetch analytics when tab becomes active or range changes
  useEffect(() => {
    if (activeTab !== 'analytics' || !eventId || !isActingReady) return
    setAnalyticsLoading(true)
    fetch(`/api/admin/events/${eventId}/analytics?range=${analyticsRange}`, adminRequest())
      .then(async (res) => {
        if (res.ok) setAnalyticsData(await res.json())
      })
      .catch(() => {})
      .finally(() => setAnalyticsLoading(false))
  }, [activeTab, analyticsRange, eventId, isActingReady, adminRequest])

  // Quick action handlers — navigate to the relevant tab where the full UI lives
  const handleAddTask = () => {
    handleEventTabChange("tasks")
    // EventTaskManager on the tasks tab has its own add-task button
  }

  const handleManageStaff = () => {
    handleEventTabChange("people")
    // Staff tab has full team management UI
  }

  const handleAddVendor = () => {
    handleEventTabChange("vendors")
  }

  const handleViewTickets = () => {
    handleEventTabChange("tickets")
    setShowTicketsDialog(true)
  }

  const handleShare = () => {
    setShowShareDialog(true)
  }

  const handleExport = () => {
    setShowExportDialog(true)
  }

  const handleDuplicateEvent = async () => {
    if (!event) return
    
    try {
      const date = event.event_date || new Date().toISOString().slice(0, 10)
      const time = (event.event_time || '00:00').slice(0, 5)
      const startAt = new Date(`${date}T${time}:00`).toISOString()
      const endAt = new Date(new Date(startAt).getTime() + 2 * 60 * 60 * 1000).toISOString()

      const response = await fetch(
        '/api/admin/events',
        adminRequest({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: `${event.name} (Copy)`,
            name: `${event.name} (Copy)`,
            description: event.description || '',
            start_at: startAt,
            end_at: endAt,
            venue_name: event.venue_name,
            capacity: event.capacity ?? null,
            status: 'draft',
            creation_source: 'admin_event_duplicate',
          }),
        })
      )
      
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData?.error || `Failed to duplicate event (${response.status})`)
      }
      
      const newEvent = await response.json()
      const duplicatedId = newEvent.event?.id || newEvent.id
      toast.success("Event duplicated successfully")
      router.push(`/admin/dashboard/events/${duplicatedId}`)
    } catch (error) {
      toast.error("Failed to duplicate event")
    }
  }

  const captureVersionConflict = (body: any, fallback: string) => {
    setVersionConflict({
      message: body?.error || fallback,
      currentVersion: typeof body?.currentVersion === "number" ? body.currentVersion : null,
      event: body?.event && typeof body.event === "object" ? body.event : null,
      changedFields: Array.isArray(body?.diff?.changedFields)
        ? body.diff.changedFields.map((field: { field?: string } | string) =>
            typeof field === "string" ? field : field.field || "field",
          )
        : [],
    })
  }

  const handleSaveEvent = async () => {
    if (!event) return
    
    try {
      const response = await fetch(
        `/api/admin/events/${eventId}`,
        adminRequest({
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...editForm, event_version: event.event_version }),
        })
      )
      const updatedEvent = await response.json().catch(() => ({}))
      if (response.status === 409 && updatedEvent.code === "version_conflict") {
        captureVersionConflict(updatedEvent, "This event changed while you were editing.")
        return
      }
      if (!response.ok) throw new Error(updatedEvent.error || 'Failed to update event')
      const normalized = normalizeEventDetails(updatedEvent.event, eventId)
      setEvent(normalized)
      setEditForm(normalized)
      toast.success("Event updated successfully")
    } catch (error) {
      toast.error("Failed to update event")
    }
  }

  const handleStatusChange = async (newStatus: Event['status']) => {
    if (!event) return
    
    try {
      const response = await fetch(
        `/api/admin/events/${eventId}`,
        adminRequest({
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus, event_version: event.event_version }),
        })
      )
      const updatedEvent = await response.json().catch(() => ({}))
      if (response.status === 409 && updatedEvent.code === "version_conflict") {
        captureVersionConflict(updatedEvent, "This event changed before the status update completed.")
        return
      }
      if (!response.ok) throw new Error(updatedEvent.error || 'Failed to update status')
      const normalized = normalizeEventDetails(updatedEvent.event, eventId)
      setEvent(normalized)
      setEditForm(normalized)
      toast.success(`Event status changed to ${newStatus}`)
    } catch (error) {
      toast.error("Failed to update event status")
    }
  }

  const handleDeleteEvent = async () => {
    try {
      const response = await fetch(`/api/admin/events/${eventId}`, adminRequest({ method: 'DELETE' }))
      
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData?.error || `Failed to delete event (${response.status})`)
      }
      
      toast.success("Event deleted successfully")
      router.push('/admin/dashboard/events')
    } catch (error) {
      toast.error("Failed to delete event")
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-slate-500/20 text-slate-300'
      case 'scheduled': return 'bg-blue-500/20 text-blue-400'
      case 'confirmed': return 'bg-green-500/20 text-green-400'
      case 'in_progress': return 'bg-yellow-500/20 text-yellow-400'
      case 'completed': return 'bg-purple-500/20 text-purple-400'
      case 'cancelled': return 'bg-red-500/20 text-red-400'
      case 'postponed': return 'bg-orange-500/20 text-orange-400'
      default: return 'bg-slate-500/20 text-slate-400'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500/20 text-red-400'
      case 'medium': return 'bg-yellow-500/20 text-yellow-400'
      case 'low': return 'bg-green-500/20 text-green-400'
      default: return 'bg-slate-500/20 text-slate-400'
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-purple-950/20 p-6">
        <div className="container mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-slate-800 rounded w-1/3"></div>
            <div className="h-64 bg-slate-800 rounded"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="h-32 bg-slate-800 rounded"></div>
              <div className="h-32 bg-slate-800 rounded"></div>
              <div className="h-32 bg-slate-800 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-purple-950/20 p-6">
        <div className="container mx-auto text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Event Not Found</h1>
          <p className="text-slate-400 mb-6">The event you&apos;re looking for doesn&apos;t exist or has been deleted.</p>
          <Button onClick={() => router.push('/admin/dashboard/events')}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Events
          </Button>
        </div>
      </div>
    )
  }

  const parsedEventDate = event.event_date ? new Date(event.event_date) : null
  const hasValidEventDate = parsedEventDate && !Number.isNaN(parsedEventDate.getTime())
  const daysUntilEvent = hasValidEventDate ? differenceInDays(parsedEventDate, new Date()) : 0
  const ticketSalesPercentage = event.capacity > 0 ? (event.tickets_sold / event.capacity) * 100 : 0
  const employerParams = resolveEmployerFromEventRow({
    org_id: event.org_id,
    venue_id: event.venue_id,
    settings: event.settings,
  })
  const venueAccountId =
    typeof event.settings?.venue_account_id === "string" ? event.settings.venue_account_id : null
  const artistAccountIds = Array.isArray(event.settings?.artist_account_ids)
    ? (event.settings.artist_account_ids as unknown[]).filter((id): id is string => typeof id === "string")
    : []
  const eventScopeParams = {
    eventId,
    tourId: event.tour_id,
    ...employerParams,
    displayName:
      employerParams.entityType === "venue"
        ? event.venue_name
        : event.name,
  }
  const eventHiringEntity: HiringEntity | null =
    eventScopeParams.entityType && eventScopeParams.entityId
      ? {
          entityType: eventScopeParams.entityType,
          entityId: eventScopeParams.entityId,
          displayName: eventScopeParams.displayName || "Event workforce",
          scope: {
            eventId,
            tourId: event.tour_id,
            venueId: eventScopeParams.venueId || event.venue_id || undefined,
          },
        }
      : null
  const rosterHref = buildAdminRosterHref(eventScopeParams)
  const hiringHref = buildAdminHiringHref(eventScopeParams)
  const jobsHref = buildAdminHiringHref({ ...eventScopeParams, tab: "jobs" })
  const staffSchedulingHref = buildAdminStaffHref({ ...eventScopeParams, tab: "scheduling" })
  const logisticsHref = buildAdminLogisticsHref(eventScopeParams)
  const siteMapHref = buildAdminSiteMapHref(eventScopeParams)
  const revenuePercentage = event.expected_revenue > 0 ? (event.actual_revenue / event.expected_revenue) * 100 : 0

  const justPublished = searchParams.get("published") === "1"

  return (
    <WorkforcePageShell className="px-0 sm:px-0 lg:px-0">
      <div className="container mx-auto space-y-6 px-4 sm:px-6">
        {justPublished ? (
          <div className="rounded-[1.25rem] border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            Your event is live. Continue advancing, staffing, logistics, or open Event HQ for day-of ops.
          </div>
        ) : null}

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={() => router.push('/admin/dashboard/events')}
            className="text-slate-400 hover:text-white"
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Events
          </Button>
          <LifecycleStrip kind="event" status={event.status} />
        </div>

        <OperationsCommandShell
          eyebrow="Event operations"
          title={event.name}
          description={`${formatSafeDate(event.event_date)}${event.event_time ? ` at ${event.event_time}` : ""} · ${event.venue_name}`}
          badge={event.status.replace('_', ' ')}
          tabs={EVENT_OPS_TABS}
          activeTab={activeTab}
          onTabChange={handleEventTabChange}
          tabColsClassName="md:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-7"
          metrics={
            <>
              <WorkforceMetricCard label="Days until" value={daysUntilEvent} icon={Calendar} accent="purple" />
              <WorkforceMetricCard label="Tickets sold" value={formatSafeNumber(event.tickets_sold)} description={`of ${formatSafeNumber(event.capacity)}`} icon={Ticket} accent="green" />
              <WorkforceMetricCard label="Revenue" value={formatSafeCurrency(event.actual_revenue)} description={`of ${formatSafeCurrency(event.expected_revenue)}`} icon={DollarSign} accent="blue" />
              <WorkforceMetricCard label="Staff" value={staff.length} description="Confirmed" icon={Users} accent="amber" />
            </>
          }
          actions={
            <>
              <Button className="bg-gradient-to-r from-purple-600 to-blue-600 text-white" onClick={() => router.push(`/admin/dashboard/events/${eventId}/hq`)}>
                <Zap className="mr-2 h-4 w-4" />
                Event HQ
              </Button>
              <Button variant="outline" className="border-cyan-700/50 text-cyan-300 hover:bg-cyan-950/30" onClick={() => router.push(`/admin/dashboard/events/${eventId}/command-center`)}>
                <Command className="mr-2 h-4 w-4" />
                Command
              </Button>
              <Button variant="outline" className="border-green-700/50 text-green-400 hover:bg-green-950/30" onClick={() => window.open(`/admin/dashboard/events/${eventId}/check-in`, '_blank')}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Check-In
              </Button>
              {event.tour_id ? (
                <Button variant="outline" className="border-cyan-700/50 text-cyan-300 hover:bg-cyan-950/30" onClick={() => router.push(`/admin/dashboard/tours/${event.tour_id}`)}>
                  <Route className="mr-2 h-4 w-4" />
                  Open tour
                </Button>
              ) : (
                <Button variant="outline" className="border-cyan-700/50 text-cyan-300 hover:bg-cyan-950/30" onClick={() => router.push(`/admin/dashboard/tours?event_id=${eventId}`)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add to tour
                </Button>
              )}
              <Button variant="outline" className="border-purple-700/50 text-purple-300 hover:bg-purple-950/30" onClick={() => router.push(`/admin/dashboard/tours/builder?event_id=${eventId}`)}>
                <CalendarDays className="mr-2 h-4 w-4" />
                Start tour
              </Button>
              <Button variant="outline" className="border-slate-700 text-slate-300" onClick={() => router.push(`/admin/dashboard/events/create?id=${eventId}`)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <Button variant="outline" className="border-slate-700 text-slate-300" onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="border-slate-700 text-slate-300">
                    <Settings className="mr-2 h-4 w-4" />
                    Actions
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
                  <DropdownMenuItem onClick={() => router.push(`/admin/dashboard/events/create?id=${eventId}`)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit in Producer Console
                  </DropdownMenuItem>
                  {event.tour_id ? (
                    <DropdownMenuItem onClick={() => router.push(`/admin/dashboard/tours/${event.tour_id}`)}>
                      <Route className="mr-2 h-4 w-4" />
                      Open tour
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={() => router.push(`/admin/dashboard/tours?event_id=${eventId}`)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add to tour
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => router.push(`/admin/dashboard/tours/builder?event_id=${eventId}`)}>
                    <CalendarDays className="mr-2 h-4 w-4" />
                    Start tour from event
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDuplicateEvent}>
                    <Copy className="mr-2 h-4 w-4" />
                    Duplicate Event
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleShare}>
                    <Share2 className="mr-2 h-4 w-4" />
                    Share
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-red-400 focus:text-red-400"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Event
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          }
        >


          {/* Overview Tab */}
          <OperationsTabPanel value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {/* Event Details */}
                <OpsPanel
                  title="Event Details"
                  description={event.description || "No description provided yet."}
                  icon={Calendar}
                  action={
                    <Button
                      variant="outline"
                      className="border-slate-700 text-slate-300"
                      onClick={() => router.push(`/admin/dashboard/events/create?id=${eventId}`)}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Edit event
                    </Button>
                  }
                >
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <OpsField label="Venue" value={event.venue_name} />
                    <OpsField label="Address" value={event.venue_address || "No address provided"} />
                    <OpsField label="Doors open" value={event.doors_open || "TBD"} />
                    <OpsField
                      label="Duration"
                      value={event.duration_minutes ? `${event.duration_minutes} minutes` : "TBD"}
                    />
                  </div>
                </OpsPanel>

                <EventPartiesPanel
                  eventId={eventId}
                  orgId={event.org_id}
                  venueAccountId={venueAccountId}
                  venueName={event.venue_name}
                  artistAccountIds={artistAccountIds}
                  employerParams={employerParams}
                  onPartiesChanged={() => {
                    void fetch(`/api/admin/events/${eventId}`, adminRequest())
                      .then((res) => res.json())
                      .then((data) => {
                        if (data?.event) setEvent(normalizeEventDetails(data.event, eventId))
                      })
                      .catch(() => undefined)
                  }}
                />

                <EventSetupCompletenessPanel eventId={eventId} />

                {/* Progress Tracking */}
                <OpsPanel title="Progress Tracking" icon={Target}>
                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <Label className="text-slate-400">Ticket Sales Progress</Label>
                        <span className="text-white">{ticketSalesPercentage.toFixed(1)}%</span>
                      </div>
                      <Progress value={ticketSalesPercentage} className="h-2" />
                    </div>
                    
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <Label className="text-slate-400">Revenue Progress</Label>
                        <span className="text-white">{revenuePercentage.toFixed(1)}%</span>
                      </div>
                      <Progress value={revenuePercentage} className="h-2" />
                    </div>
                  </div>
                </OpsPanel>
              </div>

              <div className="space-y-6">
                {/* Quick Actions */}
                <OpsPanel
                  title="Coordinator Actions"
                  description="Jump into the full workflow with this event already selected."
                  icon={Zap}
                >
                  <div className="grid gap-2">
                    <QuickActionButton icon={Plus} onClick={handleAddTask}>Add task</QuickActionButton>
                    <QuickActionButton icon={Users2} onClick={handleManageStaff}>Manage people</QuickActionButton>
                    <QuickActionButton icon={Truck} onClick={handleAddVendor}>Add vendor</QuickActionButton>
                    <QuickActionButton icon={Ticket} onClick={handleViewTickets}>View tickets</QuickActionButton>
                    <QuickActionButton icon={MessageSquare} onClick={() => handleEventTabChange("communications")}>
                      Communications hub
                    </QuickActionButton>
                    <QuickActionButton icon={Truck} onClick={() => router.push(logisticsHref)}>
                      Open logistics
                    </QuickActionButton>
                    <QuickActionButton icon={MapPin} onClick={() => router.push(siteMapHref)}>
                      Site maps
                    </QuickActionButton>
                    <QuickActionButton icon={Users2} onClick={() => router.push(staffSchedulingHref)}>
                      Create shift
                    </QuickActionButton>
                    <QuickActionButton icon={Briefcase} onClick={() => router.push(jobsHref)}>
                      Post job
                    </QuickActionButton>
                    <Separator className="bg-slate-700" />
                    <EventJobPostingPanel
                      eventId={eventId}
                      eventName={event.name}
                      eventDate={event.event_date}
                      eventLocation={event.venue_name}
                      onJobPosted={(job) => {
                        toast.success(`Job "${job.title}" posted successfully!`)
                      }}
                    />
                  </div>
                </OpsPanel>

                {/* Status Management */}
                <Card className="bg-slate-900/50 border-slate-700/50">
                  <CardHeader>
                    <CardTitle className="text-white">Status Management</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Select value={event.status} onValueChange={handleStatusChange}>
                      <SelectTrigger className="bg-slate-800 border-slate-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                        <SelectItem value="postponed">Postponed</SelectItem>
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>

                {/* Notifications Panel */}
                <Card className="bg-slate-900/50 border-slate-700/50">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-white text-sm flex items-center gap-2">
                        <Bell className="h-4 w-4 text-purple-400" />
                        Notifications
                        {notifications.filter((n: any) => !n.is_read).length > 0 && (
                          <span className="bg-purple-600/30 text-purple-400 text-xs px-1.5 py-0.5 rounded-full">
                            {notifications.filter((n: any) => !n.is_read).length}
                          </span>
                        )}
                      </CardTitle>
                      {notifications.some((n: any) => !n.is_read) && (
                        <button
                          className="text-xs text-slate-400 hover:text-white transition-colors"
                          onClick={async () => {
                            await fetch(`/api/admin/notifications?markAllRead=true&event_id=${eventId}`, adminRequest({ method: 'PATCH' }))
                            setNotifications(prev => prev.map((n: any) => ({ ...n, is_read: true })))
                          }}
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 max-h-48 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="text-slate-500 text-xs text-center py-4">No notifications for this event.</p>
                    ) : (
                      notifications.slice(0, 8).map((n: any) => (
                        <div key={n.id} className={`flex items-start gap-2 p-2 rounded-sm text-xs ${n.is_read ? 'opacity-60' : 'bg-purple-950/20 border border-purple-800/20'}`}>
                          <div className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${n.is_read ? 'bg-slate-600' : 'bg-purple-400'}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-slate-200 font-medium truncate">{n.title}</p>
                            <p className="text-slate-400 truncate">{n.content}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </OperationsTabPanel>

          {/* Tasks Tab */}
          <OperationsTabPanel value="tasks" className="space-y-6">
            <EventTaskManager
              eventId={eventId}
              tasks={tasks}
              onTasksUpdate={setTasks}
            />
            <EventIncidentsTab eventId={eventId} />
          </OperationsTabPanel>

          {/* Staff Tab */}
          <OperationsTabPanel value="people" className="space-y-6">
            <OpsPanel
              title="Event Workforce"
              description="Roster, schedule, job posts, participants, and event-specific people context stay tied to this event."
              icon={Users}
              action={
                <>
                  <Button variant="outline" className="border-slate-700 text-slate-300" onClick={() => router.push(staffSchedulingHref)}>
                    <Clock className="mr-2 h-4 w-4" />
                    Create shift
                  </Button>
                  <Button variant="outline" className="border-slate-700 text-slate-300" onClick={() => router.push(rosterHref)}>
                    Open roster
                  </Button>
                  <Button className="bg-gradient-to-r from-purple-600 to-blue-600 text-white" onClick={() => router.push(hiringHref)}>
                    Open hiring
                  </Button>
                </>
              }
            >
              <div className="grid gap-3 md:grid-cols-3">
                <OpsField label="Event scope" value={event.name} />
                <OpsField label="Venue scope" value={event.venue_name || "Venue required"} />
                <OpsField
                  label="Employer scope"
                  value={eventHiringEntity ? `${eventHiringEntity.displayName} (${eventHiringEntity.entityType})` : "Needs account/venue mapping"}
                />
              </div>
              {!eventHiringEntity ? (
                <div className="mt-4 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4">
                  <p className="text-sm font-semibold text-amber-100">Workforce scope needs repair</p>
                  <p className="mt-1 text-sm text-amber-100/80">
                    Add a venue account or organization to this event before assigning live staff shifts.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      className="border-amber-400/40 text-amber-100 hover:bg-amber-500/10"
                      onClick={() => router.push(`/admin/dashboard/events/create?id=${eventId}`)}
                    >
                      Edit event venue
                    </Button>
                    <Button
                      variant="outline"
                      className="border-amber-400/40 text-amber-100 hover:bg-amber-500/10"
                      onClick={() => router.push("/admin/dashboard/venues")}
                    >
                      Open venues
                    </Button>
                  </div>
                </div>
              ) : null}
            </OpsPanel>

            <OpsPanel
              title="Schedule Coverage"
              description="Use the same scheduling workspace from Staff Operations, preloaded for this event when scope is available."
              icon={Clock}
            >
              <StaffSchedulingTab employer={eventHiringEntity ?? undefined} />
            </OpsPanel>

            <OpsPanel
              title="Staff Assignments"
              description="Event-specific assignments and job posts remain available here for coordinators who work from the event page."
              icon={Users2}
              action={
                <EventJobPostingPanel
                  eventId={eventId}
                  eventName={event.name}
                  eventDate={event.event_date}
                  eventLocation={event.venue_name}
                  onJobPosted={(job) => {
                    toast.success(`Job "${job.title}" posted successfully!`)
                  }}
                />
              }
            >
              <EventStaffPanel
                eventId={eventId}
                staff={staff}
                onStaffUpdate={setStaff}
              />
            </OpsPanel>

            <OpsPanel title="Jobs and Participants" icon={Briefcase}>
              <div className="space-y-6">
                <EventJobsPanel eventId={eventId} />
                <Separator className="bg-slate-700" />
                <EventParticipantsTab eventId={eventId} />
                <EventLocationsTab eventId={eventId} />
              </div>
            </OpsPanel>
          </OperationsTabPanel>

          {/* Vendors Tab */}
          <OperationsTabPanel value="vendors" className="space-y-6">
            <EventVendorRequests eventId={eventId} />
            <EventVendorPanel
              eventId={eventId}
              vendors={vendors}
              onVendorsUpdate={setVendors}
            />
          </OperationsTabPanel>

          {/* Tickets Tab */}
          <OperationsTabPanel value="tickets" className="space-y-6">
            <EventTicketPanel eventId={eventId} />
          </OperationsTabPanel>

          {/* Promote Tab */}
          <OperationsTabPanel value="promote" className="space-y-6">
            <EventPromoterProgramPanel eventId={eventId} />
            <EventPromoterMembershipPanel eventId={eventId} />
            <EventPromoterAnalyticsPanel eventId={eventId} />
          </OperationsTabPanel>

          {/* Finances Tab */}
          <OperationsTabPanel value="money" className="space-y-6">
            <EventFinancePanel eventId={eventId} />
          </OperationsTabPanel>

          {/* Logistics Tab */}
          <OperationsTabPanel value="logistics" className="space-y-6">
            <OpsPanel
              title="Logistics and Requirements"
              description="Production requirements, site maps, equipment, and vendor movement all stay scoped to this event."
              icon={Truck}
              action={
                <>
                  <Button variant="outline" className="border-slate-700 text-slate-300" onClick={() => router.push(logisticsHref)}>
                    Open logistics
                  </Button>
                  <Button className="bg-gradient-to-r from-purple-600 to-blue-600 text-white" onClick={() => router.push(siteMapHref)}>
                    Open site maps
                  </Button>
                </>
              }
            >
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <OpsField label="Sound" value={event.sound_requirements || "No specific requirements"} />
                <OpsField label="Lighting" value={event.lighting_requirements || "No specific requirements"} />
                <OpsField label="Stage" value={event.stage_requirements || "No specific requirements"} />
                <OpsField label="Special requirements" value={event.special_requirements || "No special requirements"} />
                <OpsField label="Load-in" value={event.load_in_time || "TBD"} />
                <OpsField label="Sound check" value={event.sound_check_time || "TBD"} />
              </div>
            </OpsPanel>

            <LogisticsDynamicManager
              eventId={eventId}
              enableEditing={true}
              autoSave={true}
              showFilters={true}
            />
            <EventSiteMapTab eventId={eventId} eventName={event.name} />
          </OperationsTabPanel>

          {/* Communications Tab */}
          <OperationsTabPanel value="communications" className="space-y-6">
            <EventCommunicationHub eventId={eventId} eventName={event.name} />
          </OperationsTabPanel>

          {/* Advancing Tab */}
          <OperationsTabPanel value="advancing" className="space-y-6">
            <OpsPanel
              title="Advance Workspace"
              description="Fill in the technical rider, hospitality, contacts, and settlement for this show."
              icon={FileText}
              action={
                <Button
                  className="bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0"
                  onClick={() => router.push(`/admin/dashboard/events/${eventId}/advancing`)}
                >
                  Open Advancing Workspace
                </Button>
              }
            >
              <div className="grid gap-3 md:grid-cols-3">
                <OpsField label="Status" value={advancingSummary?.status || "Not loaded"} />
                <OpsField label="Share link" value={advancingSummary?.share_token ? "Ready" : "Not ready"} />
                <OpsField label="Venue contact" value={event.venue_contact_email || "Missing"} />
              </div>
                {venueAccountId && event.venue_contact_email ? (
                  <Button
                    variant="outline"
                    className="mt-4 border-slate-600 text-slate-300"
                    onClick={async () => {
                      try {
                        const res = await fetch(`/api/admin/events/${eventId}/advancing`, adminRequest({
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            status: "sent",
                            venue_contact_email: event.venue_contact_email,
                          }),
                        }))
                        const data = await res.json().catch(() => ({}))
                        if (!res.ok) throw new Error(data?.error || "Notify failed")
                        toast.success("Venue account notified")
                        if (data?.advancing) setAdvancingSummary(data.advancing)
                      } catch (error: any) {
                        toast.error(error?.message || "Notify failed")
                      }
                    }}
                  >
                    Notify venue account
                  </Button>
                ) : null}
            </OpsPanel>
          </OperationsTabPanel>

          {/* Day Sheet Tab */}
          <OperationsTabPanel value="day-sheet" className="space-y-6">
            <OpsPanel
              title="Day Sheet"
              description="Auto-generate and distribute the run sheet for the show day."
              icon={Clipboard}
              action={
                <Button
                  className="bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0"
                  onClick={() => router.push(`/admin/dashboard/events/${eventId}/day-sheet`)}
                >
                  Open Day Sheet
                </Button>
              }
            >
              <div className="grid gap-3 md:grid-cols-3">
                <OpsField
                  label="Distribution"
                  value={daySheetSummary?.distributed_at ? `Last distributed ${formatSafeDate(daySheetSummary.distributed_at)}` : "Not distributed yet"}
                />
                <OpsField label="Version" value={daySheetSummary?.version ? `v${daySheetSummary.version}` : "v1"} />
                <OpsField label="Event date" value={formatSafeDate(event.event_date)} />
              </div>
            </OpsPanel>
          </OperationsTabPanel>

          {/* Travel Tab */}
          <OperationsTabPanel value="travel" className="space-y-6">
            <TravelCoordinationHub eventId={eventId} />
          </OperationsTabPanel>

          {/* Analytics Tab */}
          <OperationsTabPanel value="analytics" className="space-y-6">
            {/* Range selector */}
            <div className="flex items-center gap-2">
              {(['7d','30d','90d','all'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setAnalyticsRange(r)}
                  className={`px-3 py-1 rounded-sm text-sm border transition-all ${
                    analyticsRange === r
                      ? 'bg-purple-600/20 border-purple-500/50 text-purple-400'
                      : 'border-slate-700/50 text-slate-400 hover:text-white'
                  }`}
                >
                  {r === 'all' ? 'All Time' : `Last ${r.replace('d',' days')}`}
                </button>
              ))}
            </div>

            {analyticsLoading ? (
              <WorkforcePanel className="flex min-h-[220px] items-center justify-center p-8">
                <RefreshCw className="h-6 w-6 animate-spin text-purple-400" />
              </WorkforcePanel>
            ) : !analyticsData ? (
              <WorkforceEmptyState
                icon={BarChart3}
                title="No analytics data yet"
                description="Sell tickets, check in guests, or add finance activity to populate event performance."
                action={
                  <Button className="bg-gradient-to-r from-purple-600 to-blue-600 text-white" onClick={() => handleEventTabChange("tickets")}>
                    Open tickets
                  </Button>
                }
              />
            ) : (
              <>
                {/* KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="bg-slate-900/60 border-slate-700/50 rounded-sm">
                    <CardContent className="p-4 text-center">
                      <p className="text-slate-400 text-xs mb-1">Tickets Sold</p>
                      <p className="text-2xl font-bold text-white">{formatSafeNumber(analyticsData.totalTicketsSold)}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-slate-900/60 border-slate-700/50 rounded-sm">
                    <CardContent className="p-4 text-center">
                      <p className="text-slate-400 text-xs mb-1">Revenue</p>
                      <p className="text-2xl font-bold text-green-400">{formatSafeCurrency(analyticsData.revenueVsExpenses?.revenue || 0)}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-slate-900/60 border-slate-700/50 rounded-sm">
                    <CardContent className="p-4 text-center">
                      <p className="text-slate-400 text-xs mb-1">Expenses</p>
                      <p className="text-2xl font-bold text-red-400">{formatSafeCurrency(analyticsData.revenueVsExpenses?.expenses || 0)}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-slate-900/60 border-slate-700/50 rounded-sm">
                    <CardContent className="p-4 text-center">
                      <p className="text-slate-400 text-xs mb-1">Capacity %</p>
                      <p className="text-2xl font-bold text-blue-400">{((analyticsData.conversionRate || 0) * 100).toFixed(1)}%</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Sales over time */}
                {analyticsData.ticketSalesOverTime?.length > 0 && (
                  <Card className="bg-slate-900/60 border-slate-700/50 rounded-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-white text-sm">Ticket Sales Over Time</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={analyticsData.ticketSalesOverTime}>
                          <defs>
                            <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#9333ea" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#9333ea" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                          <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                          <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                          <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #475569', color: '#f1f5f9' }} />
                          <Area type="monotone" dataKey="count" stroke="#9333ea" fill="url(#salesGrad)" name="Tickets" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}

                {/* Sales by tier */}
                {analyticsData.salesByTier?.length > 0 && (
                  <Card className="bg-slate-900/60 border-slate-700/50 rounded-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-white text-sm">Sales by Ticket Type</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={analyticsData.salesByTier}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                          <XAxis dataKey="tier" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                          <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                          <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #475569', color: '#f1f5f9' }} />
                          <Bar dataKey="sold" fill="#3b82f6" name="Sold" radius={[4,4,0,0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </OperationsTabPanel>


          {/* Access & Audit Tab */}
          <OperationsTabPanel value="access" className="space-y-6">
            <EntityAccessAudit entityType="Event" entityId={eventId} />
          </OperationsTabPanel>
        </OperationsCommandShell>
      </div>

      <PublicationShareLinkDialog
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
        eventId={eventId}
        title="Share event publication"
      />

      <Dialog open={Boolean(versionConflict)} onOpenChange={(open) => { if (!open) setVersionConflict(null) }}>
        <DialogContent className="border-slate-700 bg-slate-900 text-slate-100">
          <DialogHeader>
            <DialogTitle>Event changed in another session</DialogTitle>
            <DialogDescription className="text-slate-400">
              Your update was not applied. Review the newer server version before making the change again.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3">
            <p className="text-sm text-amber-100">{versionConflict?.message}</p>
            {versionConflict?.currentVersion ? (
              <p className="text-xs text-amber-200/70">Current version: {versionConflict.currentVersion}</p>
            ) : null}
            {versionConflict?.changedFields.length ? (
              <div className="flex flex-wrap gap-1.5">
                {versionConflict.changedFields.map((field) => (
                  <Badge key={field} className="border border-amber-500/30 bg-amber-500/10 text-amber-100">
                    {field.replaceAll("_", " ")}
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-slate-700" onClick={() => setVersionConflict(null)}>
              Keep this page open
            </Button>
            <Button
              className="bg-purple-600 hover:bg-purple-500"
              onClick={() => {
                if (versionConflict?.event) {
                  const latest = normalizeEventDetails(versionConflict.event, eventId)
                  setEvent(latest)
                  setEditForm(latest)
                }
                setVersionConflict(null)
                toast.success("Loaded the current event version")
              }}
            >
              Load current version
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Export Event Data</DialogTitle>
            <DialogDescription className="text-slate-400">
              Export event information in various formats.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="border-slate-600 text-slate-300 h-20 flex flex-col items-center justify-center hover:border-purple-500/50 hover:text-white"
                onClick={() => { window.location.href = `/api/admin/events/${eventId}/export?format=pdf`; setShowExportDialog(false) }}
              >
                <FileText className="h-6 w-6 mb-2 text-purple-400" />
                <span className="text-sm">HTML Report</span>
              </Button>
              <Button
                variant="outline"
                className="border-slate-600 text-slate-300 h-20 flex flex-col items-center justify-center hover:border-green-500/50 hover:text-white"
                onClick={() => { window.location.href = `/api/admin/events/${eventId}/export?format=csv`; setShowExportDialog(false) }}
              >
                <Download className="h-6 w-6 mb-2 text-green-400" />
                <span className="text-sm">CSV Attendees</span>
              </Button>
            </div>
            <Button
              variant="outline"
              className="w-full border-slate-600 text-slate-300 h-16 flex flex-col items-center justify-center hover:border-blue-500/50 hover:text-white"
              onClick={() => { window.location.href = `/api/admin/events/${eventId}/export?format=ical`; setShowExportDialog(false) }}
            >
              <Calendar className="h-5 w-5 mb-1 text-blue-400" />
              <span className="text-sm">Add to Calendar (.ics)</span>
            </Button>
            <p className="text-xs text-slate-500 text-center">CSV includes all ticket purchasers. iCal adds load-in, sound check, doors, and show to your calendar.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExportDialog(false)} className="border-slate-600 text-slate-300">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tickets Dialog */}
      <Dialog open={showTicketsDialog} onOpenChange={setShowTicketsDialog}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-4xl">
          <DialogHeader>
            <DialogTitle className="text-white">Ticket Management</DialogTitle>
            <DialogDescription className="text-slate-400">
              View and manage ticket sales for this event.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <Card className="bg-slate-700 border-slate-600">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-white">{event?.tickets_sold || 0}</p>
                  <p className="text-sm text-slate-400">Tickets Sold</p>
                </CardContent>
              </Card>
              <Card className="bg-slate-700 border-slate-600">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-white">{event?.capacity || 0}</p>
                  <p className="text-sm text-slate-400">Total Capacity</p>
                </CardContent>
              </Card>
              <Card className="bg-slate-700 border-slate-600">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-white">${event?.actual_revenue || 0}</p>
                  <p className="text-sm text-slate-400">Revenue</p>
                </CardContent>
              </Card>
            </div>
            <div>
              <Label className="text-slate-300">Sales Progress</Label>
              <Progress value={ticketSalesPercentage} className="h-3 mt-2" />
              <p className="text-sm text-slate-400 mt-1">{ticketSalesPercentage.toFixed(1)}% sold</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTicketsDialog(false)} className="border-slate-600 text-slate-300">
              Close
            </Button>
            <Button onClick={() => {
              setShowTicketsDialog(false)
              handleEventTabChange("tickets")
            }} className="bg-purple-600 hover:bg-purple-700">
              Manage Tickets
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Event</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Are you sure you want to delete this event? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteEvent}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete Event
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </WorkforcePageShell>
  )
}
