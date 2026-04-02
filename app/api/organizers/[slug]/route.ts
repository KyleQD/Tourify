import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiRequest } from '@/lib/auth/api-auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const authResult = await authenticateApiRequest(request)
    const supabase = authResult?.supabase || (await (await import('@/lib/supabase/server')).createClient())

    // Organizer page
    const { data: page, error: pageError } = await supabase
      .from('organizer_pages')
      .select('*')
      .eq('slug', slug)
      .single()

    if (pageError) return NextResponse.json({ error: 'Organizer not found' }, { status: 404 })

    // Recent posts
    const { data: posts } = await supabase
      .from('promotion_posts')
      .select('id, title, content, images, tags, created_at, event_id')
      .eq('author_id', page.user_id)
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(10)

    const today = new Date().toISOString().slice(0, 10)

    // Upcoming events (legacy + canonical), scoped to this organizer user
    const [legacyEventsResult, eventsV2Result] = await Promise.all([
      supabase
        .from('events')
        .select('id, name, event_date, status, venue_name, tour_id, user_id')
        .eq('user_id', page.user_id)
        .gte('event_date', today)
        .order('event_date', { ascending: true })
        .limit(10),
      supabase
        .from('events_v2')
        .select('id, title, status, start_at, created_by')
        .eq('created_by', page.user_id)
        .gte('start_at', new Date().toISOString())
        .order('start_at', { ascending: true })
        .limit(10)
    ])

    const legacyEvents = (legacyEventsResult.data || []).map((event: any) => ({
      id: event.id,
      name: event.name || 'Event',
      event_date: event.event_date || null,
      status: event.status || 'scheduled',
      venue_name: event.venue_name || null,
      tour_id: event.tour_id || null,
      event_table: 'events'
    }))

    const v2Events = (eventsV2Result.data || []).map((event: any) => ({
      id: event.id,
      name: event.title || 'Event',
      event_date: event.start_at ? String(event.start_at).slice(0, 10) : null,
      status: event.status || 'confirmed',
      venue_name: null,
      tour_id: null,
      event_table: 'events_v2'
    }))

    const upcoming = [...legacyEvents, ...v2Events]
      .sort((a, b) => {
        const firstDate = a.event_date ? new Date(a.event_date).getTime() : Number.MAX_SAFE_INTEGER
        const secondDate = b.event_date ? new Date(b.event_date).getTime() : Number.MAX_SAFE_INTEGER
        return firstDate - secondDate
      })
      .slice(0, 10)

    return NextResponse.json({ page, posts: posts || [], upcoming })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


