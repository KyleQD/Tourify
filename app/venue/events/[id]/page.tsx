"use client"

import { use, useMemo, useState } from "react"
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
import { formatSafeDate, formatSafeTime } from "@/lib/events/admin-event-normalization"
import {
  ArrowLeft,
  CalendarDays,
  ExternalLink,
  MapPin,
  QrCode,
  ScanLine,
  Users,
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

  const event = useMemo(() => events.find((row) => row.id === id), [events, id])

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
            <CardContent className="p-6">
              <VenueEmptyState
                icon={QrCode}
                title="Ticketing & door"
                description="Manage ticket tiers from Tickets, then run door check-in for this event."
                action={{ label: "Open check-in", href: `/venue/events/${event.id}/check-in` }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="people" className="mt-4">
          <Card className="border-zinc-800 bg-zinc-900">
            <CardContent className="p-6">
              <VenueEmptyState
                icon={Users}
                title="Staff & crew"
                description="Assign venue staff and publish shifts for this show from Scheduling."
                action={{ label: "Open scheduling", href: "/venue/staff/scheduling" }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logistics" className="mt-4">
          <Card className="border-zinc-800 bg-zinc-900">
            <CardContent className="space-y-4 p-6">
              <p className="text-sm text-zinc-400">Equipment inventory and site maps for advancing this date.</p>
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm" className={VENUE_PRIMARY_BTN}>
                  <Link href="/venue/equipment">Equipment</Link>
                </Button>
                <Button asChild size="sm" variant="outline" className="border-zinc-700">
                  <Link href="/venue/dashboard/site-maps">Site maps</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advancing" className="mt-4">
          <Card className="border-zinc-800 bg-zinc-900">
            <CardContent className="p-6">
              <VenueEmptyState
                icon={CalendarDays}
                title="Advance documents"
                description="Store riders, tech specs, insurance, and house rules in Documents."
                action={{ label: "Open documents", href: "/venue/documents" }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="day-sheet" className="mt-4">
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader>
              <CardTitle className="text-base text-zinc-100">Day sheet</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-zinc-300">
              <p>
                <span className="text-zinc-500">Date:</span> {startLabel}
              </p>
              <p>
                <span className="text-zinc-500">Doors / show:</span> {timeLabel}
              </p>
              <p>
                <span className="text-zinc-500">Capacity:</span> {event.capacity || "—"}
              </p>
              <p>
                <span className="text-zinc-500">Location:</span> {event.location || venue?.location || "—"}
              </p>
              <Button asChild size="sm" className={`mt-4 ${VENUE_PRIMARY_BTN}`}>
                <Link href={`/venue/events/${event.id}/check-in`}>Start door</Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="communications" className="mt-4">
          <Card className="border-zinc-800 bg-zinc-900">
            <CardContent className="p-6">
              <VenueEmptyState
                icon={Users}
                title="Event communications"
                description="Message artists, organizers, and staff from the venue inbox."
                action={{ label: "Open messages", href: "/venue/messages" }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="money" className="mt-4">
          <Card className="border-zinc-800 bg-zinc-900">
            <CardContent className="p-6">
              <VenueEmptyState
                icon={CalendarDays}
                title="Settlements & revenue"
                description="Track ticket revenue and venue finances from the Finances workspace."
                action={{ label: "Open finances", href: "/venue/finances" }}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
