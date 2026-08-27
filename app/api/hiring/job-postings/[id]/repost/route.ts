import { type NextRequest } from "next/server"

import {
  hiringResultToResponse,
  resolveHiringActorFromRequest,
  routeErrorToResponse,
} from "@/lib/api/hiring-route-helpers"
import { createHiringServiceClient } from "@/lib/supabase/hiring-service-client"
import { fail, ok } from "@/types/hiring-service"

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const supabase = createHiringServiceClient()
    const actorResult = await resolveHiringActorFromRequest({ request, supabase })
    if (!actorResult.ok) return hiringResultToResponse(actorResult)

    const { data: source, error: sourceError } = await supabase
      .from("job_posting_templates")
      .select("*")
      .eq("id", id)
      .in("status", ["archived", "filled"])
      .eq("employer_entity_type", actorResult.data.employer.entityType)
      .eq("employer_entity_id", actorResult.data.employer.entityId)
      .maybeSingle()

    if (sourceError) {
      return hiringResultToResponse(
        fail({ code: "DATABASE_ERROR", message: "Unable to load archived job posting.", details: sourceError })
      )
    }
    if (!source) {
      return hiringResultToResponse(fail({ code: "NOT_FOUND", message: "Archived or filled job posting was not found." }))
    }

    const now = new Date().toISOString()
    const copy = {
      employer_entity_type: actorResult.data.employer.entityType,
      employer_entity_id: actorResult.data.employer.entityId,
      venue_id: source.venue_id ?? null,
      adhoc_venue_id: source.adhoc_venue_id ?? null,
      created_by: actorResult.data.userId,
      title: source.title,
      description: source.description,
      department: source.department,
      position: source.position,
      employment_type: source.employment_type,
      location: source.location,
      role_type: source.role_type,
      number_of_positions: source.number_of_positions ?? 1,
      salary_range: source.salary_range,
      requirements: source.requirements ?? [],
      responsibilities: source.responsibilities ?? [],
      benefits: source.benefits ?? [],
      skills: source.skills ?? [],
      experience_level: source.experience_level,
      remote: source.remote ?? false,
      urgent: source.urgent ?? false,
      required_certifications: source.required_certifications ?? [],
      application_form_template: source.application_form_template ?? { fields: [] },
      onboarding_template_id: source.onboarding_template_id ?? null,
      event_id: source.event_id ?? null,
      tour_id: source.tour_id ?? null,
      event_date: source.event_date ?? null,
      allow_applicant_messages: source.allow_applicant_messages ?? false,
      status: "draft",
      applications_count: 0,
      views_count: 0,
      published_at: null,
      filled_at: null,
      archived_at: null,
      created_at: now,
      updated_at: now,
    }

    const { data: reposted, error: insertError } = await supabase
      .from("job_posting_templates")
      .insert(copy)
      .select("*")
      .single()

    if (insertError) {
      return hiringResultToResponse(
        fail({ code: "DATABASE_ERROR", message: "Unable to repost job posting.", details: insertError })
      )
    }

    await supabase.from("hiring_audit_events").insert({
      employer_entity_type: actorResult.data.employer.entityType,
      employer_entity_id: actorResult.data.employer.entityId,
      venue_id: actorResult.data.employer.entityType === "venue"
        ? actorResult.data.employer.entityId
        : actorResult.data.employer.scope?.venueId ?? null,
      application_id: null,
      job_id: reposted.id,
      actor_user_id: actorResult.data.userId,
      event_type: "job_reposted",
      action: "job_reposted",
      from_status: source.status ?? "archived",
      to_status: "draft",
      subject_type: "job_posting",
      subject_id: reposted.id,
      title: "Job posting reposted",
      content: "A new draft was created from an archived job posting.",
      metadata: {
        entity_table: "job_posting_templates",
        entity_id: reposted.id,
        job_posting_id: reposted.id,
        source_job_posting_id: id,
      },
      created_at: now,
    })

    return hiringResultToResponse(ok(reposted as Record<string, unknown>), { status: 201 })
  } catch (error) {
    return routeErrorToResponse(error)
  }
}
