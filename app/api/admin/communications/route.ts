import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withAdminAuth, withAdminCapability } from '@/lib/auth/api-auth'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

const sendMessageSchema = z.object({
  subject: z.string().min(1),
  content: z.string().min(1),
  message_type: z.enum(['announcement', 'update', 'alert', 'general']).default('general'),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  recipients: z.array(z.string().uuid()).default([]),
  requires_acknowledgment: z.boolean().default(false),
  venue_id: z.string().uuid().nullable().optional(),
  event_id: z.string().uuid().nullable().optional(),
  tour_id: z.string().uuid().nullable().optional(),
  site_map_id: z.string().uuid().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
})

export const GET = withAdminCapability('logistics.view', async (request: NextRequest, { user, admin }) => {
  try {
    const { resolveAuthorizedOrgLogisticsScope, applyOrgLogisticsTaskFilter } = await import(
      '@/lib/admin/resolve-authorized-org'
    )
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const type = searchParams.get('type')
    const venueId = searchParams.get('venue_id')
    const eventId = searchParams.get('event_id')
    const tourId = searchParams.get('tour_id')
    const siteMapId = searchParams.get('site_map_id')

    const scope = await resolveAuthorizedOrgLogisticsScope({
      userId: user.id,
      requestedOrgId: admin.orgId,
      eventId,
      tourId,
    })
    const svc = scope.service

    let q = svc.from('team_communications').select('*', { count: 'exact' })

    if (venueId) q = q.eq('venue_id', venueId)
    if (siteMapId) q = q.eq('site_map_id', siteMapId)

    if (eventId || tourId) {
      q = applyOrgLogisticsTaskFilter({
        query: q,
        userId: user.id,
        eventIds: scope.eventIds,
        tourIds: scope.tourIds,
        eventId,
        tourId,
        includeCreatedBy: false,
      })
    } else if (scope.eventIds.length || scope.tourIds.length) {
      // Limit to org-owned events/tours or sender
      const filters: string[] = []
      if (scope.eventIds.length) filters.push(`event_id.in.(${scope.eventIds.join(',')})`)
      if (scope.tourIds.length) filters.push(`tour_id.in.(${scope.tourIds.join(',')})`)
      filters.push(`sender_id.eq.${user.id}`)
      q = q.or(filters.join(','))
    } else {
      q = q.eq('sender_id', user.id)
    }

    if (type && type !== 'all') {
      q = q.eq('message_type', type)
    }

    const { data, error, count } = await q
      .order('sent_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('[Admin Communications API] Fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      messages: data || [],
      total: count || 0,
    })
  } catch (error) {
    console.error('[Admin Communications API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})

export const POST = withAdminAuth(async (request: NextRequest, { user }) => {
  try {
    const { resolveActingContext } = await import('@/lib/auth/acting-context')
    const svc = createServiceRoleClient()
    const body = await request.json()
    const validated = sendMessageSchema.parse(body)

    // Resolve acting context to stamp sender_profile_id and validate venue ownership
    const ctx = await resolveActingContext(request)
    const actingProfileId = !(ctx instanceof NextResponse) ? ctx.profileId : user.id
    const actingType = !(ctx instanceof NextResponse) ? ctx.accountType : 'general'

    // If a venue_id is supplied, verify the acting user is actually operating as that venue or org
    if (validated.venue_id && !(ctx instanceof NextResponse)) {
      const allowedTypes: string[] = ['venue', 'organization']
      if (!allowedTypes.includes(actingType)) {
        return NextResponse.json(
          { error: 'You must be acting as a venue or organization to send venue communications.' },
          { status: 403 }
        )
      }
    }

    const insertPayload = {
      sender_id: user.id,
      venue_id: validated.venue_id ?? null,
      event_id: validated.event_id ?? null,
      tour_id: validated.tour_id ?? null,
      site_map_id: validated.site_map_id ?? null,
      subject: validated.subject,
      content: validated.content,
      message_type: validated.message_type,
      priority: validated.priority,
      recipients: validated.recipients,
      requires_acknowledgment: validated.requires_acknowledgment,
      metadata: {
        ...validated.metadata,
        context: 'logistics',
        event_id: validated.event_id ?? undefined,
        tour_id: validated.tour_id ?? undefined,
        site_map_id: validated.site_map_id ?? undefined,
      },
      sent_at: new Date().toISOString(),
    }

    const { data, error } = await svc
      .from('team_communications')
      .insert(insertPayload)
      .select()
      .single()

    if (error) {
      console.error('[Admin Communications API] Insert error:', error)
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
    }

    // Fan-out to authorized recipients (idempotent per message id)
    if (validated.recipients.length > 0) {
      const { sendLogisticsNotifications } = await import('@/lib/logistics/notifications-adapter')
      const { buildAckInsert } = await import('@/lib/logistics/acknowledgements')
      await sendLogisticsNotifications({
        notify: async (payload) => {
          await svc.from('notifications').insert(
            (payload.userIds as string[]).map((userId: string) => ({
              user_id: userId,
              type: payload.type,
              title: payload.title,
              message: payload.message,
              link: payload.link,
              metadata: payload.metadata,
            }))
          )
        },
        actorUserId: user.id,
        recipients: validated.recipients.map((userId) => ({ userId, isAuthorized: true })),
        payload: {
          type: 'logistics_comms',
          title: validated.subject,
          message: validated.content.slice(0, 280),
          requireAck: validated.requires_acknowledgment,
          sourceType: 'team_communication',
          sourceId: data.id,
          link: validated.event_id
            ? `/admin/dashboard/logistics?tab=communication&eventId=${validated.event_id}`
            : '/admin/dashboard/logistics?tab=communication',
        },
        idempotencyKey: `comms-${data.id}`,
      })

      if (validated.requires_acknowledgment) {
        await svc.from('logistics_acknowledgements').upsert(
          validated.recipients.map((userId) =>
            buildAckInsert({
              sourceType: 'team_communication',
              sourceId: data.id,
              userId,
              eventId: validated.event_id,
              tourId: validated.tour_id,
            })
          ),
          { onConflict: 'source_type,source_id,user_id', ignoreDuplicates: true }
        )
      }
    }

    return NextResponse.json({ success: true, message: data })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 })
    }
    console.error('[Admin Communications API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})

export const PATCH = withAdminAuth(async (request: NextRequest, { user }) => {
  try {
    const svc = createServiceRoleClient()
    const body = await request.json()
    const { id, action } = body

    if (!id) {
      return NextResponse.json({ error: 'Missing message id' }, { status: 400 })
    }

    if (action === 'mark_read') {
      const { data: msg } = await svc
        .from('team_communications')
        .select('read_by')
        .eq('id', id)
        .single()

      if (!msg) {
        return NextResponse.json({ error: 'Message not found' }, { status: 404 })
      }

      const readBy = Array.isArray(msg.read_by) ? msg.read_by : []
      if (!readBy.includes(user.id)) {
        readBy.push(user.id)
      }

      const { error } = await svc
        .from('team_communications')
        .update({ read_by: readBy })
        .eq('id', id)

      if (error) {
        return NextResponse.json({ error: 'Failed to mark as read' }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    }

    if (action === 'acknowledge') {
      const { data: msg } = await svc
        .from('team_communications')
        .select('acknowledged_by')
        .eq('id', id)
        .single()

      if (!msg) {
        return NextResponse.json({ error: 'Message not found' }, { status: 404 })
      }

      const ackedBy = Array.isArray(msg.acknowledged_by) ? msg.acknowledged_by : []
      if (!ackedBy.includes(user.id)) {
        ackedBy.push(user.id)
      }

      const { error } = await svc
        .from('team_communications')
        .update({ acknowledged_by: ackedBy })
        .eq('id', id)

      if (error) {
        return NextResponse.json({ error: 'Failed to acknowledge' }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('[Admin Communications API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})
