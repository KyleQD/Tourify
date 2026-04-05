import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { normalizeVenueSlug } from '@/lib/venue/routing'

// GET - Get venue profile by ID or slug
export async function GET(
  request: NextRequest,
  { params }: any
) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { searchParams } = new URL(request.url)
    const track_view = searchParams.get('track_view') === 'true'
    
    // Get user if authenticated (optional)
    const { data: { user } } = await supabase.auth.getUser()
    
    let query = supabase
      .from('venue_profiles')
      .select(`
        id,
        user_id,
        venue_name,
        description,
        address,
        city,
        state,
        country,
        postal_code,
        capacity,
        venue_types,
        contact_info,
        social_links,
        settings,
        avatar_url,
        cover_image_url,
        verification_status,
        account_tier,
        created_at,
        updated_at
      `)

    // Check if ID is a UUID (venue ID) or slug
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.id)
    
    if (isUUID) {
      query = query.eq('id', params.id)
    } else {
      // Prefer indexed slug lookup and avoid table-wide scans.
      const normalizedSlug = normalizeVenueSlug(String(params.id))
      const { data: slugVenue, error: fetchError } = await supabase
        .from('venue_profiles')
        .select('id')
        .or(`url_slug.eq.${params.id},url_slug.eq.${normalizedSlug}`)
        .limit(1)
        .maybeSingle()

      if (fetchError) {
        console.error('Error fetching venues for slug lookup:', fetchError)
        return NextResponse.json({ error: 'Failed to fetch venues' }, { status: 500 })
      }

      if (slugVenue?.id) {
        query = query.eq('id', slugVenue.id)
      } else {
        // Fallback for legacy venues that predate `url_slug`.
        const legacyName = String(params.id).replace(/-/g, ' ')
        query = query.eq('venue_name', legacyName)
      }
    }

    const { data: venue, error } = await query.single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Venue not found' }, { status: 404 })
      }
      console.error('Error fetching venue:', error)
      return NextResponse.json({ error: 'Failed to fetch venue' }, { status: 500 })
    }

    // Check if venue is public (for now, allow all access)
    // TODO: Implement proper public/private logic when is_public column is added
    // if (!venue.is_public && (!user || user.id !== venue.user_id)) {
    //   return NextResponse.json({ error: 'Venue not found' }, { status: 404 })
    // }

    // Track profile view if requested
    if (track_view) {
      const viewerIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
      const userAgent = request.headers.get('user-agent')
      const referrer = request.headers.get('referer')

      try {
        await supabase
          .rpc('track_venue_profile_view', {
            venue_id: venue.id,
            viewer_id: user?.id || null,
            viewer_ip: viewerIP,
            user_agent: userAgent,
            referrer,
          })
      } catch (trackError) {
        console.warn('Failed to track venue view:', trackError)
      }
    }

    // Get venue stats
    let stats = {
      average_rating: 0,
      total_reviews: 0,
      monthly_views: 0,
      upcoming_events: 0
    }

    const today = new Date().toISOString().slice(0, 10)

    // Get recent/upcoming events at this venue from legacy + canonical tables
    const [legacyEventsResult, v2EventsResult] = await Promise.all([
      supabase
        .from('events')
        .select('id, title, name, description, event_date, event_time, ticket_price, status, start_date, date')
        .eq('venue_id', venue.id)
        .in('status', ['published', 'scheduled', 'confirmed', 'in_progress'])
        .order('event_date', { ascending: true })
        .limit(8),
      supabase
        .from('events_v2')
        .select('id, title, status, start_at, settings')
        .contains('settings', { venue_profile_id: venue.id })
        .in('status', ['confirmed', 'advancing', 'onsite'])
        .gte('start_at', new Date().toISOString())
        .order('start_at', { ascending: true })
        .limit(8),
    ])

    const legacyEvents = (legacyEventsResult.data || [])
      .filter((event: any) => {
        const dateKey = event.event_date || event.start_date || event.date || null
        if (!dateKey) return false
        return String(dateKey).slice(0, 10) >= today
      })
      .map((event: any) => ({
        id: event.id,
        title: event.title || event.name || 'Event',
        description: event.description || null,
        event_date: event.event_date || event.start_date || event.date || null,
        event_time: event.event_time || null,
        ticket_price: event.ticket_price || null,
        status: event.status || 'scheduled',
        event_table: 'events'
      }))

    const v2Events = (v2EventsResult.data || []).map((event: any) => {
      const settings = event.settings && typeof event.settings === 'object'
        ? (event.settings as Record<string, unknown>)
        : {}
      return {
        id: event.id,
        title: event.title || 'Event',
        description: typeof settings.description === 'string' ? settings.description : null,
        event_date: event.start_at ? String(event.start_at).slice(0, 10) : null,
        event_time: event.start_at ? String(event.start_at).slice(11, 16) : null,
        ticket_price: typeof settings.ticket_price === 'number' ? settings.ticket_price : null,
        status: event.status || 'confirmed',
        event_table: 'events_v2'
      }
    })

    const recentEvents = [...legacyEvents, ...v2Events]
      .sort((a, b) => {
        const firstDate = a.event_date ? new Date(a.event_date).getTime() : Number.MAX_SAFE_INTEGER
        const secondDate = b.event_date ? new Date(b.event_date).getTime() : Number.MAX_SAFE_INTEGER
        return firstDate - secondDate
      })
      .slice(0, 5)

    // Get venue stats from views table if it exists
    try {
      const { data: viewStats } = await supabase
        .from('venue_profile_views')
        .select('id')
        .eq('venue_id', venue.id)
        .gte('viewed_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days

      stats.monthly_views = viewStats?.length || 0
    } catch (error) {
      // View tracking table might not exist in all environments.
      stats.monthly_views = 0
    }

    stats.upcoming_events = recentEvents.length

    // Get user profile info if available
    let userProfile = null
    if (venue.user_id) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, full_name, avatar_url')
          .eq('id', venue.user_id)
          .single()
        
        if (profile) {
          userProfile = profile
        }
      } catch (error) {
        console.warn('Could not fetch user profile for venue:', error)
      }
    }

    const upcomingEvents = recentEvents.map((event) => ({
      ...event,
      date: event.event_date,
      eventDate: event.event_date,
    }))

    const enhancedVenue = {
      ...venue,
      tagline: venue.description?.split('.')[0] || '',
      stats,
      recent_events: recentEvents || [],
      upcomingEvents,
      user_profile: userProfile,
      // Generate a URL-friendly slug
      url_slug: venue.venue_name?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || venue.id
    }

    return NextResponse.json({ venue: enhancedVenue })
  } catch (error) {
    console.error('Error in venue API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - Update venue profile (owner only)
export async function PUT(
  request: NextRequest,
  { params }: any
) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Verify venue ownership
    const { data: venue, error: ownershipError } = await supabase
      .from('venue_profiles')
      .select('id, user_id')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (ownershipError || !venue) {
      return NextResponse.json({ error: 'Venue not found or access denied' }, { status: 403 })
    }

    // Update venue profile
    const updateFields: any = {
      ...body,
      updated_at: new Date().toISOString(),
    }

    if (typeof body?.venue_name === 'string' && body.venue_name.trim()) {
      updateFields.url_slug = body.venue_name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
    }

    const { data: updatedVenue, error: updateError } = await supabase
      .from('venue_profiles')
      .update(updateFields)
      .eq('id', params.id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating venue:', updateError)
      return NextResponse.json({ error: 'Failed to update venue' }, { status: 500 })
    }

    // Log activity
    await supabase
      .from('account_activity_log')
      .insert([
        {
          user_id: user.id,
          profile_id: user.id,
          account_type: 'venue',
          action_type: 'update_profile',
          action_details: {
            venue_id: updatedVenue.id,
            updated_fields: Object.keys(body),
          },
        },
      ])

    return NextResponse.json({
      success: true,
      venue: updatedVenue,
      message: 'Venue updated successfully',
    })
  } catch (error) {
    console.error('Error updating venue:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete venue profile (owner only)
export async function DELETE(
  request: NextRequest,
  { params }: any
) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify venue ownership
    const { data: venue, error: ownershipError } = await supabase
      .from('venue_profiles')
      .select('id, user_id, venue_name')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (ownershipError || !venue) {
      return NextResponse.json({ error: 'Venue not found or access denied' }, { status: 403 })
    }

    // Delete venue profile
    const { error: deleteError } = await supabase
      .from('venue_profiles')
      .delete()
      .eq('id', params.id)

    if (deleteError) {
      console.error('Error deleting venue:', deleteError)
      return NextResponse.json({ error: 'Failed to delete venue' }, { status: 500 })
    }

    // Log activity
    await supabase
      .from('account_activity_log')
      .insert([
        {
          user_id: user.id,
          profile_id: user.id,
          account_type: 'venue',
          action_type: 'delete_account',
          action_details: {
            venue_id: venue.id,
            venue_name: venue.venue_name,
          },
        },
      ])

    return NextResponse.json({
      success: true,
      message: 'Venue deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting venue:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 