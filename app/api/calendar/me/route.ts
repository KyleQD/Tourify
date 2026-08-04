import { NextResponse } from "next/server"

import {
  addCalendarConflicts,
  type PersonalCalendarItem,
  type PersonalCalendarPayload,
  type PersonalCalendarSource,
} from "@/lib/general/personal-calendar"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json(
      { error: "Sign in to view your calendar.", code: "not_authenticated" },
      { status: 401 },
    )
  }

  const [assignmentsResponse, ticketsResponse, bookingsResponse] = await Promise.all([
    supabase
      .from("employment_assignments")
      .select("id, event_id, role_title, department, starts_at, ends_at, status")
      .eq("user_id", user.id)
      .in("status", ["invited", "confirmed", "active"]),
    supabase
      .from("tickets")
      .select("id, event_id, status")
      .eq("owner_user_id", user.id)
      .in("status", ["issued", "active", "transferred"]),
    supabase
      .from("bookings")
      .select("id, event_id, status, ticket_quantity")
      .eq("user_id", user.id)
      .in("status", ["pending", "confirmed"]),
  ])

  const sources: Record<PersonalCalendarSource, "ready" | "unavailable"> = {
    assignment: assignmentsResponse.error ? "unavailable" : "ready",
    ticket: ticketsResponse.error ? "unavailable" : "ready",
    booking: bookingsResponse.error ? "unavailable" : "ready",
  }
  if (assignmentsResponse.error) {
    console.error("[calendar/me] assignments unavailable", assignmentsResponse.error.message)
  }
  if (ticketsResponse.error) {
    console.error("[calendar/me] tickets unavailable", ticketsResponse.error.message)
  }
  if (bookingsResponse.error) {
    console.error("[calendar/me] bookings unavailable", bookingsResponse.error.message)
  }
  if (Object.values(sources).every((state) => state === "unavailable")) {
    return NextResponse.json(
      { error: "Your calendar is temporarily unavailable.", code: "unavailable" },
      { status: 503 },
    )
  }

  const eventIds = Array.from(
    new Set([
      ...(assignmentsResponse.data ?? []).map((row) => row.event_id),
      ...(ticketsResponse.data ?? []).map((row) => row.event_id),
      ...(bookingsResponse.data ?? []).map((row) => row.event_id),
    ].filter((id): id is string => Boolean(id))),
  )

  const [eventsResponse, eventsV2Response] = eventIds.length
    ? await Promise.all([
        supabase
          .from("events")
          .select("id, title, start_at, end_at, venue_name, city, state")
          .in("id", eventIds),
        supabase
          .from("events_v2")
          .select("id, title, start_at, end_at, timezone")
          .in("id", eventIds),
      ])
    : [{ data: [], error: null }, { data: [], error: null }]

  const events = new Map<string, {
    title: string
    startAt: string
    endAt: string | null
    subtitle: string | null
  }>()
  for (const event of eventsResponse.data ?? []) {
    events.set(event.id, {
      title: event.title,
      startAt: event.start_at,
      endAt: event.end_at,
      subtitle: [event.venue_name, event.city, event.state].filter(Boolean).join(" · ") || null,
    })
  }
  for (const event of eventsV2Response.data ?? []) {
    events.set(event.id, {
      title: event.title,
      startAt: event.start_at,
      endAt: event.end_at,
      subtitle: event.timezone || null,
    })
  }

  const items: PersonalCalendarItem[] = []
  for (const assignment of assignmentsResponse.data ?? []) {
    if (!assignment.starts_at) continue
    const event = assignment.event_id ? events.get(assignment.event_id) : null
    items.push({
      id: `assignment:${assignment.id}`,
      source: "assignment",
      sourceId: assignment.id,
      eventId: assignment.event_id,
      title: assignment.role_title,
      subtitle: assignment.department || event?.title || null,
      startAt: assignment.starts_at,
      endAt: assignment.ends_at,
      href: `/work/today?assignment=${encodeURIComponent(assignment.id)}`,
      status: assignment.status,
      conflictIds: [],
    })
  }
  for (const ticket of ticketsResponse.data ?? []) {
    const event = events.get(ticket.event_id)
    if (!event) continue
    items.push({
      id: `ticket:${ticket.id}`,
      source: "ticket",
      sourceId: ticket.id,
      eventId: ticket.event_id,
      title: event.title,
      subtitle: event.subtitle,
      startAt: event.startAt,
      endAt: event.endAt,
      href: "/tickets/my-tickets",
      status: ticket.status,
      conflictIds: [],
    })
  }
  for (const booking of bookingsResponse.data ?? []) {
    if (!booking.event_id) continue
    const event = events.get(booking.event_id)
    if (!event) continue
    items.push({
      id: `booking:${booking.id}`,
      source: "booking",
      sourceId: booking.id,
      eventId: booking.event_id,
      title: event.title,
      subtitle: event.subtitle,
      startAt: event.startAt,
      endAt: event.endAt,
      href: "/bookings",
      status: booking.status,
      conflictIds: [],
    })
  }

  const data: PersonalCalendarPayload = {
    items: addCalendarConflicts(items).sort(
      (left, right) => new Date(left.startAt).getTime() - new Date(right.startAt).getTime(),
    ),
    sources,
    partial:
      Object.values(sources).some((state) => state === "unavailable") ||
      Boolean(eventsResponse.error && eventsV2Response.error),
    generatedAt: new Date().toISOString(),
  }
  return NextResponse.json(
    { data },
    { headers: { "Cache-Control": "private, no-store" } },
  )
}

