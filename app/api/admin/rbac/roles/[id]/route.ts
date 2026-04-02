import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/auth/api-auth'

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: roleId } = await context.params
  return withAdminAuth(async (_req, { supabase }) => {
    try {
      const { data: role } = await supabase
        .from('rbac_roles')
        .select('id, is_system_role')
        .eq('id', roleId)
        .single()

      if (!role) return NextResponse.json({ error: 'Role not found' }, { status: 404 })
      if (role.is_system_role) return NextResponse.json({ error: 'Cannot delete system roles' }, { status: 403 })

      await supabase.from('rbac_role_permissions').delete().eq('role_id', roleId)
      await supabase.from('rbac_user_entity_roles').delete().eq('role_id', roleId)
      const { error } = await supabase.from('rbac_roles').delete().eq('id', roleId)

      if (error) return NextResponse.json({ error: 'Failed to delete role' }, { status: 500 })
      return NextResponse.json({ success: true })
    } catch {
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  })(request)
}
