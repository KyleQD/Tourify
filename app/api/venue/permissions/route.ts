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
