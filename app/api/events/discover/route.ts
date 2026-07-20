import { NextRequest, NextResponse } from 'next/server'
import { isArtistEventDiscoverable } from '@/lib/artist/artist-event-visibility'
import {
  isEventsV2PubliclyListable,
  matchesLocationFields,
  mergeEventSourcesSoft,
  sortEventsByLocationBoost,
} from '@/lib/discover/location-match'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

function todayDateUtc() {
  return new Date().toISOString().split('T')[0]
}

function countAttendance(
  rows: Array<{ event_id: string; status: string }> | null | undefined
) {
  const byEventId = new Map<string, { attending: number; interested: number }>()
  for (const attendance of rows || []) {
    const current = byEventId.get(attendance.event_id) || { attending: 0, interested: 0 }
    if (attendance.status === 'attending') current.attending += 1
    if (attendance.status === 'interested') current.interested += 1
    byEventId.set(attendance.event_id, current)
  }
  return byEventId
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient()
    const { searchParams } = new URL(request.url)

    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)
    const type = searchParams.get('type')
    const location = searchParams.get('location')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const tags = searchParams.get('tags')?.split(',').filter(Boolean)
    const sortBy = searchParams.get('sortBy') || 'date'
    const strictLocation = searchParams.get('strictLocation') === 'true'

    const futureDate = dateFrom || todayDateUtc()
    const normalizedDateFrom = dateFrom || new Date().toISOString()
    const normalizedDateTo = dateTo ? `${dateTo}T23:59:59.999Z` : null

    // Location is boosted in-memory; do not hard-filter SQL (wipes "City, State" matches).
    // Select * without fragile embeds so schema drift / FK mismatches cannot 500 the rail.
    let legacyQuery = supabase
      .from('events')
      .select('*')
      .eq('status', 'published')
      .gte('event_date', futureDate)
      .order('event_date', { ascending: true })
      .limit(200)

    if (type) legacyQuery = legacyQuery.eq('event_type', type)
    if (dateTo) legacyQuery = legacyQuery.lte('event_date', dateTo)
    if (tags && tags.length > 0) legacyQuery = legacyQuery.overlaps('tags', tags)

    let v2Query = supabase
      .from('events_v2')
      .select('id, title, slug, status, start_at, end_at, created_by, capacity, settings, created_at, updated_at')
      .in('status', ['confirmed', 'advancing', 'onsite'])
      .gte('start_at', normalizedDateFrom)
      .order('start_at', { ascending: true })
      .limit(200)

    if (normalizedDateTo) v2Query = v2Query.lte('start_at', normalizedDateTo)

    let artistEventsQuery = supabase
      .from('artist_events')
      .select('*')
      .eq('status', 'published')
      .gte('event_date', futureDate)
      .order('event_date', { ascending: true })
      .limit(200)

    if (dateFrom) artistEventsQuery = artistEventsQuery.gte('event_date', dateFrom)
    if (dateTo) artistEventsQuery = artistEventsQuery.lte('event_date', dateTo)
    if (tags && tags.length > 0) artistEventsQuery = artistEventsQuery.overlaps('tags', tags)

    const [legacyResult, v2Result, artistEventsResult] = await Promise.all([
      legacyQuery,
      v2Query,
      artistEventsQuery,
    ])

    if (legacyResult.error) console.error('[events/discover] events query failed:', legacyResult.error)
    if (v2Result.error) console.error('[events/discover] events_v2 query failed:', v2Result.error)
    if (artistEventsResult.error)
      console.error('[events/discover] artist_events query failed:', artistEventsResult.error)

    const allSourcesFailed =
      Boolean(legacyResult.error) && Boolean(v2Result.error) && Boolean(artistEventsResult.error)

    if (allSourcesFailed) {
      return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 })
    }

    const legacyEvents = (legacyResult.error ? [] : legacyResult.data || []).filter(
      isArtistEventDiscoverable
    )
    const v2Events = (v2Result.error ? [] : v2Result.data || []).filter((event) =>
      isEventsV2PubliclyListable(event)
    )
    const artistEvents = (artistEventsResult.error ? [] : artistEventsResult.data || []).filter(
      isArtistEventDiscoverable
    )

    const legacyIds = legacyEvents.map((event) => event.id)
    const v2Ids = v2Events.map((event) => event.id)
    const artistEventIds = artistEvents.map((event) => event.id)

    const [legacyAttendanceResult, v2AttendanceResult, artistAttendanceResult] = await Promise.all([
      legacyIds.length > 0
        ? supabase
            .from('event_attendance')
            .select('event_id, status')
            .eq('event_table', 'events')
            .in('event_id', legacyIds)
        : Promise.resolve({ data: [], error: null }),
      v2Ids.length > 0
        ? supabase
            .from('event_attendance')
            .select('event_id, status')
            .eq('event_table', 'events_v2')
            .in('event_id', v2Ids)
        : Promise.resolve({ data: [], error: null }),
      artistEventIds.length > 0
        ? supabase
            .from('event_attendance')
            .select('event_id, status')
            .eq('event_table', 'artist_events')
            .in('event_id', artistEventIds)
        : Promise.resolve({ data: [], error: null }),
    ])

    if (legacyAttendanceResult.error || v2AttendanceResult.error || artistAttendanceResult.error) {
      console.error(
        '[events/discover] attendance query failed:',
        legacyAttendanceResult.error || v2AttendanceResult.error || artistAttendanceResult.error
      )
    }

    const legacyAttendanceByEventId = countAttendance(legacyAttendanceResult.data)
    const v2AttendanceByEventId = countAttendance(v2AttendanceResult.data)
    const artistAttendanceByEventId = countAttendance(artistAttendanceResult.data)

    const transformedLegacyEvents = legacyEvents.map((event) => {
      const counts = legacyAttendanceByEventId.get(event.id) || { attending: 0, interested: 0 }
      return {
        ...event,
        title: event.name || event.title || 'Event',
        type: event.event_type,
        venue_city: event.city,
        venue_state: event.state,
        poster_url: event.poster_url || null,
        ticket_price_min: event.ticket_price_min ?? event.ticket_price ?? null,
        ticket_price_max: event.ticket_price_max ?? event.ticket_price ?? null,
        event_table: 'events',
        attendance: {
          attending: counts.attending,
          interested: counts.interested,
          total: counts.attending + counts.interested,
        },
      }
    })

    const transformedV2Events = v2Events.map((event) => {
      const counts = v2AttendanceByEventId.get(event.id) || { attending: 0, interested: 0 }
      const settings =
        event.settings && typeof event.settings === 'object'
          ? (event.settings as Record<string, unknown>)
          : {}
      const startAt = typeof event.start_at === 'string' ? event.start_at : ''

      const ticketPrice =
        typeof settings.ticket_price === 'number'
          ? settings.ticket_price
          : typeof settings.ticket_price_min === 'number'
            ? settings.ticket_price_min
            : null

      return {
        id: event.id,
        title: event.title,
        name: event.title,
        type: typeof settings.event_type === 'string' ? settings.event_type : null,
        event_type: typeof settings.event_type === 'string' ? settings.event_type : null,
        description: typeof settings.description === 'string' ? settings.description : null,
        venue_name:
          typeof settings.venue_label === 'string'
            ? settings.venue_label
            : typeof settings.venue_name === 'string'
              ? settings.venue_name
              : null,
        venue_city: typeof settings.venue_city === 'string' ? settings.venue_city : null,
        venue_state: typeof settings.venue_state === 'string' ? settings.venue_state : null,
        venue_country: typeof settings.venue_country === 'string' ? settings.venue_country : null,
        poster_url:
          typeof settings.poster_url === 'string'
            ? settings.poster_url
            : typeof settings.cover_image_url === 'string'
              ? settings.cover_image_url
              : null,
        ticket_price_min:
          typeof settings.ticket_price_min === 'number' ? settings.ticket_price_min : ticketPrice,
        ticket_price_max:
          typeof settings.ticket_price_max === 'number' ? settings.ticket_price_max : ticketPrice,
        slug: event.slug,
        status: event.status,
        capacity: event.capacity,
        event_date: startAt ? startAt.slice(0, 10) : null,
        start_time: startAt ? startAt.slice(11, 16) : null,
        end_time: null,
        event_table: 'events_v2',
        attendance: {
          attending: counts.attending,
          interested: counts.interested,
          total: counts.attending + counts.interested,
        },
      }
    })

    const transformedArtistEvents = artistEvents.map((event) => {
      const counts = artistAttendanceByEventId.get(event.id) || { attending: 0, interested: 0 }
      return {
        ...event,
        title: event.title || event.name || 'Event',
        name: event.title || event.name || 'Event',
        type: event.type || event.event_type || null,
        event_type: event.type || event.event_type || null,
        venue_city: event.venue_city || event.city || null,
        venue_state: event.venue_state || event.state || null,
        poster_url: event.poster_url || null,
        ticket_price_min: event.ticket_price_min ?? event.ticket_price ?? null,
        ticket_price_max: event.ticket_price_max ?? event.ticket_price ?? null,
        event_table: 'artist_events',
        attendance: {
          attending: counts.attending,
          interested: counts.interested,
          total: counts.attending + counts.interested,
        },
      }
    })

    let transformedEvents = mergeEventSourcesSoft([
      transformedLegacyEvents,
      transformedV2Events,
      transformedArtistEvents,
    ])

    if (type) {
      transformedEvents = transformedEvents.filter(
        (event) => event.type === type || event.event_type === type
      )
    }

    // Optional strict location filter (Discover does not pass this).
    if (strictLocation && location?.trim()) {
      transformedEvents = transformedEvents.filter((event) =>
        matchesLocationFields(
          location,
          event.venue_city,
          event.venue_state,
          event.city,
          event.state
        )
      )
    }

    switch (sortBy) {
      case 'popularity':
        transformedEvents = transformedEvents.sort(
          (a, b) => (b.attendance?.total || 0) - (a.attendance?.total || 0)
        )
        break
      case 'relevance':
        transformedEvents = sortEventsByLocationBoost(transformedEvents, location)
        break
      default:
        transformedEvents = transformedEvents.sort((a, b) => {
          const aDate = a.event_date ? new Date(a.event_date).getTime() : Number.MAX_SAFE_INTEGER
          const bDate = b.event_date ? new Date(b.event_date).getTime() : Number.MAX_SAFE_INTEGER
          return aDate - bDate
        })
        if (location?.trim())
          transformedEvents = sortEventsByLocationBoost(transformedEvents, location)
        break
    }

    const paginatedEvents = transformedEvents.slice(offset, offset + limit)

    return NextResponse.json({
      events: paginatedEvents,
      pagination: {
        limit,
        offset,
        hasMore: transformedEvents.length > offset + limit,
      },
      sources: {
        events: !legacyResult.error,
        events_v2: !v2Result.error,
        artist_events: !artistEventsResult.error,
      },
    })
  } catch (error) {
    console.error('Error in events discover API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
