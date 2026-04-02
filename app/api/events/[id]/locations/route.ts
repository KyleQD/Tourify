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
      permissionName: 'EDIT_EVENT_LOGISTICS',
    })
    if (!canView) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })

    const { data, error } = await supabase
      .from('event_locations')
      .select('*, locations(*)')
      .eq('event_id', reference.id)
      .order('is_primary', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ locations: data ?? [] })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to load locations' }, { status: 500 })
  }
})

export const POST = withAuth(async (request: NextRequest, { supabase, user }) => {
  try {
    const eventParam = getEventParamFromPath(request)
    const reference = await resolveEventReference(supabase as any, eventParam)
    if (!reference) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

    const { locationId, locationType, isPrimary } = await request.json()
    if (!locationId || !locationType) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    const canEdit = await hasEventPermission({
      supabase,
      eventId: reference.id,
      userId: user.id,
      ownerUserId: reference.ownerUserId,
      permissionName: 'EDIT_EVENT_LOGISTICS',
    })
    if (!canEdit) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })

    if (isPrimary) {
      await supabase
        .from('event_locations')
        .update({ is_primary: false })
        .eq('event_id', reference.id)
    }

    const { data, error } = await supabase
      .from('event_locations')
      .insert({ event_id: reference.id, location_id: locationId, location_type: locationType, is_primary: Boolean(isPrimary) })
      .select('*')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ location: data })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to add location' }, { status: 500 })
  }
})

export const DELETE = withAuth(async (request: NextRequest, { supabase, user }) => {
  try {
    const { searchParams } = new URL(request.url)
    const eventParam = getEventParamFromPath(request)
    const reference = await resolveEventReference(supabase as any, eventParam)
    if (!reference) return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    const locationId = searchParams.get('locationId')

    if (!locationId) return NextResponse.json({ error: 'Missing locationId' }, { status: 400 })

    const canEdit = await hasEventPermission({
      supabase,
      eventId: reference.id,
      userId: user.id,
      ownerUserId: reference.ownerUserId,
      permissionName: 'EDIT_EVENT_LOGISTICS',
    })
    if (!canEdit) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })

    const { error } = await supabase
      .from('event_locations')
      .delete()
      .match({ event_id: reference.id, location_id: locationId })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to remove location' }, { status: 500 })
  }
})


