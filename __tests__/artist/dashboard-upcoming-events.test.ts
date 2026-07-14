import { describe, expect, it } from 'vitest'

import {
  eventDateKey,
  isUpcomingLocalEventDate,
  localTodayDateString,
  parseEventDateLocal,
  selectArtistDashboardEvents,
  type ArtistApiEventRow,
} from '@/lib/artist/dashboard-upcoming-events'
import { normalizeArtistEventDate } from '@/lib/artist/normalize-artist-event-date'

describe('normalizeArtistEventDate', () => {
  it('prefers event_date, then start_at, then date', () => {
    expect(normalizeArtistEventDate({ event_date: '2026-07-12', start_at: '2026-08-01T00:00:00Z' })).toBe('2026-07-12')
    expect(normalizeArtistEventDate({ event_date: null, start_at: '2026-08-01T20:00:00.000Z' })).toBe('2026-08-01')
    expect(normalizeArtistEventDate({ date: '2026-09-15' })).toBe('2026-09-15')
    expect(normalizeArtistEventDate({})).toBeNull()
  })
})

describe('dashboard-upcoming-events', () => {
  const now = new Date(2026, 6, 12, 15, 30, 0) // July 12, 2026 local afternoon

  it('builds a local today date string', () => {
    expect(localTodayDateString(now)).toBe('2026-07-12')
  })

  it('parses date-only strings as local calendar days', () => {
    const parsed = parseEventDateLocal('2026-07-12')
    expect(parsed).not.toBeNull()
    expect(parsed!.getFullYear()).toBe(2026)
    expect(parsed!.getMonth()).toBe(6)
    expect(parsed!.getDate()).toBe(12)
  })

  it('extracts YYYY-MM-DD keys from ISO and date values', () => {
    expect(eventDateKey('2026-07-12')).toBe('2026-07-12')
    expect(eventDateKey('2026-07-12T20:00:00.000Z')).toBe('2026-07-12')
    expect(eventDateKey(null)).toBeNull()
  })

  it('treats today as upcoming for local calendar comparison', () => {
    const today = parseEventDateLocal('2026-07-12')!
    const yesterday = parseEventDateLocal('2026-07-11')!
    expect(isUpcomingLocalEventDate(today, now)).toBe(true)
    expect(isUpcomingLocalEventDate(yesterday, now)).toBe(false)
  })

  it('prefers upcoming over past and includes undated drafts', () => {
    const rows: ArtistApiEventRow[] = [
      {
        id: 'past',
        title: 'Past Show',
        event_date: '2026-07-01',
        status: 'published',
      },
      {
        id: 'today-draft',
        name: 'Tonight Draft',
        event_date: '2026-07-12',
        start_time: '20:00',
        status: 'draft',
        venue_name: 'The Fillmore',
        city: 'San Francisco',
        tickets_sold: 12,
        capacity: 100,
        revenue: 500,
        ticket_url: 'https://tickets.example/show',
        slug: 'tonight-draft',
        event_type: 'concert',
      },
      {
        id: 'future-published',
        title: 'Weekend Gig',
        event_date: '2026-07-18',
        status: 'published',
        venue_name: 'Fox Theater',
        city: 'Oakland',
      },
      {
        id: 'cancelled',
        title: 'Cancelled Night',
        event_date: '2026-07-20',
        status: 'cancelled',
      },
      {
        id: 'missing-date',
        title: 'No Date',
        status: 'draft',
      },
    ]

    const selected = selectArtistDashboardEvents(rows, { limit: 8, now })

    expect(selected.map((e) => e.id)).toEqual(['today-draft', 'future-published', 'missing-date'])
    expect(selected.map((e) => e.bucket)).toEqual(['upcoming', 'upcoming', 'needs_date'])
    expect(selected[0]).toMatchObject({
      title: 'Tonight Draft',
      status: 'draft',
      venue: 'The Fillmore',
      city: 'San Francisco',
      ticketSales: 12,
      capacity: 100,
      revenue: 500,
      ticketUrl: 'https://tickets.example/show',
      slug: 'tonight-draft',
      startTime: '20:00',
      type: 'concert',
      bucket: 'upcoming',
    })
  })

  it('returns recent past when there are no upcoming events', () => {
    const rows: ArtistApiEventRow[] = [
      { id: 'old-a', title: 'Older', event_date: '2026-06-01', status: 'published' },
      { id: 'old-b', title: 'Newer Past', event_date: '2026-07-10', status: 'draft' },
      { id: 'cancelled', title: 'Nope', event_date: '2026-07-09', status: 'cancelled' },
    ]

    const selected = selectArtistDashboardEvents(rows, { limit: 8, now })
    expect(selected.map((e) => e.id)).toEqual(['old-b', 'old-a'])
    expect(selected.every((e) => e.bucket === 'recent')).toBe(true)
  })

  it('does not pad with recent past when upcoming exists', () => {
    const rows: ArtistApiEventRow[] = [
      { id: 'future', title: 'Future', event_date: '2026-07-20', status: 'published' },
      { id: 'past', title: 'Past', event_date: '2026-07-01', status: 'published' },
    ]

    const selected = selectArtistDashboardEvents(rows, { limit: 8, now })
    expect(selected.map((e) => e.id)).toEqual(['future'])
  })

  it('uses start_at when event_date is missing', () => {
    const rows: ArtistApiEventRow[] = [
      {
        id: 'legacy',
        title: 'Legacy Start At',
        start_at: '2026-07-15T20:00:00.000Z',
        status: 'published',
      },
    ]

    const selected = selectArtistDashboardEvents(rows, { limit: 8, now })
    expect(selected).toHaveLength(1)
    expect(selected[0].bucket).toBe('upcoming')
    expect(selected[0].eventDate).toBe('2026-07-15')
  })

  it('respects limit and sorts upcoming by date then start time', () => {
    const rows: ArtistApiEventRow[] = [
      { id: 'b', title: 'B', event_date: '2026-07-15', start_time: '21:00', status: 'published' },
      { id: 'a', title: 'A', event_date: '2026-07-15', start_time: '18:00', status: 'draft' },
      { id: 'c', title: 'C', event_date: '2026-07-16', status: 'published' },
      { id: 'd', title: 'D', event_date: '2026-07-17', status: 'published' },
    ]

    const selected = selectArtistDashboardEvents(rows, { limit: 2, now })
    expect(selected.map((e) => e.id)).toEqual(['a', 'b'])
  })
})
