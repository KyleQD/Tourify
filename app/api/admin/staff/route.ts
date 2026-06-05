import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/auth/api-auth'

async function resolveOrgId(supabase: any, userId: string): Promise<string | null> {
  const { data } = await supabase.from('org_members').select('org_id').eq('user_id', userId).limit(1).maybeSingle()
  return data?.org_id ?? null
}

export const GET = withAdminAuth(async (request: NextRequest, { supabase, user }) => {
  const { searchParams } = new URL(request.url)
  const entityType = searchParams.get('entity_type')
  const entityId = searchParams.get('entity_id')
  const venueId = searchParams.get('venue_id')
  const search = searchParams.get('search') || ''
  const status = searchParams.get('status')
  const role = searchParams.get('role')
  const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 200)
  const offset = parseInt(searchParams.get('offset') || '0', 10)

  try {
    // Build query from unified view
    let query = supabase
      .from('staff_members')
      .select('id, user_id, full_name, email, phone, role, status, entity_type, entity_id, venue_id, created_at', { count: 'exact' })
      .order('full_name', { ascending: true })
      .range(offset, offset + limit - 1)

    // Scope by entity
    if (entityType && entityId) {
      query = query.eq('entity_type', entityType).eq('entity_id', entityId)
    } else if (venueId) {
      query = query.eq('venue_id', venueId)
    } else {
      // Default: scope to org members' venues/entities via org_members
      const orgId = await resolveOrgId(supabase, user.id)
      if (orgId) {
        // Get all venues and events for this org
        const [venueRes, eventRes] = await Promise.allSettled([
          supabase.from('venue_profiles').select('id').eq('user_id', user.id),
          supabase.from('events_v2').select('id').eq('org_id', orgId).limit(50),
        ])
        const venueIds = venueRes.status === 'fulfilled' ? (venueRes.value.data || []).map((v: any) => v.id) : []
        const eventIds = eventRes.status === 'fulfilled' ? (eventRes.value.data || []).map((e: any) => e.id) : []

        if (venueIds.length > 0 || eventIds.length > 0) {
          const filters: string[] = []
          if (venueIds.length > 0) filters.push(`venue_id.in.(${venueIds.join(',')})`)
          if (eventIds.length > 0) filters.push(`entity_id.in.(${eventIds.join(',')})`)
          query = query.or(filters.join(','))
        }
      }
    }

    if (entityType && !entityId) query = query.eq('entity_type', entityType)
    if (status) query = query.eq('status', status)
    if (role) query = query.eq('role', role)
    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`)
    }

    const { data, error, count } = await query

    if (error) {
      // Fallback if unified view columns don't exist yet
      if (error.code === '42703' || error.code === '42P01') {
        return NextResponse.json({ success: true, data: [], total: 0 })
      }
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: data || [], total: count || 0 })
  } catch (err: any) {
    console.error('[Staff API] GET error:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
})

export const POST = withAdminAuth(async (request: NextRequest, { supabase, user }) => {
  const body = await request.json()
  const { action } = body

  try {
    if (action === 'update_status') {
      const { staff_id, status } = body
      if (!staff_id || !status) return NextResponse.json({ error: 'staff_id and status required' }, { status: 400 })

      const { data, error } = await supabase
        .from('staff_members')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', staff_id)
        .select()
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, data })
    }

    if (action === 'add_member') {
      const { user_id, role, entity_type, entity_id, venue_id, full_name, email } = body

      const { data, error } = await supabase
        .from('staff_members')
        .insert({
          user_id,
          role,
          entity_type: entity_type || 'org',
          entity_id: entity_id || null,
          venue_id: venue_id || null,
          full_name,
          email,
          status: 'active',
          created_by: user.id,
        })
        .select()
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, data })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err: any) {
    console.error('[Staff API] POST error:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
})

export const PATCH = withAdminAuth(async (request: NextRequest, { supabase }) => {
  const { id, ...updates } = await request.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const { data, error } = await supabase
    .from('staff_members')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data })
})

export const DELETE = withAdminAuth(async (request: NextRequest, { supabase }) => {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const { error } = await supabase.from('staff_members').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
})
