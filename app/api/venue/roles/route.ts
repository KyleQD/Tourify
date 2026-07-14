import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { canManageVenue, getCurrentVenueContext } from "@/lib/venue/venue-access"

export const dynamic = "force-dynamic"

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

export async function GET(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const venueId = await resolveVenueId(request, auth)
  if (!venueId) return NextResponse.json({ success: false, error: "venue_id is required" }, { status: 400 })

  const access = await canManageVenue(auth.supabase, auth.user.id, venueId, "manage_team")
  if (!access.allowed) return NextResponse.json({ success: false, error: access.reason || "Forbidden" }, { status: 403 })

  const service = createServiceRoleClient()
  const { data, error } = await service
    .from("role_templates")
    .select("*")
    .or(`owner_entity_id.is.null,owner_entity_id.eq.${venueId}`)
    .eq("is_active", true)
    .order("department", { ascending: true })
    .order("label", { ascending: true })

  if (error) return NextResponse.json({ success: false, error: error.message, roles: [] }, { status: 500 })
  return NextResponse.json({ success: true, roles: data || [], data: data || [] })
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
  const { data, error } = await service
    .from("role_templates")
    .insert({
      key: body.key,
      label: body.label,
      department: body.department,
      role_category: body.role_category,
      employment_type: body.employment_type,
      permissions: body.permissions || {},
      owner_entity_type: "venue",
      owner_entity_id: venueId,
    })
    .select("*")
    .single()

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, role: data })
}
