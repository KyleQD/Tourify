import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api-auth'
import { hasEventPermission } from '../../_lib/event-permissions'
import { resolveEventReference } from '../../_lib/event-reference'

export const dynamic = 'force-dynamic'

function getEventParamFromPath(request: NextRequest) {
  const { pathname } = new URL(request.url)
  const parts = pathname.split('/')
  const idIndex = parts.findIndex(p => p === 'events') + 1
  return parts[idIndex]
}

export const GET = withAuth(async (request: NextRequest, { supabase, user }) => {
  try {
    const eventParam = getEventParamFromPath(request)
    const reference = await resolveEventReference(supabase as any, eventParam)
    if (!reference) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

    const canView = await hasEventPermission({
      supabase,
      eventId: reference.id,
      userId: user.id,
      ownerUserId: reference.ownerUserId,
      permissionName: 'ASSIGN_EVENT_ROLES',
    })
    if (!canView) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })

    const { data, error } = await supabase
      .from('event_participants')
      .select('*')
      .eq('event_id', reference.id)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ participants: data ?? [] })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to load participants' }, { status: 500 })
  }
})

export const POST = withAuth(async (request: NextRequest, { supabase, user }) => {
  try {
    const eventParam = getEventParamFromPath(request)
    const reference = await resolveEventReference(supabase as any, eventParam)
    if (!reference) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

    const { participantType, participantId, role } = await request.json()
    if (!participantType || !participantId) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    const canAssign = await hasEventPermission({
      supabase,
      eventId: reference.id,
      userId: user.id,
      ownerUserId: reference.ownerUserId,
      permissionName: 'ASSIGN_EVENT_ROLES',
    })
    if (!canAssign) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })

    const { data, error } = await supabase
      .from('event_participants')
      .insert({ event_id: reference.id, participant_type: participantType, participant_id: participantId, role: role ?? null })
      .select('*')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ participant: data })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to add participant' }, { status: 500 })
  }
})

export const DELETE = withAuth(async (request: NextRequest, { supabase, user }) => {
  try {
    const { searchParams } = new URL(request.url)
    const eventParam = getEventParamFromPath(request)
    const reference = await resolveEventReference(supabase as any, eventParam)
    if (!reference) return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    const participantType = searchParams.get('participantType')
    const participantId = searchParams.get('participantId')

    if (!participantType || !participantId) return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })

    const canAssign = await hasEventPermission({
      supabase,
      eventId: reference.id,
      userId: user.id,
      ownerUserId: reference.ownerUserId,
      permissionName: 'ASSIGN_EVENT_ROLES',
    })
    if (!canAssign) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })

    const { error } = await supabase
      .from('event_participants')
      .delete()
      .match({ event_id: reference.id, participant_type: participantType, participant_id: participantId })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to remove participant' }, { status: 500 })
  }
})


