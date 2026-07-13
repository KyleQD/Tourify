import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { canManageVenue, getCurrentVenueContext } from "@/lib/venue/venue-access"

export const dynamic = "force-dynamic"

const createSchema = z.object({
  venue_id: z.string().uuid().optional(),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
  position: z.string().optional().nullable(),
  employment_type: z.enum(["full_time", "part_time", "contractor", "volunteer"]).optional(),
  experience_level: z.enum(["entry", "mid", "senior", "executive"]).optional(),
  location: z.string().optional().nullable(),
  number_of_positions: z.number().int().positive().optional(),
  salary_range: z.any().optional(),
  requirements: z.array(z.string()).optional(),
  responsibilities: z.array(z.string()).optional(),
  benefits: z.array(z.string()).optional(),
  skills: z.array(z.string()).optional(),
  remote: z.boolean().optional(),
  urgent: z.boolean().optional(),
  status: z.enum(["published", "draft", "paused", "closed"]).optional(),
})

async function resolveVenueId(request: NextRequest, auth: { user: any; supabase: any }) {
  const { searchParams } = new URL(request.url)
  const venueId = searchParams.get("venue_id")
  if (venueId) return venueId
  const venue = await getCurrentVenueContext(auth.supabase, auth.user.id)
  return venue?.id || null
}

function mergeById(rows: any[][]) {
  const map = new Map<string, any>()
  for (const list of rows) {
    for (const row of list || []) {
      if (row?.id) map.set(row.id, row)
    }
  }
  return Array.from(map.values()).sort((a, b) => {
    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
  })
}

export async function GET(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const venueId = await resolveVenueId(request, auth)
  if (!venueId) return NextResponse.json({ success: false, error: "venue_id is required" }, { status: 400 })

  const access = await canManageVenue(auth.supabase, auth.user.id, venueId, "manage_team")
  if (!access.allowed) return NextResponse.json({ success: false, error: access.reason || "Forbidden" }, { status: 403 })

  const service = createServiceRoleClient()
  const baseSelect = "*, application_form_template:application_form_templates(*)"

  const [employerResult, venueResult] = await Promise.all([
    service
      .from("job_posting_templates")
      .select(baseSelect)
      .eq("employer_entity_type", "venue")
      .eq("employer_entity_id", venueId)
      .order("created_at", { ascending: false }),
    service
      .from("job_posting_templates")
      .select(baseSelect)
      .eq("venue_id", venueId)
      .order("created_at", { ascending: false }),
  ])

  const data = mergeById([
    employerResult.error ? [] : employerResult.data || [],
    venueResult.error ? [] : venueResult.data || [],
  ])

  return NextResponse.json({ success: true, data })
}

export async function POST(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const body = createSchema.parse(await request.json())
  const venueId = body.venue_id || (await getCurrentVenueContext(auth.supabase, auth.user.id))?.id
  if (!venueId) return NextResponse.json({ success: false, error: "venue_id is required" }, { status: 400 })

  const access = await canManageVenue(auth.supabase, auth.user.id, venueId, "manage_team")
  if (!access.allowed) return NextResponse.json({ success: false, error: access.reason || "Forbidden" }, { status: 403 })

  const service = createServiceRoleClient()
  const insertData = {
    venue_id: venueId,
    employer_entity_type: "venue",
    employer_entity_id: venueId,
    created_by: auth.user.id,
    title: body.title,
    description: body.description || null,
    department: body.department || null,
    position: body.position || body.title,
    employment_type: body.employment_type || "contractor",
    experience_level: body.experience_level || "entry",
    location: body.location || "Venue",
    number_of_positions: body.number_of_positions || 1,
    salary_range: body.salary_range || null,
    requirements: body.requirements || [],
    responsibilities: body.responsibilities || [],
    benefits: body.benefits || [],
    skills: body.skills || [],
    remote: body.remote || false,
    urgent: body.urgent || false,
    status: body.status || "published",
    applications_count: 0,
    views_count: 0,
  }

  let result = await service.from("job_posting_templates").insert(insertData).select("*").single()

  if (result.error) {
    const retryData = { ...insertData, venue_id: null }
    result = await service.from("job_posting_templates").insert(retryData).select("*").single()
  }

  if (result.error) return NextResponse.json({ success: false, error: result.error.message }, { status: 500 })
  return NextResponse.json({ success: true, data: result.data })
}
