import { type NextRequest } from "next/server"

import { applicationStarApiSchema } from "@/lib/api/hiring-api-schemas"
import { hiringResultToResponse, readJsonBody, resolveHiringActorFromRequest, routeErrorToResponse } from "@/lib/api/hiring-route-helpers"
import { HiringOnboardingService } from "@/lib/services/hiring-onboarding.service"
import { createHiringServiceClient } from "@/lib/supabase/hiring-service-client"
import { fail } from "@/types/hiring-service"

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id: applicationId } = await context.params
    const supabase = createHiringServiceClient()
    const bodyResult = await readJsonBody({ request })
    if (!bodyResult.ok) return hiringResultToResponse(bodyResult)

    const parsed = applicationStarApiSchema.safeParse(bodyResult.data)
    if (!parsed.success) {
      return hiringResultToResponse(
        fail({ code: "VALIDATION_ERROR", message: "Star payload is invalid.", details: parsed.error.flatten() })
      )
    }

    const actorResult = await resolveHiringActorFromRequest({ request, supabase, body: bodyResult.data })
    if (!actorResult.ok) return hiringResultToResponse(actorResult)

    return hiringResultToResponse(
      await HiringOnboardingService.setApplicationStar({
        supabase,
        actor: actorResult.data,
        applicationId,
        isStarred: parsed.data.is_starred,
      })
    )
  } catch (error) {
    return routeErrorToResponse(error)
  }
}
