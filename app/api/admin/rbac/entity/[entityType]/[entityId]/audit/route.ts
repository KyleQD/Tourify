import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/auth/api-auth'

export const dynamic = 'force-dynamic'

export const GET = withAdminAuth(async (request: NextRequest, { supabase, user }) => {
  try {
    const { pathname, searchParams } = new URL(request.url)
    const parts = pathname.split('/')
    const typeIdx = parts.findIndex(p => p === 'entity') + 1
    const idIdx = typeIdx + 1
    const entityType = decodeURIComponent(parts[typeIdx] || '')
    const entityId = decodeURIComponent(parts[idIdx] || '')
    const limit = Number(searchParams.get('limit') || 25)

    if (!entityType || !entityId) return NextResponse.json({ error: 'Invalid entity' }, { status: 400 })

    // Require MANAGE_MEMBERS to view audit for this entity
    const { data: canManage, error: rpcError } = await supabase.rpc('has_entity_permission', {
      p_user_id: user.id,
      p_entity_type: entityType,
      p_entity_id: entityId,
      p_permission_name: 'MANAGE_MEMBERS'
    })
    if (rpcError) return NextResponse.json({ error: rpcError.message }, { status: 400 })
    if (!canManage) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })

    const { data, error } = await supabase
      .from('rbac_permission_audit_log')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ logs: data ?? [] })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to load audit' }, { status: 500 })
  }
})


