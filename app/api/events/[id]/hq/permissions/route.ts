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

const permissionSchema = z.object({
  participant_id: z.string().uuid(),
  permissions: z.object({
    can_post_bulletins: z.boolean().optional(),
    can_add_resources: z.boolean().optional(),
    can_edit_calendar: z.boolean().optional(),
    can_manage_tasks: z.boolean().optional(),
    can_manage_team: z.boolean().optional(),
  }),
})

export const PATCH = withAuth(async (request: NextRequest, { user }) => {
  try {
    const eventId = request.nextUrl.pathname.split('/').at(-2)!
    const svc = createServiceClient()

    const { data: event } = await svc
      .from('events_v2').select('id, created_by').eq('id', eventId).single()
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

    const { data: actorParticipant } = await svc
      .from('event_participants')
      .select('participant_id, participant_type, role')
      .eq('event_id', eventId)
      .eq('participant_id', user.id)
      .eq('participant_type', 'Individual')
      .maybeSingle()

    const isAdmin = event.created_by === user.id || actorParticipant?.role === 'admin' || actorParticipant?.role === 'manager'
    if (!isAdmin) {
      return NextResponse.json({ error: 'Only admins can grant permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { participant_id, permissions } = permissionSchema.parse(body)

    const { data: target } = await svc
      .from('event_participants')
      .select('participant_id, participant_type, metadata')
      .eq('participant_id', participant_id)
      .eq('participant_type', 'Individual')
      .eq('event_id', eventId)
      .single()

    if (!target) {
      return NextResponse.json({ error: 'Participant not found in this event' }, { status: 404 })
    }

    const existingMetadata = (target.metadata && typeof target.metadata === 'object') ? target.metadata : {}
    const existingPerms = (existingMetadata as any).hq_permissions || {}
    const mergedPerms = { ...existingPerms, ...permissions }

    const { data: updated, error } = await svc
      .from('event_participants')
      .update({
        metadata: { ...(existingMetadata as any), hq_permissions: mergedPerms },
      })
      .eq('participant_id', participant_id)
      .eq('participant_type', 'Individual')
      .select('participant_id, participant_type, role, metadata')
      .single()

    if (error) throw error

    try {
      const targetUserId = updated.participant_id
      if (targetUserId) {
        const grantedNames = Object.entries(permissions)
          .filter(([, v]) => v === true)
          .map(([k]) => k.replace(/^can_/, '').replace(/_/g, ' '))

        if (grantedNames.length > 0) {
          await svc.from('notifications').insert({
            user_id: targetUserId,
            type: 'event_permission_granted',
            title: 'New Event Permissions',
            content: `You've been granted permission to: ${grantedNames.join(', ')} for this event.`,
            metadata: {
              event_id: eventId,
              event_title: event.id,
              permissions: mergedPerms,
              granted_by: user.id,
            },
          })
        }
      }
    } catch (notifyError) {
      console.warn('Failed to notify permission grant:', notifyError)
    }

    return NextResponse.json({
      success: true,
      participant: updated,
      permissions: mergedPerms,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 })
    }
    console.error('[Event Permissions] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})
