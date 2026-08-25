import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { canManageVenue, getCurrentVenueContext } from "@/lib/venue/venue-access"

export const dynamic = "force-dynamic"

/**
 * VEN-131/132/133 — canonical Venue hiring surface.
 * GET  : job postings + applications for the acting venue (employer-scoped)
 * POST : create a job posting
 */

const createJobSchema = z.object({
  venue_id: z.string().uuid().optional(),
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(4000).optional().nullable(),
  department: z.string().trim().max(80).optional().nullable(),
  employment_type: z.enum(["full_time", "part_time", "contract", "seasonal"]).default("full_time"),
  location: z.string().trim().max(160).optional().nullable(),
  number_of_positions: z.number().int().min(1).max(500).default(1),
  salary_range: z.string().trim().max(80).optional().nullable(),
  requirements: z.array(z.string().trim().min(1)).max(30).optional(),
  responsibilities: z.array(z.string().trim().min(1)).max(30).optional(),
  required_certifications: z.array(z.string().trim().min(1)).max(20).optional(),
  background_check_required: z.boolean().default(false),
})

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
  const [jobsResult, applicationsResult] = await Promise.all([
    service
      .from("organization_job_postings")
      .select("*")
      .eq("venue_id", venueId)
      .order("created_at", { ascending: false })
      .limit(100),
    service
      .from("job_applications")
      .select(
        `id, job_posting_id, status, applied_at, applicant_name, applicant_email,
         applicant_phone, rating, reviewer_notes, decision_note,
         interview_scheduled, interview_date, offer_made, offer_date`,
      )
      .eq("venue_id", venueId)
      .order("applied_at", { ascending: false })
      .limit(300),
  ])

  if (jobsResult.error) return NextResponse.json({ success: false, error: jobsResult.error.message }, { status: 500 })
  if (applicationsResult.error)
    return NextResponse.json({ success: false, error: applicationsResult.error.message }, { status: 500 })

  return NextResponse.json({
    success: true,
    jobs: jobsResult.data ?? [],
    applications: applicationsResult.data ?? [],
  })
}

export async function POST(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 })
  }
  const parsed = createJobSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Invalid job posting", details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const venueId = parsed.data.venue_id ?? (await getCurrentVenueContext(auth.supabase, auth.user.id))?.id
  if (!venueId) return NextResponse.json({ success: false, error: "venue_id is required" }, { status: 400 })

  const access = await canManageVenue(auth.supabase, auth.user.id, venueId, "manage_team")
  if (!access.allowed) return NextResponse.json({ success: false, error: access.reason || "Forbidden" }, { status: 403 })

  const service = createServiceRoleClient()
  const { data, error } = await service
    .from("organization_job_postings")
    .insert({
      venue_id: venueId,
      created_by: auth.user.id,
      title: parsed.data.title,
      description: parsed.data.description || null,
      department: parsed.data.department || null,
      employment_type: parsed.data.employment_type,
      location: parsed.data.location || null,
      number_of_positions: parsed.data.number_of_positions,
      salary_range: parsed.data.salary_range || null,
      requirements: parsed.data.requirements ?? null,
      responsibilities: parsed.data.responsibilities ?? null,
      required_certifications: parsed.data.required_certifications ?? null,
      background_check_required: parsed.data.background_check_required,
      status: "active",
    })
    .select("*")
    .single()

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data })
}
