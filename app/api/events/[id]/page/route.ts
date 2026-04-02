import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  canAccessEventAsViewer,
  resolveEventReference,
} from '../../_lib/event-reference'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    const reference = await resolveEventReference(supabase, eventId)
    if (!reference) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    if (!canAccessEventAsViewer(reference, user?.id)) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    let event: Record<string, any> | null = null
    if (reference.table !== 'events_v2') {
      const sourceTable = reference.table
      const ownerColumn = sourceTable === 'artist_events' ? 'user_id' : 'artist_id'
      const { data: legacyEvent, error: eventError } = await supabase
        .from(sourceTable)
        .select(`
          *,
          profiles:${ownerColumn} (
            id,
            username,
            full_name,
            avatar_url,
            is_verified
          )
        `)
        .eq('id', reference.id)
        .single()

      if (eventError || !legacyEvent) {
        return NextResponse.json(
          { error: 'Event not found' },
          { status: 404 }
        )
      }
      event = legacyEvent
    } else {
      const { data: eventV2, error: eventError } = await supabase
        .from('events_v2')
        .select('id, title, slug, status, start_at, end_at, created_by, capacity, settings, created_at, updated_at')
        .eq('id', reference.id)
        .single()

      if (eventError || !eventV2) {
        return NextResponse.json(
          { error: 'Event not found' },
          { status: 404 }
        )
      }
      let creatorProfile: Record<string, unknown> | null = null
      if (eventV2.created_by) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url, is_verified')
          .eq('id', eventV2.created_by)
          .maybeSingle()
        creatorProfile = profile || null
      }

      event = {
        ...eventV2,
        profiles: creatorProfile,
      } as Record<string, any>
    }

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    const { data: attendanceData, error: attendanceError } = await supabase
      .from('event_attendance')
      .select('*')
      .eq('event_id', reference.id)
      .eq('event_table', reference.table)

    if (attendanceError) {
      console.error('Error fetching attendance:', attendanceError)
    }

    const attending = attendanceData?.filter(a => a.status === 'attending') || []
    const interested = attendanceData?.filter(a => a.status === 'interested') || []
    const notGoing = attendanceData?.filter(a => a.status === 'not_going') || []

    // Get current user's attendance status
    let userStatus = null
    if (user) {
      const userAttendance = attendanceData?.find(a => a.user_id === user.id)
      userStatus = userAttendance?.status || null
    }

    // Get event posts
    const { data: posts, error: postsError } = await supabase
      .from('event_posts')
      .select(`
        *,
        profiles:user_id (
          id,
          username,
          full_name,
          avatar_url,
          is_verified
        )
      `)
      .eq('event_id', reference.id)
      .eq('event_table', reference.table)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })

    if (postsError) {
      console.error('Error fetching posts:', postsError)
    }

    // Determine if user can post
    let canPost = false
    if (user) {
      const ownerUserId =
        reference.table === 'events_v2'
          ? (event.created_by as string | null)
          : (event.artist_id as string | null)
      const isCreator = ownerUserId === user.id
      const isAttending = userStatus === 'attending'
      canPost = isCreator || isAttending
    }

    const eventSettings =
      event.settings && typeof event.settings === 'object'
        ? (event.settings as Record<string, any>)
        : {}
    const eventStartAt = typeof event.start_at === 'string' ? event.start_at : null

    const response = {
      event: {
        id: event.id,
        title:
          reference.table === 'events_v2'
            ? event.title
            : (event.title ?? event.name ?? null),
        description:
          reference.table === 'events_v2'
            ? (eventSettings.description ?? null)
            : (event.description ?? null),
        type:
          reference.table === 'events_v2'
            ? (eventSettings.event_type ?? null)
            : (event.type ?? event.event_type ?? null),
        venue_name:
          reference.table === 'events_v2'
            ? (eventSettings.venue_label ?? null)
            : (event.venue_name ?? null),
        venue_address:
          reference.table === 'events_v2'
            ? (eventSettings.venue_address ?? null)
            : (event.venue_address ?? event.address ?? null),
        venue_city:
          reference.table === 'events_v2'
            ? (eventSettings.venue_city ?? null)
            : (event.venue_city ?? event.city ?? null),
        venue_state:
          reference.table === 'events_v2'
            ? (eventSettings.venue_state ?? null)
            : (event.venue_state ?? event.state ?? null),
        venue_country:
          reference.table === 'events_v2'
            ? (eventSettings.venue_country ?? null)
            : (event.venue_country ?? event.country ?? null),
        venue_coordinates:
          reference.table === 'events_v2'
            ? null
            : event.venue_coordinates
              ? event.venue_coordinates
              : event.latitude && event.longitude
                ? { lat: event.latitude, lng: event.longitude }
                : null,
        event_date:
          reference.table === 'events_v2' && eventStartAt
            ? eventStartAt.slice(0, 10)
            : (event.event_date ?? null),
        start_time:
          reference.table === 'events_v2' && eventStartAt
            ? eventStartAt.slice(11, 16)
            : (event.start_time ?? null),
        end_time: reference.table === 'events_v2' ? null : event.end_time,
        doors_open: reference.table === 'events_v2' ? null : event.doors_open,
        ticket_url: reference.table === 'events_v2' ? null : event.ticket_url,
        ticket_price_min: reference.table === 'events_v2' ? null : event.ticket_price_min,
        ticket_price_max: reference.table === 'events_v2' ? null : event.ticket_price_max,
        capacity: event.capacity,
        status: event.status,
        is_public: reference.table === 'events_v2' ? true : (event.is_public ?? false),
        poster_url: reference.table === 'events_v2' ? null : event.poster_url,
        setlist: reference.table === 'events_v2' ? null : event.setlist,
        tags: reference.table === 'events_v2' ? [] : (event.tags ?? []),
        social_links: reference.table === 'events_v2' ? null : (event.social_links ?? null),
        slug: event.slug,
        user_id:
          reference.table === 'events_v2'
            ? event.created_by
            : (event.user_id ?? event.artist_id ?? null),
        created_at: event.created_at,
        updated_at: event.updated_at || event.created_at,
        creator: event.profiles || null,
        event_table: reference.table,
      },
      attendance: {
        attending: attending.length,
        interested: interested.length,
        not_going: notGoing.length,
        user_status: userStatus,
        attendees: attending.slice(0, 10), // Limit for performance
        interested_users: interested.slice(0, 10)
      },
      posts: posts || [],
      can_post: canPost,
      is_creator: user ? reference.ownerUserId === user.id : false
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error in event page API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


