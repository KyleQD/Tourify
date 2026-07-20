import { NextRequest, NextResponse } from 'next/server'
import { buildIcsCalendar, type IcsEventInput } from '@/lib/admin/calendar/ics'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

function timedEvent(args: {
  eventId: string
  suffix: string
  date: string
  time: unknown
  durationMinutes: number
  summary: string
  location: string
}) {
  if (typeof args.time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(args.time)) return []
  const start = new Date(`${args.date}T${args.time}:00Z`)
  if (Number.isNaN(start.getTime())) return []
  return [{
    uid: `${args.eventId}-${args.suffix}@tourify`,
    start,
    end: new Date(start.getTime() + args.durationMinutes * 60 * 1000),
    summary: args.summary,
    location: args.location,
  } satisfies IcsEventInput]
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tourId } = await params
  const token = new URL(request.url).searchParams.get('token')

  if (!tourId) return new NextResponse('Tour not found', { status: 404 })

  const supabase = createServiceRoleClient()

  const { data: tour } = await supabase
    .from('tours')
    .select('id, name, calendar_token, status')
    .eq('id', tourId)
    .maybeSingle()

  if (!tour) return new NextResponse('Tour not found', { status: 404 })

  if (!tour.calendar_token || token !== String(tour.calendar_token))
    return new NextResponse('Invalid token', { status: 401 })

  const { data: tourEvents } = await supabase
    .from('tour_events')
    .select('event_id, events_v2(id, title, start_at, end_at, settings)')
    .eq('tour_id', tourId)

  const vevents: IcsEventInput[] = []

  for (const te of tourEvents || []) {
    const ev = (te as any).events_v2
    if (!ev) continue

    const settings = ev.settings || {}
    const venueLabel = String(settings.venue_label || '')
    const startAt = new Date(ev.start_at)
    const endAt = ev.end_at ? new Date(ev.end_at) : new Date(startAt.getTime() + 2 * 60 * 60 * 1000)

    vevents.push({
      uid: `${ev.id}-show@tourify`,
      start: startAt,
      end: endAt,
      summary: `${tour.name} — ${ev.title}`,
      location: venueLabel,
      description: `${ev.title} • ${venueLabel}`,
    })

    const date = startAt.toISOString().slice(0, 10)
    vevents.push(
      ...timedEvent({ eventId: ev.id, suffix: 'load-in', date, time: settings.load_in_time, durationMinutes: 60, summary: `Load In — ${ev.title}`, location: venueLabel }),
      ...timedEvent({ eventId: ev.id, suffix: 'sound-check', date, time: settings.sound_check_time, durationMinutes: 60, summary: `Sound Check — ${ev.title}`, location: venueLabel }),
      ...timedEvent({ eventId: ev.id, suffix: 'doors', date, time: settings.doors_open, durationMinutes: 30, summary: `Doors — ${ev.title}`, location: venueLabel }),
    )
  }

  const ical = buildIcsCalendar({
    prodId: '-//Tourify//Tour Calendar//EN',
    name: tour.name,
    events: vevents,
  })

  return new NextResponse(ical, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="tour-${tourId}.ics"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
