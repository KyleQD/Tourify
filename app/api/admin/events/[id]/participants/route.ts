import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { hasEntityPermission } from '@/lib/services/rbac'

const addSchema = z.object({
  participant_type: z.string().min(1),
  participant_id: z.string().uuid(),
  role: z.string().optional(),
})

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const { searchParams } = new URL(request.url)
    const roleFilter = searchParams.get('role')

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const canRead = await hasEntityPermission({ userId: user.id, entityType: 'Event', entityId: id, permission: 'EDIT_EVENT_LOGISTICS' })
    if (!canRead) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    let query = supabase
      .from('event_participants')
      .select('*')
      .eq('event_id', id)
      .eq('participant_type', 'Individual')

    if (roleFilter) query = query.eq('role', roleFilter)

    const { data, error } = await query

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    const { data: assignmentRows } = roleFilter
      ? { data: [] }
      : await supabase
          .from('employment_assignments')
          .select('id, user_id, role_title, department, status')
          .eq('event_id', id)
          .in('status', ['confirmed', 'active', 'completed'])

    const participantIds = Array.from(new Set([
      ...(data ?? []).map((row) => row.participant_id as string),
      ...((assignmentRows ?? []).map((row) => row.user_id as string).filter(Boolean)),
    ]))
    let profileById: Record<string, { full_name: string | null; username: string | null; avatar_url: string | null; email: string | null }> = {}

    if (participantIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url, email')
        .in('id', participantIds)

      for (const profile of profiles ?? []) {
        profileById[profile.id as string] = {
          full_name: profile.full_name as string | null,
          username: profile.username as string | null,
          avatar_url: profile.avatar_url as string | null,
          email: profile.email as string | null,
        }
      }
    }

    const participantsById = new Map<string, any>()

    for (const row of data ?? []) {
      const profile = profileById[row.participant_id as string]
      participantsById.set(row.participant_id as string, {
        ...row,
        display_name: profile?.full_name || profile?.username || profile?.email || row.participant_id,
        avatar_url: profile?.avatar_url ?? null,
        source: 'event_participants',
      })
    }

    for (const assignment of assignmentRows ?? []) {
      if (!assignment.user_id || participantsById.has(assignment.user_id as string)) continue
      const profile = profileById[assignment.user_id as string]
      participantsById.set(assignment.user_id as string, {
        id: assignment.id,
        participant_type: 'Individual',
        participant_id: assignment.user_id,
        role: assignment.role_title ?? assignment.department ?? 'Team member',
        status: assignment.status,
        display_name: profile?.full_name || profile?.username || profile?.email || assignment.user_id,
        avatar_url: profile?.avatar_url ?? null,
        source: 'employment_assignments',
      })
    }

    const participants = Array.from(participantsById.values())

    return NextResponse.json({ participants })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 400 })
  }
}

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const input = addSchema.parse(await req.json())
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const allowed = await hasEntityPermission({ userId: user.id, entityType: 'Event', entityId: id, permission: 'ASSIGN_EVENT_ROLES' })
    if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data, error } = await supabase
      .from('event_participants')
      .insert({
        event_id: id,
        participant_type: input.participant_type,
        participant_id: input.participant_id,
        role: input.role ?? null,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ data })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 400 })
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const url = new URL(req.url)
    const participantType = url.searchParams.get('participant_type')
    const participantId = url.searchParams.get('participant_id')
    if (!participantType || !participantId) return NextResponse.json({ error: 'participant_type and participant_id required' }, { status: 400 })

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const allowed = await hasEntityPermission({ userId: user.id, entityType: 'Event', entityId: id, permission: 'ASSIGN_EVENT_ROLES' })
    if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { error } = await supabase
      .from('event_participants')
      .delete()
      .eq('event_id', id)
      .eq('participant_type', participantType)
      .eq('participant_id', participantId)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 400 })
  }
}

