import type { AdminCalendarItem } from './types'
import { NextResponse } from 'next/server'

export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
    .replace(/\n/g, '\\n')
}

export function toIcsDateTime(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime()))
    return new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
}

export function toIcsDate(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime()))
    return new Date().toISOString().slice(0, 10).replace(/-/g, '')
  return date.toISOString().slice(0, 10).replace(/-/g, '')
}

export interface IcsEventInput {
  uid: string
  summary: string
  description?: string
  location?: string
  start: string | Date
  end: string | Date
  allDay?: boolean
  status?: string
}

export function buildIcsEvent(input: IcsEventInput): string[] {
  const lines = [
    'BEGIN:VEVENT',
    `UID:${input.uid}`,
    `DTSTAMP:${toIcsDateTime(new Date())}`,
  ]

  if (input.allDay) {
    lines.push(`DTSTART;VALUE=DATE:${toIcsDate(input.start)}`)
    lines.push(`DTEND;VALUE=DATE:${toIcsDate(input.end)}`)
  } else {
    lines.push(`DTSTART:${toIcsDateTime(input.start)}`)
    lines.push(`DTEND:${toIcsDateTime(input.end)}`)
  }

  lines.push(`SUMMARY:${escapeIcsText(input.summary)}`)

  if (input.description)
    lines.push(`DESCRIPTION:${escapeIcsText(input.description)}`)

  if (input.location)
    lines.push(`LOCATION:${escapeIcsText(input.location)}`)

  if (input.status)
    lines.push(`STATUS:${escapeIcsText(input.status.toUpperCase())}`)

  lines.push('END:VEVENT')
  return lines
}

export function buildIcsCalendar(args: {
  prodId?: string
  name?: string
  events: IcsEventInput[]
}): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${args.prodId || '-//Tourify//Admin Operations Calendar//EN'}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ]

  if (args.name)
    lines.push(`X-WR-CALNAME:${escapeIcsText(args.name)}`)

  for (const event of args.events)
    lines.push(...buildIcsEvent(event))

  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}

export function adminItemsToIcsEvents(items: AdminCalendarItem[]): IcsEventInput[] {
  return items.map((item) => ({
    uid: `${item.id}@tourify`,
    summary: item.title,
    description: [
      `${item.kind} • ${item.status}`,
      item.description || '',
    ].filter(Boolean).join('\n'),
    location: item.location || undefined,
    start: item.start,
    end: item.end || item.start,
    allDay: item.allDay,
    status: item.status,
  }))
}

/** Normalize doors time from either doors_open or doors_open_time settings keys. */
export function resolveDoorsOpenTime(settings: Record<string, unknown> | null | undefined): string | null {
  if (!settings || typeof settings !== 'object') return null
  const value = settings.doors_open_time ?? settings.doors_open
  if (typeof value !== 'string' || !value.trim()) return null
  return value.trim()
}

export function icsResponse(body: string, filename: string): NextResponse {
  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-cache, max-age=0',
    },
  })
}

export function icsFeedResponse(body: string): Response {
  return new Response(body, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  })
}
