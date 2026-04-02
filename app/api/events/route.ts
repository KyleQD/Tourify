import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withAuth } from '@/lib/auth/api-auth'
import { buildUniqueEventSlug, mapIncomingStatusToV2 } from './_lib/events-v2-admin'

function mapEventRow(row: Record<string, unknown>) {
  const settings =
    row.settings && typeof row.settings === 'object' && row.settings !== null
      ? (row.settings as Record<string, unknown>)
      : {}
  const description =
    typeof row.description === 'string'
      ? row.description
      : typeof settings.description === 'string'
        ? settings.description
        : null
  const tourEvents = row.tour_events as { tour_id: string }[] | null | undefined
  const tourId =
    typeof row.tour_id === 'string'
      ? row.tour_id
      : Array.isArray(tourEvents) && tourEvents[0]?.tour_id
        ? tourEvents[0].tour_id
        : null

  return {
    id: row.id as string,
    name: row.title as string,
    title: row.title as string,
    description,
    status: row.status as string,
    event_date: row.start_at as string,
    end_date: row.end_at as string,
    venue_id: (row.venue_id as string | null) ?? null,
    capacity: (row.capacity as number | null) ?? null,
    created_at: row.created_at as string,
    tour_id: tourId
  }
}

function combineDateTimeToIso(date?: string, time?: string): string | null {
  if (!date?.trim()) return null
  const t = (time?.trim() || '00:00').slice(0, 5)
  const ms = Date.parse(`${date.trim()}T${t}:00`)
  if (Number.isNaN(ms)) return null
  return new Date(ms).toISOString()
}

function defaultEndAt(startIso: string): string {
  const d = new Date(startIso)
  d.setUTCHours(d.getUTCHours() + 2)
  return d.toISOString()
}

function parseCapacityInput(v: unknown): number | null {
  if (v === undefined || v === null || v === '') return null
  const n = typeof v === 'string' ? parseInt(v, 10) : v
  if (typeof n !== 'number' || Number.isNaN(n) || n < 0) return null
  return n
}

const postBodySchema = z
  .object({
    title: z.string().min(1).optional(),
    name: z.string().min(1).optional(),
    description: z.string().optional().nullable(),
    status: z.string().optional().nullable(),
    start_at: z.string().min(1).optional(),
    end_at: z.string().min(1).optional(),
    event_date: z.string().optional(),
    event_time: z.string().optional(),
    venue_id: z.string().uuid().optional().nullable(),
    venue_name: z.string().optional(),
    venue_address: z.string().optional(),
    capacity: z.union([z.number().int(), z.string()]).optional().nullable(),
    tour_id: z.union([z.string().uuid(), z.literal('')]).optional().nullable(),
    doors_open: z.string().optional(),
    ticket_price: z.number().optional(),
    vip_price: z.number().optional(),
    expected_revenue: z.number().optional(),
  })
  .refine(d => !!(d.title?.trim() || d.name?.trim()), { message: 'title or name is required' })
  .refine(d => !!(d.start_at?.trim() || d.event_date?.trim()), {
    message: 'start_at or event_date is required',
  })

async function resolveOrgIdForCreate(
  supabase: { from: (t: string) => any },
  userId: string,
  tourId: string | null | undefined
): Promise<{ orgId: string | null; error?: string }> {
  if (tourId) {
    const { data: tour, error } = await supabase
      .from('tours')
      .select('org_id')
      .eq('id', tourId)
      .maybeSingle()

    if (error) {
      console.error('[events POST] tour lookup failed:', error)
      return { orgId: null, error: 'Failed to resolve organization' }
    }
    if (!tour) return { orgId: null, error: 'Tour not found' }
    if (tour.org_id) return { orgId: tour.org_id as string }
  }

  const { data: membership, error: memError } = await supabase
    .from('org_members')
    .select('org_id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle()

  if (memError) {
    console.error('[events POST] org_members lookup failed:', memError)
    return { orgId: null, error: 'Failed to resolve organization' }
  }
  if (!membership?.org_id) {
    return { orgId: null, error: 'No organization found for user; provide a valid tour_id' }
  }
  return { orgId: membership.org_id as string }
}

export const GET = withAuth(async (request, { user, supabase }) => {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const tourId = searchParams.get('tour_id')
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50', 10) || 50, 1), 200)
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10) || 0, 0)

    let eventIds: string[] | null = null
    if (tourId) {
      const { data: links, error: linkError } = await supabase
        .from('tour_events')
        .select('event_id')
        .eq('tour_id', tourId)

      if (linkError) {
        console.error('[events GET] tour_events filter failed:', linkError)
        return NextResponse.json({ success: false, error: 'Failed to list events' }, { status: 500 })
      }
      const filteredEventIds = (links || []).map((record: { event_id: string }) => record.event_id)
      eventIds = filteredEventIds
      if (filteredEventIds.length === 0) {
        return NextResponse.json({ success: true, events: [] })
      }
    }

    let query = supabase
      .from('events_v2')
      .select(
        'id, title, status, start_at, end_at, venue_id, capacity, created_at, created_by, settings, tour_events(tour_id)'
      )
      .eq('created_by', user.id)
      .order('start_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) query = query.eq('status', status)
    if (eventIds) query = query.in('id', eventIds)

    const { data: rows, error } = await query

    if (error) {
      console.error('[events GET] query failed:', error)
      return NextResponse.json({ success: false, error: 'Failed to list events' }, { status: 500 })
    }

    const events = (rows || []).map((row: Record<string, unknown>) => mapEventRow(row))
    return NextResponse.json({ success: true, events })
  } catch (err) {
    console.error('[events GET] unexpected error:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
})

export const POST = withAuth(async (request, { user, supabase }) => {
  try {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 })
    }

    const parsed = postBodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const d = parsed.data
    const title = (d.title?.trim() || d.name?.trim() || '').slice(0, 500)
    let startAt = d.start_at?.trim() || combineDateTimeToIso(d.event_date, d.event_time)
    if (!startAt) {
      return NextResponse.json({ success: false, error: 'Could not determine start time' }, { status: 400 })
    }
    let endAt = d.end_at?.trim() || defaultEndAt(startAt)
    const tourId = d.tour_id === '' || d.tour_id === undefined ? null : d.tour_id
    const capacity = parseCapacityInput(d.capacity)

    const { orgId, error: orgErr } = await resolveOrgIdForCreate(supabase, user.id, tourId)
    if (!orgId) {
      return NextResponse.json({ success: false, error: orgErr || 'Could not determine organization' }, { status: 400 })
    }

    const v2Status = mapIncomingStatusToV2(d.status ?? undefined)
    const slug = await buildUniqueEventSlug(supabase, orgId, title)

    const settings: Record<string, unknown> = {}
    if (d.description !== undefined && d.description !== null && d.description !== '') {
      settings.description = d.description
    }
    if (d.venue_name !== undefined && d.venue_name !== '') settings.venue_label = d.venue_name
    if (d.venue_address !== undefined && d.venue_address !== '') settings.venue_address = d.venue_address
    if (d.doors_open !== undefined && d.doors_open !== '') settings.doors_open = d.doors_open
    if (d.ticket_price !== undefined) settings.ticket_price = d.ticket_price
    if (d.vip_price !== undefined) settings.vip_price = d.vip_price
    if (d.expected_revenue !== undefined) settings.expected_revenue = d.expected_revenue

    const insertRow: Record<string, unknown> = {
      org_id: orgId,
      title,
      slug,
      status: v2Status,
      start_at: startAt,
      end_at: endAt,
      venue_id: d.venue_id ?? null,
      capacity,
      created_by: user.id,
      timezone: 'UTC',
      settings
    }

    const { data: inserted, error: insertError } = await supabase
      .from('events_v2')
      .insert(insertRow)
      .select('id, title, status, start_at, end_at, venue_id, capacity, created_at, created_by, settings')
      .single()

    if (insertError) {
      console.error('[events POST] insert failed:', insertError)
      return NextResponse.json({ success: false, error: 'Failed to create event' }, { status: 500 })
    }

    if (tourId && inserted?.id) {
      const { error: linkError } = await supabase.from('tour_events').insert({
        tour_id: tourId,
        event_id: inserted.id as string
      })
      if (linkError) {
        console.error('[events POST] tour_events link failed:', linkError)
        await supabase.from('events_v2').delete().eq('id', inserted.id as string)
        return NextResponse.json({ success: false, error: 'Failed to link event to tour' }, { status: 500 })
      }
    }

    const { data: withTour, error: fetchError } = await supabase
      .from('events_v2')
      .select('id, title, status, start_at, end_at, venue_id, capacity, created_at, created_by, settings, tour_events(tour_id)')
      .eq('id', inserted.id as string)
      .single()

    if (fetchError || !withTour) {
      const event = mapEventRow(inserted as Record<string, unknown>)
      return NextResponse.json({
        success: true,
        event: tourId ? { ...event, tour_id: tourId } : event
      })
    }

    return NextResponse.json({ success: true, event: mapEventRow(withTour as Record<string, unknown>) })
  } catch (err) {
    console.error('[events POST] unexpected error:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
})
