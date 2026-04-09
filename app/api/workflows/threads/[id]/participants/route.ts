import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withAuth } from '@/lib/auth/api-auth'
import { hasWorkflowThreadPermission } from '@/lib/workflows/workflow-permissions'

const participantSchema = z.object({
  user_id: z.string().uuid(),
  role: z.string().min(1).max(64).default('member'),
  permissions: z.array(z.string()).default([]),
  status: z.enum(['invited', 'active', 'removed']).default('active'),
})

const updateParticipantSchema = z.object({
  user_id: z.string().uuid(),
  role: z.string().min(1).max(64).optional(),
  permissions: z.array(z.string()).optional(),
  status: z.enum(['invited', 'active', 'removed']).optional(),
})

function isWorkflowEnabled() {
  return process.env.FEATURE_UNIFIED_WORKFLOW_THREADS === '1'
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  return withAuth(async (_req, { supabase, user }) => {
    if (!isWorkflowEnabled())
      return NextResponse.json({ error: 'Workflow threads are disabled' }, { status: 404 })

    const canRead = await hasWorkflowThreadPermission({
      supabase,
      threadId: id,
      userId: user.id,
      permission: 'read',
    })
    if (!canRead) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data, error } = await supabase
      .from('workflow_participants')
      .select('id, thread_id, user_id, role, permissions, status, added_by, added_at')
      .eq('thread_id', id)
      .order('added_at', { ascending: true })

    if (error) {
      console.error('[workflow participants GET]', error)
      return NextResponse.json({ error: 'Failed to fetch participants' }, { status: 500 })
    }

    return NextResponse.json({ success: true, participants: data || [] })
  })(request)
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  return withAuth(async (req, { supabase, user }) => {
    if (!isWorkflowEnabled())
      return NextResponse.json({ error: 'Workflow threads are disabled' }, { status: 404 })

    const canManage = await hasWorkflowThreadPermission({
      supabase,
      threadId: id,
      userId: user.id,
      permission: 'manage',
    })
    if (!canManage) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    try {
      const body = await req.json()
      const validated = participantSchema.parse(body)

      const { data, error } = await supabase
        .from('workflow_participants')
        .upsert(
          {
            thread_id: id,
            user_id: validated.user_id,
            role: validated.role,
            permissions: validated.permissions,
            status: validated.status,
            added_by: user.id,
          },
          { onConflict: 'thread_id,user_id' }
        )
        .select('id, thread_id, user_id, role, permissions, status, added_by, added_at')
        .single()

      if (error) {
        console.error('[workflow participants POST]', error)
        return NextResponse.json({ error: 'Failed to upsert participant' }, { status: 500 })
      }

      await supabase.from('workflow_events_audit').insert({
        thread_id: id,
        actor_user_id: user.id,
        action: 'participant.upserted',
        entity_type: 'participant',
        entity_id: validated.user_id,
        metadata: { role: validated.role, status: validated.status },
      })

      return NextResponse.json({ success: true, participant: data }, { status: 201 })
    } catch (error) {
      if (error instanceof z.ZodError)
        return NextResponse.json({ error: 'Validation error', details: error.flatten() }, { status: 400 })
      console.error('[workflow participants POST]', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  })(request)
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  return withAuth(async (req, { supabase, user }) => {
    if (!isWorkflowEnabled())
      return NextResponse.json({ error: 'Workflow threads are disabled' }, { status: 404 })

    const canManage = await hasWorkflowThreadPermission({
      supabase,
      threadId: id,
      userId: user.id,
      permission: 'manage',
    })
    if (!canManage) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    try {
      const body = await req.json()
      const validated = updateParticipantSchema.parse(body)
      const updatePayload: Record<string, any> = {}
      if (validated.role !== undefined) updatePayload.role = validated.role
      if (validated.permissions !== undefined) updatePayload.permissions = validated.permissions
      if (validated.status !== undefined) updatePayload.status = validated.status

      const { data, error } = await supabase
        .from('workflow_participants')
        .update(updatePayload)
        .eq('thread_id', id)
        .eq('user_id', validated.user_id)
        .select('id, thread_id, user_id, role, permissions, status, added_by, added_at')
        .single()

      if (error) {
        console.error('[workflow participants PATCH]', error)
        return NextResponse.json({ error: 'Failed to update participant' }, { status: 500 })
      }

      await supabase.from('workflow_events_audit').insert({
        thread_id: id,
        actor_user_id: user.id,
        action: 'participant.updated',
        entity_type: 'participant',
        entity_id: validated.user_id,
        metadata: updatePayload,
      })

      return NextResponse.json({ success: true, participant: data })
    } catch (error) {
      if (error instanceof z.ZodError)
        return NextResponse.json({ error: 'Validation error', details: error.flatten() }, { status: 400 })
      console.error('[workflow participants PATCH]', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  })(request)
}
