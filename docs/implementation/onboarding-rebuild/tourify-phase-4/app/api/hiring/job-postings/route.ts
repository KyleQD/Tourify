import { type NextRequest } from "next/server"

import { createJobPostingApiSchema } from "@/lib/api/hiring-api-schemas"
import { getListFiltersFromRequest, hiringResultToResponse, readJsonBody, resolveHiringActorFromRequest, routeErrorToResponse } from "@/lib/api/hiring-route-helpers"
import { HiringOnboardingService } from "@/lib/services/hiring-onboarding.service"
import { createHiringServiceClient } from "@/lib/supabase/hiring-service-client"
import { fail } from "@/types/hiring-service"

export async function GET(request: NextRequest) {
  try {
    const supabase = createHiringServiceClient()
    const actorResult = await resolveHiringActorFromRequest({ request, supabase })
    if (!actorResult.ok) return hiringResultToResponse(actorResult)

    const result = await HiringOnboardingService.listJobPostings({
      supabase,
      actor: actorResult.data,
      filters: getListFiltersFromRequest(request),
    })

    return hiringResultToResponse(result)
  } catch (error) {
    return routeErrorToResponse(error)
  }
}

export async function POST(request: NextRequest) {
  try {
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

    const result = await HiringOnboardingService.createJobPosting({
      supabase,
      actor: actorResult.data,
      data: {
        title: parsed.data.title,
        description: parsed.data.description,
        department: parsed.data.department,
        position: parsed.data.position,
        employment_type: parsed.data.employment_type,
        location: parsed.data.location,
        role_type: parsed.data.role_type,
        number_of_positions: parsed.data.number_of_positions,
        salary_range: parsed.data.salary_range,
        requirements: parsed.data.requirements,
        responsibilities: parsed.data.responsibilities,
        benefits: parsed.data.benefits,
        skills: parsed.data.skills,
        experience_level: parsed.data.experience_level,
        remote: parsed.data.remote,
        urgent: parsed.data.urgent,
        required_certifications: parsed.data.required_certifications,
        application_form_template: parsed.data.application_form_template,
        onboarding_template_id: parsed.data.onboarding_template_id,
        status: parsed.data.status,
      },
    })

    return hiringResultToResponse(result, { status: result.ok ? 201 : undefined })
  } catch (error) {
    return routeErrorToResponse(error)
  }
}
