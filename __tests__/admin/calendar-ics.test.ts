import { describe, expect, it } from 'vitest'
import {
  adminItemsToIcsEvents,
  buildIcsCalendar,
  buildIcsEvent,
  escapeIcsText,
  resolveDoorsOpenTime,
  toIcsDateTime,
} from '@/lib/admin/calendar/ics'
import { getCalendarItemColor, parseCalendarKinds } from '@/lib/admin/calendar/helpers'
import type { AdminCalendarItem } from '@/lib/admin/calendar/types'

describe('ICS builder', () => {
  it('escapes ICS special characters', () => {
    expect(escapeIcsText('Hello, world; line\nbreak\\')).toBe('Hello\\, world\\; line\\nbreak\\\\')
  })

  it('formats ISO datetimes as UTC ICS stamps', () => {
    expect(toIcsDateTime('2026-07-12T18:30:00.000Z')).toBe('20260712T183000Z')
  })

  it('builds a VEVENT block', () => {
    const lines = buildIcsEvent({
      uid: 'event-1@tourify',
      summary: 'Show Night',
      description: 'Main show',
      location: 'The Venue',
      start: '2026-07-12T20:00:00.000Z',
      end: '2026-07-12T23:00:00.000Z',
    })

    expect(lines[0]).toBe('BEGIN:VEVENT')
    expect(lines).toContain('UID:event-1@tourify')
    expect(lines).toContain('SUMMARY:Show Night')
    expect(lines).toContain('LOCATION:The Venue')
    expect(lines[lines.length - 1]).toBe('END:VEVENT')
  })

  it('builds a full calendar document', () => {
    const body = buildIcsCalendar({
      name: 'Ops',
      events: [
        {
          uid: 'a@tourify',
          summary: 'Tour',
          start: '2026-07-01T00:00:00.000Z',
          end: '2026-07-05T00:00:00.000Z',
          allDay: true,
        },
      ],
    })

    expect(body).toContain('BEGIN:VCALENDAR')
    expect(body).toContain('X-WR-CALNAME:Ops')
    expect(body).toContain('DTSTART;VALUE=DATE:20260701')
    expect(body).toContain('END:VCALENDAR')
  })

  it('converts admin items into ICS events', () => {
    const items: AdminCalendarItem[] = [
      {
        id: 'event-abc',
        sourceId: 'abc',
        kind: 'event',
        title: 'Headline',
        start: '2026-07-12T20:00:00.000Z',
        end: '2026-07-12T22:00:00.000Z',
        status: 'confirmed',
        priority: 'medium',
        href: '/admin/dashboard/events/abc',
        color: 'blue',
        allDay: false,
        description: 'Big night',
        location: 'Stage A',
      },
    ]

    const events = adminItemsToIcsEvents(items)
    expect(events).toHaveLength(1)
    expect(events[0].uid).toBe('event-abc@tourify')
    expect(events[0].summary).toBe('Headline')
    expect(events[0].location).toBe('Stage A')
  })
})

describe('doors open time normalization', () => {
  it('reads doors_open_time', () => {
    expect(resolveDoorsOpenTime({ doors_open_time: '19:00' })).toBe('19:00')
  })

  it('falls back to doors_open', () => {
    expect(resolveDoorsOpenTime({ doors_open: '18:30' })).toBe('18:30')
  })

  it('prefers doors_open_time when both exist', () => {
    expect(resolveDoorsOpenTime({ doors_open_time: '19:00', doors_open: '18:30' })).toBe('19:00')
  })

  it('returns null for empty settings', () => {
    expect(resolveDoorsOpenTime(null)).toBeNull()
    expect(resolveDoorsOpenTime({})).toBeNull()
  })
})

describe('calendar helpers', () => {
  it('parses type filters', () => {
    expect(parseCalendarKinds('event,tour,shift')).toEqual(['event', 'tour', 'shift'])
    expect(parseCalendarKinds('bogus')).toBeUndefined()
    expect(parseCalendarKinds(null)).toBeUndefined()
  })

  it('maps priority to color', () => {
    expect(getCalendarItemColor('event', 'medium')).toBe('blue')
    expect(getCalendarItemColor('task', 'urgent')).toBe('red')
    expect(getCalendarItemColor('hiring', 'high')).toBe('orange')
  })
})
