import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiRequest } from '@/lib/auth/api-auth'
import { buildUniqueEventSlug } from '../_lib/events-v2-admin'
import { ensureAdminOrgScope, verifyEventsV2Row } from '../_lib/admin-event-persistence'

function combineDateTimeToIso(date?: string, time?: string): string {
  if (!date?.trim()) return new Date().toISOString()
  const t = (time?.trim() || '00:00').slice(0, 5)
  const ms = Date.parse(`${date.trim()}T${t}:00`)
  if (Number.isNaN(ms)) return new Date().toISOString()
  return new Date(ms).toISOString()
}

export async function GET(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('id')

    if (eventId) {
      const { data, error } = await auth.supabase
        .from('events_v2')
        .select('*')
        .eq('id', eventId)
        .eq('created_by', auth.user.id)
        .maybeSingle()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      if (!data) return NextResponse.json({ error: 'Event not found' }, { status: 404 })
      return NextResponse.json({ event: data })
    }

    // Return draft events for resume list
    const { data, error } = await auth.supabase
      .from('events_v2')
      .select('id, title, status, start_at, settings, updated_at')
      .eq('created_by', auth.user.id)
      .eq('status', 'inquiry')
      .order('updated_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error('[Event Planner] GET error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ events: data || [] })
  } catch (error: any) {
    console.error('[Event Planner] GET exception:', error)
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { action, event_id, ...plannerData } = body

    // Legacy: action=publish goes to the dedicated publish route
    if (action === 'publish') {
      return NextResponse.json(
        { error: 'Use POST /api/events/planner/publish to publish events' },
        { status: 400 },
      )
    }

    const orgId = await ensureAdminOrgScope(auth.supabase, auth.user.id, plannerData.tour_id)

    const title = (plannerData.name || plannerData.title || '').trim()
    if (!title) {
      return NextResponse.json({ error: 'Event name is required' }, { status: 400 })
    }

    const firstVenue = Array.isArray(plannerData.venues) ? plannerData.venues[0] : null
    const startAt = combineDateTimeToIso(
      firstVenue?.selectedDate,
      firstVenue?.selectedTime,
    )
    const endAt = new Date(new Date(startAt).getTime() + 2 * 60 * 60 * 1000).toISOString()
    const capacity = firstVenue?.capacity ? Number(firstVenue.capacity) : null

    // If event_id provided, update the existing draft
    if (event_id) {
      const { data, error } = await auth.supabase
        .from('events_v2')
        .update({
          title,
          start_at: startAt,
          end_at: endAt,
          capacity,
          settings: {
            ...plannerData,
            _planner_draft: true,
            venue_label: firstVenue?.name ?? '',
            description: plannerData.description ?? '',
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', event_id)
        .eq('created_by', auth.user.id)
        .select()
        .single()

      if (error) {
        console.error('[Event Planner] update error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      if (!data?.id) {
        return NextResponse.json({ error: 'Failed to update verified planner draft' }, { status: 500 })
      }

      const verifiedEvent = await verifyEventsV2Row(auth.supabase, data.id, auth.user.id)
      return NextResponse.json({ event: verifiedEvent })
    }

    // Create new draft event
    const slug = await buildUniqueEventSlug(auth.supabase as any, orgId, title)

    const { data, error } = await auth.supabase
      .from('events_v2')
      .insert({
        org_id: orgId,
        title,
        slug,
        status: 'inquiry',
        start_at: startAt,
        end_at: endAt,
        capacity,
        timezone: 'UTC',
        created_by: auth.user.id,
        settings: {
          ...plannerData,
          _planner_draft: true,
          venue_label: firstVenue?.name ?? '',
          description: plannerData.description ?? '',
        },
      })
      .select()
      .single()

    if (error) {
      console.error('[Event Planner] POST error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data?.id) {
      return NextResponse.json({ error: 'Failed to create verified planner draft' }, { status: 500 })
    }

    const verifiedEvent = await verifyEventsV2Row(auth.supabase, data.id, auth.user.id)
    return NextResponse.json({ event: verifiedEvent }, { status: 201 })
  } catch (error: any) {
    console.error('[Event Planner] POST exception:', error)
    return NextResponse.json({ error: error.message || 'Failed to process event request' }, { status: 500 })
  }
}
