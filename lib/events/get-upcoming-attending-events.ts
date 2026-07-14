import type { SupabaseClient } from "@supabase/supabase-js"
import { formatEventTime } from "@/lib/events/format-event-time"

export type AttendingEventTable = "artist_events" | "events" | "events_v2"

export interface AttendingEventSummary {
  id: string
  title: string
  slug: string | null
  event_date: string
  start_time: string | null
  venue_name: string | null
  venue_city: string | null
  poster_url: string | null
  event_table: AttendingEventTable
  owner_user_id: string | null
}

interface AttendanceRow {
  event_id: string
  event_table: string
  status: string
}

function todayDateString() {
  return new Date().toISOString().slice(0, 10)
}

function normalizeTable(value: string): AttendingEventTable | null {
  if (value === "artist_events" || value === "events" || value === "events_v2") return value
  return null
}

async function loadEventsTable(
  supabase: SupabaseClient,
  table: AttendingEventTable,
  ids: string[]
): Promise<AttendingEventSummary[]> {
  if (ids.length === 0) return []

  if (table === "events_v2") {
    const { data, error } = await supabase
      .from("events_v2")
      .select("id, title, slug, start_at, status, created_by, capacity, settings")
      .in("id", ids)

    if (error || !data) {
      console.warn("[attending-events] events_v2 lookup failed:", error)
      return []
    }

    const now = Date.now()
    return data
      .map((row) => {
        const settings =
          row.settings && typeof row.settings === "object"
            ? (row.settings as Record<string, unknown>)
            : {}
        const startAt = typeof row.start_at === "string" ? row.start_at : null
        if (!startAt || new Date(startAt).getTime() < now) return null

        return {
          id: row.id,
          title: row.title || "Event",
          slug: row.slug || null,
          event_date: startAt.slice(0, 10),
          start_time: startAt.slice(11, 16) || null,
          venue_name:
            typeof settings.venue_label === "string" ? settings.venue_label : null,
          venue_city:
            typeof settings.venue_city === "string" ? settings.venue_city : null,
          poster_url: null,
          event_table: "events_v2" as const,
          owner_user_id: row.created_by || null,
        }
      })
      .filter(Boolean) as AttendingEventSummary[]
  }

  if (table === "artist_events") {
    const { data, error } = await supabase
      .from("artist_events")
      .select(
        "id, title, slug, event_date, start_time, venue_name, venue_city, poster_url, user_id, status"
      )
      .in("id", ids)
      .gte("event_date", todayDateString())

    if (error || !data) {
      console.warn("[attending-events] artist_events lookup failed:", error)
      return []
    }

    return data.map((row) => ({
      id: row.id,
      title: row.title || "Event",
      slug: row.slug || null,
      event_date: row.event_date,
      start_time: row.start_time || null,
      venue_name: row.venue_name || null,
      venue_city: row.venue_city || null,
      poster_url: row.poster_url || null,
      event_table: "artist_events" as const,
      owner_user_id: row.user_id || null,
    }))
  }

  const { data, error } = await supabase
    .from("events")
    .select(
      "id, title, name, slug, event_date, start_time, venue_name, city, poster_url, artist_id, status"
    )
    .in("id", ids)
    .gte("event_date", todayDateString())

  if (error || !data) {
    console.warn("[attending-events] events lookup failed:", error)
    return []
  }

  return data.map((row) => ({
    id: row.id,
    title: row.title || row.name || "Event",
    slug: row.slug || null,
    event_date: row.event_date,
    start_time: row.start_time || null,
    venue_name: row.venue_name || null,
    venue_city: row.city || null,
    poster_url: row.poster_url || null,
    event_table: "events" as const,
    owner_user_id: row.artist_id || null,
  }))
}

export async function getUpcomingAttendingEvents(params: {
  supabase: SupabaseClient
  userId: string
  limit?: number
}): Promise<AttendingEventSummary[]> {
  const limit = params.limit ?? 5

  const { data: attendance, error } = await params.supabase
    .from("event_attendance")
    .select("event_id, event_table, status")
    .eq("user_id", params.userId)
    .eq("status", "attending")

  if (error || !attendance) {
    console.warn("[attending-events] attendance lookup failed:", error)
    return []
  }

  const byTable = new Map<AttendingEventTable, string[]>()
  for (const row of attendance as AttendanceRow[]) {
    const table = normalizeTable(row.event_table)
    if (!table || !row.event_id) continue
    const list = byTable.get(table) || []
    list.push(row.event_id)
    byTable.set(table, list)
  }

  const batches = await Promise.all(
    Array.from(byTable.entries()).map(([table, ids]) =>
      loadEventsTable(params.supabase, table, [...new Set(ids)])
    )
  )

  return batches
    .flat()
    .sort((a, b) => {
      const aKey = `${a.event_date}T${a.start_time || "00:00"}`
      const bKey = `${b.event_date}T${b.start_time || "00:00"}`
      return aKey.localeCompare(bKey)
    })
    .slice(0, limit)
}

export function formatAttendingEventTimeLabel(event: AttendingEventSummary) {
  if (!event.start_time) return null
  return formatEventTime(event.start_time) || null
}
