"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Briefcase, Calendar, MapPin, Settings, Ticket, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { statusBadgeClass } from "@/app/admin/dashboard/components/admin-badge-utils"
import { formatSafeCurrency, formatSafeNumber } from "@/lib/format/number-format"
import {
  buildAdminHiringHref,
  buildAdminLogisticsHref,
  buildAdminRosterHref,
} from "@/lib/admin/admin-ops-context"
import { LifecycleStrip } from "./lifecycle-strip"
import { LogisticsProgressWidget } from "./logistics-progress-widget"

export interface EventOperationsCardData {
  id: string
  name: string
  description?: string
  venue_name?: string
  event_date: string
  event_time?: string
  status: string
  capacity?: number
  tickets_sold?: number
  ticket_price?: number
  expected_revenue?: number
  org_id?: string | null
  venue_id?: string | null
  settings?: Record<string, unknown> | null
  tour?: { id: string; name: string }
  tours?: Array<{ id: string; name: string; is_primary?: boolean }>
}

function formatEventDate(value: string) {
  try {
    return new Date(value).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  } catch {
    return value
  }
}

export function EventOperationsCard({
  event,
  logistics,
}: {
  event: EventOperationsCardData
  logistics?: { percentage: number; completed: number; items: number } | null
}) {
  const primaryTour = event.tours?.find((tour) => tour.is_primary) || event.tours?.[0] || event.tour
  const settings = event.settings && typeof event.settings === "object" ? event.settings : {}
  const venueAccountId = typeof settings.venue_account_id === "string" ? settings.venue_account_id : null
  const employer = venueAccountId
    ? { entityType: "venue" as const, entityId: venueAccountId, venueId: venueAccountId }
    : event.org_id
      ? { entityType: "organization" as const, entityId: event.org_id, venueId: event.venue_id || null }
      : event.venue_id
        ? { entityType: "venue" as const, entityId: event.venue_id, venueId: event.venue_id }
        : {}

  return (
    <motion.div layout whileHover={{ y: -4 }} transition={{ type: "spring", stiffness: 320, damping: 24 }}>
      <Card className="h-full overflow-hidden border-slate-700/50 bg-slate-900/60 backdrop-blur-sm">
        <CardHeader className="space-y-3 pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-2">
              <CardTitle className="truncate text-lg text-white">{event.name || "Untitled event"}</CardTitle>
              <LifecycleStrip kind="event" status={event.status} />
            </div>
            <Badge className={statusBadgeClass(event.status)}>{event.status}</Badge>
          </div>
          {primaryTour ? (
            <Link
              href={`/admin/dashboard/tours/${primaryTour.id}`}
              className="inline-flex w-fit items-center rounded-full border border-purple-400/30 bg-purple-400/10 px-2.5 py-0.5 text-xs text-purple-100 hover:bg-purple-400/20"
            >
              {primaryTour.name}
            </Link>
          ) : (
            <span className="text-xs text-slate-500">Standalone show</span>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 text-sm text-slate-300">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-cyan-300" />
              <span>
                {formatEventDate(event.event_date)}
                {event.event_time ? ` · ${event.event_time}` : ""}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-cyan-300" />
              <span className="truncate">{event.venue_name || "Venue TBD"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-cyan-300" />
              <span>
                {formatSafeNumber(event.tickets_sold || 0)} / {formatSafeNumber(event.capacity || 0)} capacity
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Ticket className="h-4 w-4 text-cyan-300" />
              <span>
                {event.ticket_price != null ? formatSafeCurrency(event.ticket_price) : "Pricing TBD"}
                {event.expected_revenue != null ? ` · ${formatSafeCurrency(event.expected_revenue)} expected` : ""}
              </span>
            </div>
          </div>

          <LogisticsProgressWidget
            percentage={logistics?.percentage ?? 0}
            completed={logistics?.completed ?? 0}
            items={logistics?.items ?? 0}
            href={buildAdminLogisticsHref({ eventId: event.id })}
          />

          <div className="flex flex-wrap gap-2 pt-1">
            <Button asChild className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600">
              <Link href={`/admin/dashboard/events/${event.id}`}>
                <Settings className="mr-2 h-4 w-4" />
                Manage Event
              </Link>
            </Button>
            <Button asChild variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
              <Link href={`/admin/dashboard/events/create?draft=${event.id}`}>Edit</Link>
            </Button>
            <Button asChild variant="outline" size="icon" className="border-slate-700 text-slate-300" title="Roster">
              <Link href={buildAdminRosterHref({ eventId: event.id, ...employer })}>
                <Users className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="icon" className="border-slate-700 text-slate-300" title="Hiring">
              <Link href={buildAdminHiringHref({ eventId: event.id, ...employer })}>
                <Briefcase className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
