import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiRequest, checkAdminPermissions, withAdminAuth } from '@/lib/auth/api-auth'

export const GET = withAdminAuth(async (request: NextRequest, { supabase: _supabase, user: _user }) => {
  const auth = { supabase: _supabase, user: _user }

  try {
    const { searchParams } = new URL(request.url)
    const venueId = searchParams.get('venue_id')
    const role = searchParams.get('role')
    const status = searchParams.get('status')
    const employerEntityType = searchParams.get('employer_entity_type')
    const employerEntityId = searchParams.get('employer_entity_id')
    const eventId = searchParams.get('event_id')
    const tourId = searchParams.get('tour_id')

    // Prefer the unified workforce people graph when employer/event/tour scope is present.
    if (employerEntityId || eventId || tourId || venueId) {
      const { listWorkforcePeople } = await import('@/lib/services/admin-workforce-people.service')
      const people = await listWorkforcePeople({
        supabase: auth.supabase,
        employerEntityType:
          employerEntityType === 'venue' || employerEntityType === 'organization' || employerEntityType === 'artist'
            ? employerEntityType
            : venueId
              ? 'venue'
              : null,
        employerEntityId: employerEntityId || venueId || null,
        eventId,
        tourId,
        venueId,
        includePending: true,
        limit: 200,
      })

      const members = people.map((person) => ({
        id: person.userId,
        user_id: person.userId,
        name: person.name,
        email: person.email,
        role: person.role,
        status: person.status,
        staff_member_id: person.staffMemberId,
        sources: person.sources,
        profiles: {
          id: person.userId,
          full_name: person.name,
          email: person.email,
          avatar_url: null,
        },
      }))

      return NextResponse.json({ members, source: 'workforce_people' })
    }

    let query = auth.supabase
      .from('venue_team_members')
      .select(`
        id,
        user_id,
        venue_id,
        role,
        permissions,
        status,
        created_at,
        profiles:user_id (id, full_name, email, avatar_url)
      `)
      .order('created_at', { ascending: false })

    if (venueId) query = query.eq('venue_id', venueId)
    if (role) query = query.eq('role', role)
    if (status) query = query.eq('status', status)

    const { data, error } = await query.limit(200)

    if (error) {
      console.error('[Team Members] GET error:', error)

      const { data: fallback, error: fallbackError } = await auth.supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, account_type, role')
        .limit(100)

      if (fallbackError) {
        return NextResponse.json({ error: fallbackError.message }, { status: 500 })
      }

      return NextResponse.json({ members: fallback || [], source: 'profiles' })
    }

    return NextResponse.json({ members: data || [], source: 'venue_team_members' })
  } catch (error: any) {
    console.error('[Team Members] GET exception:', error)
    return NextResponse.json({ error: 'Failed to fetch team members' }, { status: 500 })
  }
})

export async function PATCH(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { id, role, permissions, status } = body

    if (!id) return NextResponse.json({ error: 'Member id is required' }, { status: 400 })

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (role !== undefined) updates.role = role
    if (permissions !== undefined) updates.permissions = permissions
    if (status !== undefined) updates.status = status

    const { data, error } = await auth.supabase
      .from('venue_team_members')
      .update(updates)
      .eq('id', id)
      .select(`
        id,
        user_id,
        venue_id,
        role,
        permissions,
        status,
        created_at,
        updated_at,
        profiles:user_id (id, full_name, email, avatar_url)
      `)
      .single()

    if (error) {
      console.error('[Team Members] PATCH error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, member: data })
  } catch (error: any) {
    console.error('[Team Members] PATCH exception:', error)
    return NextResponse.json({ error: 'Failed to update team member' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const isAdmin = await checkAdminPermissions(auth.user)
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const body = await request.json()
    const { venue_id, user_id, name, email, role, permissions } = body

    if (!name || !email) return NextResponse.json({ error: 'Name and email are required' }, { status: 400 })

    const defaultPermissions = {
      manage_bookings: false,
      manage_events: false,
      view_analytics: false,
      manage_team: false,
      manage_documents: false,
    }

    const { data, error } = await auth.supabase
      .from('venue_team_members')
      .insert({
        venue_id: venue_id || null,
        user_id: user_id || null,
        name,
        email,
        role: role || 'member',
        permissions: permissions || defaultPermissions,
        status: 'active',
      })
      .select(`
        id,
        user_id,
        venue_id,
        role,
        permissions,
        status,
        created_at,
        profiles:user_id (id, full_name, email, avatar_url)
      `)
      .single()

    if (error) {
      console.error('[Team Members] POST error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, member: data })
  } catch (error: any) {
    console.error('[Team Members] POST exception:', error)
    return NextResponse.json({ error: 'Failed to create team member' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const isAdmin = await checkAdminPermissions(auth.user)
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return NextResponse.json({ error: 'Member id is required' }, { status: 400 })

    const { error } = await auth.supabase
      .from('venue_team_members')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[Team Members] DELETE error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[Team Members] DELETE exception:', error)
    return NextResponse.json({ error: 'Failed to delete team member' }, { status: 500 })
  }
}
