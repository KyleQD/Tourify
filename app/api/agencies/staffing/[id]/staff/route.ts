import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api-auth'

export const dynamic = 'force-dynamic'

export const GET = withAuth(async (request: NextRequest, { supabase, user }) => {
  try {
    const { pathname } = new URL(request.url)
    const parts = pathname.split('/')
    const idx = parts.findIndex(p => p === 'staffing') + 1
    const agencyId = parts[idx]

    const { data: canManage, error: rpcError } = await supabase.rpc('has_entity_permission', {
      p_user_id: user.id,
      p_entity_type: 'StaffingAgency',
      p_entity_id: agencyId,
      p_permission_name: 'MANAGE_MEMBERS'
    })
    if (rpcError) return NextResponse.json({ error: rpcError.message }, { status: 400 })
    if (!canManage) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })

    const { data, error } = await supabase
      .from('staffing_agency_staff')
      .select('user_id')
      .eq('agency_id', agencyId)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ staff: data ?? [] })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to load staff' }, { status: 500 })
  }
})

export const POST = withAuth(async (request: NextRequest, { supabase, user }) => {
  try {
    const { pathname } = new URL(request.url)
    const parts = pathname.split('/')
    const idx = parts.findIndex(p => p === 'staffing') + 1
    const agencyId = parts[idx]

    const { userId } = await request.json()
    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })

    const { data: canManage, error: rpcError } = await supabase.rpc('has_entity_permission', {
      p_user_id: user.id,
      p_entity_type: 'StaffingAgency',
      p_entity_id: agencyId,
      p_permission_name: 'MANAGE_MEMBERS'
    })
    if (rpcError) return NextResponse.json({ error: rpcError.message }, { status: 400 })
    if (!canManage) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })

    const { error } = await supabase
      .from('staffing_agency_staff')
      .insert({ agency_id: agencyId, user_id: userId })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to add staff' }, { status: 500 })
  }
})

export const DELETE = withAuth(async (request: NextRequest, { supabase, user }) => {
  try {
    const url = new URL(request.url)
    const parts = url.pathname.split('/')
    const idx = parts.findIndex(p => p === 'staffing') + 1
    const agencyId = parts[idx]
    const userId = url.searchParams.get('userId')
    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })

    const { data: canManage, error: rpcError } = await supabase.rpc('has_entity_permission', {
      p_user_id: user.id,
      p_entity_type: 'StaffingAgency',
      p_entity_id: agencyId,
      p_permission_name: 'MANAGE_MEMBERS'
    })
    if (rpcError) return NextResponse.json({ error: rpcError.message }, { status: 400 })
    if (!canManage) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })

    const { error } = await supabase
      .from('staffing_agency_staff')
      .delete()
      .match({ agency_id: agencyId, user_id: userId })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to remove staff' }, { status: 500 })
  }
})


