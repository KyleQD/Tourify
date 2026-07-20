import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { adminAccessErrorResponse, assertAdminTourAccess } from "@/lib/admin/admin-tour-event-access"
import { resolveArtistJobCategoryId } from "@/lib/artist-jobs/categories"
import { withAdminCapability } from "@/lib/auth/api-auth"

const nullableDateSchema = z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal("")])
  .transform(value => value || null)
  .optional()
  .nullable()
const nullableTimeSchema = z.union([z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), z.literal("")])
  .transform(value => value || null)
  .optional()
  .nullable()
const nullableHttpUrlSchema = z.union([
  z.string().url().refine(value => /^https?:\/\//i.test(value), { message: "Only HTTP(S) links are supported" }),
  z.literal(""),
]).transform(value => value || null).optional().nullable()

const createTourJobSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(12000),
  category_id: z.string().trim().min(1),
  job_type: z.enum(["one_time", "recurring", "tour", "residency", "collaboration"]),
  payment_type: z.enum(["paid", "unpaid", "revenue_share", "exposure"]),
  payment_amount: z.number().finite().min(0).optional().nullable(),
  payment_currency: z.string().trim().length(3).default("USD"),
  payment_description: z.string().max(2000).optional().nullable(),
  location: z.string().max(500).optional().nullable(),
  location_type: z.enum(["in_person", "remote", "hybrid"]).default("in_person"),
  city: z.string().max(160).optional().nullable(),
  state: z.string().max(160).optional().nullable(),
  country: z.string().max(160).optional().nullable(),
  event_date: nullableDateSchema,
  event_time: nullableTimeSchema,
  duration_hours: z.number().int().min(0).max(100000).optional().nullable(),
  deadline: nullableDateSchema,
  required_skills: z.array(z.string().max(160)).max(100).default([]),
  required_equipment: z.array(z.string().max(160)).max(100).default([]),
  required_experience: z.enum(["beginner", "intermediate", "professional"]).optional().nullable(),
  required_genres: z.array(z.string().max(160)).max(100).default([]),
  age_requirement: z.string().max(160).optional().nullable(),
  benefits: z.array(z.string().max(160)).max(100).default([]),
  special_requirements: z.string().max(5000).optional().nullable(),
  contact_email: z.union([z.string().email(), z.literal("")]).optional().nullable(),
  contact_phone: z.string().max(80).optional().nullable(),
  external_link: nullableHttpUrlSchema,
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  featured: z.boolean().default(false),
  status: z.enum(["draft", "open"]).default("open"),
  tour_id: z.string().uuid(),
})

function routeError(error: unknown, fallback: string) {
  if (error instanceof z.ZodError) {
    return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 })
  }
  const resolved = adminAccessErrorResponse(error, fallback, 500)
  return NextResponse.json({ error: resolved.message }, { status: resolved.status })
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return withAdminCapability("hiring.manage", async (_request, { user, supabase, admin }) => {
    try {
      await assertAdminTourAccess({ supabase, userId: user.id, tourId: id, orgId: admin.orgId })
      const { data, error } = await supabase
        .from("artist_jobs")
        .select("*")
        .eq("tour_id", id)
        .order("created_at", { ascending: false })
      if (error) throw new Error(error.message)
      return NextResponse.json({
        success: true,
        jobs: (data ?? []).map((job: Record<string, unknown>) => ({
          ...job,
          required_skills: Array.isArray(job.required_skills) ? job.required_skills : [],
          required_equipment: Array.isArray(job.required_equipment) ? job.required_equipment : [],
          required_genres: Array.isArray(job.required_genres) ? job.required_genres : [],
          benefits: Array.isArray(job.benefits) ? job.benefits : [],
        })),
      })
    } catch (error) {
      return routeError(error, "Failed to load tour jobs")
    }
  })(request)
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return withAdminCapability("hiring.manage", async (_request, { user, supabase, admin }) => {
    try {
      const tour = await assertAdminTourAccess({ supabase, userId: user.id, tourId: id, orgId: admin.orgId }) as Record<string, unknown>
      const input = createTourJobSchema.parse(await request.json())
      if (input.tour_id !== id) {
        return NextResponse.json({ error: "Tour does not match the route" }, { status: 409 })
      }
      const categoryId = await resolveArtistJobCategoryId(supabase, input.category_id)
      if (!categoryId) return NextResponse.json({ error: "Unknown job category" }, { status: 400 })

      const { tour_id: _tourId, ...jobFields } = input
      const { data, error } = await supabase
        .from("artist_jobs")
        .insert({
          ...jobFields,
          category_id: categoryId,
          tour_id: id,
          tour_name: String(tour.name || "Tour"),
          posted_by: user.id,
          posted_by_type: "organizer",
          posted_by_profile_id: admin.profileId,
          poster_profile_id: admin.profileId,
        })
        .select("*")
        .single()
      if (error) throw new Error(error.message)
      return NextResponse.json({ success: true, job: data }, { status: 201 })
    } catch (error) {
      return routeError(error, "Failed to create tour job")
    }
  })(request)
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return withAdminCapability("hiring.manage", async (_request, { user, supabase, admin }) => {
    try {
      await assertAdminTourAccess({ supabase, userId: user.id, tourId: id, orgId: admin.orgId })
      const body = await request.json()
      const jobId = z.string().uuid().parse(body.job_id)
      const status = z.enum(["draft", "open", "paused", "closed", "filled"]).parse(body.status)
      const { data, error } = await supabase
        .from("artist_jobs")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", jobId)
        .eq("tour_id", id)
        .select("*")
        .single()
      if (error) throw new Error(error.message)
      return NextResponse.json({ success: true, job: data })
    } catch (error) {
      return routeError(error, "Failed to update tour job")
    }
  })(request)
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return withAdminCapability("hiring.manage", async (_request, { user, supabase, admin }) => {
    try {
      await assertAdminTourAccess({ supabase, userId: user.id, tourId: id, orgId: admin.orgId })
      const jobId = z.string().uuid().parse(new URL(request.url).searchParams.get("job_id"))
      const { data, error } = await supabase
        .from("artist_jobs")
        .delete()
        .eq("id", jobId)
        .eq("tour_id", id)
        .select("id")
        .maybeSingle()
      if (error) throw new Error(error.message)
      if (!data) return NextResponse.json({ error: "Tour job not found" }, { status: 404 })
      return NextResponse.json({ success: true })
    } catch (error) {
      return routeError(error, "Failed to delete tour job")
    }
  })(request)
}
