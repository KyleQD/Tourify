"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Box, Building, Building2, Calendar, Clock, FileText, MapPin, MessageSquare, Plane, Truck, Users, Utensils, Edit, Trash2, AlertCircle, Loader2, Zap, Guitar, Mic, Piano, Drum, CheckCircle } from "lucide-react"
import { AdminEmptyState } from "../components/admin-empty-state"
import { LogisticsMetricsCard } from "@/components/admin/logistics/logistics-metrics-card"
import { TravelSLOBanner } from "@/components/admin/logistics/travel-slo-banner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TabsContent } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { useLogistics } from "@/hooks/use-logistics"
import { LogisticsScopeBar } from "@/components/admin/logistics/logistics-scope-bar"
import {
  assertLogisticsScopeOrgConsistency,
  buildLogisticsScopeSearchParams,
  formatLogisticsScopeBadge,
  parseLogisticsScopeParams,
} from "@/lib/admin/logistics-scope"
import { useRentalAgreements, useRentalAnalytics, useEquipmentUtilization } from "@/hooks/use-rentals"
import { useLodging } from "@/hooks/use-lodging"
import { useTravelCoordination } from "@/hooks/use-travel-coordination"
import dynamic from "next/dynamic"
import { OperationsCommandShell } from "@/components/admin/operations/operations-command-shell"
import { TransportManager } from "@/components/admin/logistics/transport/transport-manager"
import { TravelOpsHub } from "@/components/admin/logistics/travel/travel-ops-hub"
import { PartyTravelMatrixPanel } from "@/components/admin/logistics/travel/party-travel-matrix-panel"
import { TravelCommandsPanel } from "@/components/admin/logistics/travel/travel-commands-panel"
import { TravelDocumentsPanel } from "@/components/admin/logistics/travel/travel-documents-panel"
import { LogisticsAlertsPanel } from "@/components/admin/logistics/logistics-alerts-panel"
import { LogisticsPlansLauncher } from "@/components/admin/logistics/workspace/logistics-plans-launcher"
import { CommunicationsCommandCenter } from "@/components/admin/logistics/communications-command-center"
import { LodgingManagement } from "@/components/admin/lodging-management"
import { EquipmentOpsPanel } from "@/components/admin/logistics/equipment-ops-panel"
import { BacklineOpsPanel } from "@/components/admin/logistics/backline/backline-ops-panel"
import { CateringOpsPanel } from "@/components/admin/logistics/catering/catering-ops-panel"
import { useMultiAccount } from "@/hooks/use-multi-account"
import { useActingContext } from "@/hooks/use-acting-context"
import { hiringEntityFromAccount } from "@/lib/hiring/hiring-entity-from-account"
import type { RosterMember } from "@/types/hiring-roster-work-mode"

const LogisticsDynamicManager = dynamic(
  () =>
    import("@/components/admin/logistics-dynamic-manager").then((mod) => ({
      default: mod.LogisticsDynamicManager,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[200px] items-center justify-center text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    ),
  }
)

const SiteMapManager = dynamic(
  () =>
    import("@/components/admin/logistics/site-map/site-map-manager").then((mod) => ({
      default: mod.SiteMapManager,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[200px] items-center justify-center text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    ),
  }
)
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"
import { formatSafeCurrency } from "@/lib/format/number-format"

interface TeamGroup {
  key: string
  label: string
  members: RosterMember[]
}

function groupActiveRosterMembers(members: RosterMember[]): TeamGroup[] {
  const hasDepartments = members.some((member) => Boolean(member.department?.trim()))

  if (!hasDepartments) {
    return members.length > 0
      ? [{ key: "team", label: "Team", members }]
      : []
  }

  const groups = new Map<string, TeamGroup>()

  for (const member of members) {
    const department = member.department?.trim()
    const key = department ? department.toLowerCase() : "unassigned"
    const label = department || "Unassigned"
    const existing = groups.get(key)
    if (existing) {
      existing.members.push(member)
      continue
    }
    groups.set(key, { key, label, members: [member] })
  }

  return Array.from(groups.values()).sort((a, b) => {
    if (a.key === "unassigned") return 1
    if (b.key === "unassigned") return -1
    return a.label.localeCompare(b.label)
  })
}

const LOGISTICS_OPS_TABS = [
  { value: 'overview', label: 'Overview', icon: Truck },
  { value: 'transportation', label: 'Transport', icon: Truck },
  { value: 'accommodations', label: 'Hotels & Flights', icon: Building },
  { value: 'equipment', label: 'Equipment', icon: Box },
  { value: 'backline', label: 'Backline', icon: Zap },
  { value: 'catering', label: 'Catering', icon: Utensils },
  { value: 'communication', label: 'Comms', icon: MessageSquare },
  { value: 'site-maps', label: 'Site Maps', icon: MapPin },
] as const

const logisticsTabs = LOGISTICS_OPS_TABS.map((tab) => tab.value)

export default function LogisticsPageClient() {
  const { toast } = useToast()
  const { user } = useAuth()
  const { currentAccount } = useMultiAccount()
  const { actingHeaders, isActingReady } = useActingContext()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null)
  const [selectedEventName, setSelectedEventName] = useState<string | null>(null)
  const [selectedEventOwnerId, setSelectedEventOwnerId] = useState<string | null>(null)
  const [commsThreadId, setCommsThreadId] = useState<string | null>(null)
  const [selectedTour, setSelectedTour] = useState<string | null>(null)
  const [selectedTourName, setSelectedTourName] = useState<string | null>(null)
  const [selectedLegId, setSelectedLegId] = useState<string | null>(null)
  const [teamMembers, setTeamMembers] = useState<RosterMember[]>([])
  const [teamLoading, setTeamLoading] = useState(false)
  const requestedTab = searchParams.get('tab')
  const defaultTab = logisticsTabs.includes(requestedTab as typeof logisticsTabs[number])
    ? requestedTab!
    : 'overview'
  const [activeTab, setActiveTab] = useState(defaultTab)
  const employer = useMemo(() => hiringEntityFromAccount(currentAccount), [currentAccount])
  // Server resolves orgId as ops_org_id; profile_id is the organizer_account.id — use ops_org_id for comparison
  const actingOrgId = (currentAccount?.profile_data?.ops_org_id as string | undefined) || employer?.entityId || null
  const orgLabel = useMemo(() => {
    const data = currentAccount?.profile_data
    return (
      data?.organization_name
      || data?.name
      || data?.display_name
      || currentAccount?.account_type
      || 'Organization'
    )
  }, [currentAccount])
  const teamGroups = useMemo(() => groupActiveRosterMembers(teamMembers), [teamMembers])

  const updateLogisticsUrl = useCallback((updates: {
    tab?: string | null
    eventId?: string | null
    tourId?: string | null
    legId?: string | null
    orgId?: string | null
    stopId?: string | null
    panel?: string | null
    issueId?: string | null
  }) => {
    const params = buildLogisticsScopeSearchParams({
      current: searchParams,
      updates: {
        tab: updates.tab,
        eventId: updates.eventId,
        tourId: updates.tourId,
        legId: updates.legId,
        orgId: updates.orgId,
        stopId: updates.stopId,
        panel: updates.panel,
        issueId: updates.issueId,
      },
    })
    // Always stamp acting org when known — never invent a different org.
    if (actingOrgId && !params.get('orgId')) params.set('orgId', actingOrgId)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }, [actingOrgId, pathname, router, searchParams])

  useEffect(() => {
    const scope = parseLogisticsScopeParams(searchParams)
    const consistency = assertLogisticsScopeOrgConsistency({
      actingOrgId,
      urlOrgId: scope.orgId,
    })
    if (!consistency.ok) {
      // Refuse silent org switch: clear foreign org/tour/event from URL.
      const params = buildLogisticsScopeSearchParams({
        current: searchParams,
        updates: {
          orgId: actingOrgId,
          tourId: null,
          eventId: null,
          legId: null,
          stopId: null,
          panel: null,
          issueId: null,
          tab: scope.tab,
        },
      })
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
      return
    }

    setSelectedEvent(scope.eventId)
    if (!scope.eventId) setSelectedEventName(null)
    setSelectedTour(scope.tourId)
    if (!scope.tourId) setSelectedTourName(null)
    setSelectedLegId(scope.legId)
    setActiveTab(
      logisticsTabs.includes(scope.tab as typeof logisticsTabs[number]) ? scope.tab! : 'overview',
    )

    if (actingOrgId && !scope.orgId) {
      const params = buildLogisticsScopeSearchParams({
        current: searchParams,
        updates: { orgId: actingOrgId },
      })
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    }
  }, [actingOrgId, pathname, router, searchParams])

  useEffect(() => {
    async function fetchActiveRoster() {
      if (!employer) {
        setTeamMembers([])
        return
      }

      setTeamLoading(true)
      try {
        const params = new URLSearchParams({
          status: "active",
          entity_type: employer.entityType,
          entity_id: employer.entityId,
        })
        if (selectedEvent) params.set("event_id", selectedEvent)
        if (selectedTour) params.set("tour_id", selectedTour)

        const res = await fetch(`/api/hiring/roster?${params.toString()}`, { credentials: "include" })
        if (!res.ok) {
          setTeamMembers([])
          return
        }

        const payload = await res.json()
        const members = (payload?.data?.members ?? []) as RosterMember[]
        setTeamMembers(members.filter((member) => member.status === "active"))
      } catch {
        setTeamMembers([])
      } finally {
        setTeamLoading(false)
      }
    }

    if (user) void fetchActiveRoster()
  }, [user, employer, selectedEvent, selectedTour])

  // Fetch event owner + existing comms thread ID when selected event changes
  useEffect(() => {
    if (!selectedEvent) {
      setSelectedEventOwnerId(null)
      setCommsThreadId(null)
      return
    }
    async function fetchEventMeta() {
      try {
        const [eventRes, threadRes] = await Promise.all([
          fetch(`/api/admin/events/${selectedEvent}`, { credentials: 'include', headers: { ...actingHeaders } }),
          fetch(`/api/admin/logistics/comms-thread?event_id=${selectedEvent}`, { credentials: 'include', headers: { ...actingHeaders } }),
        ])
        if (eventRes.ok) {
          const eventData = await eventRes.json()
          setSelectedEventOwnerId(eventData?.event?.created_by ?? eventData?.created_by ?? null)
        }
        if (threadRes.ok) {
          const threadData = await threadRes.json()
          setCommsThreadId(threadData?.threadId ?? null)
        }
      } catch {
        // non-fatal — owner check defaults to false
      }
    }
    void fetchEventMeta()
  }, [selectedEvent, actingHeaders])

  // Fetch logistics data (combined — one hook, no transportation/equipment/analytics fan-out)
  const { data: logisticsData, loading: logisticsLoading, error: logisticsError, refetch: refetchLogistics } = useLogistics({
    eventId: selectedEvent || undefined,
    tourId: selectedTour || undefined,
    autoRefresh: true,
    refreshInterval: 30000
  })

  // Fetch rental data
  const { agreements: rentalAgreements, loading: rentalsLoading, updateAgreement } = useRentalAgreements({
    status: 'active',
    event_id: selectedEvent || undefined,
    tour_id: selectedTour || undefined,
    limit: 10
  })

  const { analytics: rentalAnalytics } = useRentalAnalytics({
    event_id: selectedEvent || undefined,
    tour_id: selectedTour || undefined,
  })

  const { utilization: equipmentUtilization } = useEquipmentUtilization()

  // Single lodging hook — selective slices only (avoids 3× full prefetch storm)
  const {
    bookings: lodgingBookings,
    analytics: lodgingAnalytics,
    utilization: lodgingUtilization,
  } = useLodging({
    event_id: selectedEvent || undefined,
    tour_id: selectedTour || undefined,
    fetchOnMount: ['bookings', 'analytics', 'utilization'],
  })

  // Fetch travel coordination data (scoped to selected event/tour)
  const { 
    groups: travelGroups, 
    flights: travelFlights, 
    transportation: travelTransportation,
    analytics: travelAnalytics,
  } = useTravelCoordination({
    event_id: selectedEvent || undefined,
    tour_id: selectedTour || undefined,
  })

  // Fetch real metrics from API
  const [apiMetrics, setApiMetrics] = useState<any>(null)
  useEffect(() => {
    const params = new URLSearchParams()
    if (selectedEvent) params.set('eventId', selectedEvent)
    if (selectedTour) params.set('tourId', selectedTour)
    fetch(`/api/admin/logistics/metrics?${params}`, { credentials: 'include', headers: { ...actingHeaders } })
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setApiMetrics(d.metrics || d))
      .catch(() => {})
  }, [selectedEvent, selectedTour, actingHeaders])

  // Calculate status metrics
  const calculateStatusMetrics = () => {
    // Default metrics object with all required properties
    const defaultMetrics = {
      transportation: { percentage: 0, items: 0, completed: 0, status: 'Not Started' },
      equipment: { percentage: 0, items: 0, completed: 0, status: 'Not Started' },
      backline: { percentage: 0, items: 0, completed: 0, status: 'Not Started' },
      rentals: { percentage: 0, items: 0, completed: 0, status: 'No Rentals', revenue: 0 },
      lodging: { percentage: 0, items: 0, completed: 0, status: 'No Bookings', revenue: 0 },
      travelCoordination: { percentage: 0, items: 0, completed: 0, status: 'Not Started', travelers: 0 },
      accommodations: { percentage: 0, items: 0, completed: 0, status: 'Not Started' },
      catering: { percentage: 0, items: 0, completed: 0, status: 'Not Started' },
      communication: { percentage: 0, items: 0, completed: 0, status: 'Not Started' }
    }

    if (!logisticsData) return defaultMetrics

    try {
      const transportation = logisticsData.transportation || []
      const equipment = logisticsData.equipment || []
      const assignments = logisticsData.assignments || []

      // Prefer API metrics (org-scoped) for task-backed dimensions
      const apiTransport = apiMetrics?.transportation
      const apiEquipment = apiMetrics?.equipment
      const apiBackline = apiMetrics?.backline

      const transportTotal = apiTransport?.items ?? transportation.length
      const transportCompleted = apiTransport?.completed ?? transportation.filter(t => t.status === 'completed').length
      const transportPercentage = apiTransport?.percentage ?? (transportTotal > 0 ? Math.round((transportCompleted / transportTotal) * 100) : 0)
      const transportStatus = apiTransport?.status ?? (transportPercentage === 100 ? 'Completed' : transportPercentage > 50 ? 'In Progress' : 'Not Started')

      const equipTotal = apiEquipment?.items ?? equipment.length
      const equipAssigned = apiEquipment?.completed ?? assignments.length
      const equipPercentage = apiEquipment?.percentage ?? (equipTotal > 0 ? Math.round((equipAssigned / equipTotal) * 100) : 0)
      const equipStatus = apiEquipment?.status ?? (equipPercentage === 100 ? 'Completed' : equipPercentage > 50 ? 'In Progress' : 'Not Started')

      // Backline is its own logistics_tasks type — never filter equipment "category"
      const backlineTotal = apiBackline?.items ?? 0
      const backlineAssigned = apiBackline?.completed ?? 0
      const backlinePercentage = apiBackline?.percentage ?? 0
      const backlineStatus = apiBackline?.status ?? 'Not Started'

      // Rental metrics from real data
      const activeRentals = rentalAgreements?.length || 0
      const totalRentalRevenue = rentalAnalytics?.[0]?.total_revenue || 0
      const rentalBudget =
        apiMetrics?.rentals?.total_budget ||
        (rentalAnalytics?.[0] as any)?.total_budget ||
        totalRentalRevenue
      const rentalPercentage =
        rentalBudget > 0 ? Math.min(100, Math.round((totalRentalRevenue / rentalBudget) * 100)) : 0
      const rentalStatus = activeRentals > 0 ? 'Active' : 'No Rentals'

      // Lodging metrics from real data
      const activeLodgingBookings = lodgingBookings?.filter(b => b.status === 'confirmed' || b.status === 'checked_in').length || 0
      const totalLodgingRevenue = lodgingAnalytics?.[0]?.total_revenue || 0
      const totalLodgingBookings = lodgingBookings?.length || 0
      const lodgingPercentage =
        totalLodgingBookings > 0 ? Math.round((activeLodgingBookings / totalLodgingBookings) * 100) : 0
      const lodgingStatus = activeLodgingBookings > 0 ? 'Active' : 'No Bookings'

      // Travel coordination metrics
      const totalTravelGroups = travelGroups?.length || 0
      const totalTravelers = travelGroups?.reduce((sum, group) => sum + (group.total_members || 0), 0) || 0
      const fullyCoordinatedGroups = travelGroups?.filter(g => g.coordination_status === 'complete').length || 0
      const travelCoordinationPercentage = totalTravelGroups > 0 ? Math.round((fullyCoordinatedGroups / totalTravelGroups) * 100) : 0
      const travelCoordinationStatus = travelCoordinationPercentage === 100 ? 'Complete' : travelCoordinationPercentage > 50 ? 'In Progress' : 'Not Started'

      return {
        transportation: { percentage: transportPercentage, items: transportTotal, completed: transportCompleted, status: transportStatus },
        equipment: { percentage: equipPercentage, items: equipTotal, completed: equipAssigned, status: equipStatus },
        backline: { percentage: backlinePercentage, items: backlineTotal, completed: backlineAssigned, status: backlineStatus },
        rentals: { percentage: rentalPercentage, items: activeRentals, completed: activeRentals, status: rentalStatus, revenue: totalRentalRevenue },
        lodging: { percentage: lodgingPercentage, items: activeLodgingBookings, completed: activeLodgingBookings, status: lodgingStatus, revenue: totalLodgingRevenue },
        travelCoordination: { percentage: travelCoordinationPercentage, items: totalTravelGroups, completed: fullyCoordinatedGroups, status: travelCoordinationStatus, travelers: totalTravelers },
        accommodations: { percentage: lodgingPercentage, items: activeLodgingBookings, completed: activeLodgingBookings, status: lodgingStatus },
        catering: apiMetrics?.catering
          ? { percentage: apiMetrics.catering.percentage || 0, items: apiMetrics.catering.items || 0, completed: apiMetrics.catering.completed || 0, status: apiMetrics.catering.status || 'Not Started' }
          : { percentage: 0, items: 0, completed: 0, status: 'Not Started' },
        communication: apiMetrics?.communication
          ? { percentage: apiMetrics.communication.percentage || 0, items: apiMetrics.communication.items || 0, completed: apiMetrics.communication.completed || 0, status: apiMetrics.communication.status || 'Not Started' }
          : { percentage: 0, items: 0, completed: 0, status: 'Not Started' }
      }
    } catch (error) {
      console.error('Error calculating metrics:', error)
      return defaultMetrics
    }
  }

  const metrics = calculateStatusMetrics()

  // Handle errors — soft-fail so Site Maps and other tabs still render
  useEffect(() => {
    if (logisticsError) {
      toast({
        title: "Error",
        description: logisticsError,
        variant: "destructive"
      })
    }
  }, [logisticsError, toast])

  // Overview waits only on core logistics fetch
  const isLoading = logisticsLoading

  // Do not block the page on AuthContext hydration. Admin shell already
  // authenticated the session server-side; cookie fetches work without
  // waiting for client user.

  if (!isActingReady) {
    return (
      <AdminEmptyState
        icon={Building2}
        title="No organization selected"
        description="Select an organization from the account switcher in the top navigation to continue."
      />
    )
  }

  return (
    <div className="space-y-6 px-1 pb-8">
      <OperationsCommandShell
        showHero={false}
        eyebrow="Logistics"
        title="Logistics Management"
        description="Coordinate transportation, equipment, and venue layouts for events and tours"
        badge={formatLogisticsScopeBadge({
          orgLabel,
          tourName: selectedTourName || (selectedTour ? 'Tour scoped' : null),
          eventName: selectedEventName || (selectedEvent ? 'Stop scoped' : null),
          legLabel: selectedLegId,
        })}
        tabs={[...LOGISTICS_OPS_TABS]}
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab)
          updateLogisticsUrl({ tab })
        }}
        tabColsClassName="md:grid-cols-4 xl:grid-cols-8"
        actions={
          <LogisticsScopeBar
            orgLabel={orgLabel}
            actingOrgId={actingOrgId}
            actingHeaders={actingHeaders}
            isActingReady={isActingReady}
            tourId={selectedTour}
            eventId={selectedEvent}
            legId={selectedLegId}
            onChange={(next) => {
              if ('tourId' in next) {
                setSelectedTour(next.tourId ?? null)
                setSelectedTourName(next.tourName ?? null)
              }
              if ('eventId' in next) {
                setSelectedEvent(next.eventId ?? null)
                setSelectedEventName(next.eventName ?? null)
              }
              if ('legId' in next) setSelectedLegId(next.legId ?? null)
              updateLogisticsUrl({
                orgId: actingOrgId,
                tourId: 'tourId' in next ? next.tourId ?? null : selectedTour,
                eventId: 'eventId' in next ? next.eventId ?? null : selectedEvent,
                legId: 'legId' in next ? next.legId ?? null : selectedLegId,
              })
            }}
          />
        }
      >
        <TabsContent value="overview" className="mt-0 space-y-6">
          <LogisticsPlansLauncher
            actingHeaders={actingHeaders}
            isActingReady={isActingReady}
            tourId={selectedTour}
            eventId={selectedEvent}
            onSelectTour={(plan) => {
              setSelectedTour(plan.tourId)
              setSelectedTourName(plan.name)
              setSelectedEvent(null)
              setSelectedEventName(null)
              setSelectedLegId(null)
              setActiveTab("overview")
              updateLogisticsUrl({
                orgId: actingOrgId,
                tourId: plan.tourId,
                eventId: null,
                legId: null,
                tab: "overview",
                stopId: null,
                panel: null,
                issueId: null,
              })
            }}
            onOpenStop={(tourId, stop, tab = "overview", issueId = null) => {
              setSelectedTour(tourId)
              setSelectedEvent(stop.eventId)
              setSelectedEventName(stop.name)
              setSelectedLegId(null)
              setActiveTab(tab)
              updateLogisticsUrl({
                orgId: actingOrgId,
                tourId,
                eventId: stop.eventId,
                legId: null,
                tab,
                stopId: stop.tourStopId,
                panel: tab,
                issueId,
              })
            }}
          />

          {/* TRAVEL-601 — Travel SLO alert banner */}
          <TravelSLOBanner />

          {/* LOG-601 — Logistics metrics snapshot card */}
          <LogisticsMetricsCard tourId={selectedTour} eventId={selectedEvent} />

          {/* LOG-601 / LOG-602 — Equipment, rental, catering alerts */}
          <LogisticsAlertsPanel tourId={selectedTour} eventId={selectedEvent} />

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
              <span className="ml-2 text-slate-400">Loading logistics data...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <LogisticsStatusCard title="Transportation" icon={Truck} status={metrics.transportation.status} percentage={metrics.transportation.percentage} items={metrics.transportation.items} completed={metrics.transportation.completed} />
              <LogisticsStatusCard title="Equipment" icon={Box} status={metrics.equipment.status} percentage={metrics.equipment.percentage} items={metrics.equipment.items} completed={metrics.equipment.completed} />
              <LogisticsStatusCard title="Backline" icon={Zap} status={metrics.backline.status} percentage={metrics.backline.percentage} items={metrics.backline.items} completed={metrics.backline.completed} />
              <LogisticsStatusCard title="Accommodations" icon={Building} status={metrics.accommodations.status} percentage={metrics.accommodations.percentage} items={metrics.accommodations.items} completed={metrics.accommodations.completed} />
              <LogisticsStatusCard title="Catering" icon={Utensils} status={metrics.catering.status} percentage={metrics.catering.percentage} items={metrics.catering.items} completed={metrics.catering.completed} />
              <LogisticsStatusCard title="Rentals" icon={Box} status={metrics.rentals.status} percentage={metrics.rentals.percentage} items={metrics.rentals.items} completed={metrics.rentals.completed} />
              <LogisticsStatusCard title="Travel" icon={Plane} status={metrics.travelCoordination.status} percentage={metrics.travelCoordination.percentage} items={metrics.travelCoordination.items} completed={metrics.travelCoordination.completed} />
              <LogisticsStatusCard title="Communication" icon={MessageSquare} status={metrics.communication.status} percentage={metrics.communication.percentage} items={metrics.communication.items} completed={metrics.communication.completed} />
            </div>
          )}

          <Card className="rounded-sm bg-slate-900/60 backdrop-blur-sm border-slate-700/50 mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-slate-100 flex items-center text-base">
                <Calendar className="mr-2 h-5 w-5 text-purple-500" />
                Logistics Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative pl-8 pb-1">
                <div className="absolute top-0 bottom-0 left-3.5 w-px bg-slate-700"></div>
                {Array.isArray(logisticsData?.transportation) && logisticsData?.transportation.length > 0 ? (
                  logisticsData.transportation
                    .filter((t: any) => t?.due_date || t?.departure_time)
                    .sort((a: any, b: any) => new Date(a.due_date || a.departure_time).getTime() - new Date(b.due_date || b.departure_time).getTime())
                    .slice(0, 8)
                    .map((t: any) => (
                      <TimelineItem
                        key={t.id}
                        date={new Intl.DateTimeFormat("en-US", {
                          year: "numeric",
                          month: "numeric",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        }).format(new Date(t.due_date || t.departure_time))}
                        title={t.title || t.type || 'Logistics Item'}
                        description={t.description || ''}
                        status={t.status || 'scheduled'}
                      />
                    ))
                ) : (
                  <div className="text-slate-400 text-sm">No upcoming logistics items</div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-sm bg-slate-900/60 backdrop-blur-sm border-slate-700/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-slate-100 flex items-center text-base">
                <Users className="mr-2 h-5 w-5 text-purple-500" />
                Teams
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {teamLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-purple-500" />
                  <span className="ml-2 text-slate-400 text-sm">Loading teams...</span>
                </div>
              ) : teamGroups.length > 0 ? (
                teamGroups.map((group) => (
                  <div key={group.key} className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-medium text-slate-200">{group.label}</h3>
                      <Badge className="bg-slate-800 text-slate-300 border-slate-700">
                        {group.members.length}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {group.members.map((member) => (
                        <TeamMemberCard
                          key={member.id}
                          name={member.profile?.fullName || "Team Member"}
                          role={member.position || member.department || "Team Member"}
                          email={member.profile?.email || ""}
                          phone={member.profile?.phone || ""}
                        />
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6">
                  <Users className="h-10 w-10 text-slate-500 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">No onboarded team members yet.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transportation" className="mt-0">
          <div className="space-y-6">
            <TransportManager
              eventId={selectedEvent || undefined}
              tourId={selectedTour || undefined}
            />
            <LogisticsDynamicManager
              eventId={selectedEvent || undefined}
              tourId={selectedTour || undefined}
              type="transportation"
              enableEditing={true}
              autoSave={true}
              showFilters={true}
            />
          </div>
        </TabsContent>

        <TabsContent value="accommodations" className="mt-0">
          <div className="space-y-6">
            {/* TRAVEL-301 / LODGE-302 — Party travel matrix */}
            <PartyTravelMatrixPanel tourId={selectedTour} eventId={selectedEvent} />
            {/* TRAVEL-302 / TRAVEL-104 — Travel segment commands */}
            <TravelCommandsPanel tourId={selectedTour} eventId={selectedEvent} />
            {/* TRAVEL-501 / TRAVEL-502 — Protected travel documents */}
            <TravelDocumentsPanel tourId={selectedTour} eventId={selectedEvent} />
            <TravelOpsHub eventId={selectedEvent || undefined} tourId={selectedTour || undefined} />
            <LodgingManagement eventId={selectedEvent || undefined} tourId={selectedTour || undefined} />
          </div>
        </TabsContent>

        <TabsContent value="equipment" className="mt-0">
          <EquipmentOpsPanel
            eventId={selectedEvent || undefined}
            tourId={selectedTour || undefined}
          />
        </TabsContent>

        <TabsContent value="backline" className="mt-0">
          <BacklineOpsPanel
            eventId={selectedEvent || undefined}
            tourId={selectedTour || undefined}
          />
        </TabsContent>

        <TabsContent value="catering" className="mt-0">
          <CateringOpsPanel
            eventId={selectedEvent || undefined}
            tourId={selectedTour || undefined}
            siteMapId={searchParams.get('siteMapId')}
          />
        </TabsContent>

        <TabsContent value="communication" className="mt-0">
          <div className="space-y-6">
            <CommunicationsCommandCenter
              eventId={selectedEvent || undefined}
              tourId={selectedTour || undefined}
              eventName={selectedEventName || undefined}
              isOwner={!!(selectedEvent && selectedEventOwnerId && user?.id && selectedEventOwnerId === user.id)}
              threadId={commsThreadId || undefined}
              onThreadProvisioned={(id) => setCommsThreadId(id)}
              actingHeaders={actingHeaders}
            />

            <LogisticsDynamicManager
              eventId={selectedEvent || undefined}
              tourId={selectedTour || undefined}
              type="communication"
              enableEditing={true}
              autoSave={true}
              showFilters={true}
            />
          </div>
        </TabsContent>

        <TabsContent value="site-maps" className="mt-0">
          <SiteMapManager
            eventId={selectedEvent || undefined}
            tourId={selectedTour || undefined}
            eventLabel={selectedEventName}
          />
        </TabsContent>
      </OperationsCommandShell>
    </div>
  )
}

interface LogisticsStatusCardProps {
  title: string
  icon: any
  status: string
  percentage: number
  items: number
  completed: number
}

function LogisticsStatusCard({ title, icon: Icon, status, percentage, items, completed }: LogisticsStatusCardProps) {
  const getStatusColor = () => {
    if (percentage === 100) return "bg-green-500/20 text-green-400 border-green-500/30"
    if (percentage > 50) return "bg-blue-500/20 text-blue-400 border-blue-500/30"
    if (percentage > 0) return "bg-amber-500/20 text-amber-400 border-amber-500/30"
    return "bg-slate-500/20 text-slate-400 border-slate-500/30"
  }

  return (
    <Card className="rounded-2xl border-slate-700/50 bg-slate-950/60 backdrop-blur-sm">
      <CardContent className="pt-6">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="text-lg font-medium text-white">{title}</h3>
            <Badge className={`mt-1 ${getStatusColor()}`}>{status}</Badge>
          </div>
          <div className="rounded-xl bg-cyan-500/15 p-2">
            <Icon className="h-5 w-5 text-cyan-300" />
          </div>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <div className="text-xs text-slate-500">
              {completed} of {items} items completed
            </div>
            <div className="text-xs text-cyan-300">{percentage}%</div>
          </div>
          <Progress value={percentage} className="h-1.5 bg-slate-700">
            <div
              className="h-full rounded-full bg-cyan-500"
              style={{ width: `${percentage}%` }}
            />
          </Progress>
        </div>
      </CardContent>
    </Card>
  )
}

interface TimelineItemProps {
  date: string
  title: string
  description: string
  status: string
  daysAway?: number
}

function TimelineItem({ date, title, description, status, daysAway }: TimelineItemProps) {
  const getStatusColor = () => {
    switch (status) {
      case "completed":
        return "bg-green-500 text-green-500"
      case "in-progress":
        return "bg-blue-500 text-blue-500"
      case "scheduled":
        return "bg-purple-500 text-purple-500"
      case "delayed":
        return "bg-amber-500 text-amber-500"
      default:
        return "bg-slate-500 text-slate-500"
    }
  }

  return (
    <div className="mb-6 relative">
      <div
        className={`absolute -left-8 mt-1.5 h-4 w-4 rounded-full border-2 border-slate-900 ${getStatusColor()}`}
      ></div>
      <div className="flex flex-col sm:flex-row sm:items-start">
        <div className="mb-1 sm:mb-0 sm:mr-4 sm:w-32 text-xs text-slate-500">{date}</div>
        <div>
          <h4 className="text-sm font-medium text-slate-200">{title}</h4>
          <p className="text-xs text-slate-400 mt-1">{description}</p>
          {daysAway && (
            <Badge className="mt-2 bg-purple-500/10 text-purple-400 border-purple-500/20">{daysAway} days away</Badge>
          )}
        </div>
      </div>
    </div>
  )
}

interface TeamMemberCardProps {
  name: string
  role: string
  email: string
  phone: string
}

function TeamMemberCard({ name, role, email, phone }: TeamMemberCardProps) {
  const initials = name
    .split(' ')
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="bg-slate-800/50 rounded-md p-4 border border-slate-700/50 flex items-start space-x-3">
      <Avatar className="h-10 w-10">
        <AvatarFallback className="bg-slate-700 text-purple-500">{initials || 'TM'}</AvatarFallback>
      </Avatar>
      <div>
        <h4 className="text-sm font-medium text-slate-200">{name}</h4>
        <p className="text-xs text-purple-400">{role}</p>
        <p className="text-xs text-slate-400 mt-1">{email}</p>
        <p className="text-xs text-slate-400">{phone}</p>
      </div>
    </div>
  )
}

interface TransportationRowProps {
  dateTime: string
  description: string
  provider: string
  from: string
  to: string
  status: string
}

function TransportationRow({ dateTime, description, provider, from, to, status }: TransportationRowProps) {
  const getStatusBadge = () => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Completed</Badge>
      case "in-progress":
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">In Progress</Badge>
      case "scheduled":
        return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">Scheduled</Badge>
      case "delayed":
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Delayed</Badge>
      default:
        return <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30">{status}</Badge>
    }
  }

  return (
    <tr className="hover:bg-slate-800/30">
      <td className="px-4 py-3 text-slate-300">{dateTime}</td>
      <td className="px-4 py-3 text-slate-300">{description}</td>
      <td className="px-4 py-3 text-slate-300">{provider}</td>
      <td className="px-4 py-3 text-slate-300">{from}</td>
      <td className="px-4 py-3 text-slate-300">{to}</td>
      <td className="px-4 py-3">{getStatusBadge()}</td>
      <td className="px-4 py-3">
        <div className="flex space-x-2">
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
            <Edit className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-400 hover:text-red-300">
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </td>
    </tr>
  )
}

interface ProviderCardProps {
  name: string
  type: string
  contact: string
  phone: string
  email: string
}

function ProviderCard({ name, type, contact, phone, email }: ProviderCardProps) {
  return (
    <div className="bg-slate-800/50 rounded-md p-4 border border-slate-700/50">
      <h4 className="text-sm font-medium text-slate-200">{name}</h4>
      <Badge className="mt-1 bg-slate-700/50 text-slate-300 border-slate-600/50">{type}</Badge>
      <div className="mt-3 space-y-1">
        <p className="text-xs text-slate-400">
          Contact: <span className="text-slate-300">{contact}</span>
        </p>
        <p className="text-xs text-slate-400">
          Phone: <span className="text-slate-300">{phone}</span>
        </p>
        <p className="text-xs text-slate-400">
          Email: <span className="text-slate-300">{email}</span>
        </p>
      </div>
    </div>
  )
}

interface EquipmentRowProps {
  item: string
  category: string
  condition: string
  location: string
  status: string
}

function EquipmentRow({ item, category, condition, location, status }: EquipmentRowProps) {
  const getStatusBadge = () => {
    switch (status) {
      case "available":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Available</Badge>
      case "in_use":
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">In Use</Badge>
      case "maintenance":
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Maintenance</Badge>
      case "retired":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Retired</Badge>
      default:
        return <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30">{status}</Badge>
    }
  }

  const getConditionBadge = () => {
    switch (condition) {
      case "excellent":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Excellent</Badge>
      case "good":
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Good</Badge>
      case "fair":
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Fair</Badge>
      case "poor":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Poor</Badge>
      case "damaged":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Damaged</Badge>
      default:
        return <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30">{condition}</Badge>
    }
  }

  return (
    <tr className="hover:bg-slate-800/30">
      <td className="px-4 py-3 text-slate-300">{item}</td>
      <td className="px-4 py-3 text-slate-300">{category}</td>
      <td className="px-4 py-3">{getConditionBadge()}</td>
      <td className="px-4 py-3 text-slate-300">{location}</td>
      <td className="px-4 py-3">{getStatusBadge()}</td>
      <td className="px-4 py-3">
        <div className="flex space-x-2">
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
            <Edit className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-400 hover:text-red-300">
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </td>
    </tr>
  )
}

interface CateringCardProps {
  title: string
  provider: string
  servingTime: string
  location: string
  meals: number
  specialRequests: number
}

function CateringCard({ title, provider, servingTime, location, meals, specialRequests }: CateringCardProps) {
  return (
    <div className="bg-slate-800/50 rounded-md p-4 border border-slate-700/50">
      <h4 className="text-sm font-medium text-slate-200">{title}</h4>
      <p className="text-xs text-purple-400">{provider}</p>

      <div className="mt-3 space-y-2">
        <div className="flex items-start">
          <Clock className="h-3.5 w-3.5 text-slate-500 mt-0.5 mr-2" />
          <p className="text-xs text-slate-300">{servingTime}</p>
        </div>
        <div className="flex items-start">
          <MapPin className="h-3.5 w-3.5 text-slate-500 mt-0.5 mr-2" />
          <p className="text-xs text-slate-300">{location}</p>
        </div>
        <div className="flex items-start">
          <Utensils className="h-3.5 w-3.5 text-slate-500 mt-0.5 mr-2" />
          <p className="text-xs text-slate-300">{meals} meals total</p>
        </div>
        <div className="flex items-start">
          <FileText className="h-3.5 w-3.5 text-slate-500 mt-0.5 mr-2" />
          <p className="text-xs text-slate-300">{specialRequests} special dietary requests</p>
        </div>
      </div>
    </div>
  )
}

// New component interfaces and implementations

interface AccommodationCardProps {
  hotel: string
  checkIn: string
  checkOut: string
  rooms: number
  guests: number
  status: string
  contact: string
  phone: string
}

function AccommodationCard({ hotel, checkIn, checkOut, rooms, guests, status, contact, phone }: AccommodationCardProps) {
  const getStatusBadge = () => {
    switch (status) {
      case "confirmed":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Confirmed</Badge>
      case "pending":
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Pending</Badge>
      case "cancelled":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Cancelled</Badge>
      default:
        return <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30">{status}</Badge>
    }
  }

  return (
    <div className="bg-slate-800/50 rounded-md p-4 border border-slate-700/50">
      <div className="flex items-start justify-between mb-3">
        <h4 className="text-sm font-medium text-slate-200">{hotel}</h4>
        {getStatusBadge()}
      </div>
      
      <div className="space-y-2">
        <div className="flex items-start">
          <Calendar className="h-3.5 w-3.5 text-slate-500 mt-0.5 mr-2" />
          <div className="text-xs text-slate-300">
            <div>Check-in: {checkIn}</div>
            <div>Check-out: {checkOut}</div>
          </div>
        </div>
        <div className="flex items-start">
          <Users className="h-3.5 w-3.5 text-slate-500 mt-0.5 mr-2" />
          <div className="text-xs text-slate-300">
            <div>{rooms} rooms • {guests} guests</div>
          </div>
        </div>
        <div className="flex items-start">
          <FileText className="h-3.5 w-3.5 text-slate-500 mt-0.5 mr-2" />
          <div className="text-xs text-slate-300">
            <div>Contact: {contact}</div>
            <div>Phone: {phone}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface FlightCardProps {
  flight: string
  departure: string
  date: string
  passengers: number
  status: string
  airline: string
}

function FlightCard({ flight, departure, date, passengers, status, airline }: FlightCardProps) {
  const getStatusBadge = () => {
    switch (status) {
      case "confirmed":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Confirmed</Badge>
      case "pending":
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Pending</Badge>
      case "delayed":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Delayed</Badge>
      default:
        return <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30">{status}</Badge>
    }
  }

  return (
    <div className="bg-slate-800/50 rounded-md p-4 border border-slate-700/50">
      <div className="flex items-start justify-between mb-3">
        <h4 className="text-sm font-medium text-slate-200">{flight}</h4>
        {getStatusBadge()}
      </div>
      
      <div className="space-y-2">
        <div className="flex items-start">
          <Plane className="h-3.5 w-3.5 text-slate-500 mt-0.5 mr-2" />
          <div className="text-xs text-slate-300">{departure}</div>
        </div>
        <div className="flex items-start">
          <Calendar className="h-3.5 w-3.5 text-slate-500 mt-0.5 mr-2" />
          <div className="text-xs text-slate-300">{date}</div>
        </div>
        <div className="flex items-start">
          <Users className="h-3.5 w-3.5 text-slate-500 mt-0.5 mr-2" />
          <div className="text-xs text-slate-300">{passengers} passengers</div>
        </div>
        <div className="flex items-start">
          <FileText className="h-3.5 w-3.5 text-slate-500 mt-0.5 mr-2" />
          <div className="text-xs text-slate-300">{airline}</div>
        </div>
      </div>
    </div>
  )
}

interface DocumentCardProps {
  title: string
  status: string
  description: string
  icon: string
}

function DocumentCard({ title, status, description, icon }: DocumentCardProps) {
  const getStatusColor = () => {
    switch (status) {
      case "Completed":
        return "bg-green-500/20 text-green-400 border-green-500/30"
      case "Active":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30"
      case "Updated":
        return "bg-purple-500/20 text-purple-400 border-purple-500/30"
      default:
        return "bg-slate-500/20 text-slate-400 border-slate-500/30"
    }
  }

  return (
    <div className="bg-slate-800/50 rounded-md p-4 border border-slate-700/50">
      <div className="flex items-start justify-between mb-2">
        <h4 className="text-sm font-medium text-slate-200">{title}</h4>
        <Badge className={`${getStatusColor()} text-xs`}>{status}</Badge>
      </div>
      <p className="text-xs text-slate-400">{description}</p>
    </div>
  )
}

interface ChatMessageProps {
  sender: string
  message: string
  time: string
  unread: boolean
}

function ChatMessage({ sender, message, time, unread }: ChatMessageProps) {
  return (
    <div className={`p-3 rounded-md ${unread ? 'bg-purple-500/10 border border-purple-500/20' : 'bg-slate-800/30'}`}>
      <div className="flex items-start justify-between mb-1">
        <span className="text-sm font-medium text-slate-200">{sender}</span>
        <span className="text-xs text-slate-500">{time}</span>
      </div>
      <p className="text-sm text-slate-300">{message}</p>
      {unread && <div className="mt-2 h-2 w-2 rounded-full bg-purple-500"></div>}
    </div>
  )
}

interface NotificationItemProps {
  title: string
  message: string
  time: string
  type: 'info' | 'warning' | 'success' | 'error'
}

function NotificationItem({ title, message, time, type }: NotificationItemProps) {
  const getTypeColor = () => {
    switch (type) {
      case 'info':
        return 'border-blue-500/30 bg-blue-500/10'
      case 'warning':
        return 'border-amber-500/30 bg-amber-500/10'
      case 'success':
        return 'border-green-500/30 bg-green-500/10'
      case 'error':
        return 'border-red-500/30 bg-red-500/10'
      default:
        return 'border-slate-500/30 bg-slate-500/10'
    }
  }

  return (
    <div className={`p-3 rounded-md border ${getTypeColor()}`}>
      <div className="flex items-start justify-between mb-1">
        <span className="text-sm font-medium text-slate-200">{title}</span>
        <span className="text-xs text-slate-500">{time}</span>
      </div>
      <p className="text-sm text-slate-300">{message}</p>
    </div>
  )
}

interface QuickActionButtonProps {
  title: string
  description: string
  icon: string
}

function QuickActionButton({ title, description, icon }: QuickActionButtonProps) {
  return (
    <button className="w-full p-3 rounded-md bg-slate-800/50 border border-slate-700/50 hover:bg-slate-700/50 transition-colors text-left">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-slate-200">{title}</span>
        <div className="h-6 w-6 rounded-md bg-purple-500/20 flex items-center justify-center">
          <FileText className="h-3 w-3 text-purple-500" />
        </div>
      </div>
      <p className="text-xs text-slate-400">{description}</p>
    </button>
  )
}

interface ContactCardProps {
  name: string
  role: string
  phone: string
  email: string
  emergency: boolean
}

function ContactCard({ name, role, phone, email, emergency }: ContactCardProps) {
  const initials = name
    .split(' ')
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className={`p-4 rounded-md border ${emergency ? 'bg-red-500/10 border-red-500/30' : 'bg-slate-800/50 border-slate-700/50'}`}>
      <div className="flex items-start space-x-3">
        <Avatar className="h-10 w-10">
          <AvatarFallback className={`${emergency ? 'bg-red-700 text-white' : 'bg-slate-700 text-purple-500'}`}>
            {initials || 'CT'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h4 className="text-sm font-medium text-slate-200">{name}</h4>
          <p className={`text-xs ${emergency ? 'text-red-400' : 'text-purple-400'}`}>{role}</p>
          <p className="text-xs text-slate-400 mt-1">{phone}</p>
          <p className="text-xs text-slate-400">{email}</p>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// BACKLINE & RENTALS COMPONENTS
// =============================================================================

interface BacklineRowProps {
  instrument: string
  category: string
  condition: string
  rentalRate: number
  status: string
}

function BacklineRow({ instrument, category, condition, rentalRate, status }: BacklineRowProps) {
  const getStatusBadge = () => {
    switch (status) {
      case "available":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Available</Badge>
      case "rented":
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Rented</Badge>
      case "maintenance":
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Maintenance</Badge>
      case "damaged":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Damaged</Badge>
      default:
        return <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30">{status}</Badge>
    }
  }

  const getConditionBadge = () => {
    switch (condition) {
      case "excellent":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Excellent</Badge>
      case "good":
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Good</Badge>
      case "fair":
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Fair</Badge>
      case "poor":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Poor</Badge>
      case "damaged":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Damaged</Badge>
      default:
        return <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30">{condition}</Badge>
    }
  }

  const getCategoryIcon = () => {
    switch (category.toLowerCase()) {
      case "guitar":
      case "electric":
      case "acoustic":
        return <Guitar className="h-4 w-4 text-purple-400" />
      case "drums":
      case "percussion":
        return <Drum className="h-4 w-4 text-purple-400" />
      case "piano":
      case "keyboard":
        return <Piano className="h-4 w-4 text-purple-400" />
      case "microphone":
      case "vocal":
        return <Mic className="h-4 w-4 text-purple-400" />
      default:
        return <Zap className="h-4 w-4 text-purple-400" />
    }
  }

  return (
    <tr className="hover:bg-slate-800/30">
      <td className="px-4 py-3">
        <div className="flex items-center">
          {getCategoryIcon()}
          <span className="ml-2 text-slate-300">{instrument}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-slate-300 capitalize">{category}</td>
      <td className="px-4 py-3">{getConditionBadge()}</td>
      <td className="px-4 py-3 text-slate-300">${rentalRate}/day</td>
      <td className="px-4 py-3">{getStatusBadge()}</td>
      <td className="px-4 py-3">
        <div className="flex space-x-2">
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
            <Edit className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-400 hover:text-red-300">
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </td>
    </tr>
  )
}

interface RentalCardProps {
  id: string
  instrument: string
  client: string
  startDate: string
  endDate: string
  dailyRate: number
  totalAmount: number
  status: 'active' | 'upcoming' | 'completed' | 'overdue'
  onEdit?: (id: string) => void | Promise<void>
  onExtend?: (id: string) => void | Promise<void>
  onReturn?: (id: string) => void | Promise<void>
}

function RentalCard({ id, instrument, client, startDate, endDate, dailyRate, totalAmount, status, onEdit, onExtend, onReturn }: RentalCardProps) {
  const getStatusBadge = () => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Active</Badge>
      case "upcoming":
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Upcoming</Badge>
      case "completed":
        return <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30">Completed</Badge>
      case "overdue":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Overdue</Badge>
      default:
        return <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30">{status}</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    return formatSafeDate(dateString)
  }

  const daysRemaining = () => {
    const end = new Date(endDate)
    const today = new Date()
    const diffTime = end.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  return (
    <div className="p-4 rounded-lg border border-slate-700/50 bg-slate-800/30 hover:bg-slate-800/50 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          <Zap className="h-5 w-5 text-purple-500 mr-2" />
          <h4 className="font-medium text-slate-200">{instrument}</h4>
        </div>
        {getStatusBadge()}
      </div>
      
      <div className="space-y-2 text-sm">
        <p className="text-slate-400">
          <span className="text-slate-300 font-medium">Client:</span> {client}
        </p>
        <p className="text-slate-400">
          <span className="text-slate-300 font-medium">Period:</span> {formatDate(startDate)} - {formatDate(endDate)}
        </p>
        <p className="text-slate-400">
          <span className="text-slate-300 font-medium">Rate:</span> ${dailyRate}/day
        </p>
        <p className="text-slate-400">
          <span className="text-slate-300 font-medium">Total:</span> ${totalAmount}
        </p>
        {status === 'active' && (
          <p className="text-amber-400">
            <span className="font-medium">Due in:</span> {daysRemaining()} days
          </p>
        )}
      </div>
      
      <div className="flex space-x-2 mt-4">
        <Button size="sm" variant="outline" className="flex-1" onClick={() => void onEdit?.(id)}>
          <Edit className="h-3 w-3 mr-1" />
          Edit
        </Button>
        <Button size="sm" variant="outline" className="flex-1" onClick={() => void onExtend?.(id)}>
          <Calendar className="h-3 w-3 mr-1" />
          Extend
        </Button>
        <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => void onReturn?.(id)}>
          <CheckCircle className="h-3 w-3 mr-1" />
          Return
        </Button>
      </div>
    </div>
  )
}
