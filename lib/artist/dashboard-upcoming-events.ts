/** Pure helpers for artist home Scheduled Events selection and date parsing. */

import { normalizeArtistEventDate } from '@/lib/artist/normalize-artist-event-date'

export interface ArtistApiEventRow {
  id?: string | null
  title?: string | null
  name?: string | null
  event_date?: string | null
  start_at?: string | null
  date?: string | null
  start_time?: string | null
  venue_name?: string | null
  city?: string | null
  venue_city?: string | null
  status?: string | null
  capacity?: number | null
  tickets_sold?: number | null
  revenue?: number | null
  event_type?: string | null
  type?: string | null
  ticket_url?: string | null
  slug?: string | null
}

export type DashboardEventBucket = 'upcoming' | 'needs_date' | 'recent'

export interface DashboardUpcomingEvent {
  id: string
  title: string
  date: Date
  eventDate: string
  venue?: string
  city?: string
  status?: string
  ticketSales?: number
  capacity?: number
  revenue?: number
  type?: string
  ticketUrl?: string
  slug?: string
  startTime?: string
  bucket: DashboardEventBucket
}

export function localTodayDateString(now: Date = new Date()): string {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Parse DATE or ISO strings as local calendar dates (avoids UTC midnight drop). */
export function parseEventDateLocal(value?: string | null): Date | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null

  if (trimmed.includes('T')) {
    const parsed = new Date(trimmed)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed)
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const parsed = new Date(year, month - 1, day)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function eventDateKey(value?: string | null): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(trimmed)
  return match?.[1] ?? null
}

function mapRowToDashboardEvent(
  row: ArtistApiEventRow,
  bucket: DashboardEventBucket,
  dateKey: string | null
): DashboardUpcomingEvent {
  const date =
    parseEventDateLocal(dateKey) ??
    (dateKey ? new Date(`${dateKey}T00:00:00`) : new Date(0))

  return {
    id: String(row.id),
    title: String(row.title || row.name || 'Untitled event'),
    date,
    eventDate: dateKey || '',
    venue: row.venue_name ? String(row.venue_name) : undefined,
    city: row.city ? String(row.city) : (row.venue_city ? String(row.venue_city) : undefined),
    status: row.status ? String(row.status) : undefined,
    ticketSales: typeof row.tickets_sold === 'number' ? row.tickets_sold : undefined,
    capacity: typeof row.capacity === 'number' ? row.capacity : undefined,
    revenue: typeof row.revenue === 'number' ? row.revenue : undefined,
    type: row.event_type ? String(row.event_type) : (row.type ? String(row.type) : undefined),
    ticketUrl: row.ticket_url ? String(row.ticket_url) : undefined,
    slug: row.slug ? String(row.slug) : undefined,
    startTime: row.start_time ? String(row.start_time) : undefined,
    bucket,
  }
}

/**
 * Select owned events for the artist home widget with priority:
 * 1) upcoming (date >= today)
 * 2) needs_date (missing date)
 * 3) recent past (only when no upcoming, to avoid empty dashboard)
 */
export function selectArtistDashboardEvents(
  rows: ArtistApiEventRow[],
  options?: { limit?: number; now?: Date }
): DashboardUpcomingEvent[] {
  const limit = options?.limit ?? 8
  const today = localTodayDateString(options?.now)

  const upcoming: DashboardUpcomingEvent[] = []
  const needsDate: DashboardUpcomingEvent[] = []
  const recent: DashboardUpcomingEvent[] = []

  for (const row of rows) {
    if (!row.id) continue
    if (row.status === 'cancelled') continue

    const key = normalizeArtistEventDate(row) || eventDateKey(row.event_date)

    if (!key) {
      needsDate.push(mapRowToDashboardEvent(row, 'needs_date', null))
      continue
    }

    if (key >= today) {
      upcoming.push(mapRowToDashboardEvent(row, 'upcoming', key))
    } else {
      recent.push(mapRowToDashboardEvent(row, 'recent', key))
    }
  }

  upcoming.sort((a, b) => {
    const byDate = a.eventDate.localeCompare(b.eventDate)
    if (byDate !== 0) return byDate
    return (a.startTime || '').localeCompare(b.startTime || '')
  })

  needsDate.sort((a, b) => a.title.localeCompare(b.title))

  recent.sort((a, b) => {
    const byDate = b.eventDate.localeCompare(a.eventDate)
    if (byDate !== 0) return byDate
    return (b.startTime || '').localeCompare(a.startTime || '')
  })

  const selected: DashboardUpcomingEvent[] = []

  for (const event of upcoming) {
    if (selected.length >= limit) break
    selected.push(event)
  }

  for (const event of needsDate) {
    if (selected.length >= limit) break
    selected.push(event)
  }

  // Only surface recent past when there are no upcoming events (avoid empty home).
  if (upcoming.length === 0) {
    for (const event of recent) {
      if (selected.length >= limit) break
      selected.push(event)
    }
  }

  return selected
}

/** @deprecated Use selectArtistDashboardEvents */
export function selectUpcomingDashboardEvents(
  rows: ArtistApiEventRow[],
  options?: { limit?: number; now?: Date }
): DashboardUpcomingEvent[] {
  return selectArtistDashboardEvents(rows, options).filter((event) => event.bucket === 'upcoming')
}

/** Keep date-only events that are today or later (local calendar). */
export function isUpcomingLocalEventDate(date: Date, now: Date = new Date()): boolean {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const eventDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  return eventDay.getTime() >= startOfToday.getTime()
}
