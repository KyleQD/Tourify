import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/auth/api-auth'

export const dynamic = 'force-dynamic'

export const GET = withAdminAuth(async (request: NextRequest, { supabase, user }) => {
  try {
    const isEntityRbacEnabled = process.env.FEATURE_ENTITY_RBAC === '1'
    if (!isEntityRbacEnabled) return NextResponse.json({ assignments: [] })

    const url = new URL(request.url)
    const parts = url.pathname.split('/')
    const entityType = decodeURIComponent(parts[parts.findIndex(p => p === 'entity') + 1] || '')
    const entityId = decodeURIComponent(parts[parts.findIndex(p => p === 'entity') + 2] || '')

    if (!entityType || !entityId) return NextResponse.json({ error: 'Invalid entity' }, { status: 400 })

    // Require MANAGE_MEMBERS to view assignments
    const { data: canManage, error: rpcError } = await supabase.rpc('has_entity_permission', {
      p_user_id: user.id,
      p_entity_type: entityType,
      p_entity_id: entityId,
      p_permission_name: 'MANAGE_MEMBERS'
    })
    if (rpcError) return NextResponse.json({ error: rpcError.message }, { status: 400 })
    if (!canManage) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })

    const { data, error } = await supabase
      .from('rbac_user_entity_roles')
      .select('id, user_id, role_id, is_active, start_at, end_at, rbac_roles(name, display_name)')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('start_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ assignments: data ?? [] })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to load assignments' }, { status: 500 })
  }
})


