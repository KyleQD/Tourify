import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import {
  projectPermissionRow,
  sortPermissionsForUi,
} from "@/lib/venue/rbac-projection"

export const dynamic = "force-dynamic"

/**
 * VEN-124 — the permission catalog comes from the CANONICAL rbac_permissions
 * table (stable UUID ids), projected into the VenuePermission shape the Roles &
 * Permissions UI already consumes. The previous implementation returned an
 * incompatible hardcoded mini-list ({key,label,group}) that no component could
 * render (RoleManagement expects id/permission_name/permission_category).
 *
 * Category projection: canonical categories are semantic ('ticketing',
 * 'finance', …); the UI enum is a fixed union, so we map with an explicit table
 * and default unknowns to 'admin' rather than inventing new UI categories.
 */

export async function GET() {
  const service = createServiceRoleClient()
  // Catalog is public reference data; read via service client so the endpoint
  // works pre-auth for role editors while writes stay guarded elsewhere.
  const { data, error } = await service
    .from("rbac_permissions")
    .select("id, name, display_name, category, description")
    .order("category", { ascending: true })
    .order("name", { ascending: true })

  if (error) {
    return NextResponse.json({ success: false, error: error.message, permissions: [] }, { status: 500 })
  }

  const permissions = sortPermissionsForUi((data || []).map(projectPermissionRow))

  return NextResponse.json({
    success: true,
    permissions,
    total: permissions.length,
    source: "rbac_permissions",
  })
}
export async function GET() {
  const service = createServiceRoleClient()
  // Catalog is public reference data; read via service client so the endpoint
  // works pre-auth for role editors while writes stay guarded elsewhere.
  const { data, error } = await service
    .from("rbac_permissions")
    .select("id, name, display_name, category, description")
    .order("category", { ascending: true })
    .order("name", { ascending: true })

  if (error) {
    return NextResponse.json({ success: false, error: error.message, permissions: [] }, { status: 500 })
  }

  const permissions = (data || []).map((row: any) => ({
    id: row.id,
    permission_name: row.name,
    permission_description: row.description ?? row.display_name ?? null,
    permission_category: CATEGORY_TO_UI[row.category] ?? "admin",
    is_system_permission: true,
    created_at: null as string | null,
    updated_at: null as string | null,
  }))

  permissions.sort((a: any, b: any) => {
    const catDelta =
      CATEGORY_ORDER.indexOf(a.permission_category) - CATEGORY_ORDER.indexOf(b.permission_category)
    return catDelta !== 0 ? catDelta : a.permission_name.localeCompare(b.permission_name)
  })

  return NextResponse.json({
    success: true,
    permissions,
    total: permissions.length,
    source: "rbac_permissions",
  })
}
