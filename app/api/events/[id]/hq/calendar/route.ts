import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withAuth } from '@/lib/auth/api-auth'
import { createClient } from '@supabase/supabase-js'

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

async function checkEditPermission(svc: any, eventId: string, userId: string, permissionKey: string) {
  const { data: event } = await svc
    .from('events_v2').select('id, created_by').eq('id', eventId).single()
  if (!event) return { allowed: false }
  if (event.created_by === userId) return { allowed: true }

  const { data: participant } = await svc
    .from('event_participants')
    .select('participant_id, participant_type, role, metadata')
    .eq('event_id', eventId)
    .eq('participant_id', userId)
    .eq('participant_type', 'Individual')
    .maybeSingle()

  if (!participant) return { allowed: false }

  const role = participant.role || 'staff'
  if (role === 'admin' || role === 'manager') return { allowed: true }

  const granted = participant.metadata?.hq_permissions as Record<string, boolean> | undefined
  return { allowed: !!granted?.[permissionKey] }
}

const calendarItemSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  start_time: z.string().min(1),
  end_time: z.string().optional(),
  type: z.enum(['deadline', 'meeting', 'rehearsal', 'setup', 'performance', 'load_in', 'load_out', 'soundcheck', 'doors_open', 'curfew', 'custom']),
  location: z.string().optional(),
  assigned_to: z.array(z.string()).default([]),
  color: z.string().optional(),
  is_all_day: z.boolean().default(false),
  metadata: z.record(z.any()).optional(),
})

export const POST = withAuth(async (request: NextRequest, { user }) => {
  try {
    const eventId = request.nextUrl.pathname.split('/').at(-2)!
    const svc = createServiceClient()

    const { allowed } = await checkEditPermission(svc, eventId, user.id, 'can_edit_calendar')
    if (!allowed) {
      return NextResponse.json({ error: 'You do not have permission to edit the calendar' }, { status: 403 })
    }

    const body = await request.json()
    const validated = calendarItemSchema.parse(body)

    const { data, error } = await svc
      .from('event_calendar_items')
      .insert({ event_id: eventId, created_by: user.id, ...validated })
      .select()
      .single()

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({ success: false, error: 'event_calendar_items table not yet created' }, { status: 501 })
      }
      throw error
    }

    return NextResponse.json({ success: true, item: data })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 })
    }
    console.error('[Event Calendar] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})

export const DELETE = withAuth(async (request: NextRequest, { user }) => {
  try {
    const eventId = request.nextUrl.pathname.split('/').at(-2)!
    const svc = createServiceClient()
    const { searchParams } = new URL(request.url)
    const itemId = searchParams.get('id')
    if (!itemId) return NextResponse.json({ error: 'Item id required' }, { status: 400 })

    const { allowed } = await checkEditPermission(svc, eventId, user.id, 'can_edit_calendar')
    if (!allowed) {
      return NextResponse.json({ error: 'You do not have permission to delete calendar items' }, { status: 403 })
    }

    await svc.from('event_calendar_items').delete().eq('id', itemId).eq('event_id', eventId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Event Calendar] Delete error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})
