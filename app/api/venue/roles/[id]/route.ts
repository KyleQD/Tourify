import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { canManageVenue } from "@/lib/venue/venue-access"

export const dynamic = "force-dynamic"

/**
 * VEN-123: venue role PATCH/DELETE against canonical rbac_roles.
 * System roles are immutable; venue-owned roles require manage_team.
 */

const patchRoleSchema = z.object({
  label: z.string().min(1).optional(),
  description: z.string().optional(),
  permissions: z.record(z.any()).optional(),
})

function getRoleId(request: NextRequest) {
  const parts = request.nextUrl.pathname.split("/")
  return parts[parts.length - 1]
}

async function getVenueOwnedRole(service: any, roleId: string) {
  const { data } = await service
    .from("rbac_roles")
    .select("id, name, display_name, description, owner_entity_type, owner_entity_id, is_system")
    .eq("id", roleId)
    .maybeSingle()
  return data || null
}

export async function PATCH(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const roleId = getRoleId(request)
  const body = patchRoleSchema.parse(await request.json())
  const service = createServiceRoleClient()

  const role = await getVenueOwnedRole(service, roleId)
  if (!role?.id || role.owner_entity_type !== "Venue" || !role.owner_entity_id) {
    return NextResponse.json({ success: false, error: "Venue role not found" }, { status: 404 })
  }

  const access = await canManageVenue(auth.supabase, auth.user.id, role.owner_entity_id, "manage_team")
  if (!access.allowed) return NextResponse.json({ success: false, error: access.reason || "Forbidden" }, { status: 403 })

  const updates: Record<string, unknown> = {}
  if (body.label !== undefined) updates.display_name = body.label
  if (body.description !== undefined) updates.description = body.description

  let updated: any = role
  if (Object.keys(updates).length) {
    const { data, error } = await service
      .from("rbac_roles")
      .update(updates)
      .eq("id", roleId)
      .select("*")
      .single()
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    updated = data
  }

  let permissionNames: string[] | undefined
  if (body.permissions !== undefined) {
    await service.from("rbac_role_permissions").delete().eq("role_id", roleId)
    const requestedNames = Object.entries(body.permissions)
      .filter(([, allowed]) => allowed)
      .map(([name]) => name)

    if (requestedNames.length) {
      const { data: permRows, error: permError } = await service
        .from("rbac_permissions")
        .select("id, name")
        .in("name", requestedNames)
      if (permError) return NextResponse.json({ success: false, error: permError.message }, { status: 500 })

      const rows = (permRows || []).map((p: any) => ({ role_id: roleId, permission_id: p.id }))
      if (rows.length) {
        const { error: linkError } = await service.from("rbac_role_permissions").insert(rows)
        if (linkError) return NextResponse.json({ success: false, error: linkError.message }, { status: 500 })
      }
      permissionNames = (permRows || []).map((p: any) => p.name)
    } else {
      permissionNames = []
    }
  }

  return NextResponse.json({
    success: true,
    role: {
      id: updated.id,
      key: updated.name,
      label: updated.display_name || updated.name,
      description: updated.description ?? null,
      is_system_role: false,
      is_active: true,
      owner_entity_type: updated.owner_entity_type,
      owner_entity_id: updated.owner_entity_id,
      source: "rbac_roles",
      ...(permissionNames !== undefined ? { permissions: permissionNames } : {}),
    },
  })
}

export async function DELETE(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const roleId = getRoleId(request)
  const service = createServiceRoleClient()

  const role = await getVenueOwnedRole(service, roleId)
  if (!role?.id || role.owner_entity_type !== "Venue" || !role.owner_entity_id) {
    return NextResponse.json({ success: false, error: "Venue role not found" }, { status: 404 })
  }

  const access = await canManageVenue(auth.supabase, auth.user.id, role.owner_entity_id, "manage_team")
  if (!access.allowed) return NextResponse.json({ success: false, error: access.reason || "Forbidden" }, { status: 403 })

  // Block deletion while assignments reference the role.
  const { count } = await service
    .from("rbac_user_entity_roles")
    .select("id", { count: "exact", head: true })
    .eq("role_id", roleId)
    .eq("is_active", true)
  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { success: false, error: `Cannot delete: ${count} active assignment(s) use this role.` },
      { status: 409 },
    )
  }

  await service.from("rbac_role_permissions").delete().eq("role_id", roleId)
  const { error } = await service.from("rbac_roles").delete().eq("id", roleId)
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
