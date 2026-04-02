"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ArrowRight, Calendar, Globe, Ticket } from "lucide-react"
import Link from "next/link"
import { isUpcomingAdminEvent, normalizeAdminEvent } from "@/lib/events/admin-event-normalization"

interface DashboardStats {
  totalTours: number
  activeTours: number
  totalEvents: number
  upcomingEvents: number
  ticketsSold: number
  totalCapacity: number
}

interface WidgetsRowProps {
  tours: any[]
  events: any[]
  stats?: Partial<DashboardStats> | null
  isLoading?: boolean
}

export function WidgetsRow({ tours, events, stats, isLoading }: WidgetsRowProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <ToursWidget tours={tours} stats={stats} isLoading={isLoading} />
      <EventsWidget events={events} stats={stats} isLoading={isLoading} />
    </div>
  )
}

export function ToursWidget({ tours, stats, isLoading }: { tours: any[]; stats?: Partial<DashboardStats> | null; isLoading?: boolean }) {
  const totalShows = safeSum(tours?.map(t => t.totalShows ?? t.total_shows ?? 0))
  const completedShows = safeSum(tours?.map(t => t.completedShows ?? t.completed_shows ?? 0))
  const progress = totalShows > 0 ? Math.round((completedShows / totalShows) * 100) : 0
  const activeTours = stats?.activeTours ?? countByStatus(tours, ['active'])

  return (
    <FrostedCard>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-sky-400/80 to-indigo-500/80 flex items-center justify-center shadow-sm">
              <Globe className="h-4 w-4 text-white" />
            </div>
            <p className="text-sm text-slate-300">Tours</p>
          </div>
          <div className="mt-2 flex items-baseline gap-3">
            <h3 className="text-2xl font-semibold text-white tracking-tight">{isLoading ? '…' : activeTours}</h3>
            <span className="text-sm text-slate-400">active</span>
          </div>
        </div>
        <Badge className="bg-white/10 text-slate-100 border-white/10">{tours?.length ?? 0} total</Badge>
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-300">
          <span>Show progress</span>
          <span className="tabular-nums text-slate-200">{completedShows}/{totalShows}</span>
        </div>
        <Progress value={progress} className="h-2 bg-white/10" />
      </div>

      <div className="mt-4 flex items-center justify-between">
        <Link href="/admin/dashboard/tours">
          <Button variant="outline" size="sm" className="border-white/10 bg-white/5 text-slate-100 hover:bg-white/10">
            Open <ArrowRight className="h-3.5 w-3.5 ml-2" />
          </Button>
        </Link>
        <div className="flex items-center gap-3 text-xs text-slate-300">
          <Metric label="Total shows" value={totalShows} />
          <SeparatorDot />
          <Metric label="Completion" value={`${progress}%`} />
        </div>
      </div>
    </FrostedCard>
  )
}

export function EventsWidget({ events, stats, isLoading }: { events: any[]; stats?: Partial<DashboardStats> | null; isLoading?: boolean }) {
  const normalizedEvents = (events || []).map((event: any) => normalizeAdminEvent(event))
  const upcoming = (stats?.upcomingEvents ?? 0) || countUpcoming(normalizedEvents)
  const ticketsSold = stats?.ticketsSold ?? safeSum(normalizedEvents?.map((event) => event.tickets_sold ?? 0))
  const capacity = stats?.totalCapacity ?? safeSum(normalizedEvents?.map((event) => event.capacity ?? 0))
  const utilization = capacity > 0 ? Math.round((ticketsSold / capacity) * 100) : 0
  const spark = buildEventsSparkline(normalizedEvents)

  return (
    <FrostedCard>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-emerald-400/80 to-teal-500/80 flex items-center justify-center shadow-sm">
              <Calendar className="h-4 w-4 text-white" />
            </div>
            <p className="text-sm text-slate-300">Events</p>
          </div>
          <div className="mt-2 flex items-baseline gap-3">
            <h3 className="text-2xl font-semibold text-white tracking-tight">{isLoading ? '…' : upcoming}</h3>
            <span className="text-sm text-slate-400">upcoming</span>
          </div>
        </div>
        <Badge className="bg-white/10 text-slate-100 border-white/10">{events?.length ?? 0} total</Badge>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <MiniStat label="Tickets" value={formatCompact(ticketsSold)} icon={<Ticket className="h-3.5 w-3.5 text-slate-200" />} />
        <MiniStat label="Capacity" value={formatCompact(capacity)} />
        <MiniStat label="Utilization" value={`${utilization}%`} />
      </div>

      <div className="mt-3 h-12 w-full rounded-xl bg-white/5 overflow-hidden relative">
        {/* Sparkline bars */}
        <div className="absolute inset-x-0 bottom-0 flex items-end gap-1 px-2">
          {spark.map((v, i) => (
            <div key={i} className="flex-1 rounded-t-md bg-gradient-to-t from-white/30 to-white/60" style={{ height: `${Math.max(8, v)}%` }} />
          ))}
        </div>
        <div className="absolute top-1 left-2 text-[10px] text-slate-300/80">next 7 days</div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <Link href="/admin/dashboard/events">
          <Button variant="outline" size="sm" className="border-white/10 bg-white/5 text-slate-100 hover:bg-white/10">
            Open <ArrowRight className="h-3.5 w-3.5 ml-2" />
          </Button>
        </Link>
        <div className="flex items-center gap-3 text-xs text-slate-300">
          <Metric label="This week" value={`${sum(spark)} evts`} />
        </div>
      </div>
    </FrostedCard>
  )
}

// Frosted glass container
function FrostedCard({ children }: { children: React.ReactNode }) {
  return (
    <Card className="rounded-2xl bg-white/5 border-white/10 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_10px_30px_rgba(0,0,0,0.35)]">
      <CardContent className="p-5">{children}</CardContent>
    </Card>
  )
}

function MiniStat({ label, value, icon }: { label: string; value: string | number; icon?: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 flex items-center justify-between">
      <div className="text-[11px] text-slate-300">{label}</div>
      <div className="flex items-center gap-1">
        {icon}
        <div className="text-sm font-medium text-slate-100 tabular-nums">{value}</div>
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-slate-400">{label}</span>
      <span className="text-slate-100 font-medium tabular-nums">{value}</span>
    </div>
  )
}

function SeparatorDot() {
  return <div className="h-1 w-1 rounded-full bg-slate-500" />
}

// Helpers
function safeSum(values: number[]) { return values.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0) }
function sum(values: number[]) { return values.reduce((a, b) => a + b, 0) }
function countByStatus(items: any[], statuses: string[]) {
  if (!items?.length) return 0
  const set = new Set(statuses)
  return items.filter(t => set.has((t.status ?? '').toString())).length
}
function countUpcoming(events: any[]) {
  if (!events?.length) return 0
  return events.filter((event) => isUpcomingAdminEvent(event)).length
}
function buildEventsSparkline(events: any[]) {
  const days = 7
  const counts = Array.from({ length: days }, () => 0)
  if (events?.length) {
    const now = new Date()
    events.forEach(e => {
      const d = e.eventDate ?? e.date ?? e.event_date
      const dt = d ? new Date(d) : null
      if (!dt) return
      const diff = Math.floor((dt.getTime() - now.getTime()) / (24 * 3600 * 1000))
      if (diff >= 0 && diff < days) counts[diff] += 1
    })
  }
  // Normalize to 100 scale for bar heights
  const max = Math.max(1, ...counts)
  return counts.map(c => Math.round((c / max) * 100))
}
function formatCompact(n?: number) {
  if (!n) return '0'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}


