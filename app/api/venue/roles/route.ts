import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { canManageVenue, getCurrentVenueContext } from "@/lib/venue/venue-access"
import { projectRoleRow } from "@/lib/venue/rbac-projection"

export const dynamic = "force-dynamic"

/**
 * VEN-123 / VEN-122: venue role CRUD now targets the CANONICAL entity-RBAC
 * tables. The previous implementation queried a `role_templates` relation that
 * does not exist in the active database (guaranteed 500s).
 *
 * Model: system roles are global (owner columns NULL); venue-created custom
 * roles are rbac_roles rows with owner ('Venue', venueId) + permissions wired
 * through rbac_role_permissions.
 */

const createRoleSchema = z.object({
  venue_id: z.string().uuid().optional(),
  key: z.string().min(1),
  label: z.string().min(1),
  department: z.string().min(1).default("Operations"),
  role_category: z.string().optional().default("general"),
  employment_type: z.string().optional().default("part_time"),
  permissions: z.record(z.any()).optional(),
})

async function resolveVenueId(request: NextRequest, auth: { user: any; supabase: any }) {
  return (
    request.nextUrl.searchParams.get("venue_id") ||
    request.nextUrl.searchParams.get("venueId") ||
    (await getCurrentVenueContext(auth.supabase, auth.user.id))?.id ||
    null
  )
}

const toRoleDto = projectRoleRow

async function loadPermissionNames(service: any, roleIds: string[]) {
  if (!roleIds.length) return new Map<string, string[]>()
  const { data, error } = await service
    .from("rbac_role_permissions")
    .select("role_id, rbac_permissions(name)")
    .in("role_id", roleIds)
  const map = new Map<string, string[]>()
  for (const row of data || []) {
    const roleId = String(row.role_id)
    const name = row.rbac_permissions?.name
    if (!name) continue
    map.set(roleId, [...(map.get(roleId) ?? []), name])
  }
  return map
}

async function syncRolePermissions(service: any, roleId: string, permissions: Record<string, unknown> | undefined) {
  // Replace-with-set semantics for the truthy keys of the legacy JSON map.
  const requestedNames = Object.entries(permissions ?? {})
    .filter(([, allowed]) => allowed)
    .map(([name]) => name)

  await service.from("rbac_role_permissions").delete().eq("role_id", roleId)

  if (!requestedNames.length) return

  const { data: permRows, error: permError } = await service
    .from("rbac_permissions")
    .select("id, name")
    .in("name", requestedNames)
  if (permError) throw new Error(permError.message)

  const rows = (permRows || []).map((p: any) => ({ role_id: roleId, permission_id: p.id }))
  if (rows.length) {
    const { error: linkError } = await service.from("rbac_role_permissions").insert(rows)
    if (linkError) throw new Error(linkError.message)
  }
}

export async function GET(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const venueId = await resolveVenueId(request, auth)
  if (!venueId) return NextResponse.json({ success: false, error: "venue_id is required" }, { status: 400 })

  const access = await canManageVenue(auth.supabase, auth.user.id, venueId, "manage_team")
  if (!access.allowed) return NextResponse.json({ success: false, error: access.reason || "Forbidden" }, { status: 403 })

  const service = createServiceRoleClient()
  const { data, error } = await service
    .from("rbac_roles")
    .select("*")
    .or(`owner_entity_id.is.null,and(owner_entity_type.eq.Venue,owner_entity_id.eq.${venueId})`)
    .order("is_system", { ascending: false })
    .order("display_name", { ascending: true })

  if (error) return NextResponse.json({ success: false, error: error.message, roles: [] }, { status: 500 })

  const roles = data || []
  const permissionMap = await loadPermissionNames(service, roles.map((r: any) => r.id))
  const dtos = roles.map((role: any) => toRoleDto(role, permissionMap.get(role.id) ?? []))

  return NextResponse.json({ success: true, roles: dtos, data: dtos })
}

export async function POST(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const body = createRoleSchema.parse(await request.json())
  const venueId = body.venue_id || (await getCurrentVenueContext(auth.supabase, auth.user.id))?.id
  if (!venueId) return NextResponse.json({ success: false, error: "venue_id is required" }, { status: 400 })

  const access = await canManageVenue(auth.supabase, auth.user.id, venueId, "manage_team")
  if (!access.allowed) return NextResponse.json({ success: false, error: access.reason || "Forbidden" }, { status: 403 })

  const service = createServiceRoleClient()

  // Unique-name guard: keep rbac_roles.name globally unique without surprises.
  const candidateName = `Venue:${venueId.slice(0, 8)}:${body.key}`
  const { data: existing } = await service
    .from("rbac_roles")
    .select("id")
    .eq("name", candidateName)
    .maybeSingle()
  if (existing?.id) {
    return NextResponse.json({ success: false, error: "A role with this key already exists for this venue." }, { status: 409 })
  }

  const { data: role, error } = await service
    .from("rbac_roles")
    .insert({
      name: candidateName,
      display_name: body.label,
      scope_type: "entity",
      is_system: false,
      description: `${body.role_category}/${body.department} (${body.employment_type})`,
      owner_entity_type: "Venue",
      owner_entity_id: venueId,
    })
    .select("*")
    .single()

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })

  try {
    await syncRolePermissions(service, role.id, body.permissions)
  } catch (permErr: any) {
    // Roll the role back so we never leave an unwired partial row behind.
    await service.from("rbac_roles").delete().eq("id", role.id)
    return NextResponse.json({ success: false, error: permErr?.message || "Failed to wire permissions" }, { status: 500 })
  }

  const permissionNames = Object.entries(body.permissions ?? {})
    .filter(([, allowed]) => allowed)
    .map(([name]) => name)

  return NextResponse.json({ success: true, role: toRoleDto(role, permissionNames) })
}
