import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { canManageVenue } from "@/lib/venue/venue-access"

export const dynamic = "force-dynamic"

const assignmentSchema = z.object({
  venue_id: z.string().uuid(),
  shift_id: z.string().uuid(),
  staff_member_id: z.string().uuid().nullable(),
})

export async function POST(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const body = assignmentSchema.parse(await request.json())
  const access = await canManageVenue(auth.supabase, auth.user.id, body.venue_id, "manage_team")
  if (!access.allowed) return NextResponse.json({ success: false, error: access.reason || "Forbidden" }, { status: 403 })

  const service = createServiceRoleClient()
  const { data, error } = await service
    .from("staff_shifts")
    .update({ staff_member_id: body.staff_member_id, updated_at: new Date().toISOString() })
    .eq("id", body.shift_id)
    .select("*")
    .single()

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data })
}
