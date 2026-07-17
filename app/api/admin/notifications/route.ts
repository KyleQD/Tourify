import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withAdminAuth } from '@/lib/auth/api-auth'
import { requireOpsOrgId, resolveAdminWorkspaceScope } from '@/lib/admin/workspace-scope'

const createNotificationSchema = z.object({
  user_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(2000),
  type: z.string().max(50).default('task_assignment'),
  link: z.string().max(500).optional(),
  related_content_id: z.string().uuid().optional(),
  related_content_type: z.string().max(50).optional(),
})

export const GET = withAdminAuth(async (request, { user, supabase }) => {
  try {
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('event_id')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100)
    const scope = await resolveAdminWorkspaceScope(request, { user, supabase })
    if (scope instanceof NextResponse) return scope
    const orgId = requireOpsOrgId(scope)
    if (orgId instanceof NextResponse) return orgId

    const { data: orgEvents, error: eventsError } = await supabase
      .from('events_v2')
      .select('id')
      .eq('org_id', orgId)
      .limit(1000)

    if (eventsError) {
      return NextResponse.json({ success: true, notifications: [], timestamp: new Date().toISOString() })
    }

    const eventIds = (orgEvents || []).map((event: { id: string }) => event.id)
    if (eventId && !eventIds.includes(eventId)) {
      return NextResponse.json({ success: false, error: 'Event is not available to this workspace' }, { status: 403 })
    }
    if (!eventId && eventIds.length === 0) {
      return NextResponse.json({ success: true, notifications: [], timestamp: new Date().toISOString() })
    }

    let query = supabase
      .from('notifications')
      .select('id, title, content, type, is_read, created_at, related_user_id, priority')
      .eq('user_id', user.id)
      .eq('related_content_type', 'event')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (eventId) {
      // Filter notifications linked to a specific event via related_content_id
      query = query.eq('related_content_id', eventId)
    } else {
      query = query.in('related_content_id', eventIds)
    }

    const { data: notifications, error } = await query

    if (error) {
      console.error('[Admin Notifications API] Query error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch notifications', notifications: [] },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      notifications: notifications || [],
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Admin Notifications API] Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error', notifications: [] },
      { status: 500 },
    )
  }
})

export const POST = withAdminAuth(async (request: NextRequest, { user, supabase }) => {
  try {
    const body = await request.json()
    const validated = createNotificationSchema.parse(body)

    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: validated.user_id,
        title: validated.title,
        content: validated.content,
        type: validated.type,
        is_read: false,
        related_user_id: user.id,
        related_content_id: validated.related_content_id ?? null,
        related_content_type: validated.related_content_type ?? null,
        metadata: validated.link ? { link: validated.link } : {},
      })
      .select()
      .single()

    if (error) {
      console.error('[Admin Notifications API] Insert error:', error)
      return NextResponse.json({ success: false, error: 'Failed to create notification' }, { status: 500 })
    }

    return NextResponse.json({ success: true, notification: data })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 })
    }
    console.error('[Admin Notifications API] POST error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
})

export const PATCH = withAdminAuth(async (request: NextRequest, { user, supabase }) => {
  try {
    const { searchParams } = new URL(request.url)
    const markAllRead = searchParams.get('markAllRead') === 'true'
    const eventId = searchParams.get('event_id')
    const scope = await resolveAdminWorkspaceScope(request, { user, supabase })
    if (scope instanceof NextResponse) return scope
    const orgId = requireOpsOrgId(scope)
    if (orgId instanceof NextResponse) return orgId

    if (eventId) {
      const { data: event } = await supabase
        .from('events_v2')
        .select('id')
        .eq('id', eventId)
        .eq('org_id', orgId)
        .maybeSingle()
      if (!event?.id) {
        return NextResponse.json({ success: false, error: 'Event is not available to this workspace' }, { status: 403 })
      }
    }

    if (markAllRead) {
      let query = supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false)
        .eq('related_content_type', 'event')

      if (eventId) {
        query = query.eq('related_content_id', eventId)
      } else {
        return NextResponse.json({ success: false, error: 'event_id is required for workspace notification updates' }, { status: 400 })
      }

      const { error } = await query
      if (error) {
        return NextResponse.json({ success: false, error: 'Failed to mark as read' }, { status: 500 })
      }
      return NextResponse.json({ success: true })
    }

    // Mark individual notification as read
    const body = await request.json()
    const { id } = body
    if (!id) return NextResponse.json({ error: 'Missing notification id' }, { status: 400 })

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ success: false, error: 'Failed to update notification' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Admin Notifications API] PATCH error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
})
