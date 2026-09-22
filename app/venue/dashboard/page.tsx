"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useCurrentVenue } from "@/app/venue/hooks/useCurrentVenue"
import { VenuePageSkeleton } from "@/components/dashboard/venue-page-skeleton"
import { VenueStatCard } from "@/components/dashboard/venue-stat-card"
import { VenueAttentionStrip } from "@/components/dashboard/venue-attention-strip"
import { VenuePageHeader } from "@/components/dashboard/venue-page-header"
import { VENUE_CARD, VENUE_PRIMARY_BTN, VENUE_SECTION_LABEL } from "@/components/dashboard/venue-tokens"
import { buildVenueActionItems } from "@/lib/venue/build-action-items"
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ClipboardList,
  DollarSign,
  FileText,
  Package,
  Ticket,
  Users,
} from "lucide-react"

function formatCurrency(value?: number | null) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value || 0)
}

export default function VenueDashboardPage() {
  const { venue, stats, isLoading, error } = useCurrentVenue()
  const [openApplications, setOpenApplications] = useState(0)
  const [hasSiteMap, setHasSiteMap] = useState<boolean | undefined>(undefined)

  useEffect(() => {
    const venueId = venue?.id
    if (!venueId) return

    let cancelled = false

    async function loadActionSignals() {
      try {
        const [appsRes, mapsRes] = await Promise.all([
          fetch(
            `/api/venue/hiring/applications?venue_id=${encodeURIComponent(venueId)}`,
            { credentials: "include", cache: "no-store" },
          ),
          fetch("/api/site-maps/shared", { credentials: "include", cache: "no-store" }),
        ])

        const appsJson = appsRes.ok ? await appsRes.json() : null
        const mapsJson = mapsRes.ok ? await mapsRes.json() : null

        if (cancelled) return

        const apps = Array.isArray(appsJson?.data) ? appsJson.data : []
        const openCount = apps.filter((app: { status?: string }) => {
          const status = (app.status || "").toLowerCase()
          return !status || ["new", "pending", "submitted", "in_review", "reviewing"].includes(status)
        }).length
        setOpenApplications(openCount)

        const maps = Array.isArray(mapsJson?.data) ? mapsJson.data : []
        setHasSiteMap(maps.length > 0)
      } catch {
        if (!cancelled) setHasSiteMap(undefined)
      }
    }

    void loadActionSignals()
    return () => {
      cancelled = true
    }
  }, [venue?.id])

  if (isLoading) return <VenuePageSkeleton />

  if (error || !venue) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center">
        <Card className="max-w-lg border-zinc-800 bg-zinc-900 text-zinc-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertCircle className="h-5 w-5 text-amber-400" />
              Venue Not Ready
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-zinc-400">
            <p>{error || "We could not load a Venue profile for this account."}</p>
            <Button asChild className={VENUE_PRIMARY_BTN}>
              <Link href="/venue/settings">Open Venue Settings</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const pendingRequests = stats?.pendingRequests ?? 0
  const upcomingEvents = stats?.upcomingEvents ?? 0
  const teamMembers = stats?.teamMembers ?? 0

  const attentionChips = [
    {
      id: "bookings",
      label: "Pending bookings",
      count: pendingRequests,
      tone: pendingRequests > 3 ? ("critical" as const) : ("warning" as const),
      href: "/venue/bookings",
    },
    {
      id: "events",
      label: "Upcoming events",
      count: upcomingEvents,
      tone: upcomingEvents > 0 ? ("ok" as const) : ("neutral" as const),
      href: "/venue/events",
    },
    {
      id: "hiring",
      label: "Staff on roster",
      count: teamMembers,
      tone: teamMembers === 0 ? ("warning" as const) : ("ok" as const),
      href: "/venue/staff",
    },
  ]

  const actionItems = buildVenueActionItems({
    venue: {
      name: venue.name,
      capacity: venue.capacity,
      location: venue.location,
      description: venue.description,
      avatar: venue.avatar,
    },
    pendingBookings: pendingRequests,
    upcomingEvents,
    openApplications,
    hasSiteMap,
  })

  const workflowCards = [
    {
      title: "Booking Requests",
      description: "Review holds, offers, and incoming artist or organizer requests.",
      href: "/venue/bookings",
      icon: ClipboardList,
      count: pendingRequests,
    },
    {
      title: "Event Calendar",
      description: "Confirm shows, track advancing, and manage venue-hosted dates.",
      href: "/venue/dashboard/calendar",
      icon: CalendarDays,
      count: upcomingEvents,
    },
    {
      title: "Ticketing",
      description: "Manage ticket tiers, sales status, check-in, and settlement exports.",
      href: "/venue/dashboard/tickets",
      icon: Ticket,
      count: null as number | null,
    },
    {
      title: "Staffing",
      description: "Post jobs, onboard staff, assign shifts, and publish Work Mode packets.",
      href: "/venue/staff",
      icon: Users,
      count: teamMembers,
    },
    {
      title: "Documents",
      description: "Keep contracts, riders, permits, insurance, and floor plans organized.",
      href: "/venue/documents",
      icon: FileText,
      count: null as number | null,
    },
    {
      title: "Equipment",
      description: "Track inventory, maintenance, event assignments, and rental readiness.",
      href: "/venue/equipment",
      icon: Package,
      count: null as number | null,
    },
  ]

  return (
    <div className="space-y-6 pb-12">
      <VenuePageHeader
        title={venue.name}
        subtitle="Manage bookings, events, tickets, staff, documents, and event-day operations."
        icon={Building2}
        actions={
          <>
            <Button asChild className={VENUE_PRIMARY_BTN}>
              <Link href="/venue/bookings">Review Requests</Link>
            </Button>
            <Button asChild variant="outline" className="border-zinc-700 bg-zinc-950 text-zinc-100">
              <Link href="/venue/dashboard/jobs">Post Job</Link>
            </Button>
          </>
        }
      />

      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Badge className="bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/15">Venue Command</Badge>
        <Badge variant="outline" className="border-zinc-700 text-zinc-300">
          {venue.type || "Physical location"}
        </Badge>
      </div>

      <VenueAttentionStrip chips={attentionChips} />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <VenueStatCard title="Pending Requests" value={pendingRequests} icon={ClipboardList} tone="amber" />
        <VenueStatCard title="Upcoming Events" value={upcomingEvents} icon={CalendarDays} tone="emerald" />
        <VenueStatCard title="Team Members" value={teamMembers} icon={Users} tone="blue" />
        <VenueStatCard
          title="Month Revenue"
          value={formatCurrency(stats?.thisMonthRevenue ?? 0)}
          icon={DollarSign}
          tone="emerald"
        />
      </section>

      {actionItems.length > 0 ? (
        <section className={VENUE_CARD + " p-5"}>
          <p className={VENUE_SECTION_LABEL + " mb-3"}>Next actions</p>
          <ul className="space-y-3">
            {actionItems.slice(0, 4).map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-3 border-b border-zinc-800 pb-3 last:border-0 last:pb-0">
                <div>
                  <p className="text-sm font-medium text-zinc-100">{item.title}</p>
                  <p className="mt-0.5 text-xs text-zinc-500">{item.description}</p>
                </div>
                {item.href ? (
                  <Button asChild size="sm" variant="ghost" className="shrink-0 text-emerald-300">
                    <Link href={item.href}>
                      Open
                      <ArrowRight className="ml-1 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {workflowCards.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.title} className="border-zinc-800 bg-zinc-900 text-zinc-100">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between gap-3 text-base">
                  <span className="flex items-center gap-3">
                    <span className="rounded-md bg-zinc-800 p-2 text-emerald-300">
                      <Icon className="h-4 w-4" />
                    </span>
                    {card.title}
                  </span>
                  {card.count !== null && card.count !== undefined ? (
                    <Badge variant="outline" className="border-zinc-700 text-zinc-300">
                      {card.count}
                    </Badge>
                  ) : null}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="min-h-12 text-sm text-zinc-400">{card.description}</p>
                <Button asChild variant="ghost" className="px-0 text-emerald-300 hover:text-emerald-200">
                  <Link href={card.href}>
                    Open
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="border-zinc-800 bg-zinc-900 text-zinc-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BriefcaseBusiness className="h-5 w-5 text-amber-300" />
              Workforce Readiness
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-zinc-400">
            <p>Hire for physical-location roles, then publish schedules and Work Mode packets for event day.</p>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" className={VENUE_PRIMARY_BTN}>
                <Link href="/venue/dashboard/jobs">Hiring Pipeline</Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="border-zinc-700 bg-zinc-950 text-zinc-100">
                <Link href="/venue/staff/scheduling">Schedule Staff</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900 text-zinc-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-5 w-5 text-sky-300" />
              Operations Health
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-zinc-400">
            <p>
              Track conversion from public venue views to requests, confirmed bookings, ticket sales, attendance, and
              settlement.
            </p>
            <Button asChild size="sm" variant="outline" className="border-zinc-700 bg-zinc-950 text-zinc-100">
              <Link href="/venue/analytics">Open Analytics</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
