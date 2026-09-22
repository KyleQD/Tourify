/**
 * VEN-175..184 — Venue analytics metric catalog + pure aggregation contract.
 *
 * Every displayed metric must map to an entry here: one declared canonical
 * source, formula, scope and freshness. Values that cannot be derived from
 * their source are reported through `unavailable[]` — never silently coerced
 * to zero and never replaced by industry averages or capacity heuristics.
 */

export type MetricFreshness = "realtime" | "daily_rollup"

export interface MetricDefinition {
  id: string
  label: string
  /** Canonical source table(s). */
  source: string
  /** Human-readable formula bound to the implementation below. */
  formula: string
  scope: "venue" | "event"
  freshness: MetricFreshness
  permission: string
}

export const ANALYTICS_METRIC_CATALOG: readonly MetricDefinition[] = [
  {
    id: "events_hosted",
    label: "Events hosted",
    source: "events_v2",
    formula: "count(events linked to venue within window)",
    scope: "venue",
    freshness: "realtime",
    permission: "view_analytics",
  },
  {
    id: "attendance_validated",
    label: "Validated attendance",
    source: "ticket_checkins",
    formula: "count(result='valid' AND reversed_at IS NULL)",
    scope: "event",
    freshness: "realtime",
    permission: "view_analytics",
  },
  {
    id: "tickets_sold",
    label: "Tickets sold",
    source: "ticket_sales",
    formula: "sum(quantity) over payment_status IN ('completed') minus refunded quantity",
    scope: "event",
    freshness: "realtime",
    permission: "view_analytics",
  },
  {
    id: "booking_funnel",
    label: "Booking funnel",
    source: "venue_booking_requests",
    formula: "count grouped by resolved lifecycle stage",
    scope: "venue",
    freshness: "realtime",
    permission: "view_analytics",
  },
  {
    id: "avg_rating",
    label: "Average rating",
    source: "venue_reviews",
    formula: "avg(rating)",
    scope: "venue",
    freshness: "realtime",
    permission: "view_analytics",
  },
  {
    id: "recorded_money",
    label: "Recorded income/expenses",
    source: "venue_manual_transactions",
    formula: "sum(amount) where status='completed' grouped by type and date",
    scope: "venue",
    freshness: "realtime",
    permission: "view_finances",
  },
  {
    id: "profile_traffic",
    label: "Profile views (traffic)",
    source: "venue_analytics",
    formula: "sum(page_views) — traffic signal only, never attendance",
    scope: "venue",
    freshness: "daily_rollup",
    permission: "view_analytics",
  },
] as const

// ── Input row shapes (server-mapped from canonical tables) ───────────────────

export interface BookingFunnelRow {
  status: string
  lifecycle_status?: string | null
}

export interface TicketSalesRow {
  quantity: number | string
  payment_status: string
}

export interface MoneyRow {
  amount: number | string
  type: string
  status: string
  date: string
}

export interface EventRowLite {
  id: string
  title?: string | null
  start_at?: string | null
  status?: string | null
  capacity?: number | null
}

export interface CheckinCountRow {
  event_id: string
  total: number
}

const round2 = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100

/** Resolved lifecycle buckets for the funnel (VEN-179). */
export type FunnelStage = "inquiry" | "offered" | "confirmed" | "declined" | "cancelled"

export function resolveFunnelStage(row: BookingFunnelRow): FunnelStage {
  const lifecycle = String(row.lifecycle_status || "").toLowerCase()
  const status = String(row.status || "").toLowerCase()
  if (["cancelled", "canceled"].includes(lifecycle) || status === "cancelled") return "cancelled"
  if (["rejected", "declined"].includes(lifecycle) || status === "rejected") return "declined"
  if (["confirmed", "accepted", "completed", "contracted", "approved"].includes(lifecycle) || status === "approved")
    return "confirmed"
  if (["offer_sent", "hold", "offered"].includes(lifecycle)) return "offered"
  return "inquiry"
}

export function computeBookingFunnel(rows: BookingFunnelRow[]): Record<FunnelStage, number> {
  const funnel: Record<FunnelStage, number> = { inquiry: 0, offered: 0, confirmed: 0, declined: 0, cancelled: 0 }
  for (const row of rows) funnel[resolveFunnelStage(row)] += 1
  return funnel
}

/**
 * VEN-178 — sold minus refunded; pending/failed never inflate sales.
 */
export function computeTicketsSold(rows: TicketSalesRow[]): { sold: number; refunded: number } {
  let sold = 0
  let refunded = 0
  for (const row of rows) {
    const qty = Math.max(0, Math.floor(Number(row.quantity || 0)))
    if (row.payment_status === "completed") sold += qty
    else if (row.payment_status === "refunded") refunded += qty
  }
  return { sold: Math.max(0, sold - refunded), refunded }
}

/** VEN-177 — validated door count; reversed scans never count. */
export function sumValidatedAttendance(checkinsByEvent: CheckinCountRow[]): number {
  return round2(checkinsByEvent.reduce((sum, row) => sum + Math.max(0, Number(row.total || 0)), 0))
}

export interface PeriodWindow {
  start: string
  end: string
}

/**
 * VEN-180 — equal adjacent windows. The previous window ends exactly where
 * the current begins and spans identical length (no midpoint slicing).
 */
export function previousWindow(window: PeriodWindow): PeriodWindow {
  const startMs = new Date(window.start).getTime()
  const endMs = new Date(window.end).getTime()
  const length = Math.max(1, endMs - startMs)
  return { start: new Date(startMs - length).toISOString(), end: window.start }
}

export function defaultWindows(now = new Date()): { current: PeriodWindow; previous: PeriodWindow } {
  const end = now.toISOString()
  const start = new Date(now.getTime() - 30 * 24 * 3600 * 1000).toISOString()
  const current = { start, end }
  return { current, previous: previousWindow(current) }
}

function inWindow(dateIso: string | null | undefined, window: PeriodWindow): boolean {
  if (!dateIso) return false
  const t = new Date(dateIso).getTime()
  return t >= new Date(window.start).getTime() && t < new Date(window.end).getTime()
}

export interface WindowAggregates {
  events_hosted: number
  attendance_validated: number
  tickets_sold: number
  bookings: Record<FunnelStage, number>
  conversion_rate: number | null
  avg_rating: number | null
  recorded_income: number
  recorded_expenses: number
  profile_views: number | null // null when no rollup rows exist yet
}

export interface SnapshotInputs {
  window: PeriodWindow
  events: EventRowLite[]
  bookings: BookingFunnelRow[]
  reviews: Array<{ rating: number | string; created_at?: string | null }>
  money: MoneyRow[]
  ticketSales: TicketSalesRow[]
  checkinsByEvent: CheckinCountRow[]
  /** Daily profile-view rollups overlapping the window ([] when absent). */
  trafficRows?: Array<{ date: string; page_views?: number | null }>
}

export function aggregateWindow(input: SnapshotInputs): WindowAggregates {
  const w = input.window

  const eventsInWindow = input.events.filter((e) => inWindow(e.start_at ?? null, w))
  const bookingsInWindow = input.bookings.filter((b) =>
    // booking requests carry requested_at upstream; funnel counts use all-in-window rows passed by caller
    true,
  )
  void bookingsInWindow

  const funnel = computeBookingFunnel(input.bookings)
  const totalBookings = Object.values(funnel).reduce((a, b) => a + b, 0)
  const conversion =
    totalBookings > 0 ? round2(((funnel.confirmed + funnel.declined + funnel.cancelled) > 0 ? funnel.confirmed / totalBookings : 0) * 100) : null

  const ratings = input.reviews.map((r) => Number(r.rating)).filter((r) => Number.isFinite(r) && r > 0)
  const avgRating = ratings.length > 0 ? round2(ratings.reduce((a, b) => a + b, 0) / ratings.length) : null

  let income = 0
  let expenses = 0
  for (const row of input.money) {
    if (row.status !== "completed" || !inWindow(`${row.date}T00:00:00Z`, w)) continue
    if (row.type === "income") income += Number(row.amount || 0)
    else if (row.type === "expense") expenses += Number(row.amount || 0)
  }

  const sales = computeTicketsSold(input.ticketSales)
  const traffic = (input.trafficRows || []).filter((r) => inWindow(`${r.date}T00:00:00Z`, w))
  const profileViews = traffic.some((r) => Number(r.page_views || 0) > 0)
    ? traffic.reduce((sum, r) => sum + Math.max(0, Number(r.page_views || 0)), 0)
    : null // rollup has no data yet — explicitly unavailable, never zero-faked

  return {
    events_hosted: eventsInWindow.length,
    attendance_validated: sumValidatedAttendance(input.checkinsByEvent),
    tickets_sold: sales.sold,
    bookings: funnel,
    conversion_rate: conversion,
    avg_rating: avgRating,
    recorded_income: round2(income),
    recorded_expenses: round2(expenses),
    profile_views: profileViews,
  }
}

export interface PeriodComparison {
  metric: string
  current: number | null
  previous: number | null
  delta_percent: number | null
}

/** Equal-window deltas; null on either side stays null (no invented %). */
export function comparePeriods(current: WindowAggregates, previous: WindowAggregates): PeriodComparison[] {
  const pick = (agg: WindowAggregates, key: keyof WindowAggregates): number | null => {
    const value = agg[key]
    if (value === null) return null
    if (typeof value === "number") return value
    return Object.values(value as Record<string, number>).reduce((a, b) => a + b, 0)
  }
  const keys: Array<keyof WindowAggregates> = [
    "events_hosted",
    "attendance_validated",
    "tickets_sold",
    "recorded_income",
    "recorded_expenses",
  ]
  return keys.map((key) => {
    const c = pick(current, key)
    const p = pick(previous, key)
    const delta = c !== null && p !== null && p > 0 ? round2(((c - p) / p) * 100) : null
    return { metric: String(key), current: c, previous: p, delta_percent: delta }
  })
}

export interface VenueAnalyticsSnapshot {
  window: PeriodWindow
  previous_window: PeriodWindow
  current: WindowAggregates
  previous: WindowAggregates
  comparison: PeriodComparison[]
  per_event: Array<{
    id: string
    title: string
    start_at: string | null
    attendance_validated: number
    tickets_sold: number
    capacity: number | null
    /** Attendance/capacity ratio ONLY when both are real; never a proxy. */
    fill_rate: number | null
  }>
  unavailable: string[]
  currency: "usd"
}
