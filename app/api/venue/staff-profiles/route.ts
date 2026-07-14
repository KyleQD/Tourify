import { NextRequest, NextResponse } from "next/server"
import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { canManageVenue, getCurrentVenueContext } from "@/lib/venue/venue-access"

export const dynamic = "force-dynamic"

async function resolveVenueId(request: NextRequest, auth: { user: any; supabase: any }) {
  const venueId = request.nextUrl.searchParams.get("venue_id") || request.nextUrl.searchParams.get("venueId")
  if (venueId) return venueId
  return (await getCurrentVenueContext(auth.supabase, auth.user.id))?.id || null
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
    .from("staff_members")
    .select("id, user_id, name, email, phone, role, department, employment_type, status, permissions, created_at, updated_at")
    .eq("employer_entity_type", "venue")
    .eq("employer_entity_id", venueId)
    .order("name", { ascending: true })

  if (error) return NextResponse.json({ success: false, error: error.message, data: [] }, { status: 500 })
  return NextResponse.json({ success: true, data: data || [], staff: data || [] })
}
