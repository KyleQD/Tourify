import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/auth/api-auth'

export const dynamic = 'force-dynamic'

export const POST = withAdminAuth(async (request: NextRequest, { supabase, user }) => {
  try {
    const isEntityRbacEnabled = process.env.FEATURE_ENTITY_RBAC === '1'
    if (!isEntityRbacEnabled) return NextResponse.json({ success: false, error: 'RBAC disabled' }, { status: 400 })

    const body = await request.json()
    const { targetUserId, entityType, entityId, roleName } = body || {}

    if (!targetUserId || !entityType || !entityId || !roleName)
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })

    // Check that the actor has MANAGE_MEMBERS on the entity
    const { data: canManage, error: rpcError } = await supabase.rpc('has_entity_permission', {
      p_user_id: user.id,
      p_entity_type: entityType,
      p_entity_id: entityId,
      p_permission_name: 'MANAGE_MEMBERS'
    })
    if (rpcError) return NextResponse.json({ error: rpcError.message }, { status: 400 })
    if (!canManage) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })

    // Resolve role id
    const { data: role, error: roleErr } = await supabase
      .from('rbac_roles')
      .select('id, name')
      .eq('name', roleName)
      .single()

    if (roleErr || !role) return NextResponse.json({ error: 'Role not found' }, { status: 404 })

    // Upsert assignment
    const { error: upsertErr } = await supabase
      .from('rbac_user_entity_roles')
      .insert({
        user_id: targetUserId,
        entity_type: entityType,
        entity_id: entityId,
        role_id: role.id,
        is_active: true
      })

    if (upsertErr) return NextResponse.json({ error: upsertErr.message }, { status: 400 })

    // Audit log
    await supabase.from('rbac_permission_audit_log').insert({
      actor_id: user.id,
      target_user_id: targetUserId,
      entity_type: entityType,
      entity_id: entityId,
      action: 'assign_role',
      permission_name: roleName
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to assign role' }, { status: 500 })
  }
})


