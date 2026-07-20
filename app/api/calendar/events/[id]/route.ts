import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import {
  buildIcsCalendar,
  resolveDoorsOpenTime,
} from '@/lib/admin/calendar/ics'
import {
  getStoredCalendarToken,
  isValidCalendarFeedToken,
} from '@/lib/calendar/feed-token'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: eventId } = await params
  const token = new URL(request.url).searchParams.get('token')

  if (!eventId) return new NextResponse('Event not found', { status: 404 })

  const supabase = createServiceRoleClient()

  const { data: event } = await supabase
    .from('events_v2')
    .select('id, title, start_at, end_at, settings')
    .eq('id', eventId)
    .maybeSingle()

  if (!event) return new NextResponse('Event not found', { status: 404 })

  const settings = (event.settings && typeof event.settings === 'object'
    ? event.settings
    : {}) as Record<string, unknown>

  if (!isValidCalendarFeedToken({
    resourceType: 'event',
    resourceId: event.id,
    token,
    storedToken: getStoredCalendarToken(settings),
  })) {
    return new NextResponse('Unauthorized', { status: 401 })
  }
  const venueLabel = typeof settings.venue_label === 'string' ? settings.venue_label : ''
  const startAt = new Date(event.start_at)
  const endAt = event.end_at ? new Date(event.end_at) : new Date(startAt.getTime() + 2 * 60 * 60 * 1000)
  const startDate = startAt.toISOString().slice(0, 10)

  const events = [
    {
      uid: `${event.id}-show@tourify`,
      summary: event.title || 'Event',
      location: venueLabel || undefined,
      description: `${event.title || 'Event'} at ${venueLabel}`,
      start: startAt,
      end: endAt,
    },
  ]

  if (typeof settings.load_in_time === 'string' && settings.load_in_time) {
    const t = new Date(`${startDate}T${settings.load_in_time}:00Z`)
    events.push({
      uid: `${event.id}-load-in@tourify`,
      summary: `Load In — ${event.title}`,
      location: venueLabel || undefined,
      description: `Load in for ${event.title}`,
      start: t,
      end: new Date(t.getTime() + 60 * 60 * 1000),
    })
  }

  if (typeof settings.sound_check_time === 'string' && settings.sound_check_time) {
    const t = new Date(`${startDate}T${settings.sound_check_time}:00Z`)
    events.push({
      uid: `${event.id}-soundcheck@tourify`,
      summary: `Sound Check — ${event.title}`,
      location: venueLabel || undefined,
      description: `Sound check for ${event.title}`,
      start: t,
      end: new Date(t.getTime() + 60 * 60 * 1000),
    })
  }

  const doorsOpen = resolveDoorsOpenTime(settings)
  if (doorsOpen) {
    const t = new Date(`${startDate}T${doorsOpen}:00Z`)
    events.push({
      uid: `${event.id}-doors@tourify`,
      summary: `Doors Open — ${event.title}`,
      location: venueLabel || undefined,
      description: `Doors open for ${event.title}`,
      start: t,
      end: new Date(t.getTime() + 30 * 60 * 1000),
    })
  }

  const ical = buildIcsCalendar({
    prodId: '-//Tourify//Event Calendar//EN',
    name: event.title || 'Event',
    events,
  })

  return new NextResponse(ical, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="event-${eventId}.ics"`,
      'Cache-Control': 'private, max-age=300',
    },
  })
}
