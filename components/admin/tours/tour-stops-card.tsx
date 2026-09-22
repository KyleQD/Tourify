"use client"

import Link from "next/link"
import { CalendarDays, ChevronRight, MapPin } from "lucide-react"

import { AdminEmptyState } from "@/app/admin/dashboard/components/admin-empty-state"
import { AdminSurfaceCard } from "@/app/admin/dashboard/components/admin-surface-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"

interface TourStopView {
  id: string
  ordinal?: number | null
  name?: string | null
  stop_type?: string | null
  local_date?: string | null
  hold_status?: string | null
  is_protected?: boolean | null
}

export function TourStopsCard({
  tourId,
  stops,
  state,
}: {
  tourId: string
  stops: TourStopView[]
  state: "ready" | "empty" | "denied" | "unavailable"
}) {
  const editorHref = `/admin/dashboard/tours/builder?draft=${encodeURIComponent(tourId)}`

  return (
    <AdminSurfaceCard>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="flex items-center gap-2 text-white">
          <MapPin className="h-4 w-4 text-violet-300" /> Tour stops
        </CardTitle>
        {state !== "denied" ? (
          <Button asChild size="sm" variant="outline" className="border-slate-700 text-slate-200">
            <Link href={editorHref}>Edit plan <ChevronRight className="ml-1 h-3.5 w-3.5" /></Link>
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>
        {state === "unavailable" ? (
          <p className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-200">
            Canonical stop data is temporarily unavailable. No fallback itinerary is being shown.
          </p>
        ) : state === "denied" ? (
          <p className="text-sm text-slate-400">Your current role cannot view tour stops.</p>
        ) : state === "empty" ? (
          <AdminEmptyState
            icon={CalendarDays}
            title="No planned stops"
            description="Add the first versioned stop in the existing tour plan editor."
            action={{ label: "Open plan editor", href: editorHref }}
          />
        ) : (
          <ol className="space-y-2">
            {stops.map((stop, index) => (
              <li key={stop.id} className="flex items-center gap-3 rounded-lg border border-slate-700/80 bg-slate-900/40 p-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-xs font-semibold text-violet-200">
                  {(stop.ordinal ?? index) + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-100">{stop.name || "Untitled stop"}</p>
                  <p className="text-xs text-slate-400">
                    {stop.local_date ? formatSafeDate(stop.local_date) : "Date not set"}
                  </p>
                </div>
                <div className="flex flex-wrap justify-end gap-1.5">
                  <Badge className="border border-slate-600 bg-slate-800 text-slate-300">{stop.stop_type || "show"}</Badge>
                  {stop.hold_status ? <Badge className="border border-amber-500/30 bg-amber-500/10 text-amber-200">{stop.hold_status}</Badge> : null}
                  {stop.is_protected ? <Badge className="border border-blue-500/30 bg-blue-500/10 text-blue-200">protected</Badge> : null}
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </AdminSurfaceCard>
  )
}
