/**
 * VEN-175/177/178/179/180 — server-owned Venue analytics snapshot.
 * Every number derives from canonical tables inside equal adjacent windows;
 * unavailable values are listed explicitly instead of zero-faked.
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { canManageVenue, getCurrentVenueContext } from "@/lib/venue/venue-access"
import {
  aggregateWindow,
  comparePeriods,
  defaultWindows,
  previousWindow,
  type CheckinCountRow,
  type EventRowLite,
  type VenueAnalyticsSnapshot,
} from "@/lib/venue/analytics-service"

export const dynamic = "force-dynamic"

const querySchema = z.object({
  venue_id: z.string().uuid().optional(),
  start: z.string().datetime({ offset: true }).optional(),
  end: z.string().datetime({ offset: true }).optional(),
})

type Window = { start: string; end: string }

export async function GET(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams))
  if (!parsed.success) return NextResponse.json({ error: "Invalid query" }, { status: 400 })

  let venueId = parsed.data.venue_id || null
  if (!venueId) {
    const venue = await getCurrentVenueContext(auth.supabase, auth.user.id)
    venueId = venue?.id || null
  }
  if (!venueId) return NextResponse.json({ error: "venue_id is required" }, { status: 400 })

  const access = await canManageVenue(auth.supabase, auth.user.id, venueId, "view_analytics")
  if (!access.allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  // VEN-180 — equal adjacent windows derived server-side.
  const currentWindow: Window =
    parsed.data.start && parsed.data.end
      ? { start: parsed.data.start, end: parsed.data.end }
      : defaultWindows().current
  const prevWindow: Window = previousWindow(currentWindow)

  const service = createServiceRoleClient()

  // ── Events bound to the venue (settings link first, identity bridge second)
  const [settingsRes, bridgeRes] = await Promise.all([
    service.from("events_v2").select("id, title, start_at, status, capacity").contains("settings", { venue_profile_id: venueId }).limit(300),
    service.from("venue_identity_bridges").select("venues_v2_id").eq("venue_profile_id", venueId).maybeSingle(),
  ])

  const events: EventRowLite[] = ((settingsRes.data || []) as any[]).map((e) => ({
    id: String(e.id),
    title: e.title,
    start_at: e.start_at,
    status: e.status,
    capacity: e.capacity,
  }))
  const venuesV2Id = bridgeRes?.data?.venues_v2_id || null
  if (venuesV2Id) {
    const { data: bridgedEvents } = await service
      .from("events_v2")
      .select("id, title, start_at, status, capacity")
      .or(`venue_id.eq.${venuesV2Id},id.eq.${venuesV2Id}`)
      .limit(300)
    const seen = new Set(events.map((e) => e.id))
    for (const e of bridgedEvents || []) {
      if (!seen.has(String((e as any).id))) {
        events.push({
          id: String((e as any).id),
          title: (e as any).title,
          start_at: (e as any).start_at,
          status: (e as any).status,
          capacity: (e as any).capacity,
        })
      }
    }
  }
  const eventIds = events.map((e) => e.id)

  async function countCheckins(window: Window): Promise<CheckinCountRow[]> {
    if (!eventIds.length) return []
    const { data } = await service
      .from("ticket_checkins")
      .select("event_id, created_at")
      .in("event_id", eventIds)
      .eq("result", "valid")
      .is("reversed_at", null)
      .gte("created_at", window.start)
      .lt("created_at", window.end)
      .limit(20_000)
    const counts = new Map<string, number>()
    for (const row of data || []) {
      const key = String((row as any).event_id)
      counts.set(key, (counts.get(key) || 0) + 1)
    }
    return [...counts.entries()].map(([event_id, total]) => ({ event_id, total }))
  }

  const [bookingsRes, reviewsRes, moneyRes, salesRes, checkinsCurrent, checkinsPrev] = await Promise.all([
    service.from("venue_booking_requests").select("status, lifecycle_status, created_at, requested_at").eq("venue_id", venueId).limit(500),
    service.from("venue_reviews").select("rating, created_at").eq("venue_id", venueId).limit(500),
    service.from("venue_manual_transactions").select("amount, type, status, date").eq("venue_id", venueId).limit(1000),
    eventIds.length
      ? service.from("ticket_sales").select("event_id, quantity, payment_status").in("event_id", eventIds).limit(5000)
      : Promise.resolve({ data: [], error: null } as any),
    countCheckins(currentWindow),
    countCheckins(prevWindow),
  ])

  // Profile traffic rollups (VEN-176) — optional daily rows; absent ⇒ null.
  const { data: trafficRows } = await service
    .from("venue_analytics")
    .select("date, page_views")
    .eq("venue_id", venueId)
    .gte("date", currentWindow.start.slice(0, 10))
    .lte("date", currentWindow.end.slice(0, 10))
    .limit(400)

  function aggregate(window: Window, bookingsRows: any[], checkins: CheckinCountRow[]) {
    return aggregateWindow({
      window,
      events,
      bookings: bookingsRows,
      reviews: reviewsRes.data || [],
      money: moneyRes.data || [],
      ticketSales: (salesRes.data || []) as any,
      checkinsByEvent: checkins,
      trafficRows: trafficRows || [],
    })
  }

  const bookingTs = (row: any) => row.created_at || row.requested_at
  const within = (ts: string | null | undefined, window: Window) =>
    Boolean(ts && new Date(ts).getTime() >= new Date(window.start).getTime() && new Date(ts).getTime() < new Date(window.end).getTime())

  const currentAgg = aggregate(
    currentWindow,
    (bookingsRes.data || []).filter((row: any) => within(bookingTs(row), currentWindow)),
    checkinsCurrent,
  )
  const previousAgg = aggregate(
    prevWindow,
    (bookingsRes.data || []).filter((row: any) => within(bookingTs(row), prevWindow)),
    checkinsPrev,
  )

  // ── Per-event breakdown (validated attendance + real sold counts only) ────
  const attendanceByEvent = new Map(checkinsCurrent.map((r) => [r.event_id, r.total]))
  const soldByEvent = new Map<string, number>()
  for (const sale of (salesRes.data || []) as Array<{ event_id: string; quantity: number | string; payment_status: string }>) {
    if (sale.payment_status !== "completed") continue
    const key = String(sale.event_id)
    soldByEvent.set(key, (soldByEvent.get(key) || 0) + Math.max(0, Math.floor(Number(sale.quantity || 0))))
  }

  const per_event = events
    .filter((e) => within(e.start_at ?? undefined, currentWindow))
    .map((e) => {
      const attendance = attendanceByEvent.get(e.id) || 0
      const capacity = e.capacity != null ? Number(e.capacity) : null
      return {
        id: e.id,
        title: e.title || "Event",
        start_at: e.start_at ?? null,
        attendance_validated: attendance,
        tickets_sold: soldByEvent.get(e.id) || 0,
        capacity,
        fill_rate:
          capacity && capacity > 0 ? Math.round((attendance / capacity) * 100) : null,
      }
    })
    .sort((a, b) => b.attendance_validated - a.attendance_validated)

  // VEN-182 — explicit unavailability instead of silent zeros.
  const unavailable: string[] = []
  if (currentAgg.profile_views === null)
    unavailable.push("profile_views: no daily rollup rows exist yet (nightly job pending)")
  if (!(salesRes.data || []).length)
    unavailable.push("tickets_sold: no ticket sales rows exist for this venue's events")

  const snapshot: VenueAnalyticsSnapshot & { per_event: typeof per_event; unavailable: string[] } = {
    window: currentWindow,
    previous_window: prevWindow,
    current: currentAgg,
    previous: previousAgg,
    comparison: comparePeriods(currentAgg, previousAgg),
    per_event,
    unavailable,
    currency: "usd",
  }

  return NextResponse.json(
    { success: true, snapshot },
    { headers: { "Cache-Control": "no-store" } },
  )
}
