"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useCurrentVenue } from "../hooks/useCurrentVenue"
import { LoadingSpinner } from "../components/loading-spinner"
import { useToast } from "@/hooks/use-toast"
import { formatSafeCurrency, formatSafeNumber } from "@/lib/format/number-format"
import { PollAnalyticsPanel } from "@/components/polls/poll-analytics-panel"
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarCheck,
  DollarSign,
  Download,
  Eye,
  Minus,
  RefreshCw,
  Star,
  Ticket,
  Users,
} from "lucide-react"

// VEN-175..182 — every number on this page comes from the server snapshot
// (GET /api/venue/analytics). Metrics that lack source data render as
// explicitly unavailable — never zero-filled or replaced with averages.

interface Funnel {
  inquiry: number
  offered: number
  confirmed: number
  declined: number
  cancelled: number
}

interface WindowAgg {
  events_hosted: number
  attendance_validated: number
  tickets_sold: number
  bookings: Funnel
  conversion_rate: number | null
  avg_rating: number | null
  recorded_income: number
  recorded_expenses: number
  profile_views: number | null
}

interface Comparison {
  metric: string
  current: number | null
  previous: number | null
  delta_percent: number | null
}

interface Snapshot {
  window: { start: string; end: string }
  current: WindowAgg
  comparison: Comparison[]
  per_event: Array<{
    id: string
    title: string
    start_at: string | null
    attendance_validated: number
    tickets_sold: number
    capacity: number | null
    fill_rate: number | null
  }>
  unavailable: string[]
}

const METRIC_LABELS: Record<string, string> = {
  events_hosted: "Events hosted",
  attendance_validated: "Validated attendance",
  tickets_sold: "Tickets sold",
  recorded_income: "Recorded income",
  recorded_expenses: "Recorded expenses",
}

function DeltaChip({ delta }: { delta: number | null }) {
  if (delta === null) {
    return (
      <span className="flex items-center text-xs text-zinc-500">
        <Minus className="h-3 w-3 mr-1" /> no prior data
      </span>
    )
  }
  const positive = delta >= 0
  return (
    <span className={`flex items-center text-xs ${positive ? "text-green-500" : "text-red-500"}`}>
      {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {Math.abs(delta).toFixed(1)}% vs prev 30d
    </span>
  )
}

export default function AnalyticsPage() {
  const { venue, isLoading: venueLoading } = useCurrentVenue()
  const { toast } = useToast()
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exportBusy, setExportBusy] = useState(false)

  const loadSnapshot = useCallback(async () => {
    if (!venue?.id) return
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/venue/analytics?venue_id=${encodeURIComponent(venue.id)}`, {
        credentials: "include",
        cache: "no-store",
      })
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        throw new Error(payload.error || `Analytics unavailable (${res.status})`)
      }
      const payload = await res.json()
      setSnapshot(payload.snapshot || null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics")
      setSnapshot(null)
    } finally {
      setIsLoading(false)
    }
  }, [venue?.id])

  useEffect(() => {
    void loadSnapshot()
  }, [loadSnapshot])

  const exportCsv = async () => {
    if (!venue?.id) return
    setExportBusy(true)
    try {
      const res = await fetch(`/api/venue/analytics/export?venue_id=${encodeURIComponent(venue.id)}`, {
        credentials: "include",
        cache: "no-store",
      })
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        throw new Error(payload.error || `Export failed (${res.status})`)
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = `venue-analytics-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      URL.revokeObjectURL(url)
    } catch (err) {
      toast({ title: "Export failed", description: err instanceof Error ? err.message : undefined, variant: "destructive" })
    } finally {
      setExportBusy(false)
    }
  }

  if (venueLoading || isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!venue) {
    return (
      <div className="py-12 text-center">
        <h2 className="mb-2 text-xl font-semibold">No Venue Found</h2>
        <p className="text-muted-foreground">Please set up your venue profile first.</p>
      </div>
    )
  }

  if (error || !snapshot) {
    return (
      <div className="space-y-3 py-12 text-center">
        <h2 className="text-xl font-semibold text-red-400">{error || "Unable to load analytics"}</h2>
        <Button variant="outline" onClick={() => void loadSnapshot()}>
          <RefreshCw className="mr-2 h-4 w-4" /> Try again
        </Button>
      </div>
    )
  }

  const agg = snapshot.current
  const funnelTotal = Object.values(agg.bookings).reduce((a, b) => a + b, 0)

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            Last 30 days · derived from validated check-ins, bookings and your recorded ledger
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" onClick={() => void loadSnapshot()}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => void exportCsv()} disabled={exportBusy}>
            <Download className="mr-2 h-4 w-4" /> {exportBusy ? "Exporting…" : "Export CSV"}
          </Button>
        </div>
      </div>

      {/* Explicit unavailability (VEN-182) */}
      {(snapshot.unavailable || []).length > 0 && (
        <Card className="border-yellow-800 bg-yellow-950/20">
          <CardContent className="space-y-1 p-4 text-sm text-yellow-200">
            <p className="font-medium">Some metrics are unavailable right now:</p>
            <ul className="list-inside list-disc text-xs text-yellow-300/80">
              {snapshot.unavailable.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* KPI cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Events Hosted</CardTitle>
            <CalendarCheck className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatSafeNumber(agg.events_hosted)}</div>
            <DeltaChip delta={snapshot.comparison.find((c) => c.metric === "events_hosted")?.delta_percent ?? null} />
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Validated Attendance</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatSafeNumber(agg.attendance_validated)}</div>
            <p className="text-xs text-muted-foreground">Door check-ins only (reversed excluded)</p>
            <DeltaChip delta={snapshot.comparison.find((c) => c.metric === "attendance_validated")?.delta_percent ?? null} />
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tickets Sold</CardTitle>
            <Ticket className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatSafeNumber(agg.tickets_sold)}</div>
            <p className="text-xs text-muted-foreground">Completed orders minus refunds</p>
            <DeltaChip delta={snapshot.comparison.find((c) => c.metric === "tickets_sold")?.delta_percent ?? null} />
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Rating</CardTitle>
            <Star className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            {agg.avg_rating !== null ? (
              <div className="text-2xl font-bold">{agg.avg_rating.toFixed(1)}</div>
            ) : (
              <div className="text-sm text-muted-foreground">No reviews yet</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList className="h-auto w-full flex-nowrap justify-start gap-1 overflow-x-auto p-1 [&>*]:shrink-0">
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="polls">Polls</TabsTrigger>
        </TabsList>

        {/* PERFORMANCE */}
        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Booking funnel (VEN-179)</CardTitle>
              <CardDescription>Real lifecycle counts — the old flat “30% pending” estimate is retired.</CardDescription>
            </CardHeader>
            <CardContent>
              {funnelTotal === 0 ? (
                <p className="text-sm text-muted-foreground">No booking requests in this window.</p>
              ) : (
                <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                  {(["inquiry", "offered", "confirmed", "declined", "cancelled"] as const).map((stage) => (
                    <div key={stage} className="rounded-md border p-3">
                      <dt className="text-xs capitalize text-muted-foreground">{stage}</dt>
                      <dd className="text-xl font-semibold">{agg.bookings[stage]}</dd>
                    </div>
                  ))}
                </dl>
              )}
              <p className="mt-3 text-xs text-muted-foreground">
                Conversion: {agg.conversion_rate !== null ? `${agg.conversion_rate.toFixed(0)}% confirmed` : "not yet computable"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Period comparison (VEN-180)</CardTitle>
              <CardDescription>Equal adjacent 30-day windows, computed server-side.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="divide-y rounded-md border text-sm">
                {snapshot.comparison.map((cmp) => (
                  <li key={cmp.metric} className="flex items-center justify-between px-3 py-2">
                    <span>{METRIC_LABELS[cmp.metric] || cmp.metric}</span>
                    <span className="flex items-center gap-3">
                      <span className="tabular-nums">{formatSafeNumber(cmp.current ?? 0)}</span>
                      <span className="w-32 text-right"><DeltaChip delta={cmp.delta_percent} /></span>
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Profile traffic (VEN-176)</CardTitle>
              <CardDescription>Profile views are a traffic signal — never counted as attendance.</CardDescription>
            </CardHeader>
            <CardContent>
              {agg.profile_views !== null ? (
                <p className="flex items-center gap-2 text-lg font-semibold">
                  <Eye className="h-4 w-4 text-sky-500" /> {formatSafeNumber(agg.profile_views)} views this window
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No daily traffic rollup rows yet — the nightly job populates this within 24h.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* FINANCIAL */}
        <TabsContent value="financial" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Recorded Income</CardTitle>
                <DollarSign className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-500">{formatSafeCurrency(agg.recorded_income)}</div>
                <p className="text-xs text-muted-foreground">Completed ledger entries only</p>
                <DeltaChip delta={snapshot.comparison.find((c) => c.metric === "recorded_income")?.delta_percent ?? null} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Recorded Expenses</CardTitle>
                <DollarSign className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-500">{formatSafeCurrency(agg.recorded_expenses)}</div>
                <p className="text-xs text-muted-foreground">Completed ledger entries only</p>
                <DeltaChip delta={snapshot.comparison.find((c) => c.metric === "recorded_expenses")?.delta_percent ?? null} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Net Recorded</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${agg.recorded_income - agg.recorded_expenses >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {formatSafeCurrency(agg.recorded_income - agg.recorded_expenses)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Full financial detail lives in Finances —{" "}
                  <Link href="/venue/finances" className="underline">open finances</Link>.
                </p>
              </CardContent>
            </Card>
          </div>
          <p className="text-xs text-muted-foreground">
            The former hardcoded $18,459 / $26,773 operating figures were removed — money shown here is only what your
            ledger actually records.
          </p>
        </TabsContent>

        {/* ATTENDANCE */}
        <TabsContent value="attendance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Attendance by event</CardTitle>
              <CardDescription>Validated door scans in this window. Fill rate shown only when capacity is known.</CardDescription>
            </CardHeader>
            <CardContent>
              {snapshot.per_event.length === 0 ? (
                <p className="text-sm text-muted-foreground">No events in this window.</p>
              ) : (
                <ul className="divide-y rounded-md border text-sm">
                  {snapshot.per_event.map((event) => (
                    <li key={event.id} className="flex items-center justify-between px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{event.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {event.attendance_validated} checked in · {event.tickets_sold} sold
                        </p>
                      </div>
                      {event.fill_rate !== null ? (
                        <Badge variant="outline">{event.fill_rate}% capacity</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">capacity unknown</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          <PollAnalyticsPanel />
        </TabsContent>

        {/* EVENTS */}
        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top events by attendance</CardTitle>
              <CardDescription>Ratings shown per event only when that event has its own reviews.</CardDescription>
            </CardHeader>
            <CardContent>
              {snapshot.per_event.length === 0 ? (
                <p className="text-sm text-muted-foreground">No events hosted in this window.</p>
              ) : (
                <ol className="divide-y rounded-md border text-sm">
                  {snapshot.per_event.slice(0, 10).map((event, index) => (
                    <li key={event.id} className="flex items-center gap-3 px-3 py-2">
                      <span className="w-5 text-muted-foreground">{index + 1}.</span>
                      <span className="min-w-0 flex-1 truncate font-medium">{event.title}</span>
                      <span className="tabular-nums text-muted-foreground">{event.attendance_validated} attended</span>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* POLLS (real existing surface kept) */}
        <TabsContent value="polls">
          <PollAnalyticsPanel />
        </TabsContent>
      </Tabs>
    </div>
  )
}
