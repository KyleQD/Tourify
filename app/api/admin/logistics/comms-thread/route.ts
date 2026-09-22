import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withAdminCapability } from '@/lib/auth/api-auth'
import { executeServiceRoleJob } from '@/lib/supabase/service-role-job'

// GET /api/admin/logistics/comms-thread?event_id=
// Returns { threadId } for an existing logistics thread tied to the event, or { threadId: null }.
export const GET = withAdminCapability(
  'logistics.view',
  async (request: NextRequest, { user, admin }) => {
    const { resolveAuthorizedOrgLogisticsScope } = await import('@/lib/admin/resolve-authorized-org')
    const eventId = request.nextUrl.searchParams.get('event_id')
    if (!eventId) {
      return NextResponse.json({ error: 'event_id is required' }, { status: 400 })
    }

    await resolveAuthorizedOrgLogisticsScope({
      userId: user.id,
      requestedOrgId: admin.orgId,
      eventId,
    })

    return executeServiceRoleJob(
      {
        orgId: admin.orgId,
        reason: 'Load the authorized event logistics thread',
        moduleId: 'admin.logistics.comms-thread',
        target: { eventId },
      },
      async (svc) => {
        const { data } = await svc
          .from('group_threads')
          .select('id')
          .eq('context_type', 'logistics')
          .eq('context_id', eventId)
          .maybeSingle()

        return NextResponse.json({ threadId: data?.id ?? null })
      },
    )
  },
)

const provisionSchema = z.object({
  event_id: z.string().uuid(),
  event_name: z.string().min(1).max(120).optional(),
})

// POST /api/admin/logistics/comms-thread
// Idempotently creates (or retrieves) a logistics group thread for the event
// and syncs all team members into thread_members.
export const POST = withAdminCapability(
  'logistics.view',
  async (request: NextRequest, { user, admin }) => {
  const { resolveAuthorizedOrgLogisticsScope } = await import('@/lib/admin/resolve-authorized-org')

  const body = await request.json().catch(() => null)
  const parsed = provisionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 })
  }
  const { event_id: eventId, event_name } = parsed.data

  // Verify admin is authorized for this event's org
  await resolveAuthorizedOrgLogisticsScope({
    userId: user.id,
    requestedOrgId: admin.orgId,
    eventId,
  })

  return executeServiceRoleJob(
    {
      orgId: admin.orgId,
      reason: 'Provision the authorized event logistics thread',
      moduleId: 'admin.logistics.comms-thread',
      target: { eventId },
    },
    async (svc) => {
      // 1. Find or create the group thread.
      const { data: existing } = await svc
        .from('group_threads')
        .select('id')
        .eq('context_type', 'logistics')
        .eq('context_id', eventId)
        .maybeSingle()

      let threadId: string
      let isNew = false

      if (existing) {
        threadId = existing.id
      } else {
        const { data: event } = await svc
          .from('events_v2')
          .select('id, title, created_by')
          .eq('id', eventId)
          .maybeSingle()

        const threadName = event_name
          ? `${event_name} — Team Comms`
          : event?.title
            ? `${event.title} — Team Comms`
            : 'Event Team Comms'
        const ownerId = event?.created_by ?? user.id
        const { data: thread, error: createErr } = await svc
          .from('group_threads')
          .insert({
            name: threadName,
            thread_type: 'logistics',
            context_type: 'logistics',
            context_id: eventId,
            created_by: ownerId,
          })
          .select('id')
          .single()

        if (createErr || !thread) {
          console.error('[logistics/comms-thread] Create thread error:', createErr)
          return NextResponse.json({ error: 'Failed to create thread' }, { status: 500 })
        }
        threadId = thread.id
        isNew = true
      }

      // 2. Resolve all team members for this event.
      const memberUserIds = new Set<string>()
      const { data: event } = await svc
        .from('events_v2')
        .select('created_by')
        .eq('id', eventId)
        .maybeSingle()
      if (event?.created_by) memberUserIds.add(event.created_by)

      const { data: tourLinks } = await svc
        .from('tour_events')
        .select('tour_id')
        .eq('event_id', eventId)
      if (tourLinks && tourLinks.length > 0) {
        const tourIds = tourLinks.map((row: { tour_id: string }) => row.tour_id)
        const { data: teamMembers } = await svc
          .from('tour_team_members')
          .select('user_id')
          .in('tour_id', tourIds)
          .eq('is_active', true)
        for (const member of teamMembers ?? []) memberUserIds.add(member.user_id)
      }

      const { data: staffParticipants } = await svc
        .from('event_participants')
        .select('participant_id')
        .eq('event_id', eventId)
        .eq('role', 'staff')
      for (const participant of staffParticipants ?? [])
        memberUserIds.add(participant.participant_id)
      memberUserIds.add(user.id)

      // 3. Idempotently synchronize membership.
      const ownerUserId = event?.created_by ?? user.id
      const memberRecords = Array.from(memberUserIds).map((uid) => ({
        thread_id: threadId,
        user_id: uid,
        role: uid === ownerUserId ? 'owner' : 'member',
        left_at: null,
      }))
      const { error: membersErr } = await svc
        .from('thread_members')
        .upsert(memberRecords, { onConflict: 'thread_id,user_id' })
      if (membersErr) {
        console.error('[logistics/comms-thread] Upsert members error:', membersErr)
        return NextResponse.json({ error: 'Failed to sync thread members' }, { status: 500 })
      }

      return NextResponse.json({ success: true, threadId, isNew, memberCount: memberUserIds.size })
    },
  )
  },
)
