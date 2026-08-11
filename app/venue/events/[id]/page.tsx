"use client"

import { use, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { VenuePageHeader } from "@/components/dashboard/venue-page-header"
import { VenueEmptyState } from "@/components/dashboard/venue-empty-state"
import { VenuePageSkeleton } from "@/components/dashboard/venue-page-skeleton"
import { VENUE_PRIMARY_BTN } from "@/components/dashboard/venue-tokens"
import {
  normalizeVenueEventOpsTab,
  VENUE_EVENT_OPS_TABS,
  type VenueEventOpsTab,
} from "@/lib/venue/event-ops-tabs"
import { useVenueEvents } from "@/app/venue/lib/hooks/use-venue-events"
import { useCurrentVenue } from "@/app/venue/hooks/useCurrentVenue"
import { venueService } from "@/lib/services/venue.service"
import { formatSafeDate, formatSafeTime } from "@/lib/events/admin-event-normalization"
import { formatSafeCurrency } from "@/lib/format/number-format"
import {
  ArrowLeft,
  CalendarDays,
  DollarSign,
  ExternalLink,
  FileText,
  MapPin,
  Package,
  QrCode,
  ScanLine,
  Users,
  MessageSquare,
} from "lucide-react"

interface EventOpsPageProps {
  params: Promise<{ id: string }>
}

function collaborationLabel(organizerId?: string, venueUserId?: string) {
  if (!organizerId) return { label: "Venue-produced", tone: "emerald" as const }
  if (venueUserId && organizerId === venueUserId) return { label: "Venue-produced", tone: "emerald" as const }
  return { label: "Partner-hosted", tone: "blue" as const }
}

export default function VenueEventOpsPage({ params }: EventOpsPageProps) {
  const { id } = use(params)
  const { venue } = useCurrentVenue()
  const { events, isLoading } = useVenueEvents({ venueId: venue?.id })
  const [activeTab, setActiveTab] = useState<VenueEventOpsTab>("overview")
  const [ticketSummary, setTicketSummary] = useState<{
    sold: number
    total: number
    revenue: number
    avgPrice: number
    budgetRange?: string
  } | null>(null)
  const [shifts, setShifts] = useState<any[]>([])
  const [equipment, setEquipment] = useState<any[]>([])
  const [documents, setDocuments] = useState<any[]>([])
  const [bookingRequest, setBookingRequest] = useState<any | null>(null)
  const [siteMapCount, setSiteMapCount] = useState<number>(0)

  const event = useMemo(() => events.find((row) => row.id === id), [events, id])

  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get("tab")
    if (tab) setActiveTab(normalizeVenueEventOpsTab(tab))
  }, [])

  useEffect(() => {
    if (!venue?.id || !id) return
    let cancelled = false

    async function loadAll() {
      try {
        // --- Ticketing ---
        const tickRes = await fetch(
          `/api/venue/ticketing?venue_id=${encodeURIComponent(venue.id)}`,
          { credentials: "include", cache: "no-store" },
        )
        if (tickRes.ok) {
          const payload = await tickRes.json()
          const rows = Array.isArray(payload?.summary?.events) ? payload.summary.events : []
          const match = rows.find((row: { id?: string }) => String(row.id) === id)
          if (!cancelled && match) {
            const ticketTypes = Array.isArray(match.ticket_types) ? match.ticket_types : []
            const total =
              ticketTypes.reduce(
                (sum: number, ticket: { quantity_available?: number }) =>
                  sum + Number(ticket.quantity_available || 0),
                0,
              ) || Number(match.capacity || 0)
            const sold = Number(match.tickets_sold || 0)
            const revenue = Number(match.gross_revenue || 0)
            setTicketSummary({
              sold,
              total,
              revenue,
              avgPrice: sold > 0 ? revenue / sold : 0,
            })
          } else if (!cancelled) {
            setTicketSummary(null)
          }
        }

        // --- Shifts (filtered by event date) ---
        const shiftsRes = await fetch(
          `/api/venue/shifts?venue_id=${encodeURIComponent(venue.id)}`,
          { credentials: "include", cache: "no-store" },
        )
        if (!cancelled && shiftsRes.ok) {
          const { data: allShifts } = await shiftsRes.json()
          setShifts(allShifts || [])
        }

        // --- Equipment ---
        const equip = await venueService.getVenueEquipment(venue.id)
        if (!cancelled) setEquipment(equip)

        // --- Documents ---
        const docs = await venueService.getVenueDocuments(venue.id)
        if (!cancelled) setDocuments(docs)

        // --- Booking request tied to this event ---
        const bookingsRes = await fetch(
          `/api/venue/booking-requests?venue_id=${encodeURIComponent(venue.id)}`,
          { credentials: "include", cache: "no-store" },
        )
        if (!cancelled && bookingsRes.ok) {
          const { data: allBookings } = await bookingsRes.json()
          const matched = (allBookings || []).find(
            (b: any) => b.event_id === id || b.id === id,
          )
          setBookingRequest(matched || null)
        }

        // --- Site maps count ---
        const mapsRes = await fetch(
          `/api/site-maps/shared?venue_id=${encodeURIComponent(venue.id)}`,
          { credentials: "include", cache: "no-store" },
        )
        if (!cancelled && mapsRes.ok) {
          const { data: maps } = await mapsRes.json()
          setSiteMapCount(Array.isArray(maps) ? maps.length : 0)
        }
      } catch {
        // individual failures are non-fatal; tabs show empty states
      }
    }

    void loadAll()
    return () => { cancelled = true }
  }, [venue?.id, id])

  if (isLoading) return <VenuePageSkeleton />
  if (!event) notFound()

  const collab = collaborationLabel(event.organizerId, venue?.user_id)
  const startLabel = formatSafeDate(event.startDate)
  const timeLabel = `${formatSafeTime(event.startDate)} – ${formatSafeTime(event.endDate)}`

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="ghost" size="sm" className="text-zinc-400">
          <Link href="/venue/events">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Events
          </Link>
        </Button>
      </div>

      <VenuePageHeader
        title={event.title}
        subtitle={event.description || "Venue event operations"}
        icon={CalendarDays}
        actions={
          <>
            <Button asChild className={VENUE_PRIMARY_BTN}>
              <Link href={`/venue/events/${event.id}/check-in`}>
                <ScanLine className="mr-2 h-4 w-4" />
                Door Check-In
              </Link>
            </Button>
            <Button asChild variant="outline" className="border-zinc-700">
              <Link href={`/venue/dashboard/tickets`}>
                <QrCode className="mr-2 h-4 w-4" />
                Tickets
              </Link>
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap gap-2">
        <Badge className="bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/15">{event.status || "scheduled"}</Badge>
        <Badge variant="outline" className="border-zinc-700 text-zinc-300">{event.type}</Badge>
        <Badge
          variant="outline"
          className={
            collab.tone === "emerald"
              ? "border-emerald-500/40 text-emerald-200"
              : "border-blue-500/40 text-blue-200"
          }
        >
          {collab.label}
        </Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="border-zinc-800 bg-zinc-900">
          <CardContent className="flex items-center gap-3 p-4 text-sm text-zinc-300">
            <CalendarDays className="h-4 w-4 text-emerald-300" />
            <div>
              <p className="font-medium text-zinc-100">{startLabel}</p>
              <p className="text-xs text-zinc-500">{timeLabel}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900">
          <CardContent className="flex items-center gap-3 p-4 text-sm text-zinc-300">
            <MapPin className="h-4 w-4 text-emerald-300" />
            <div>
              <p className="font-medium text-zinc-100">{event.location || venue?.location || "Venue"}</p>
              <p className="text-xs text-zinc-500">{event.venue}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900">
          <CardContent className="flex items-center gap-3 p-4 text-sm text-zinc-300">
            <Users className="h-4 w-4 text-emerald-300" />
            <div>
              <p className="font-medium text-zinc-100">{event.capacity || "—"} capacity</p>
              <p className="text-xs text-zinc-500">{event.organizerName || "Organizer TBD"}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(normalizeVenueEventOpsTab(value))}>
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-zinc-900 p-1">
          {VENUE_EVENT_OPS_TABS.map((tab) => {
            const Icon = tab.icon
            return (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="data-[state=active]:bg-emerald-500/15 data-[state=active]:text-emerald-100"
              >
                <Icon className="mr-1.5 h-3.5 w-3.5" />
                {tab.label}
              </TabsTrigger>
            )
          })}
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader>
              <CardTitle className="text-base text-zinc-100">Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-zinc-400">
              <p>{event.description || "No description provided."}</p>
              {event.organizerName ? (
                <p>
                  Organizer: <span className="text-zinc-200">{event.organizerName}</span>
                  {collab.label === "Partner-hosted" ? (
                    <span className="ml-2 text-xs text-blue-300">
                      (Artist or org booking — collaborate via messages)
                    </span>
                  ) : null}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2 pt-2">
                <Button asChild size="sm" className={VENUE_PRIMARY_BTN}>
                  <Link href={`/venue/events/${event.id}/check-in`}>Open door</Link>
                </Button>
                <Button asChild size="sm" variant="outline" className="border-zinc-700">
                  <Link href="/venue/staff/scheduling">Assign staff</Link>
                </Button>
                <Button asChild size="sm" variant="outline" className="border-zinc-700">
                  <Link href="/venue/messages">
                    Message partners
                    <ExternalLink className="ml-1 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tickets" className="mt-4">
          <Card className="border-zinc-800 bg-zinc-900">
            <CardContent className="space-y-4 p-6">
              {ticketSummary && (ticketSummary.sold > 0 || ticketSummary.total > 0) ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-md border border-zinc-800 bg-zinc-950/60 p-3">
                      <p className="text-xs text-zinc-500">Sold</p>
                      <p className="text-xl font-semibold text-zinc-100">{ticketSummary.sold}</p>
                    </div>
                    <div className="rounded-md border border-zinc-800 bg-zinc-950/60 p-3">
                      <p className="text-xs text-zinc-500">Capacity / inventory</p>
                      <p className="text-xl font-semibold text-zinc-100">{ticketSummary.total}</p>
                    </div>
                    <div className="rounded-md border border-zinc-800 bg-zinc-950/60 p-3">
                      <p className="text-xs text-zinc-500">Gross revenue</p>
                      <p className="text-xl font-semibold text-zinc-100">
                        {new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: "USD",
                          maximumFractionDigits: 0,
                        }).format(ticketSummary.revenue)}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild size="sm" className={VENUE_PRIMARY_BTN}>
                      <Link href={`/venue/events/${event.id}/check-in`}>Open check-in</Link>
                    </Button>
                    <Button asChild size="sm" variant="outline" className="border-zinc-700">
                      <Link href="/venue/dashboard/tickets">Ticket management</Link>
                    </Button>
                  </div>
                </>
              ) : (
                <VenueEmptyState
                  icon={QrCode}
                  title="Ticketing & door"
                  description="No ticket sales yet for this event. Open ticket management to configure tiers, then run door check-in."
                  action={{ label: "Open tickets", href: "/venue/dashboard/tickets" }}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── PEOPLE ─────────────────────────────────────────────── */}
        <TabsContent value="people" className="mt-4">
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base text-zinc-100">Staff & crew</CardTitle>
              <Button asChild size="sm" className={VENUE_PRIMARY_BTN}>
                <Link href="/venue/staff/scheduling">Manage shifts</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {shifts.length === 0 ? (
                <VenueEmptyState
                  icon={Users}
                  title="No shifts scheduled"
                  description="Assign staff shifts for this event from the Scheduling page."
                  action={{ label: "Open scheduling", href: "/venue/staff/scheduling" }}
                />
              ) : (
                <div className="divide-y divide-zinc-800">
                  {shifts.slice(0, 10).map((shift: any) => (
                    <div key={shift.id} className="flex items-center justify-between py-3 text-sm">
                      <div>
                        <p className="font-medium text-zinc-200">{shift.title || shift.role || "Shift"}</p>
                        <p className="text-xs text-zinc-500">
                          {shift.department || "General"} ·{" "}
                          {shift.start_time ? new Date(shift.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                          {" – "}
                          {shift.end_time ? new Date(shift.end_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                        </p>
                      </div>
                      <Badge variant="outline" className="border-zinc-700 text-zinc-400 text-xs">
                        {shift.status || "scheduled"}
                      </Badge>
                    </div>
                  ))}
                  {shifts.length > 10 && (
                    <p className="pt-3 text-xs text-zinc-500">+{shifts.length - 10} more shifts — view all in Scheduling</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── LOGISTICS ──────────────────────────────────────────── */}
        <TabsContent value="logistics" className="mt-4 space-y-4">
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base text-zinc-100">Equipment</CardTitle>
              <Button asChild size="sm" variant="outline" className="border-zinc-700">
                <Link href="/venue/equipment">Manage all</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {equipment.length === 0 ? (
                <p className="text-sm text-zinc-500">No equipment in inventory.</p>
              ) : (
                <div className="divide-y divide-zinc-800">
                  {equipment.slice(0, 8).map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-zinc-500" />
                        <div>
                          <p className="font-medium text-zinc-200">{item.name}</p>
                          <p className="text-xs text-zinc-500">{item.category} · qty {item.quantity}</p>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          item.condition === "excellent" || item.condition === "good"
                            ? "border-emerald-800 text-emerald-300"
                            : item.condition === "needs_repair" || item.condition === "out_of_service"
                            ? "border-red-800 text-red-300"
                            : "border-zinc-700 text-zinc-400"
                        }`}
                      >
                        {(item.condition || "unknown").replace("_", " ")}
                      </Badge>
                    </div>
                  ))}
                  {equipment.length > 8 && (
                    <p className="pt-3 text-xs text-zinc-500">+{equipment.length - 8} more items in inventory</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base text-zinc-100">Site maps</CardTitle>
              <Button asChild size="sm" variant="outline" className="border-zinc-700">
                <Link href="/venue/dashboard/site-maps">View maps</Link>
              </Button>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-400">
                {siteMapCount > 0
                  ? `${siteMapCount} site map${siteMapCount !== 1 ? "s" : ""} available for this venue.`
                  : "No site maps uploaded yet."}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── ADVANCING ──────────────────────────────────────────── */}
        <TabsContent value="advancing" className="mt-4">
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base text-zinc-100">Advance documents</CardTitle>
              <Button asChild size="sm" variant="outline" className="border-zinc-700">
                <Link href="/venue/documents">Manage all</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {documents.length === 0 ? (
                <VenueEmptyState
                  icon={FileText}
                  title="No documents"
                  description="Upload riders, tech specs, insurance certificates, and house rules in Documents."
                  action={{ label: "Open documents", href: "/venue/documents" }}
                />
              ) : (
                <div className="divide-y divide-zinc-800">
                  {documents.slice(0, 8).map((doc: any) => (
                    <div key={doc.id} className="flex items-center justify-between py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-zinc-500" />
                        <div>
                          <p className="font-medium text-zinc-200">{doc.name}</p>
                          <p className="text-xs text-zinc-500 capitalize">{(doc.document_type || "other").replace("_", " ")}</p>
                        </div>
                      </div>
                      {doc.file_url && (
                        <Button asChild size="sm" variant="ghost" className="h-7 text-zinc-400">
                          <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                      )}
                    </div>
                  ))}
                  {documents.length > 8 && (
                    <p className="pt-3 text-xs text-zinc-500">+{documents.length - 8} more in Documents</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── DAY SHEET ──────────────────────────────────────────── */}
        <TabsContent value="day-sheet" className="mt-4">
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader>
              <CardTitle className="text-base text-zinc-100">Day sheet</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-zinc-300">
              <p><span className="text-zinc-500">Date:</span> {startLabel}</p>
              <p><span className="text-zinc-500">Doors / show:</span> {timeLabel}</p>
              <p><span className="text-zinc-500">Capacity:</span> {event.capacity || "—"}</p>
              <p><span className="text-zinc-500">Location:</span> {event.location || venue?.location || "—"}</p>
              <Button asChild size="sm" className={`mt-4 ${VENUE_PRIMARY_BTN}`}>
                <Link href={`/venue/events/${event.id}/check-in`}>Start door</Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── COMMUNICATIONS ─────────────────────────────────────── */}
        <TabsContent value="communications" className="mt-4">
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base text-zinc-100">Event communications</CardTitle>
              <Button asChild size="sm" variant="outline" className="border-zinc-700">
                <Link href="/venue/messages">Open inbox</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {bookingRequest ? (
                <div className="space-y-3 text-sm">
                  <div className="rounded-md border border-zinc-800 bg-zinc-950/60 p-4 space-y-2">
                    <p className="font-medium text-zinc-200">Booking request: {bookingRequest.event_name}</p>
                    <p className="text-zinc-400">
                      Requester: <span className="text-zinc-200">{bookingRequest.contact_email || "—"}</span>
                    </p>
                    {bookingRequest.contact_phone && (
                      <p className="text-zinc-400">Phone: <span className="text-zinc-200">{bookingRequest.contact_phone}</span></p>
                    )}
                    <p className="text-zinc-400">
                      Status:{" "}
                      <Badge variant="outline" className="ml-1 text-xs border-zinc-700">
                        {bookingRequest.status}
                      </Badge>
                    </p>
                    {bookingRequest.description && (
                      <p className="text-zinc-500 text-xs">{bookingRequest.description}</p>
                    )}
                  </div>
                  <Button asChild size="sm" className={VENUE_PRIMARY_BTN}>
                    <Link href="/venue/messages">
                      <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
                      Message organizer
                    </Link>
                  </Button>
                </div>
              ) : (
                <VenueEmptyState
                  icon={MessageSquare}
                  title="No booking request found"
                  description="If this event came in via a booking request, the requester details will appear here. Message artists and organizers from the venue inbox."
                  action={{ label: "Open messages", href: "/venue/messages" }}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── MONEY ──────────────────────────────────────────────── */}
        <TabsContent value="money" className="mt-4">
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base text-zinc-100">Revenue & settlements</CardTitle>
              <Button asChild size="sm" variant="outline" className="border-zinc-700">
                <Link href="/venue/finances">Full finances</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {ticketSummary ? (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-md border border-zinc-800 bg-zinc-950/60 p-3">
                      <p className="text-xs text-zinc-500">Gross revenue</p>
                      <p className="text-xl font-semibold text-emerald-300">
                        {formatSafeCurrency(ticketSummary.revenue)}
                      </p>
                    </div>
                    <div className="rounded-md border border-zinc-800 bg-zinc-950/60 p-3">
                      <p className="text-xs text-zinc-500">Tickets sold</p>
                      <p className="text-xl font-semibold text-zinc-100">{ticketSummary.sold}</p>
                    </div>
                    <div className="rounded-md border border-zinc-800 bg-zinc-950/60 p-3">
                      <p className="text-xs text-zinc-500">Avg. ticket price</p>
                      <p className="text-xl font-semibold text-zinc-100">
                        {formatSafeCurrency(ticketSummary.avgPrice)}
                      </p>
                    </div>
                    <div className="rounded-md border border-zinc-800 bg-zinc-950/60 p-3">
                      <p className="text-xs text-zinc-500">Booking budget</p>
                      <p className="text-xl font-semibold text-zinc-100">
                        {bookingRequest?.budget_range || "—"}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button asChild size="sm" className={VENUE_PRIMARY_BTN}>
                      <Link href={`/venue/events/${event.id}/check-in`}>
                        <DollarSign className="mr-1.5 h-3.5 w-3.5" />
                        Door check-in
                      </Link>
                    </Button>
                    <Button asChild size="sm" variant="outline" className="border-zinc-700">
                      <Link href="/venue/finances">View all finances</Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <VenueEmptyState
                  icon={DollarSign}
                  title="No revenue data yet"
                  description="Ticket sales and revenue for this event will appear here once tickets are sold."
                  action={{ label: "Set up ticketing", href: "/venue/dashboard/tickets" }}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
