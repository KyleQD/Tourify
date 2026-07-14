import { NextResponse, type NextRequest } from "next/server"

import { submitJobApplicationApiSchema } from "@/lib/api/hiring-api-schemas"
import { getAuthenticatedUserId, hiringResultToResponse, readJsonBody, routeErrorToResponse } from "@/lib/api/hiring-route-helpers"
import { createHiringServiceClient } from "@/lib/supabase/hiring-service-client"
import { fail, ok } from "@/types/hiring-service"

function getNowIso(): string {
  return new Date().toISOString()
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createHiringServiceClient()
    const userResult = await getAuthenticatedUserId({ request, supabase })
    if (!userResult.ok) return hiringResultToResponse(userResult)

    const { data, error } = await supabase
      .from("job_applications")
      .select("*")
      .eq("applicant_id", userResult.data)
      .order("created_at", { ascending: false })

    if (error) {
      return hiringResultToResponse(fail({ code: "DATABASE_ERROR", message: "Unable to load your applications.", details: error }))
    }

    return hiringResultToResponse(ok(data ?? []))
  } catch (error) {
    return routeErrorToResponse(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createHiringServiceClient()
    const userResult = await getAuthenticatedUserId({ request, supabase })
    if (!userResult.ok) return hiringResultToResponse(userResult)

    const bodyResult = await readJsonBody({ request })
    if (!bodyResult.ok) return hiringResultToResponse(bodyResult)

    const parsed = submitJobApplicationApiSchema.safeParse(bodyResult.data)
    if (!parsed.success) {
      return hiringResultToResponse(
        fail({ code: "VALIDATION_ERROR", message: "Application payload is invalid.", details: parsed.error.flatten() })
      )
    }

    const { data: posting, error: postingError } = await supabase
      .from("job_posting_templates")
      .select("*")
      .eq("id", parsed.data.job_posting_id)
      .maybeSingle()

    if (postingError) {
      return hiringResultToResponse(fail({ code: "DATABASE_ERROR", message: "Unable to load job posting.", details: postingError }))
    }

    if (!posting) {
      return hiringResultToResponse(fail({ code: "NOT_FOUND", message: "Job posting was not found." }))
    }

    if (posting.status !== "published") {
      return hiringResultToResponse(fail({ code: "CONFLICT", message: "This job posting is not open for applications." }))
    }

    const employerEntityType = posting.employer_entity_type ?? "venue"
    const employerEntityId = posting.employer_entity_id ?? posting.venue_id

    if (!employerEntityType || !employerEntityId) {
      return hiringResultToResponse(
        fail({ code: "CONFLICT", message: "Job posting is missing employer scope. Run Phase 1 backfill before accepting applications." })
      )
    }

    const duplicate = await supabase
      .from("job_applications")
      .select("id")
      .eq("job_posting_id", parsed.data.job_posting_id)
      .eq("applicant_id", userResult.data)
      .maybeSingle()

    if (duplicate.error) {
      return hiringResultToResponse(fail({ code: "DATABASE_ERROR", message: "Unable to check existing application.", details: duplicate.error }))
    }

    if (duplicate.data) {
      return hiringResultToResponse(fail({ code: "CONFLICT", message: "You have already applied to this job." }))
    }

    const { data, error } = await supabase
      .from("job_applications")
      .insert({
        employer_entity_type: employerEntityType,
        employer_entity_id: employerEntityId,
        venue_id: posting.venue_id ?? (employerEntityType === "venue" ? employerEntityId : null),
        job_posting_id: parsed.data.job_posting_id,
        applicant_id: userResult.data,
        applicant_name: parsed.data.applicant_name ?? null,
        applicant_email: parsed.data.applicant_email ?? null,
        applicant_phone: parsed.data.applicant_phone ?? null,
        form_responses: parsed.data.form_responses,
        cover_letter: parsed.data.cover_letter ?? null,
        title: posting.title ?? null,
        department: posting.department ?? null,
        position: posting.position ?? null,
        employment_type: posting.employment_type ?? null,
        status: "pending",
        created_at: getNowIso(),
        updated_at: getNowIso(),
      })
      .select("*")
      .single()

    if (error) {
      return hiringResultToResponse(fail({ code: "DATABASE_ERROR", message: "Unable to submit application.", details: error }))
    }

    return NextResponse.json({ ok: true, data }, { status: 201 })
  } catch (error) {
    return routeErrorToResponse(error)
  }
}
