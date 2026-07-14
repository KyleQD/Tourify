import { NextRequest, NextResponse } from "next/server"
import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { canManageVenue } from "@/lib/venue/venue-access"

export const dynamic = "force-dynamic"

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

  const { userId } = getParams(request)
  const venueId = request.nextUrl.searchParams.get("venue_id") || request.nextUrl.searchParams.get("venueId")
  if (!venueId) return NextResponse.json({ success: false, error: "venue_id is required" }, { status: 400 })

  const access = await canManageVenue(auth.supabase, auth.user.id, venueId, "manage_team")
  if (!access.allowed) return NextResponse.json({ success: false, error: access.reason || "Forbidden" }, { status: 403 })

  const service = createServiceRoleClient()
  const { data, error } = await service
    .from("staff_members")
    .update({ role: "member", permissions: {}, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("employer_entity_type", "venue")
    .eq("employer_entity_id", venueId)
    .select("*")

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data: data || [] })
}
