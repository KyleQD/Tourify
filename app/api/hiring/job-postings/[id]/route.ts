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

    const lifecycleBody = bodyResult.data && typeof bodyResult.data === "object"
      ? bodyResult.data as Record<string, unknown>
      : {}

    if (lifecycleBody.lifecycle_action === "restore" && lifecycleBody.status === "draft") {
      const actorResult = await resolveHiringActorFromRequest({ request, supabase, body: bodyResult.data })
      if (!actorResult.ok) return hiringResultToResponse(actorResult)

      const now = new Date().toISOString()
      const { data, error } = await supabase
        .from("job_posting_templates")
        .update({ status: "draft", archived_at: null, filled_at: null, updated_at: now })
        .eq("id", id)
        .in("status", ["archived", "filled"])
        .eq("employer_entity_type", actorResult.data.employer.entityType)
        .eq("employer_entity_id", actorResult.data.employer.entityId)
        .select("*")
        .maybeSingle()

      if (error) {
        return hiringResultToResponse(
          fail({ code: "DATABASE_ERROR", message: "Unable to restore job posting.", details: error })
        )
      }
      if (!data) {
        return hiringResultToResponse(fail({ code: "NOT_FOUND", message: "Recoverable job posting was not found." }))
      }

      await supabase.from("hiring_audit_events").insert({
        employer_entity_type: actorResult.data.employer.entityType,
        employer_entity_id: actorResult.data.employer.entityId,
        venue_id: actorResult.data.employer.entityType === "venue"
          ? actorResult.data.employer.entityId
          : actorResult.data.employer.scope?.venueId ?? null,
        application_id: null,
        job_id: id,
        actor_user_id: actorResult.data.userId,
        event_type: "job_restored",
        action: "job_restored",
        from_status: "archived_or_filled",
        to_status: "draft",
        subject_type: "job_posting",
        subject_id: id,
        title: "Job posting restored",
        content: "A job posting was restored as a draft while retaining its applicant history.",
        metadata: { entity_table: "job_posting_templates", entity_id: id, job_posting_id: id },
        created_at: now,
      })

      return hiringResultToResponse(ok(data as Record<string, unknown>))
    }

    const parsed = createJobPostingApiSchema.safeParse(bodyResult.data)
    if (!parsed.success) {
      return hiringResultToResponse(
        fail({ code: "VALIDATION_ERROR", message: "Job posting payload is invalid.", details: parsed.error.flatten() })
      )
    }

    const actorResult = await resolveHiringActorFromRequest({ request, supabase, body: bodyResult.data })
    if (!actorResult.ok) return hiringResultToResponse(actorResult)

    const patchPayload = getJobPostingPatchPayload(parsed.data)
    if (patchPayload.status === "published" && !patchPayload.onboarding_template_id) {
      return hiringResultToResponse(
        fail({
          code: "BAD_REQUEST",
          message: "An onboarding template is required before publishing a job posting.",
        })
      )
    }

    const { data, error } = await supabase
      .from("job_posting_templates")
      .update(patchPayload)
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

    const { data: existing } = await supabase
      .from("job_posting_templates")
      .select("status")
      .eq("id", id)
      .eq("employer_entity_type", actorResult.data.employer.entityType)
      .eq("employer_entity_id", actorResult.data.employer.entityId)
      .maybeSingle()

    const now = new Date().toISOString()
    const { data, error } = await supabase
      .from("job_posting_templates")
      .update({ status: "archived", archived_at: now, updated_at: now })
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

    await supabase.from("hiring_audit_events").insert({
      employer_entity_type: actorResult.data.employer.entityType,
      employer_entity_id: actorResult.data.employer.entityId,
      venue_id: actorResult.data.employer.entityType === "venue"
        ? actorResult.data.employer.entityId
        : actorResult.data.employer.scope?.venueId ?? null,
      application_id: null,
      job_id: id,
      actor_user_id: actorResult.data.userId,
      event_type: "job_archived",
      action: "job_archived",
      from_status: typeof existing?.status === "string" ? existing.status : "active",
      to_status: "archived",
      subject_type: "job_posting",
      subject_id: id,
      title: "Job posting archived",
      content: "A job posting was removed from active listings while preserving its applicant history.",
      metadata: { entity_table: "job_posting_templates", entity_id: id, job_posting_id: id },
      created_at: now,
    })

    return hiringResultToResponse(ok(data as Record<string, unknown>))
  } catch (error) {
    return routeErrorToResponse(error)
  }
}
