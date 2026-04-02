import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withAdminAuth } from '@/lib/auth/api-auth'

export const dynamic = 'force-dynamic'

export const GET = withAdminAuth(async (_request: NextRequest, { supabase }) => {
  try {
    const { data: roles, error } = await supabase
      .from('rbac_roles')
      .select('id, name, display_name, scope_type, is_system, description')
      .order('name', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    const roleIds = (roles || []).map((r: any) => r.id)
    let permCountMap: Record<string, number> = {}
    let userCountMap: Record<string, number> = {}

    if (roleIds.length > 0) {
      const { data: rpRows } = await supabase
        .from('rbac_role_permissions')
        .select('role_id')
        .in('role_id', roleIds)

      if (rpRows) {
        rpRows.forEach((r: any) => {
          permCountMap[r.role_id] = (permCountMap[r.role_id] || 0) + 1
        })
      }

      const { data: uerRows } = await supabase
        .from('rbac_user_entity_roles')
        .select('role_id')
        .in('role_id', roleIds)
        .eq('is_active', true)

      if (uerRows) {
        uerRows.forEach((r: any) => {
          userCountMap[r.role_id] = (userCountMap[r.role_id] || 0) + 1
        })
      }
    }

    const enriched = (roles || []).map((role: any) => ({
      ...role,
      permission_count: permCountMap[role.id] || 0,
      active_users: userCountMap[role.id] || 0,
    }))

    return NextResponse.json({ roles: enriched })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to load roles' }, { status: 500 })
  }
})

const createRoleSchema = z.object({
  name: z.string().min(1).regex(/^[a-z_]+$/, 'Name must be lowercase letters and underscores'),
  display_name: z.string().min(1),
  description: z.string().optional(),
  scope_type: z.enum(['global', 'entity']).default('entity'),
  permission_ids: z.array(z.string().uuid()).default([]),
})

export const POST = withAdminAuth(async (request: NextRequest, { supabase, user }) => {
  try {
    const body = await request.json()
    const validated = createRoleSchema.parse(body)

    const { data: role, error } = await supabase
      .from('rbac_roles')
      .insert({
        name: validated.name,
        display_name: validated.display_name,
        description: validated.description || null,
        scope_type: validated.scope_type,
        is_system: false,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'A role with this name already exists' }, { status: 409 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (validated.permission_ids.length > 0) {
      const rpInserts = validated.permission_ids.map(pid => ({
        role_id: role.id,
        permission_id: pid,
      }))

      const { error: rpError } = await supabase
        .from('rbac_role_permissions')
        .insert(rpInserts)

      if (rpError) {
        console.error('[RBAC roles POST] permission link error:', rpError)
      }
    }

    await supabase.from('rbac_permission_audit_log').insert({
      actor_id: user.id,
      action: 'create_role',
      permission_name: validated.name,
    })

    return NextResponse.json({ success: true, role })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: err.errors }, { status: 400 })
    }
    console.error('[RBAC roles POST] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})
