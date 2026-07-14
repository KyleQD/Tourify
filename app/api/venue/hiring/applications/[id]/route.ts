import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { canManageVenue } from "@/lib/venue/venue-access"

export const dynamic = "force-dynamic"

const patchSchema = z.object({
  status: z.string().min(1),
  feedback: z.string().optional().nullable(),
})

function getApplicationId(request: NextRequest) {
  const parts = request.nextUrl.pathname.split("/")
  return parts[parts.length - 1]
}

function toDatabaseStatus(status: string) {
  if (status === "approved") return "accepted"
  if (status === "reviewing") return "in_review"
  return status
}

async function resolveVenueIdForApplication(service: any, applicationId: string) {
  const { data: application, error } = await service
    .from("job_applications")
    .select(
      `
        id,
        venue_id,
        job_posting_id,
        job_posting:job_posting_templates(venue_id, employer_entity_type, employer_entity_id)
      `,
    )
    .eq("id", applicationId)
    .maybeSingle()

  if (error || !application?.id) return null
  const posting = Array.isArray(application.job_posting) ? application.job_posting[0] : application.job_posting
  if (posting?.employer_entity_type === "venue" && posting?.employer_entity_id) return posting.employer_entity_id
  return application.venue_id || posting?.venue_id || null
}

export async function PATCH(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const applicationId = getApplicationId(request)
  const body = patchSchema.parse(await request.json())
  const service = createServiceRoleClient()
  const venueId = await resolveVenueIdForApplication(service, applicationId)

  if (!venueId) return NextResponse.json({ success: false, error: "Application not found" }, { status: 404 })

  const access = await canManageVenue(auth.supabase, auth.user.id, venueId, "manage_team")
  if (!access.allowed) return NextResponse.json({ success: false, error: access.reason || "Forbidden" }, { status: 403 })

  const { data, error } = await service
    .from("job_applications")
    .update({
      status: toDatabaseStatus(body.status),
      feedback: body.feedback || null,
      reviewed_by: auth.user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", applicationId)
    .select("*")
    .single()

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, data })
}
