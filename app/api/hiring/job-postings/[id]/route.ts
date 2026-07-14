import { type NextRequest } from "next/server"

import { createJobPostingApiSchema } from "@/lib/api/hiring-api-schemas"
import {
  hiringResultToResponse,
  readJsonBody,
  resolveHiringActorFromRequest,
  routeErrorToResponse,
} from "@/lib/api/hiring-route-helpers"
import { createHiringServiceClient } from "@/lib/supabase/hiring-service-client"
import { fail, ok } from "@/types/hiring-service"

interface RouteContext {
  params: Promise<{ id: string }>
}

const ALLOWED_EMPLOYMENT_TYPES = ["full_time", "part_time", "contractor", "volunteer"]
const ALLOWED_EXPERIENCE_LEVELS = ["entry", "mid", "senior", "executive"]
const ALLOWED_ROLE_TYPES = ["security", "bartender", "street_team", "production", "management", "other"]

function getJobPostingPatchPayload(parsed: ReturnType<typeof createJobPostingApiSchema.parse>) {
  return {
    title: parsed.title,
    description: parsed.description,
    department: parsed.department || null,
    position: parsed.position || null,
    employment_type: parsed.employment_type && ALLOWED_EMPLOYMENT_TYPES.includes(parsed.employment_type) ? parsed.employment_type : "contractor",
    location: parsed.location ?? "TBD",
    role_type: parsed.role_type && ALLOWED_ROLE_TYPES.includes(parsed.role_type) ? parsed.role_type : null,
    number_of_positions: parsed.number_of_positions ?? 1,
    salary_range: parsed.salary_range ?? null,
    requirements: parsed.requirements ?? [],
    responsibilities: parsed.responsibilities ?? [],
    benefits: parsed.benefits ?? [],
    skills: parsed.skills ?? [],
    experience_level: parsed.experience_level && ALLOWED_EXPERIENCE_LEVELS.includes(parsed.experience_level) ? parsed.experience_level : "entry",
    remote: parsed.remote ?? false,
    urgent: parsed.urgent ?? false,
    required_certifications: parsed.required_certifications ?? [],
    application_form_template: parsed.application_form_template ?? { fields: [] },
    onboarding_template_id: parsed.onboarding_template_id ?? null,
    event_id: parsed.event_id ?? parsed.eventId ?? null,
    tour_id: parsed.tour_id ?? parsed.tourId ?? null,
    event_date: parsed.event_date ?? null,
    status: parsed.status ?? "draft",
    updated_at: new Date().toISOString(),
  }
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const supabase = createHiringServiceClient()
    const actorResult = await resolveHiringActorFromRequest({ request, supabase })
    if (!actorResult.ok) return hiringResultToResponse(actorResult)

    const { data, error } = await supabase
      .from("job_posting_templates")
      .select("*")
      .eq("id", id)
      .eq("employer_entity_type", actorResult.data.employer.entityType)
      .eq("employer_entity_id", actorResult.data.employer.entityId)
      .maybeSingle()

    if (error) {
      return hiringResultToResponse(
        fail({ code: "DATABASE_ERROR", message: "Unable to load job posting.", details: error })
      )
    }

    if (!data) {
      return hiringResultToResponse(fail({ code: "NOT_FOUND", message: "Job posting was not found." }))
    }

    return hiringResultToResponse(ok(data as Record<string, unknown>))
  } catch (error) {
    return routeErrorToResponse(error)
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const supabase = createHiringServiceClient()
    const bodyResult = await readJsonBody({ request })
    if (!bodyResult.ok) return hiringResultToResponse(bodyResult)

    const parsed = createJobPostingApiSchema.safeParse(bodyResult.data)
    if (!parsed.success) {
      return hiringResultToResponse(
        fail({ code: "VALIDATION_ERROR", message: "Job posting payload is invalid.", details: parsed.error.flatten() })
      )
    }

    const actorResult = await resolveHiringActorFromRequest({ request, supabase, body: bodyResult.data })
    if (!actorResult.ok) return hiringResultToResponse(actorResult)

    const { data, error } = await supabase
      .from("job_posting_templates")
      .update(getJobPostingPatchPayload(parsed.data))
      .eq("id", id)
      .eq("employer_entity_type", actorResult.data.employer.entityType)
      .eq("employer_entity_id", actorResult.data.employer.entityId)
      .select("*")
      .maybeSingle()

    if (error) {
      return hiringResultToResponse(
        fail({ code: "DATABASE_ERROR", message: "Unable to update job posting.", details: error })
      )
    }

    if (!data) {
      return hiringResultToResponse(fail({ code: "NOT_FOUND", message: "Job posting was not found." }))
    }

    return hiringResultToResponse(ok(data as Record<string, unknown>))
  } catch (error) {
    return routeErrorToResponse(error)
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const supabase = createHiringServiceClient()
    const actorResult = await resolveHiringActorFromRequest({ request, supabase })
    if (!actorResult.ok) return hiringResultToResponse(actorResult)

    const { data, error } = await supabase
      .from("job_posting_templates")
      .update({ status: "archived", updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("employer_entity_type", actorResult.data.employer.entityType)
      .eq("employer_entity_id", actorResult.data.employer.entityId)
      .select("*")
      .maybeSingle()

    if (error) {
      return hiringResultToResponse(
        fail({ code: "DATABASE_ERROR", message: "Unable to archive job posting.", details: error })
      )
    }

    if (!data) {
      return hiringResultToResponse(fail({ code: "NOT_FOUND", message: "Job posting was not found." }))
    }

    return hiringResultToResponse(ok(data as Record<string, unknown>))
  } catch (error) {
    return routeErrorToResponse(error)
  }
}
