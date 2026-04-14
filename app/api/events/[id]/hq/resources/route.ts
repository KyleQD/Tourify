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
  if (!event) return { allowed: false, isOwner: false }
  if (event.created_by === userId) return { allowed: true, isOwner: true }

  const { data: participant } = await svc
    .from('event_participants')
    .select('id, role, metadata')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .maybeSingle()

  if (!participant) return { allowed: false, isOwner: false }

  const role = participant.role || 'staff'
  if (role === 'admin' || role === 'manager') return { allowed: true, isOwner: false }

  const granted = participant.metadata?.hq_permissions as Record<string, boolean> | undefined
  if (granted?.[permissionKey]) return { allowed: true, isOwner: false }

  return { allowed: false, isOwner: false }
}

const resourceSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  type: z.enum(['link', 'document', 'note', 'itinerary', 'contact', 'file']),
  url: z.string().optional(),
  content: z.string().optional(),
  category: z.string().optional(),
  visible_to: z.array(z.string()).default(['all']),
  pinned: z.boolean().default(false),
  metadata: z.record(z.any()).optional(),
})

export const POST = withAuth(async (request: NextRequest, { user }) => {
  try {
    const eventId = request.nextUrl.pathname.split('/').at(-2)!
    const svc = createServiceClient()

    const { allowed } = await checkEditPermission(svc, eventId, user.id, 'can_add_resources')
    if (!allowed) {
      return NextResponse.json({ error: 'You do not have permission to add resources to this event' }, { status: 403 })
    }

    const body = await request.json()
    const validated = resourceSchema.parse(body)

    const { data, error } = await svc
      .from('event_resources')
      .insert({ event_id: eventId, created_by: user.id, ...validated })
      .select()
      .single()

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({ success: false, error: 'event_resources table not yet created' }, { status: 501 })
      }
      throw error
    }

    return NextResponse.json({ success: true, resource: data })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 })
    }
    console.error('[Event Resources] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})

export const DELETE = withAuth(async (request: NextRequest, { user }) => {
  try {
    const eventId = request.nextUrl.pathname.split('/').at(-2)!
    const svc = createServiceClient()
    const { searchParams } = new URL(request.url)
    const resourceId = searchParams.get('id')
    if (!resourceId) return NextResponse.json({ error: 'Resource id required' }, { status: 400 })

    const { allowed } = await checkEditPermission(svc, eventId, user.id, 'can_add_resources')
    if (!allowed) {
      return NextResponse.json({ error: 'You do not have permission to delete resources' }, { status: 403 })
    }

    await svc.from('event_resources').delete().eq('id', resourceId).eq('event_id', eventId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Event Resources] Delete error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})
