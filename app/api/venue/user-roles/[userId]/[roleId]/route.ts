import { NextRequest, NextResponse } from "next/server"
import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { canManageVenue } from "@/lib/venue/venue-access"

export const dynamic = "force-dynamic"

/**
 * VEN-126 — revoke a role assignment by deactivating it (audit trail preserved)
 * rather than resetting staff_members.role strings.
 */

function getParams(request: NextRequest) {
  const parts = request.nextUrl.pathname.split("/")
  return {
    roleId: parts[parts.length - 1],
    userId: parts[parts.length - 2],
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const { userId, roleId } = getParams(request)
  const venueId =
    request.nextUrl.searchParams.get("venue_id") || request.nextUrl.searchParams.get("venueId")
  if (!venueId) return NextResponse.json({ success: false, error: "venue_id is required" }, { status: 400 })

  const access = await canManageVenue(auth.supabase, auth.user.id, venueId, "manage_team")
  if (!access.allowed) return NextResponse.json({ success: false, error: access.reason || "Forbidden" }, { status: 403 })

  const service = createServiceRoleClient()
  const { data: revoked, error } = await service
    .from("rbac_user_entity_roles")
    .update({ is_active: false, end_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("entity_type", "Venue")
    .eq("entity_id", venueId)
    .eq("role_id", roleId)
    .eq("is_active", true)
    .select("id")

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, revoked: revoked?.length ?? 0 })
}
