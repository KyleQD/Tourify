import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withAdminAuth, withAuth } from '@/lib/auth/api-auth'
import { createClient } from '@supabase/supabase-js'

function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

const bulletinSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  priority: z.enum(['info', 'important', 'urgent', 'emergency']).default('info'),
  pinned: z.boolean().default(false),
  visible_to: z.array(z.enum(['admin', 'manager', 'staff', 'crew', 'vendor', 'all'])).default(['all']),
  requires_acknowledgment: z.boolean().default(false),
})

export const GET = withAuth(async (request: NextRequest, { user }) => {
  try {
    const eventId = request.nextUrl.pathname.split('/')[5]
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const pinnedOnly = searchParams.get('pinned') === 'true'

    const svc = createServiceClient()

    const { data: participant } = await svc
      .from('event_participants')
      .select('participant_id, participant_type, role')
      .eq('event_id', eventId)
      .eq('participant_id', user.id)
      .eq('participant_type', 'Individual')
      .maybeSingle()

    const { data: eventOwner } = await svc
      .from('events_v2')
      .select('id')
      .eq('id', eventId)
      .eq('created_by', user.id)
      .maybeSingle()

    if (!participant && !eventOwner) {
      return NextResponse.json({ error: 'Not a member of this event' }, { status: 403 })
    }

    const userRole = eventOwner ? 'admin' : (participant?.role || 'staff')

    let q = svc
      .from('event_bulletins')
      .select('*', { count: 'exact' })
      .eq('event_id', eventId)

    if (pinnedOnly) q = q.eq('pinned', true)

    q = q.order('pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data, error, count } = await q

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({
          success: true,
          bulletins: [],
          total: 0,
          userRole,
          _notice: 'event_bulletins table not yet created'
        })
      }
      console.error('[Event Communications] Fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch bulletins' }, { status: 500 })
    }

    const visibleBulletins = (data || []).filter((b: any) => {
      if (!b.visible_to || b.visible_to.includes('all')) return true
      return b.visible_to.includes(userRole)
    })

    return NextResponse.json({
      success: true,
      bulletins: visibleBulletins,
      total: count || 0,
      userRole,
    })
  } catch (error) {
    console.error('[Event Communications] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})

export const POST = withAuth(async (request: NextRequest, { user }) => {
  try {
    const eventId = request.nextUrl.pathname.split('/')[5]
    const svc = createServiceClient()

    const { data: eventOwner } = await svc
      .from('events_v2')
      .select('id')
      .eq('id', eventId)
      .eq('created_by', user.id)
      .maybeSingle()

    const { data: participant } = await svc
      .from('event_participants')
      .select('participant_id, participant_type, role')
      .eq('event_id', eventId)
      .eq('participant_id', user.id)
      .eq('participant_type', 'Individual')
      .maybeSingle()

    const isAdmin = !!eventOwner || participant?.role === 'admin' || participant?.role === 'manager'

    if (!isAdmin) {
      return NextResponse.json({ error: 'Only admins can create bulletins' }, { status: 403 })
    }

    const body = await request.json()
    const validated = bulletinSchema.parse(body)

    const { data, error } = await svc
      .from('event_bulletins')
      .insert({
        event_id: eventId,
        author_id: user.id,
        title: validated.title,
        content: validated.content,
        priority: validated.priority,
        pinned: validated.pinned,
        visible_to: validated.visible_to,
        requires_acknowledgment: validated.requires_acknowledgment,
        read_by: [],
        acknowledged_by: [],
      })
      .select()
      .single()

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({
          success: false,
          error: 'event_bulletins table not yet created — run the migration',
          _migration: 'See event-communications migration'
        }, { status: 501 })
      }
      console.error('[Event Communications] Insert error:', error)
      return NextResponse.json({ error: 'Failed to create bulletin' }, { status: 500 })
    }

    try {
      const { data: event } = await svc
        .from('events_v2')
        .select('title')
        .eq('id', eventId)
        .maybeSingle()
      const { data: participants } = await svc
        .from('event_participants')
        .select('participant_id')
        .eq('event_id', eventId)
        .eq('participant_type', 'Individual')
        .limit(100)

      const userIds = Array.from(
        new Set((participants || []).map((row: any) => row.participant_id).filter(Boolean))
      ).filter((id: string) => id !== user.id)

      if (userIds.length > 0) {
        await svc.from('notifications').insert(
          userIds.map((userId: string) => ({
            user_id: userId,
            type: 'hq_bulletin',
            title: validated.title,
            content: `New HQ bulletin for ${event?.title || 'your event'}: ${validated.content.slice(0, 140)}`,
            metadata: {
              event_id: eventId,
              bulletin_id: data.id,
              url: `/admin/dashboard/events/${eventId}/hq`,
              priority: validated.priority,
            },
          }))
        )
      }
    } catch (notifyError) {
      console.warn('[Event Communications] bulletin notification skipped:', notifyError)
    }

    return NextResponse.json({ success: true, bulletin: data })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 })
    }
    console.error('[Event Communications] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})

export const PATCH = withAuth(async (request: NextRequest, { user }) => {
  try {
    const eventId = request.nextUrl.pathname.split('/')[5]
    const svc = createServiceClient()
    const body = await request.json()
    const { id, action } = body

    if (!id) {
      return NextResponse.json({ error: 'Missing bulletin id' }, { status: 400 })
    }

    if (action === 'mark_read') {
      const { data: bulletin } = await svc
        .from('event_bulletins')
        .select('read_by')
        .eq('id', id)
        .eq('event_id', eventId)
        .single()

      if (!bulletin) {
        return NextResponse.json({ error: 'Bulletin not found' }, { status: 404 })
      }

      const readBy = Array.isArray(bulletin.read_by) ? bulletin.read_by : []
      if (!readBy.includes(user.id)) readBy.push(user.id)

      await svc.from('event_bulletins').update({ read_by: readBy }).eq('id', id)
      return NextResponse.json({ success: true })
    }

    if (action === 'acknowledge') {
      const { data: bulletin } = await svc
        .from('event_bulletins')
        .select('acknowledged_by')
        .eq('id', id)
        .eq('event_id', eventId)
        .single()

      if (!bulletin) {
        return NextResponse.json({ error: 'Bulletin not found' }, { status: 404 })
      }

      const ackedBy = Array.isArray(bulletin.acknowledged_by) ? bulletin.acknowledged_by : []
      if (!ackedBy.includes(user.id)) ackedBy.push(user.id)

      await svc.from('event_bulletins').update({ acknowledged_by: ackedBy }).eq('id', id)
      return NextResponse.json({ success: true })
    }

    if (action === 'pin' || action === 'unpin') {
      const { data: eventOwner } = await svc
        .from('events_v2')
        .select('id')
        .eq('id', eventId)
        .eq('created_by', user.id)
        .maybeSingle()

      if (!eventOwner) {
        return NextResponse.json({ error: 'Only event admin can pin/unpin' }, { status: 403 })
      }

      await svc.from('event_bulletins').update({ pinned: action === 'pin' }).eq('id', id)
      return NextResponse.json({ success: true })
    }

    if (action === 'delete') {
      const { data: eventOwner } = await svc
        .from('events_v2')
        .select('id')
        .eq('id', eventId)
        .eq('created_by', user.id)
        .maybeSingle()

      if (!eventOwner) {
        return NextResponse.json({ error: 'Only event admin can delete bulletins' }, { status: 403 })
      }

      await svc.from('event_bulletins').delete().eq('id', id).eq('event_id', eventId)
      return NextResponse.json({ success: true })
    }

    if (action === 'moderate') {
      const moderationStatus = body.moderation_status === 'rejected' ? 'rejected' : 'approved'
      const { data: eventOwner } = await svc
        .from('events_v2')
        .select('id')
        .eq('id', eventId)
        .eq('created_by', user.id)
        .maybeSingle()

      if (!eventOwner) {
        return NextResponse.json({ error: 'Only event admin can moderate bulletins' }, { status: 403 })
      }

      await svc
        .from('event_bulletins')
        .update({ moderation_status: moderationStatus })
        .eq('id', id)
        .eq('event_id', eventId)

      return NextResponse.json({ success: true, moderation_status: moderationStatus })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('[Event Communications] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})
