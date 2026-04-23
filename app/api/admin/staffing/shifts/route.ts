import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { hasEntityPermission } from '@/lib/services/rbac'

const createSchema = z.object({
  venue_id: z.string().uuid(),
  event_id: z.string().uuid().optional(),
  staff_member_id: z.string().uuid(),
  shift_date: z.string(),
  start_time: z.string(),
  end_time: z.string(),
  break_duration: z.number().int().min(0).default(0),
  zone_assignment: z.string().optional(),
  role_assignment: z.string().optional(),
  notes: z.string().optional(),
})

export async function POST(req: Request) {
  try {
    const input = createSchema.parse(await req.json())
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    // Permission on Venue or Event
    const allowed = (
      await hasEntityPermission({ userId: user.id, entityType: 'Venue', entityId: input.venue_id, permission: 'ASSIGN_EVENT_ROLES' })
    ) || (input.event_id ? await hasEntityPermission({ userId: user.id, entityType: 'Event', entityId: input.event_id, permission: 'ASSIGN_EVENT_ROLES' }) : false)

    if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data, error } = await supabase
      .from('staff_shifts')
      .insert({ ...input, created_by: user.id })
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
    const staffMemberId = url.searchParams.get('staff_member_id') || undefined
    const status = url.searchParams.get('status') || undefined
    const dateFrom = url.searchParams.get('date_from') || undefined
    const dateTo = url.searchParams.get('date_to') || undefined

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    // At least read permission on logistics
    const canRead = await hasEntityPermission({ userId: user.id, entityType: 'Venue', entityId: venueId, permission: 'EDIT_EVENT_LOGISTICS' })
    if (!canRead) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    let query = supabase
      .from('staff_shifts')
      .select('*')
      .eq('venue_id', venueId)

    if (eventId) query = query.eq('event_id', eventId)
    if (staffMemberId) query = query.eq('staff_member_id', staffMemberId)
    if (status) query = query.eq('status', status)
    if (dateFrom) query = query.gte('shift_date', dateFrom)
    if (dateTo) query = query.lte('shift_date', dateTo)

    const { data, error } = await query
      .order('shift_date', { ascending: true })
      .order('start_time', { ascending: true })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ data: data ?? [] })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 400 })
  }
}


