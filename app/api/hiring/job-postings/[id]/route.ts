import { type NextRequest } from "next/server"

import { createJobPostingApiSchema } from "@/lib/api/hiring-api-schemas"
import {
  hiringResultToResponse,
  readJsonBody,
  resolveHiringActorFromRequest,
  routeErrorToResponse,
} from "@/lib/api/hiring-route-helpers"
import { createHiringServiceClient } from "@/lib/supabase/hiring-service-client"
import { getRoleTemplateById, getRoleTemplateByKey, type RoleTemplate } from "@/lib/staff/role-templates"
import { fail, ok } from "@/types/hiring-service"

interface RouteContext {
  params: Promise<{ id: string }>
}

const ALLOWED_EMPLOYMENT_TYPES = ["full_time", "part_time", "contractor", "volunteer", "intern"]
const ALLOWED_EXPERIENCE_LEVELS = ["entry", "mid", "senior", "executive", "any"]

function normalizeRoleType(value?: string | null): string | null {
  if (!value) return null
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  return normalized && normalized.length <= 100 ? normalized : null
}

function getJobPostingPatchPayload(
  parsed: ReturnType<typeof createJobPostingApiSchema.parse>,
  roleTemplate: RoleTemplate | null
) {
  return {
    title: parsed.title,
    description: parsed.description,
    department: parsed.department || roleTemplate?.department || null,
    position: parsed.position || roleTemplate?.label || null,
    employment_type:
      parsed.employment_type && ALLOWED_EMPLOYMENT_TYPES.includes(parsed.employment_type)
        ? parsed.employment_type
        : roleTemplate?.employment_type ?? "contractor",
    location: parsed.location ?? "TBD",
    role_type: normalizeRoleType(parsed.role_type ?? roleTemplate?.key),
    role_template_id: roleTemplate?.id ?? parsed.role_template_id ?? null,
    number_of_positions: parsed.number_of_positions ?? 1,
    salary_range: parsed.salary_range ?? null,
    requirements:
      parsed.requirements && parsed.requirements.length > 0
        ? parsed.requirements
        : roleTemplate?.qualifications ?? [],
    responsibilities:
      parsed.responsibilities && parsed.responsibilities.length > 0
        ? parsed.responsibilities
        : roleTemplate?.duties ?? [],
    benefits: parsed.benefits ?? [],
    skills: parsed.skills ?? [],
    experience_level: parsed.experience_level && ALLOWED_EXPERIENCE_LEVELS.includes(parsed.experience_level) ? parsed.experience_level : "entry",
    remote: parsed.remote ?? false,
    urgent: parsed.urgent ?? false,
    required_certifications:
      parsed.required_certifications && parsed.required_certifications.length > 0
        ? parsed.required_certifications
        : (roleTemplate?.required_credentials ?? [])
            .filter((credential) => credential && typeof credential === "object" && (credential as Record<string, unknown>).isRequired !== false)
            .map((credential) =>
              typeof (credential as Record<string, unknown>).label === "string"
                ? String((credential as Record<string, unknown>).label)
                : ""
            )
            .filter(Boolean),
    required_credentials:
      parsed.required_credentials && parsed.required_credentials.length > 0
        ? parsed.required_credentials
        : roleTemplate?.required_credentials ?? [],
    role_essentials:
      parsed.role_essentials && parsed.role_essentials.length > 0
        ? parsed.role_essentials
        : roleTemplate?.essentials ?? [],
    workflow_requirements:
      parsed.workflow_requirements && Object.keys(parsed.workflow_requirements).length > 0
        ? parsed.workflow_requirements
        : roleTemplate?.workflow_requirements ?? {},
    role_definition_snapshot: roleTemplate
      ? {
          template_id: roleTemplate.id ?? null,
          key: roleTemplate.key,
          label: roleTemplate.label,
          department: roleTemplate.department,
          role_category: roleTemplate.role_category,
          employment_type: roleTemplate.employment_type,
          job_summary: roleTemplate.job_summary,
          duties: roleTemplate.duties,
          qualifications: roleTemplate.qualifications,
          required_credentials: roleTemplate.required_credentials,
          essentials: roleTemplate.essentials,
          workflow_requirements: roleTemplate.workflow_requirements,
          tags: roleTemplate.tags,
          captured_at: new Date().toISOString(),
        }
      : null,
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

    const employer = actorResult.data.employer
    const roleOwner =
      employer.entityType === "venue" || employer.entityType === "organization"
        ? { entityType: employer.entityType, entityId: employer.entityId }
        : null

    let roleTemplate: RoleTemplate | null = null
    if (parsed.data.role_template_id) {
      roleTemplate = await getRoleTemplateById(supabase, parsed.data.role_template_id)
      if (!roleTemplate) {
        return hiringResultToResponse(
          fail({ code: "BAD_REQUEST", message: "The selected workforce role template does not exist or is inactive." })
        )
      }
      if (
        roleTemplate.owner_entity_id &&
        (!roleOwner ||
          roleTemplate.owner_entity_id !== roleOwner.entityId ||
          roleTemplate.owner_entity_type !== roleOwner.entityType)
      ) {
        return hiringResultToResponse(
          fail({ code: "FORBIDDEN", message: "The selected workforce role template is not available to this employer." })
        )
      }
    } else if (parsed.data.role_type) {
      roleTemplate = await getRoleTemplateByKey(
        supabase,
        normalizeRoleType(parsed.data.role_type) ?? parsed.data.role_type,
        roleOwner
      )
    }

    const patchPayload = getJobPostingPatchPayload(parsed.data, roleTemplate)
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
