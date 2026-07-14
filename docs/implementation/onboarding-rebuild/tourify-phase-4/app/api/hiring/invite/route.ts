import { type NextRequest } from "next/server"

import { inviteStaffApiSchema } from "@/lib/api/hiring-api-schemas"
import { hiringResultToResponse, readJsonBody, resolveHiringActorFromRequest, routeErrorToResponse } from "@/lib/api/hiring-route-helpers"
import { HiringOnboardingService } from "@/lib/services/hiring-onboarding.service"
import { createHiringServiceClient } from "@/lib/supabase/hiring-service-client"
import { fail } from "@/types/hiring-service"

export async function POST(request: NextRequest) {
  try {
    const supabase = createHiringServiceClient()
    const bodyResult = await readJsonBody({ request })
    if (!bodyResult.ok) return hiringResultToResponse(bodyResult)

    const parsed = inviteStaffApiSchema.safeParse(bodyResult.data)
    if (!parsed.success) {
      return hiringResultToResponse(
        fail({ code: "VALIDATION_ERROR", message: "Staff invite payload is invalid.", details: parsed.error.flatten() })
      )
    }

    const actorResult = await resolveHiringActorFromRequest({ request, supabase, body: bodyResult.data })
    if (!actorResult.ok) return hiringResultToResponse(actorResult)

    const result = await HiringOnboardingService.createDirectInvite({
      supabase,
      actor: actorResult.data,
      email: parsed.data.email,
      name: parsed.data.name,
      phone: parsed.data.phone,
      position: parsed.data.position,
      department: parsed.data.department,
      employmentType: parsed.data.employmentType ?? parsed.data.employment_type,
      templateId: parsed.data.templateId ?? parsed.data.template_id,
      jobPostingId: parsed.data.jobPostingId ?? parsed.data.job_posting_id,
    })

    return hiringResultToResponse(result, { status: result.ok ? 201 : undefined })
  } catch (error) {
    return routeErrorToResponse(error)
  }
}
