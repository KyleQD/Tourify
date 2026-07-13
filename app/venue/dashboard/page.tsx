"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useCurrentVenue } from "@/app/venue/hooks/useCurrentVenue"
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  ClipboardList,
  DollarSign,
  FileText,
  Package,
  Ticket,
  Users,
} from "lucide-react"

const workflowCards = [
  {
    title: "Booking Requests",
    description: "Review holds, offers, and incoming artist or organizer requests.",
    href: "/venue/bookings",
    icon: ClipboardList,
  },
  {
    title: "Event Calendar",
    description: "Confirm shows, track advancing, and manage venue-hosted dates.",
    href: "/venue/events",
    icon: CalendarDays,
  },
  {
    title: "Ticketing",
    description: "Manage ticket tiers, sales status, check-in, and settlement exports.",
    href: "/venue/tickets",
    icon: Ticket,
  },
  {
    title: "Staffing",
    description: "Post jobs, onboard staff, assign shifts, and publish Work Mode packets.",
    href: "/venue/staff",
    icon: Users,
  },
  {
    title: "Documents",
    description: "Keep contracts, riders, permits, insurance, and floor plans organized.",
    href: "/venue/documents",
    icon: FileText,
  },
  {
    title: "Equipment",
    description: "Track inventory, maintenance, event assignments, and rental readiness.",
    href: "/venue/equipment",
    icon: Package,
  },
]

function formatCurrency(value?: number | null) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value || 0)
}

export default function VenueDashboardPage() {
  const { venue, stats, isLoading, error } = useCurrentVenue()

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full rounded-md bg-zinc-900" />
        <div className="grid gap-4 md:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-28 rounded-md bg-zinc-900" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((item) => (
            <Skeleton key={item} className="h-40 rounded-md bg-zinc-900" />
          ))}
        </div>
      </div>
    )
  }

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
            <Button asChild className="bg-emerald-600 hover:bg-emerald-700">
              <Link href="/venue/settings">Open Venue Settings</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const kpis = [
    {
      label: "Pending Requests",
      value: stats?.pendingRequests ?? 0,
      href: "/venue/bookings",
      icon: ClipboardList,
    },
    {
      label: "Upcoming Events",
      value: stats?.upcomingEvents ?? 0,
      href: "/venue/events",
      icon: CalendarDays,
    },
    {
      label: "Team Members",
      value: stats?.teamMembers ?? 0,
      href: "/venue/staff",
      icon: Users,
    },
    {
      label: "Month Revenue",
      value: formatCurrency(stats?.thisMonthRevenue ?? 0),
      href: "/venue/finances",
      icon: DollarSign,
    },
  ]

  return (
    <div className="space-y-6 pb-12">
      <section className="rounded-md border border-zinc-800 bg-zinc-900 px-5 py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge className="bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/15">Venue Command</Badge>
              <Badge variant="outline" className="border-zinc-700 text-zinc-300">
                {venue.type || "Physical location"}
              </Badge>
            </div>
            <h1 className="truncate text-2xl font-semibold text-zinc-50 sm:text-3xl">{venue.name}</h1>
            <p className="mt-1 max-w-3xl text-sm text-zinc-400">
              Manage bookings, events, tickets, staff, documents, equipment, finances, and event-day operations from one
              Venue-owned workspace.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild className="bg-emerald-600 hover:bg-emerald-700">
              <Link href="/venue/bookings">Review Requests</Link>
            </Button>
            <Button asChild variant="outline" className="border-zinc-700 bg-zinc-950 text-zinc-100">
              <Link href="/venue/dashboard/jobs">Post Job</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon
          return (
            <Link key={kpi.label} href={kpi.href}>
              <Card className="h-full border-zinc-800 bg-zinc-900 text-zinc-100 transition-colors hover:border-emerald-500/50">
                <CardContent className="flex items-center justify-between p-5">
                  <div>
                    <p className="text-sm text-zinc-400">{kpi.label}</p>
                    <p className="mt-1 text-2xl font-semibold">{kpi.value}</p>
                  </div>
                  <div className="rounded-md bg-zinc-800 p-3 text-emerald-300">
                    <Icon className="h-5 w-5" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {workflowCards.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.title} className="border-zinc-800 bg-zinc-900 text-zinc-100">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-3 text-base">
                  <span className="rounded-md bg-zinc-800 p-2 text-sky-300">
                    <Icon className="h-4 w-4" />
                  </span>
                  {card.title}
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
            <p>Use Venue hiring for physical-location roles, then publish schedules and Work Mode packets for event day.</p>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-700">
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
