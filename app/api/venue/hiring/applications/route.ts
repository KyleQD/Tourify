import { NextRequest, NextResponse } from "next/server"
import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { canManageVenue, getCurrentVenueContext } from "@/lib/venue/venue-access"

export const dynamic = "force-dynamic"

async function resolveVenueId(input: {
  request: NextRequest
  service: any
  auth: { user: any; supabase: any }
}) {
  const { searchParams } = new URL(input.request.url)
  const explicitVenueId = searchParams.get("venue_id")
  if (explicitVenueId) return explicitVenueId

  const jobPostingId = searchParams.get("job_posting_id")
  if (jobPostingId) {
    let posting = await input.service
      .from("job_posting_templates")
      .select("venue_id, employer_entity_type, employer_entity_id")
      .eq("id", jobPostingId)
      .maybeSingle()
    if (posting.error) {
      posting = await input.service.from("job_posting_templates").select("venue_id").eq("id", jobPostingId).maybeSingle()
    }
    const row = posting.data
    if (row?.employer_entity_type === "venue" && row?.employer_entity_id) return row.employer_entity_id
    if (row?.venue_id) return row.venue_id
  }

  const venue = await getCurrentVenueContext(input.auth.supabase, input.auth.user.id)
  return venue?.id || null
}

export async function GET(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const service = createServiceRoleClient()
  const venueId = await resolveVenueId({ request, service, auth })
  if (!venueId) return NextResponse.json({ success: false, error: "venue_id or job_posting_id is required" }, { status: 400 })

  const access = await canManageVenue(auth.supabase, auth.user.id, venueId, "manage_team")
  if (!access.allowed) return NextResponse.json({ success: false, error: access.reason || "Forbidden" }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const jobPostingId = searchParams.get("job_posting_id")

  let query = service
    .from("job_applications")
    .select(
      `
        *,
        job_posting:job_posting_templates(title, department, position, location)
      `,
    )
    .order("applied_at", { ascending: false })

  if (jobPostingId) query = query.eq("job_posting_id", jobPostingId)
  else query = query.or(`venue_id.eq.${venueId},employer_entity_id.eq.${venueId}`)

  const { data, error } = await query
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, data: data || [] })
}
