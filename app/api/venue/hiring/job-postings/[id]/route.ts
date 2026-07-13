import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { canManageVenue } from "@/lib/venue/venue-access"

export const dynamic = "force-dynamic"

const patchSchema = z.object({
  status: z.enum(["published", "draft", "paused", "closed"]).optional(),
})

function getJobId(request: NextRequest) {
  const parts = request.nextUrl.pathname.split("/")
  return parts[parts.length - 1]
}

async function resolveVenueIdForPosting(service: any, jobId: string) {
  let { data, error } = await service
    .from("job_posting_templates")
    .select("id, venue_id, employer_entity_type, employer_entity_id")
    .eq("id", jobId)
    .maybeSingle()

  if (error) {
    const fallback = await service
      .from("job_posting_templates")
      .select("id, venue_id")
      .eq("id", jobId)
      .maybeSingle()
    data = fallback.data
    error = fallback.error
  }

  if (error || !data?.id) return null
  if (data.employer_entity_type === "venue" && data.employer_entity_id) return data.employer_entity_id
  return data.venue_id || null
}

export async function PATCH(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const jobId = getJobId(request)
  const body = patchSchema.parse(await request.json())
  const service = createServiceRoleClient()
  const venueId = await resolveVenueIdForPosting(service, jobId)

  if (!venueId) return NextResponse.json({ success: false, error: "Job posting not found" }, { status: 404 })

  const access = await canManageVenue(auth.supabase, auth.user.id, venueId, "manage_team")
  if (!access.allowed) return NextResponse.json({ success: false, error: access.reason || "Forbidden" }, { status: 403 })

  const { data, error } = await service
    .from("job_posting_templates")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("id", jobId)
    .select("*")
    .single()

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data })
}
