import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

function formatICalDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

function escapeIcal(s: string): string {
  return (s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

export async function GET(request: NextRequest) {
  const { searchParams, pathname } = new URL(request.url)
  const token = searchParams.get('token')

  const filename = pathname.split('/').pop() || ''
  const eventId = filename.replace('.ics', '')
  if (!eventId) return new NextResponse('Event not found', { status: 404 })

  const supabase = createServiceRoleClient()

  const { data: event } = await supabase
    .from('events_v2')
    .select('id, title, start_at, end_at, settings')
    .eq('id', eventId)
    .maybeSingle()

  if (!event) return new NextResponse('Event not found', { status: 404 })

  const settings = event.settings || {}
  const venueLabel = escapeIcal(settings.venue_label || '')
  const startAt = new Date(event.start_at)
  const endAt = event.end_at ? new Date(event.end_at) : new Date(startAt.getTime() + 2 * 60 * 60 * 1000)
  const startDate = startAt.toISOString().slice(0, 10)

  const vevents: string[] = []

  // Main show event
  vevents.push(
    'BEGIN:VEVENT',
    `UID:${event.id}-show@tourify`,
    `DTSTART:${formatICalDate(startAt)}`,
    `DTEND:${formatICalDate(endAt)}`,
    `SUMMARY:${escapeIcal(event.title)}`,
    `LOCATION:${venueLabel}`,
    `DESCRIPTION:${escapeIcal(event.title)} at ${venueLabel}`,
    'END:VEVENT',
  )

  // Load-in
  if (settings.load_in_time) {
    const t = new Date(`${startDate}T${settings.load_in_time}:00Z`)
    vevents.push('BEGIN:VEVENT', `UID:${event.id}-load-in@tourify`, `DTSTART:${formatICalDate(t)}`, `DTEND:${formatICalDate(new Date(t.getTime() + 60 * 60 * 1000))}`, `SUMMARY:Load In — ${escapeIcal(event.title)}`, `LOCATION:${venueLabel}`, 'END:VEVENT')
  }

  // Sound check
  if (settings.sound_check_time) {
    const t = new Date(`${startDate}T${settings.sound_check_time}:00Z`)
    vevents.push('BEGIN:VEVENT', `UID:${event.id}-soundcheck@tourify`, `DTSTART:${formatICalDate(t)}`, `DTEND:${formatICalDate(new Date(t.getTime() + 60 * 60 * 1000))}`, `SUMMARY:Sound Check — ${escapeIcal(event.title)}`, `LOCATION:${venueLabel}`, 'END:VEVENT')
  }

  // Doors
  if (settings.doors_open) {
    const t = new Date(`${startDate}T${settings.doors_open}:00Z`)
    vevents.push('BEGIN:VEVENT', `UID:${event.id}-doors@tourify`, `DTSTART:${formatICalDate(t)}`, `DTEND:${formatICalDate(new Date(t.getTime() + 30 * 60 * 1000))}`, `SUMMARY:Doors Open — ${escapeIcal(event.title)}`, `LOCATION:${venueLabel}`, 'END:VEVENT')
  }

  const ical = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Tourify//Event Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcal(event.title)}`,
    ...vevents,
    'END:VCALENDAR',
  ].join('\r\n')

  return new NextResponse(ical, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="event-${eventId}.ics"`,
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
