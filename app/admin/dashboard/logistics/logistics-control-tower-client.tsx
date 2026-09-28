"use client"

import dynamic from "next/dynamic"
import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Boxes, LayoutDashboard, Loader2, Map, MessageSquare, Plane, Route, Utensils } from "lucide-react"

import { OperationsCommandShell } from "@/components/admin/operations/operations-command-shell"
import { LogisticsOverviewPanel } from "@/components/admin/logistics/command-center"
import { LogisticsScopeBar } from "@/components/admin/logistics/logistics-scope-bar"
import { TransportManager } from "@/components/admin/logistics/transport/transport-manager"
import { TravelOpsHub } from "@/components/admin/logistics/travel/travel-ops-hub"
import { PartyTravelMatrixPanel } from "@/components/admin/logistics/travel/party-travel-matrix-panel"
import { TravelCommandsPanel } from "@/components/admin/logistics/travel/travel-commands-panel"
import { TravelDocumentsPanel } from "@/components/admin/logistics/travel/travel-documents-panel"
import { LodgingManagement } from "@/components/admin/lodging-management"
import { EquipmentOpsPanel } from "@/components/admin/logistics/equipment-ops-panel"
import { BacklineOpsPanel } from "@/components/admin/logistics/backline/backline-ops-panel"
import { CateringOpsPanel } from "@/components/admin/logistics/catering/catering-ops-panel"
import { CommunicationsCommandCenter } from "@/components/admin/logistics/communications-command-center"
import { Button } from "@/components/ui/button"
import { TabsContent } from "@/components/ui/tabs"
import { useAuth } from "@/contexts/auth-context"
import { useActingContext } from "@/hooks/use-acting-context"
import { useAdminLogisticsRequest } from "@/hooks/use-admin-logistics-request"
import { useMultiAccount } from "@/hooks/use-multi-account"
import { hiringEntityFromAccount } from "@/lib/hiring/hiring-entity-from-account"
import {
  assertLogisticsScopeOrgConsistency,
  buildLogisticsScopeSearchParams,
  formatLogisticsScopeBadge,
  normalizeLogisticsTab,
  parseLogisticsScopeParams,
  type LogisticsPrimaryTab,
} from "@/lib/admin/logistics-scope"
import { cn } from "@/lib/utils"

const LogisticsDynamicManager = dynamic(
  () => import("@/components/admin/logistics-dynamic-manager").then((module) => module.LogisticsDynamicManager),
  { ssr: false, loading: PanelLoading },
)

const SiteMapManager = dynamic(
  () => import("@/components/admin/logistics/site-map/site-map-manager").then((module) => module.SiteMapManager),
  { ssr: false, loading: PanelLoading },
)

const PRIMARY_TABS = [
  { value: "overview", label: "Overview", icon: LayoutDashboard },
  { value: "travel", label: "Travel & Transport", icon: Route },
  { value: "production", label: "Production", icon: Boxes },
  { value: "communications", label: "Comms", icon: MessageSquare },
  { value: "maps", label: "Maps", icon: Map },
] as const

function PanelLoading() {
  return <div className="flex min-h-56 items-center justify-center text-slate-400"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Loading workspace…</div>
}

function DetailedScopeRequired({ domain }: { domain: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/40 p-8 text-center">
      <h2 className="font-semibold text-white">Select a tour or event</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm text-slate-400">
        {domain} contains operational and traveler-level detail. Choose a tour or event above to open a safely scoped workspace.
      </p>
    </div>
  )
}

function SecondaryNav({
  items,
  value,
  onChange,
}: {
  items: Array<{ value: string; label: string }>
  value: string
  onChange: (value: string) => void
}) {
  return (
    <nav aria-label="Workspace views" className="flex flex-wrap gap-2 rounded-xl border border-slate-700/70 bg-slate-950/40 p-2">
      {items.map((item) => (
        <Button
          aria-current={value === item.value ? "page" : undefined}
          className={cn(value === item.value && "border-cyan-400/30 bg-cyan-400/10 text-white")}
          key={item.value}
          onClick={() => onChange(item.value)}
          size="sm"
          type="button"
          variant="ghost"
        >
          {item.label}
        </Button>
      ))}
    </nav>
  )
}

export default function LogisticsControlTowerClient() {
  const { user } = useAuth()
  const { currentAccount } = useMultiAccount()
  const { actingHeaders, isActingReady } = useActingContext()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const scope = parseLogisticsScopeParams(searchParams)
  const normalizedTab = normalizeLogisticsTab(scope.tab)
  const activeTab = normalizedTab.tab
  const [selectedEventName, setSelectedEventName] = useState<string | null>(null)
  const [selectedTourName, setSelectedTourName] = useState<string | null>(null)
  const employer = useMemo(() => hiringEntityFromAccount(currentAccount), [currentAccount])
  const actingOrgId = (currentAccount?.profile_data?.ops_org_id as string | undefined) || employer?.entityId || null
  const orgLabel = useMemo(() => {
    const data = currentAccount?.profile_data
    return String(data?.organization_name || data?.name || data?.display_name || currentAccount?.account_type || "Organization")
  }, [currentAccount])

  useEffect(() => {
    setSelectedEventName(null)
    setSelectedTourName(null)
  }, [actingOrgId])

  const updateUrl = useCallback((updates: Parameters<typeof buildLogisticsScopeSearchParams>[0]["updates"]) => {
    const params = buildLogisticsScopeSearchParams({ current: searchParams, updates })
    if (actingOrgId) params.set("orgId", actingOrgId)
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }, [actingOrgId, pathname, router, searchParams])

  useEffect(() => {
    const consistency = assertLogisticsScopeOrgConsistency({ actingOrgId, urlOrgId: scope.orgId })
    if (!consistency.ok) {
      updateUrl({ orgId: actingOrgId, tourId: null, eventId: null, legId: null, stopId: null, recordId: null, issueId: null, siteMapId: null })
      return
    }
    if (normalizedTab.isAlias || (!scope.orgId && actingOrgId)) {
      updateUrl({
        orgId: actingOrgId,
        tab: normalizedTab.tab,
        panel: scope.panel || normalizedTab.panel,
      })
    }
  }, [actingOrgId, normalizedTab.isAlias, normalizedTab.panel, normalizedTab.tab, scope.orgId, scope.panel, updateUrl])

  const travelPanel = activeTab === "travel"
    ? scope.panel && ["ground", "air-travelers", "lodging-documents", "air-lodging"].includes(scope.panel)
      ? scope.panel === "air-lodging" ? "air-travelers" : scope.panel
      : "ground"
    : "ground"
  const productionPanel = activeTab === "production" && scope.panel && ["equipment", "backline", "catering", "rentals"].includes(scope.panel)
    ? scope.panel
    : "equipment"
  const communicationsPanel = activeTab === "communications" && scope.panel && ["attention", "announcements", "mentions", "acknowledgements"].includes(scope.panel)
    ? scope.panel as "attention" | "announcements" | "mentions" | "acknowledgements"
    : "attention"
  const mapsPanel = activeTab === "maps" && scope.panel && ["library", "draft", "published", "archived"].includes(scope.panel)
    ? scope.panel as "library" | "draft" | "published" | "archived"
    : "library"

  function changeScope(next: {
    tourId?: string | null
    eventId?: string | null
    legId?: string | null
    tourName?: string | null
    eventName?: string | null
  }) {
    if ("tourName" in next) setSelectedTourName(next.tourName || null)
    if ("eventName" in next) setSelectedEventName(next.eventName || null)
    updateUrl({
      tourId: "tourId" in next ? next.tourId : scope.tourId,
      eventId: "eventId" in next ? next.eventId : scope.eventId,
      legId: "legId" in next ? next.legId : scope.legId,
      stopId: null,
      recordId: null,
      issueId: null,
      siteMapId: null,
    })
  }

  return (
    <div className="space-y-6 px-1 pb-8">
      <OperationsCommandShell
        activeTab={activeTab}
        actions={
          <LogisticsScopeBar
            actingHeaders={actingHeaders}
            actingOrgId={actingOrgId}
            eventId={scope.eventId}
            isActingReady={isActingReady}
            legId={scope.legId}
            onChange={changeScope}
            orgLabel={orgLabel}
            tourId={scope.tourId}
          />
        }
        badge={formatLogisticsScopeBadge({
          orgLabel,
          tourName: selectedTourName || (scope.tourId ? "Tour scoped" : null),
          eventName: selectedEventName || (scope.eventId ? "Event scoped" : null),
          legLabel: scope.legId,
        })}
        description="See what needs attention across every tour and event, then move directly into the owning logistics workflow."
        eyebrow="Operations"
        onTabChange={(value) => updateUrl({ tab: value, panel: null })}
        tabColsClassName="md:grid-cols-5"
        tabs={[...PRIMARY_TABS]}
        title="Logistics control tower"
      >
        <TabsContent className="mt-0" value="overview">
          <LogisticsOverviewPanel
            eventId={scope.eventId || undefined}
            onOpenScope={(next) => changeScope(next)}
            tourId={scope.tourId || undefined}
          />
        </TabsContent>

        <TabsContent className="mt-0 space-y-6" value="travel">
          <SecondaryNav
            items={[
              { value: "ground", label: "Ground transport" },
              { value: "air-travelers", label: "Air & travelers" },
              { value: "lodging-documents", label: "Lodging & documents" },
            ]}
            onChange={(panel) => updateUrl({ tab: "travel", panel })}
            value={travelPanel}
          />
          {!scope.eventId && !scope.tourId ? <DetailedScopeRequired domain="Travel & Transport" /> : travelPanel === "ground" ? (
            <div className="space-y-6">
              <TransportManager eventId={scope.eventId || undefined} tourId={scope.tourId || undefined} />
              <LogisticsDynamicManager autoSave enableEditing={Boolean(scope.eventId || scope.tourId)} eventId={scope.eventId || undefined} showFilters tourId={scope.tourId || undefined} type="transportation" />
            </div>
          ) : travelPanel === "air-travelers" ? (
            <div className="space-y-6">
              <PartyTravelMatrixPanel eventId={scope.eventId} tourId={scope.tourId} />
              <TravelCommandsPanel eventId={scope.eventId} tourId={scope.tourId} />
              <TravelOpsHub eventId={scope.eventId || undefined} tourId={scope.tourId || undefined} />
            </div>
          ) : (
            <div className="space-y-6">
              <TravelDocumentsPanel eventId={scope.eventId} tourId={scope.tourId} />
              <LodgingManagement eventId={scope.eventId || undefined} tourId={scope.tourId || undefined} />
            </div>
          )}
        </TabsContent>

        <TabsContent className="mt-0 space-y-6" value="production">
          <SecondaryNav
            items={[
              { value: "equipment", label: "Equipment" },
              { value: "backline", label: "Backline" },
              { value: "catering", label: "Catering" },
              { value: "rentals", label: "Rentals" },
            ]}
            onChange={(panel) => updateUrl({ tab: "production", panel })}
            value={productionPanel}
          />
          {!scope.eventId && !scope.tourId ? <DetailedScopeRequired domain="Production" /> : (
            <>
              {productionPanel === "equipment" ? <EquipmentOpsPanel eventId={scope.eventId || undefined} tourId={scope.tourId || undefined} /> : null}
              {productionPanel === "backline" ? <BacklineOpsPanel eventId={scope.eventId || undefined} tourId={scope.tourId || undefined} /> : null}
              {productionPanel === "catering" ? <CateringOpsPanel eventId={scope.eventId || undefined} siteMapId={scope.siteMapId} tourId={scope.tourId || undefined} /> : null}
              {productionPanel === "rentals" ? <LogisticsDynamicManager autoSave enableEditing eventId={scope.eventId || undefined} showFilters tourId={scope.tourId || undefined} type="rental" /> : null}
            </>
          )}
        </TabsContent>

        <TabsContent className="mt-0 space-y-6" value="communications">
          <SecondaryNav
            items={[
              { value: "attention", label: "Attention" },
              { value: "announcements", label: "Announcements" },
              { value: "mentions", label: "Mentions" },
              { value: "acknowledgements", label: "Acknowledgements" },
            ]}
            onChange={(panel) => updateUrl({ tab: "communications", panel })}
            value={communicationsPanel}
          />
          <LogisticsCommunicationsWorkspace
            eventId={scope.eventId}
            eventName={selectedEventName}
            tourId={scope.tourId}
            userId={user?.id || null}
            view={communicationsPanel}
          />
        </TabsContent>

        <TabsContent className="mt-0 space-y-4" value="maps">
          <SecondaryNav
            items={[
              { value: "library", label: "Library" },
              { value: "draft", label: "Draft" },
              { value: "published", label: "Published" },
              { value: "archived", label: "Archived" },
            ]}
            onChange={(panel) => updateUrl({ tab: "maps", panel })}
            value={mapsPanel}
          />
          <div className="flex flex-col gap-3 rounded-xl border border-slate-700/70 bg-slate-950/40 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-white">Organization map library</h2>
              <p className="text-sm text-slate-400">Browse every accessible map. Select an event or tour before creating a new one.</p>
            </div>
            <Button asChild variant="outline"><Link href="/admin/dashboard/events">Find an event</Link></Button>
          </div>
          <SiteMapManager
            eventId={scope.eventId || undefined}
            eventLabel={selectedEventName}
            libraryStatus={mapsPanel === "library" ? "all" : mapsPanel}
            tourId={scope.tourId || undefined}
          />
        </TabsContent>
      </OperationsCommandShell>
    </div>
  )
}

function LogisticsCommunicationsWorkspace({
  eventId,
  eventName,
  tourId,
  userId,
  view,
}: {
  eventId: string | null
  eventName: string | null
  tourId: string | null
  userId: string | null
  view: "attention" | "announcements" | "mentions" | "acknowledgements"
}) {
  const { adminFetch, actingContextKey, isAdminReady } = useAdminLogisticsRequest()
  const [eventOwnerId, setEventOwnerId] = useState<string | null>(null)
  const [threadId, setThreadId] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    if (!eventId || !isAdminReady) {
      setEventOwnerId(null)
      setThreadId(null)
      return
    }
    setEventOwnerId(null)
    setThreadId(null)
    void Promise.all([
      adminFetch(`/api/admin/events/${eventId}`),
      adminFetch(`/api/admin/logistics/comms-thread?event_id=${eventId}`),
    ]).then(async ([eventResponse, threadResponse]) => {
      if (!active) return
      if (eventResponse.ok) {
        const event = await eventResponse.json()
        if (active) setEventOwnerId(event?.event?.created_by ?? event?.created_by ?? null)
      }
      if (threadResponse.ok) {
        const thread = await threadResponse.json()
        if (active) setThreadId(thread?.threadId ?? null)
      }
    }).catch(() => undefined)
    return () => { active = false }
  }, [actingContextKey, adminFetch, eventId, isAdminReady])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-xl border border-slate-700/70 bg-slate-950/40 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold text-white">Operational Comms</h2>
          <p className="text-sm text-slate-400">Announcements, acknowledgements, mentions, and logistics-linked discussion.</p>
        </div>
        <Button asChild variant="outline"><Link href="/admin/dashboard/communications"><MessageSquare className="mr-2 h-4 w-4" />Open direct-message inbox</Link></Button>
      </div>
      <CommunicationsCommandCenter
        eventId={eventId || undefined}
        eventName={eventName || undefined}
        isOwner={Boolean(eventId && eventOwnerId && userId && eventOwnerId === userId)}
        onThreadProvisioned={setThreadId}
        threadId={threadId || undefined}
        tourId={tourId || undefined}
        view={view}
      />
      <LogisticsDynamicManager autoSave enableEditing={Boolean(eventId || tourId)} eventId={eventId || undefined} showFilters tourId={tourId || undefined} type="communication" />
    </div>
  )
}
