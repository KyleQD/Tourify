import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { hasEntityPermission } from '@/lib/services/rbac'

const createSchema = z.object({
  venue_id: z.string().uuid(),
  event_id: z.string().uuid().optional(),
  zone_name: z.string().min(1),
  zone_description: z.string().optional(),
  zone_type: z.enum(['security','bartending','crowd_control','vip','general','backstage']),
  capacity: z.number().int().optional(),
  required_staff_count: z.number().int().min(1),
  supervisor_id: z.string().uuid().optional(),
})

export async function POST(req: Request) {
  try {
    const input = createSchema.parse(await req.json())
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const allowed = (
      await hasEntityPermission({ userId: user.id, entityType: 'Venue', entityId: input.venue_id, permission: 'ASSIGN_EVENT_ROLES' })
    ) || (input.event_id ? await hasEntityPermission({ userId: user.id, entityType: 'Event', entityId: input.event_id, permission: 'ASSIGN_EVENT_ROLES' }) : false)

    if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Create the canonical event_zone first, then attach the legacy staff_zone to it
    // so new zones flow into the unified model (migration 20260610000200 backfills
    // pre-existing rows; this keeps go-forward writes in sync).
    let eventZoneId: string | null = null
    try {
      const { createEventZone } = await import('@/lib/zones/event-zones')
      const zone = await createEventZone(supabase as any, {
        eventId: input.event_id ?? null,
        venueId: input.venue_id,
        name: input.zone_name,
        description: input.zone_description ?? null,
        category: 'operations',
        zoneType: input.zone_type,
        capacity: input.capacity ?? null,
        requiredStaffCount: input.required_staff_count,
        supervisorId: input.supervisor_id ?? null,
      })
      eventZoneId = zone.id
    } catch (zoneErr) {
      console.warn('[staffing/zones] canonical event_zone create failed (non-fatal):', zoneErr)
    }

    const { data, error } = await supabase
      .from('staff_zones')
      .insert({ ...input, assigned_staff_count: 0, status: 'active', event_zone_id: eventZoneId })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ data })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 400 })
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const venueId = url.searchParams.get('venueId')
    if (!venueId) return NextResponse.json({ error: 'venueId required' }, { status: 400 })
    const eventId = url.searchParams.get('eventId') || undefined
    const zoneType = url.searchParams.get('zone_type') || undefined
    const status = url.searchParams.get('status') || undefined

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const canRead = await hasEntityPermission({ userId: user.id, entityType: 'Venue', entityId: venueId, permission: 'EDIT_EVENT_LOGISTICS' })
    if (!canRead) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    let query = supabase
      .from('staff_zones')
      .select('*')
      .eq('venue_id', venueId)

    if (eventId) query = query.eq('event_id', eventId)
    if (zoneType) query = query.eq('zone_type', zoneType)
    if (status) query = query.eq('status', status)

    const { data, error } = await query.order('zone_name', { ascending: true })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ data: data ?? [] })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 400 })
  }
}


