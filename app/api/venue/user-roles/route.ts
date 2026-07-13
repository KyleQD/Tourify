import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { canManageVenue, getCurrentVenueContext } from "@/lib/venue/venue-access"

export const dynamic = "force-dynamic"

const assignSchema = z.object({
  venue_id: z.string().uuid().optional(),
  staff_member_id: z.string().uuid(),
  role: z.string().min(1),
  permissions: z.record(z.any()).optional(),
})

export async function GET(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const venueId =
    request.nextUrl.searchParams.get("venue_id") ||
    request.nextUrl.searchParams.get("venueId") ||
    (await getCurrentVenueContext(auth.supabase, auth.user.id))?.id
  if (!venueId) return NextResponse.json({ success: false, error: "venue_id is required" }, { status: 400 })

  const access = await canManageVenue(auth.supabase, auth.user.id, venueId, "manage_team")
  if (!access.allowed) return NextResponse.json({ success: false, error: access.reason || "Forbidden" }, { status: 403 })

  const service = createServiceRoleClient()
  const { data, error } = await service
    .from("staff_members")
    .select("id, user_id, name, email, role, permissions, employer_entity_id")
    .eq("employer_entity_type", "venue")
    .eq("employer_entity_id", venueId)

  if (error) return NextResponse.json({ success: false, error: error.message, assignments: [] }, { status: 500 })
  return NextResponse.json({ success: true, assignments: data || [], data: data || [] })
}

export async function POST(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const body = assignSchema.parse(await request.json())
  const venueId = body.venue_id || (await getCurrentVenueContext(auth.supabase, auth.user.id))?.id
  if (!venueId) return NextResponse.json({ success: false, error: "venue_id is required" }, { status: 400 })

  const access = await canManageVenue(auth.supabase, auth.user.id, venueId, "manage_team")
  if (!access.allowed) return NextResponse.json({ success: false, error: access.reason || "Forbidden" }, { status: 403 })

  const service = createServiceRoleClient()
  const { data, error } = await service
    .from("staff_members")
    .update({ role: body.role, permissions: body.permissions || {}, updated_at: new Date().toISOString() })
    .eq("id", body.staff_member_id)
    .eq("employer_entity_type", "venue")
    .eq("employer_entity_id", venueId)
    .select("*")
    .single()

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, assignment: data })
}
