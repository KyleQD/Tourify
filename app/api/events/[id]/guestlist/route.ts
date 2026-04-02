import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api-auth'
import { hasEventPermission } from '../../_lib/event-permissions'
import { resolveEventReference } from '../../_lib/event-reference'

export async function GET(_req: NextRequest, { params }: any) {
  return withAuth(async (_request, { supabase, user }) => {
    try {
      const reference = await resolveEventReference(supabase as any, params.id)
      if (!reference) return NextResponse.json({ guests: [] })

      const canAccessGuestlist = await hasEventPermission({
        supabase,
        eventId: reference.id,
        userId: user.id,
        ownerUserId: reference.ownerUserId,
        permissionName: 'EDIT_EVENT_LOGISTICS',
      })
      if (!canAccessGuestlist) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      }

      const { data, error } = await supabase
        .from('event_guestlist')
        .select('id, user_id, full_name, contact_email, contact_phone, guests_count, status, invite_code, notes, checked_in_at, created_at, updated_at')
        .eq('event_id', reference.id)
        .order('created_at', { ascending: false })
        .limit(200)

      if (error) return NextResponse.json({ guests: [] })
      return NextResponse.json({ guests: data || [] })
    } catch (error) {
      console.error('[Event Guestlist API] GET error:', error)
      return NextResponse.json({ guests: [] })
    }
  })(_req)
}

export async function POST(request: NextRequest, { params }: any) {
  return withAuth(async (_request, { supabase, user }) => {
    try {
      const body = await request.json()
      const reference = await resolveEventReference(supabase as any, params.id)
      if (!reference) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

      const canEditGuestlist = await hasEventPermission({
        supabase,
        eventId: reference.id,
        userId: user.id,
        ownerUserId: reference.ownerUserId,
        permissionName: 'EDIT_EVENT_LOGISTICS',
      })
      if (!canEditGuestlist) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      }

      const insert = {
        event_id: reference.id,
        user_id: body.user_id || null,
        full_name: body.full_name || null,
        contact_email: body.contact_email || null,
        contact_phone: body.contact_phone || null,
        guests_count: body.guests_count || 1,
        status: body.status || 'invited',
        invited_by: user.id,
        invite_code: body.invite_code || null,
        notes: body.notes || null
      }

      const { data, error } = await supabase.from('event_guestlist').insert([insert]).select().single()
      if (error) return NextResponse.json({ error: 'Failed to add guest' }, { status: 500 })
      return NextResponse.json({ guest: data })
    } catch (error) {
      console.error('[Event Guestlist API] POST error:', error)
      return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
  })(request)
}

export async function PATCH(request: NextRequest, { params }: any) {
  return withAuth(async (_request, { supabase, user }) => {
    try {
      const body = await request.json()
      const reference = await resolveEventReference(supabase as any, params.id)
      if (!reference) return NextResponse.json({ error: 'Event not found' }, { status: 404 })
      if (!body?.id) return NextResponse.json({ error: 'Guest id required' }, { status: 400 })

      const canEditGuestlist = await hasEventPermission({
        supabase,
        eventId: reference.id,
        userId: user.id,
        ownerUserId: reference.ownerUserId,
        permissionName: 'EDIT_EVENT_LOGISTICS',
      })
      if (!canEditGuestlist) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      }

      const { data, error } = await supabase
        .from('event_guestlist')
        .update({
          status: body.status,
          full_name: body.full_name,
          contact_email: body.contact_email,
          contact_phone: body.contact_phone,
          guests_count: body.guests_count,
          notes: body.notes,
          checked_in_at: body.checked_in_at || null
        })
        .eq('id', body.id)
        .eq('event_id', reference.id)
        .select()
        .single()

      if (error) return NextResponse.json({ error: 'Failed to update guest' }, { status: 500 })
      return NextResponse.json({ guest: data })
    } catch (error) {
      console.error('[Event Guestlist API] PATCH error:', error)
      return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
  })(request)
}


