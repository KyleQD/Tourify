"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Briefcase, CalendarRange, Route, Settings, Users } from "lucide-react"
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

export interface TourOperationsCardData {
  id: string
  name: string
  status?: string
  start_date?: string
  end_date?: string
  main_artist?: string
  artist?: string
  event_count?: number
  completed_events?: number
  crew_count?: number
  expected_revenue?: number
  expenses?: number
  org_id?: string | null
  artist_id?: string | null
}

function formatRange(start?: string, end?: string) {
  const fmt = (value?: string) => {
    if (!value) return null
    try {
      return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    } catch {
      return value
    }
  }
  const a = fmt(start)
  const b = fmt(end)
  if (a && b) return `${a} – ${b}`
  return a || b || "Dates TBD"
}

export function TourOperationsCard({
  tour,
  logistics,
}: {
  tour: TourOperationsCardData
  logistics?: { percentage: number; completed: number; items: number } | null
}) {
  const shows = tour.event_count ?? 0
  const completed = tour.completed_events ?? 0
  const profit = (tour.expected_revenue || 0) - (tour.expenses || 0)
  const employer = tour.org_id
    ? { entityType: "organization" as const, entityId: tour.org_id }
    : tour.artist_id
      ? { entityType: "artist" as const, entityId: tour.artist_id }
      : {}

  return (
    <motion.div layout whileHover={{ y: -4 }} transition={{ type: "spring", stiffness: 320, damping: 24 }}>
      <Card className="h-full overflow-hidden border-slate-700/50 bg-slate-900/60 backdrop-blur-sm">
        <CardHeader className="space-y-3 pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-2">
              <CardTitle className="truncate text-lg text-white">{tour.name || "Untitled tour"}</CardTitle>
              <LifecycleStrip kind="tour" status={tour.status} />
            </div>
            <Badge className={statusBadgeClass(tour.status || "planning")}>{tour.status || "planning"}</Badge>
          </div>
          <p className="text-sm text-slate-400">{tour.main_artist || tour.artist || "Artist TBD"}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 text-sm text-slate-300">
            <div className="flex items-center gap-2">
              <CalendarRange className="h-4 w-4 text-cyan-300" />
              <span>{formatRange(tour.start_date, tour.end_date)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Route className="h-4 w-4 text-cyan-300" />
              <span>
                {formatSafeNumber(completed)} / {formatSafeNumber(shows)} shows complete
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-cyan-300" />
              <span>{formatSafeNumber(tour.crew_count || 0)} crew</span>
            </div>
            <div className="text-xs text-slate-400">
              Rev {formatSafeCurrency(tour.expected_revenue || 0)} · Exp {formatSafeCurrency(tour.expenses || 0)} ·{" "}
              <span className={profit >= 0 ? "text-emerald-300" : "text-red-300"}>
                {formatSafeCurrency(profit)}
              </span>
            </div>
          </div>

          <LogisticsProgressWidget
            percentage={logistics?.percentage ?? 0}
            completed={logistics?.completed ?? 0}
            items={logistics?.items ?? 0}
            href={buildAdminLogisticsHref({ tourId: tour.id })}
          />

          <div className="flex flex-wrap gap-2 pt-1">
            <Button asChild className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600">
              <Link href={`/admin/dashboard/tours/${tour.id}`}>
                <Settings className="mr-2 h-4 w-4" />
                Manage Tour
              </Link>
            </Button>
            <Button asChild variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
              <Link href={`/admin/dashboard/tours/builder?draft=${tour.id}`}>Edit</Link>
            </Button>
            <Button asChild variant="outline" size="icon" className="border-slate-700 text-slate-300" title="Roster">
              <Link href={buildAdminRosterHref({ tourId: tour.id, ...employer })}>
                <Users className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="icon" className="border-slate-700 text-slate-300" title="Hiring">
              <Link href={buildAdminHiringHref({ tourId: tour.id, ...employer })}>
                <Briefcase className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
