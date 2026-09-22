import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api-auth'
import { hasEventPermission } from '../../_lib/event-permissions'
import { resolveEventReference } from '../../_lib/event-reference'

export async function GET(_req: NextRequest, { params }: any) {
  return withAuth(async (_request, { supabase, user }) => {
    try {
      const reference = await resolveEventReference(supabase as any, params.id)
      if (!reference) return NextResponse.json({ guests: [], deprecated: true })

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
      return NextResponse.json({ guests: data || [], deprecated: true })
    } catch (error) {
      console.error('[Event Guestlist API] GET error:', error)
      return NextResponse.json({ guests: [] })
    }
  })(_req)
}

export async function POST() {
  return NextResponse.json(
    { error: 'Legacy guest-list writes are frozen. Use the event ticketing invitation API.' },
    { status: 410, headers: { Deprecation: 'true' } },
  )
}

export async function PATCH() {
  return NextResponse.json(
    { error: 'Legacy guest-list writes are frozen. Use the event ticketing invitation API.' },
    { status: 410, headers: { Deprecation: 'true' } },
  )
}
