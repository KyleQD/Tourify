"use client"

import { Suspense, useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CreateEventModal } from "../../components/events/create-event-modal"
import { Calendar, QrCode, ScanLine, Search, Settings2, TicketIcon, Wallet } from "lucide-react"
import { useCurrentVenue } from "@/app/venue/hooks/useCurrentVenue"
import { LoadingSpinner } from "@/app/venue/components/loading-spinner"
import { venueDashboardTabListClass } from "@/app/venue/lib/dashboard-ui"
import { VenueEmptyState } from "@/components/dashboard/venue-empty-state"
import { SaleStateBadge } from "../../components/tickets/sale-state-badge"
import { TicketSetupWizard } from "../../components/tickets/ticket-setup-wizard"
import { OrdersPanel } from "../../components/tickets/orders-panel"
import { GuestListPanel } from "../../components/tickets/guestlist-panel"
import { BoxOfficeSellPanel } from "../../components/tickets/box-office-panel"
import { deriveSaleState, type TicketSaleState } from "@/lib/ticketing/sale-state"
import { formatSafeDate, formatSafeTime } from "@/lib/events/admin-event-normalization"

// VEN-150/151/152/153 — event-scoped sales & box-office workspace.
// Purchased personal tickets intentionally live in the human wallet
// (/tickets/my-tickets), not inside Venue operations (VEN-152).

interface RowTicketType {
  id: string
  name: string
  price?: number
  all_in_price?: number
  mandatory_fees?: number
  quantity_available?: number
  quantity_sold?: number
}

interface VenueTicketEvent {
  id: string
  title: string
  start_at: string | null
  end_at: string | null
  status: string | null
  capacity: number | null
  ticketsSold: number
  totalInventory: number
  ticketTypes: RowTicketType[]
}

interface SetupPayload {
  config: Record<string, any> | null
  ticket_types: Array<RowTicketType & { is_active: boolean; is_complimentary: boolean }>
  inventory: { total_inventory: number; total_sold: number; available: number }
  sale_state: TicketSaleState
  sale_state_label: string
  sale_state_reason: string
  checkpoints?: string[]
  capabilities: Record<string, boolean>
}

function TicketsPageInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const eventIdContext = searchParams.get("event_id")
  const { venue, isLoading: isVenueLoading } = useCurrentVenue()

  const [events, setEvents] = useState<VenueTicketEvent[]>([])
  const [eventsLoading, setEventsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("overview")
  const [setupOpen, setSetupOpen] = useState(false)
  const [showCreateEvent, setShowCreateEvent] = useState(false)
  const [setup, setSetup] = useState<SetupPayload | null>(null)
  const [setupError, setSetupError] = useState<string | null>(null)

  const selectedId = eventIdContext || null

  const loadEvents = useCallback(async () => {
    if (!venue?.id) return
    setEventsLoading(true)
    try {
      const response = await fetch(`/api/venue/ticketing?venue_id=${encodeURIComponent(venue.id)}`, {
        credentials: "include",
        cache: "no-store",
      })
      if (!response.ok) {
        setEvents([])
        return
      }
      const payload = await response.json()
      const rows = Array.isArray(payload?.summary?.events) ? payload.summary.events : []
      setEvents(
        rows.map((event: any): VenueTicketEvent => {
          const ticketTypes: RowTicketType[] = Array.isArray(event.ticket_types) ? event.ticket_types : []
          const totalInventory =
            ticketTypes.reduce((sum: number, t) => sum + Number(t.quantity_available || 0), 0) || Number(event.capacity || 0)
          return {
            id: String(event.id),
            title: String(event.title || "Event"),
            start_at: event.start_at || null,
            end_at: event.end_at || null,
            status: event.status || null,
            capacity: Number(event.capacity || 0),
            ticketsSold: Number(event.tickets_sold || 0),
            totalInventory,
            ticketTypes,
          }
        }),
      )
    } finally {
      setEventsLoading(false)
    }
  }, [venue?.id])

  useEffect(() => {
    void loadEvents()
  }, [loadEvents])

  const loadSetup = useCallback(async () => {
    if (!selectedId) {
      setSetup(null)
      return
    }
    setSetupError(null)
    try {
      const response = await fetch(`/api/venue/events/${selectedId}/ticketing-setup`, { credentials: "include", cache: "no-store" })
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error || `Load failed (${response.status})`)
      }
      setSetup(await response.json())
    } catch (error) {
      setSetup(null)
      setSetupError(error instanceof Error ? error.message : "Failed to load ticketing details")
    }
  }, [selectedId])

  useEffect(() => {
    void loadSetup()
  }, [loadSetup])

  const selectEvent = (id: string | null) => {
    router.replace(id ? `/venue/dashboard/tickets?event_id=${id}` : "/venue/dashboard/tickets", { scroll: false })
  }

  const filteredEvents = useMemo(
    () =>
      events.filter((event) =>
        `${event.title}`.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [events, searchQuery],
  )

  const selectedEvent = filteredEvents.find((event) => event.id === selectedId) || null
  const activeTypes = setup?.ticket_types.filter((t) => t.is_active && !t.is_complimentary) || []
  const compPools = setup?.ticket_types.filter((t) => t.is_active && t.is_complimentary) || []

  const currency = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(amount)

  if (isVenueLoading)
    return (
      <div className="flex h-96 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tickets</h1>
          <p className="text-zinc-400">Sales, guest list and box office for your events</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {selectedId && (
            <Button onClick={() => setSetupOpen(true)}>
              <Settings2 className="mr-2 h-4 w-4" />
              {setup?.config?.ticketing_enabled ? "Manage ticketing" : "Generate Tickets"}
            </Button>
          )}
          <Button variant="outline" className="border-zinc-700" onClick={() => setShowCreateEvent(true)}>
            <Calendar className="mr-2 h-4 w-4" />
            Create Event
          </Button>
          {/* VEN-152 — human wallet stays outside Venue operations */}
          <Button asChild variant="ghost" size="sm" className="text-zinc-500" title="Your personal account wallet">
            <Link href="/tickets/my-tickets">
              <Wallet className="mr-1 h-4 w-4" />
              Personal wallet
            </Link>
          </Button>
        </div>
      </div>

      {/* Event selector */}
      <Card className="border-zinc-800 bg-gray-900">
        <CardContent className="space-y-3 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
            <input
              aria-label="Filter events"
              placeholder="Filter events…"
              className="w-full rounded-md border border-zinc-700 bg-gray-800 py-2 pl-10 pr-3 text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {eventsLoading ? (
            <div className="flex h-20 items-center justify-center"><LoadingSpinner /></div>
          ) : filteredEvents.length === 0 ? (
            <VenueEmptyState
              icon={TicketIcon}
              title={searchQuery ? "No matching events" : "No events yet"}
              description={searchQuery ? "Try a different filter." : "Create an event, then configure ticketing for it."}
              action={!searchQuery ? undefined : undefined}
            />
          ) : (
            <ul className="grid grid-cols-1 gap-2 lg:grid-cols-2" aria-label="Events">
              {filteredEvents.map((event) => {
                const saleState = deriveSaleState({
                  eventStatus: event.status,
                  eventStartAt: event.start_at,
                  eventEndAt: event.end_at,
                  saleStart: setup?.config?.sale_start ?? null,
                  saleEnd: setup?.config?.sale_end ?? null,
                  ticketingEnabled: true,
                  totalInventory: event.totalInventory,
                  totalSold: event.ticketsSold,
                  activeTypeCount: event.ticketTypes.length,
                })
                const isSelected = event.id === selectedId
                return (
                  <li key={event.id}>
                    <button
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => selectEvent(isSelected ? null : event.id)}
                      className={`flex w-full flex-col gap-1 rounded-md border p-3 text-left transition ${
                        isSelected ? "border-purple-500 bg-purple-600/10" : "border-zinc-800 bg-zinc-950/50 hover:border-zinc-600"
                      }`}
                    >
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-zinc-100">{event.title}</span>
                        <SaleStateBadge state={saleState.state} label={saleState.label} />
                      </span>
                      <span className="text-xs text-zinc-400">
                        {formatSafeDate(event.start_at)} · {formatSafeTime(event.start_at)} ·{" "}
                        {event.ticketsSold}/{event.totalInventory || "?"} sold
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {!selectedId ? (
        <VenueEmptyState
          icon={QrCode}
          title="Select an event to manage ticketing"
          description="Pick an event above to view sales, run the box office and manage the guest list."
        />
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className={venueDashboardTabListClass}>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="types">Ticket Types</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="guestlist">Guest List &amp; Comps</TabsTrigger>
            <TabsTrigger value="box-office">Box Office</TabsTrigger>
            <TabsTrigger value="door">Door</TabsTrigger>
          </TabsList>

          {/* OVERVIEW */}
          <TabsContent value="overview" className="mt-6 space-y-4">
            {setupError ? (
              <Card className="border-red-800 bg-red-950/30">
                <CardContent className="space-y-2 p-5 text-sm text-red-300">
                  <p>{setupError}</p>
                  <Button size="sm" variant="outline" onClick={() => void loadSetup()}>Retry</Button>
                </CardContent>
              </Card>
            ) : !setup ? (
              <div className="flex h-40 items-center justify-center"><LoadingSpinner /></div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <Card className="border-zinc-800 bg-gray-900">
                    <CardContent className="p-4">
                      <p className="text-xs text-zinc-500">Sale state</p>
                      <div className="mt-1 flex items-center gap-2">
                        <SaleStateBadge state={setup.sale_state} label={setup.sale_state_label} />
                      </div>
                      <p className="mt-2 text-xs text-zinc-400">{setup.sale_state_reason}</p>
                    </CardContent>
                  </Card>
                  <Card className="border-zinc-800 bg-gray-900">
                    <CardContent className="p-4">
                      <p className="text-xs text-zinc-500">Inventory</p>
                      <p className="text-xl font-semibold">{setup.inventory.available} available</p>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-800">
                        <div
                          className="h-full bg-purple-600"
                          style={{
                            width: `${
                              setup.inventory.total_inventory > 0
                                ? Math.min(100, (setup.inventory.total_sold / setup.inventory.total_inventory) * 100)
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                      <p className="mt-1 text-xs text-zinc-500">{setup.inventory.total_sold}/{setup.inventory.total_inventory || "?"} sold</p>
                    </CardContent>
                  </Card>
                  <Card className="border-zinc-800 bg-gray-900">
                    <CardContent className="p-4">
                      <p className="text-xs text-zinc-500">Door</p>
                      <p className="mt-1 text-sm text-zinc-300">Open scanner for this event.</p>
                      <Button asChild size="sm" className="mt-2 bg-emerald-600 hover:bg-emerald-500">
                        <Link href={`/venue/events/${selectedId}/check-in`}>
                          <ScanLine className="mr-2 h-4 w-4" />Open door
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                {!setup.config?.ticketing_enabled && (
                  <Card className="border-yellow-700 bg-yellow-950/20">
                    <CardContent className="flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm text-yellow-200">Ticketing isn’t configured for this event yet.</p>
                      <Button size="sm" onClick={() => setSetupOpen(true)}>
                        <Settings2 className="mr-2 h-4 w-4" />Set up ticketing
                      </Button>
                    </CardContent>
                  </Card>
                )}

                <p className="text-xs text-zinc-500">
                  Full order financials are visible only to accounts with finance authority; your share appears under Finance → Settlements.
                </p>
              </>
            )}
          </TabsContent>

          {/* TYPES */}
          <TabsContent value="types" className="mt-6 space-y-3">
            {activeTypes.length === 0 && compPools.length === 0 ? (
              <VenueEmptyState
                icon={Settings2}
                title="No ticket types yet"
                description="Add tiers, prices and quantities in the setup wizard."
                action={{ label: "Open setup", onClick: () => setSetupOpen(true) }}
              />
            ) : (
              <ul className="grid grid-cols-1 gap-3 md:grid-cols-2" aria-label="Ticket types">
                {[...activeTypes, ...compPools].map((type) => (
                  <li key={type.id} className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-medium text-zinc-100">{type.name}</h3>
                      {type.is_complimentary ? (
                        <Badge variant="outline" className="border-sky-600 text-sky-400">Comp pool</Badge>
                      ) : (
                        <Badge variant="outline" className="border-zinc-700">{currency(Number(type.all_in_price ?? type.price ?? 0))}</Badge>
                      )}
                    </div>
                    {!type.is_complimentary && (
                      <p className="mt-1 text-xs text-zinc-400">
                        {currency(Number(type.price ?? 0))} base
                        {Number(type.mandatory_fees || 0) > 0 ? ` + ${currency(Number(type.mandatory_fees))} fees` : ""}
                      </p>
                    )}
                    <div className="mt-2 flex justify-between text-sm">
                      <span>{Number(type.quantity_sold || 0)}/{Number(type.quantity_available || 0)} sold</span>
                      <span className="text-zinc-400">{Math.max(0, Number(type.quantity_available || 0) - Number(type.quantity_sold || 0))} left</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>

          {/* ORDERS */}
          <TabsContent value="orders" className="mt-6">
            <OrdersPanel eventId={selectedId} canRefund={Boolean(setup?.capabilities?.process_refunds)} />
          </TabsContent>

          {/* GUEST LIST */}
          <TabsContent value="guestlist" className="mt-6">
            <GuestListPanel
              eventId={selectedId}
              canManageGuestlist={Boolean(setup?.capabilities?.manage_guestlist)}
              canIssueComps={Boolean(setup?.capabilities?.issue_comps)}
              ticketTypes={[...activeTypes, ...compPools].map((t) => ({ id: t.id, name: t.name }))}
            />
          </TabsContent>

          {/* BOX OFFICE */}
          <TabsContent value="box-office" className="mt-6">
            {setup?.capabilities?.operate_box_office === false ? (
              <VenueEmptyState icon={QrCode} title="Box office not permitted" description="You need “Operate box office” permission to sell here." />
            ) : (
              <BoxOfficeSellPanel
                eventId={selectedId}
                ticketTypes={[...activeTypes, ...compPools].map((t) => ({
                  id: t.id,
                  name: t.name,
                  all_in_price: Number(t.all_in_price ?? t.price ?? 0),
                  available: Math.max(0, Number(t.quantity_available || 0) - Number(t.quantity_sold || 0)),
                  is_complimentary: t.is_complimentary,
                }))}
                onSold={() => void Promise.all([loadEvents(), loadSetup()])}
              />
            )}
          </TabsContent>

          {/* DOOR */}
          <TabsContent value="door" className="mt-6">
            <Card className="border-zinc-800 bg-gray-900">
              <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-zinc-100">Door check-in scanner</p>
                  <p className="text-sm text-zinc-400">Validates QR credentials with idempotent scans and reverse check-in.</p>
                </div>
                <Button asChild className="bg-emerald-600 hover:bg-emerald-500">
                  <Link href={`/venue/events/${selectedId}/check-in`}>
                    <ScanLine className="mr-2 h-4 w-4" />Open door
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {selectedId && (
        <TicketSetupWizard
          eventId={selectedId}
          open={setupOpen}
          onOpenChange={setSetupOpen}
          onSaved={() => void Promise.all([loadEvents(), loadSetup()])}
        />
      )}

      <CreateEventModal isOpen={showCreateEvent} onClose={() => setShowCreateEvent(false)} />
    </div>
  )
}

export default function TicketsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-96 items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      }
    >
      <TicketsPageInner />
    </Suspense>
  )
}
