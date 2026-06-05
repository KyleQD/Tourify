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

  // Extract tour ID from path: /api/calendar/tours/[id].ics
  const filename = pathname.split('/').pop() || ''
  const tourId = filename.replace('.ics', '')

  if (!tourId) return new NextResponse('Tour not found', { status: 404 })

  const supabase = createServiceRoleClient()

  const { data: tour } = await supabase
    .from('tours')
    .select('id, name, calendar_token, status')
    .eq('id', tourId)
    .maybeSingle()

  if (!tour) return new NextResponse('Tour not found', { status: 404 })

  // Verify token if tour has one
  if (tour.calendar_token && token !== String(tour.calendar_token)) {
    return new NextResponse('Invalid token', { status: 401 })
  }

  // Fetch tour events
  const { data: tourEvents } = await supabase
    .from('tour_events')
    .select('event_id, events_v2(id, title, start_at, end_at, settings)')
    .eq('tour_id', tourId)

  const vevents: string[] = []

  for (const te of tourEvents || []) {
    const ev = (te as any).events_v2
    if (!ev) continue

    const settings = ev.settings || {}
    const venueLabel = escapeIcal(settings.venue_label || '')
    const startAt = new Date(ev.start_at)
    const endAt = ev.end_at ? new Date(ev.end_at) : new Date(startAt.getTime() + 2 * 60 * 60 * 1000)

    vevents.push(
      'BEGIN:VEVENT',
      `UID:${ev.id}-show@tourify`,
      `DTSTART:${formatICalDate(startAt)}`,
      `DTEND:${formatICalDate(endAt)}`,
      `SUMMARY:${escapeIcal(tour.name)} — ${escapeIcal(ev.title)}`,
      `LOCATION:${venueLabel}`,
      `DESCRIPTION:${escapeIcal(ev.title)} • ${venueLabel}`,
      'END:VEVENT',
    )

    // Load-in VEVENT
    if (settings.load_in_time) {
      const loadInAt = new Date(`${startAt.toISOString().slice(0, 10)}T${settings.load_in_time}:00Z`)
      vevents.push(
        'BEGIN:VEVENT',
        `UID:${ev.id}-load-in@tourify`,
        `DTSTART:${formatICalDate(loadInAt)}`,
        `DTEND:${formatICalDate(new Date(loadInAt.getTime() + 60 * 60 * 1000))}`,
        `SUMMARY:Load In — ${escapeIcal(ev.title)}`,
        `LOCATION:${venueLabel}`,
        'END:VEVENT',
      )
    }
  }

  const ical = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Tourify//Tour Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcal(tour.name)}`,
    ...vevents,
    'END:VCALENDAR',
  ].join('\r\n')

  return new NextResponse(ical, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="tour-${tourId}.ics"`,
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
