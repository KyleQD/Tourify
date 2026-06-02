import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withAuth } from '@/lib/auth/api-auth'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

const eventIdSchema = z.string().uuid({ message: 'Invalid event id' })

function getEventIdFromPath(request: NextRequest) {
  // /api/events/[id]/group-chats → index 3
  return request.nextUrl.pathname.split('/')[3]
}

export const GET = withAuth(async (request: NextRequest, { user }) => {
  try {
    const parsedEventId = eventIdSchema.safeParse(getEventIdFromPath(request))
    if (!parsedEventId.success)
      return NextResponse.json({ error: 'Invalid event id' }, { status: 400 })

    const eventId = parsedEventId.data
    const svc = createServiceRoleClient()

    // Match admin route authorization: event participant (Individual) OR event creator
    // OR org-member of the event's organization. This keeps the public endpoint in
    // lockstep with [app/api/admin/events/[id]/group-chats/route.ts] (lines 35-52).
    const { data: participant } = await svc
      .from('event_participants')
      .select('participant_id')
      .eq('event_id', eventId)
      .eq('participant_id', user.id)
      .eq('participant_type', 'Individual')
      .maybeSingle()

    const { data: eventOwner } = await svc
      .from('events_v2')
      .select('id, created_by')
      .eq('id', eventId)
      .maybeSingle()

    const isCreator = eventOwner?.created_by === user.id

    let isOrgMember = false
    if (!participant && !isCreator) {
      const { data: orgRow } = await svc
        .from('events_v2')
        .select('org_id')
        .eq('id', eventId)
        .maybeSingle()
      if (orgRow?.org_id) {
        const { data: orgMembership } = await svc
          .from('org_members')
          .select('user_id')
          .eq('org_id', orgRow.org_id)
          .eq('user_id', user.id)
          .maybeSingle()
        isOrgMember = Boolean(orgMembership)
      }
    }

    if (!participant && !isCreator && !isOrgMember) {
      return NextResponse.json({ error: 'Not a member of this event' }, { status: 403 })
    }

    const { data, error } = await svc
      .from('event_group_chats')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({ success: true, groups: [], _notice: 'event_group_chats not yet created' })
      }
      return NextResponse.json({ error: 'Failed to load event groups' }, { status: 500 })
    }

    const groups = (data || []).filter((group: any) => {
      if (isCreator || isOrgMember) return true
      if (group.created_by === user.id) return true
      if (Array.isArray(group.member_ids) && group.member_ids.includes(user.id)) return true
      return false
    })

    return NextResponse.json({ success: true, groups })
  } catch (error) {
    console.error('Event group chats GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})
