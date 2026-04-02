import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    const type = searchParams.get('type')
    const location = searchParams.get('location')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const tags = searchParams.get('tags')?.split(',')
    const sortBy = searchParams.get('sortBy') || 'date' // date, popularity, relevance

    // Build legacy events query
    let legacyQuery = supabase
      .from('events')
      .select(`
        *,
        profiles:artist_id (
          id,
          username,
          full_name,
          avatar_url,
          is_verified
        ),
        event_attendance!left (
          status
        )
      `)
      .eq('status', 'published')
      .gte('event_date', new Date().toISOString().split('T')[0]) // Only future events
      .order('event_date', { ascending: true })

    // Apply filters
    if (type) {
      legacyQuery = legacyQuery.eq('event_type', type)
    }

    if (location) {
      legacyQuery = legacyQuery.or(`city.ilike.%${location}%,state.ilike.%${location}%`)
    }

    if (dateFrom) {
      legacyQuery = legacyQuery.gte('event_date', dateFrom)
    }

    if (dateTo) {
      legacyQuery = legacyQuery.lte('event_date', dateTo)
    }

    if (tags && tags.length > 0) {
      legacyQuery = legacyQuery.overlaps('tags', tags)
    }

    const normalizedDateFrom = dateFrom || new Date().toISOString()
    const normalizedDateTo = dateTo ? `${dateTo}T23:59:59.999Z` : null

    // Build events_v2 query in parallel to support canonical model
    let v2Query = supabase
      .from('events_v2')
      .select('id, title, slug, status, start_at, end_at, created_by, capacity, settings, created_at, updated_at')
      .in('status', ['confirmed', 'advancing', 'onsite'])
      .gte('start_at', normalizedDateFrom)

    if (normalizedDateTo) {
      v2Query = v2Query.lte('start_at', normalizedDateTo)
    }

    if (location) {
      v2Query = v2Query.or(`settings->>venue_city.ilike.%${location}%,settings->>venue_state.ilike.%${location}%`)
    }

    // Build artist_events query for backward compatibility
    let artistEventsQuery = supabase
      .from('artist_events')
      .select('*')
      .eq('status', 'published')
      .gte('event_date', new Date().toISOString().split('T')[0])
      .order('event_date', { ascending: true })

    if (dateFrom) {
      artistEventsQuery = artistEventsQuery.gte('event_date', dateFrom)
    }
    if (dateTo) {
      artistEventsQuery = artistEventsQuery.lte('event_date', dateTo)
    }
    if (tags && tags.length > 0) {
      artistEventsQuery = artistEventsQuery.overlaps('tags', tags)
    }

    const [legacyResult, v2Result, artistEventsResult] = await Promise.all([
      legacyQuery,
      v2Query,
      artistEventsQuery,
    ])

    if (legacyResult.error || v2Result.error || artistEventsResult.error) {
      console.error('Error fetching events:', legacyResult.error || v2Result.error || artistEventsResult.error)
      return NextResponse.json(
        { error: 'Failed to fetch events' },
        { status: 500 }
      )
    }

    const legacyEvents = legacyResult.data || []
    const v2Events = v2Result.data || []
    const artistEvents = artistEventsResult.data || []
    const legacyIds = legacyEvents.map(event => event.id)
    const v2Ids = v2Events.map(event => event.id)
    const artistEventIds = artistEvents.map(event => event.id)

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
      console.error('Error fetching attendance counts:', legacyAttendanceResult.error || v2AttendanceResult.error || artistAttendanceResult.error)
    }

    const legacyAttendanceByEventId = new Map<string, { attending: number; interested: number }>()
    for (const attendance of legacyAttendanceResult.data || []) {
      const current = legacyAttendanceByEventId.get(attendance.event_id) || { attending: 0, interested: 0 }
      if (attendance.status === 'attending') current.attending += 1
      if (attendance.status === 'interested') current.interested += 1
      legacyAttendanceByEventId.set(attendance.event_id, current)
    }

    const v2AttendanceByEventId = new Map<string, { attending: number; interested: number }>()
    for (const attendance of v2AttendanceResult.data || []) {
      const current = v2AttendanceByEventId.get(attendance.event_id) || { attending: 0, interested: 0 }
      if (attendance.status === 'attending') current.attending += 1
      if (attendance.status === 'interested') current.interested += 1
      v2AttendanceByEventId.set(attendance.event_id, current)
    }

    const artistAttendanceByEventId = new Map<string, { attending: number; interested: number }>()
    for (const attendance of artistAttendanceResult.data || []) {
      const current = artistAttendanceByEventId.get(attendance.event_id) || { attending: 0, interested: 0 }
      if (attendance.status === 'attending') current.attending += 1
      if (attendance.status === 'interested') current.interested += 1
      artistAttendanceByEventId.set(attendance.event_id, current)
    }

    const transformedLegacyEvents = legacyEvents.map(event => {
      const counts = legacyAttendanceByEventId.get(event.id) || { attending: 0, interested: 0 }
      return {
        ...event,
        title: event.name,
        type: event.event_type,
        venue_city: event.city,
        venue_state: event.state,
        event_table: 'events',
        attendance: {
          attending: counts.attending,
          interested: counts.interested,
          total: counts.attending + counts.interested
        }
      }
    })

    const transformedV2Events = v2Events.map(event => {
      const counts = v2AttendanceByEventId.get(event.id) || { attending: 0, interested: 0 }
      const settings = event.settings && typeof event.settings === 'object'
        ? event.settings as Record<string, unknown>
        : {}
      const startAt = typeof event.start_at === 'string' ? event.start_at : ''

      return {
        id: event.id,
        title: event.title,
        name: event.title,
        type: typeof settings.event_type === 'string' ? settings.event_type : null,
        event_type: typeof settings.event_type === 'string' ? settings.event_type : null,
        description: typeof settings.description === 'string' ? settings.description : null,
        venue_name: typeof settings.venue_label === 'string' ? settings.venue_label : null,
        venue_city: typeof settings.venue_city === 'string' ? settings.venue_city : null,
        venue_state: typeof settings.venue_state === 'string' ? settings.venue_state : null,
        venue_country: typeof settings.venue_country === 'string' ? settings.venue_country : null,
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
          total: counts.attending + counts.interested
        }
      }
    })

    const transformedArtistEvents = artistEvents.map(event => {
      const counts = artistAttendanceByEventId.get(event.id) || { attending: 0, interested: 0 }
      return {
        ...event,
        title: event.title || event.name || 'Event',
        name: event.title || event.name || 'Event',
        type: event.type || event.event_type || null,
        event_type: event.type || event.event_type || null,
        venue_city: event.venue_city || event.city || null,
        venue_state: event.venue_state || event.state || null,
        event_table: 'artist_events',
        attendance: {
          attending: counts.attending,
          interested: counts.interested,
          total: counts.attending + counts.interested
        }
      }
    })

    let transformedEvents = [...transformedLegacyEvents, ...transformedV2Events, ...transformedArtistEvents]

    switch (sortBy) {
      case 'popularity':
        transformedEvents = transformedEvents.sort((a, b) => (b.attendance?.total || 0) - (a.attendance?.total || 0))
        break
      case 'relevance':
        transformedEvents = transformedEvents.sort((a, b) => {
          const aPopularity = a.attendance?.total || 0
          const bPopularity = b.attendance?.total || 0
          const aDate = a.event_date ? new Date(a.event_date).getTime() : Number.MAX_SAFE_INTEGER
          const bDate = b.event_date ? new Date(b.event_date).getTime() : Number.MAX_SAFE_INTEGER
          return (bPopularity - aPopularity) || (aDate - bDate)
        })
        break
      default:
        transformedEvents = transformedEvents.sort((a, b) => {
          const aDate = a.event_date ? new Date(a.event_date).getTime() : Number.MAX_SAFE_INTEGER
          const bDate = b.event_date ? new Date(b.event_date).getTime() : Number.MAX_SAFE_INTEGER
          return aDate - bDate
        })
    }

    const paginatedEvents = transformedEvents.slice(offset, offset + limit)

    return NextResponse.json({
      events: paginatedEvents,
      pagination: {
        limit,
        offset,
        hasMore: transformedEvents.length > offset + limit
      }
    })
  } catch (error) {
    console.error('Error in events discover API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
