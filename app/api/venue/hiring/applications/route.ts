import { NextRequest, NextResponse } from "next/server"
import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { canManageVenue, getCurrentVenueContext } from "@/lib/venue/venue-access"

export const dynamic = "force-dynamic"

/**
 * VEN-139 — employer-scoped application LIST feeding the hiring board and
 * candidate drawer. Includes drawer payload fields (answers/snapshot/dates).
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const venueId =
    new URL(request.url).searchParams.get("venue_id") ??
    (await getCurrentVenueContext(auth.supabase, auth.user.id))?.id
  if (!venueId) return NextResponse.json({ success: false, error: "venue_id is required" }, { status: 400 })

  const access = await canManageVenue(auth.supabase, auth.user.id, venueId, "manage_team")
  if (!access.allowed) return NextResponse.json({ success: false, error: access.reason || "Forbidden" }, { status: 403 })

  const service = createServiceRoleClient()
  const { data, error } = await service
    .from("job_applications")
    .select(
      `id, job_posting_id, status, applied_at, applicant_name, applicant_email,
       applicant_phone, rating, reviewer_notes, decision_note,
       interview_scheduled, interview_date, offer_made, offer_date,
       form_responses, profile_snapshot`,
    )
    .eq("venue_id", venueId)
    .order("applied_at", { ascending: false })
    .limit(300)

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data: data ?? [] })
}
