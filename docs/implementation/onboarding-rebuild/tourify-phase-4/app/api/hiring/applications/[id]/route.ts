import { type NextRequest } from "next/server"

import { applicationDecisionApiSchema } from "@/lib/api/hiring-api-schemas"
import { hiringResultToResponse, readJsonBody, resolveHiringActorFromRequest, routeErrorToResponse } from "@/lib/api/hiring-route-helpers"
import { HiringOnboardingService } from "@/lib/services/hiring-onboarding.service"
import { createHiringServiceClient } from "@/lib/supabase/hiring-service-client"
import { fail } from "@/types/hiring-service"

interface RouteParams {
  params: Promise<{ id: string }> | { id: string }
}

async function getApplicationId(params: RouteParams["params"]): Promise<string> {
  const resolved = await params
  return resolved.id
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const applicationId = await getApplicationId(params)
    const supabase = createHiringServiceClient()
    const bodyResult = await readJsonBody({ request })
    if (!bodyResult.ok) return hiringResultToResponse(bodyResult)

    const parsed = applicationDecisionApiSchema.safeParse(bodyResult.data)
    if (!parsed.success) {
      return hiringResultToResponse(
        fail({ code: "VALIDATION_ERROR", message: "Application decision payload is invalid.", details: parsed.error.flatten() })
      )
    }

    const actorResult = await resolveHiringActorFromRequest({ request, supabase, body: bodyResult.data })
    if (!actorResult.ok) return hiringResultToResponse(actorResult)

    if (parsed.data.action === "approve") {
      return hiringResultToResponse(
        await HiringOnboardingService.approveApplication({
          supabase,
          actor: actorResult.data,
          applicationId,
          note: parsed.data.note,
        })
      )
    }

    if (parsed.data.action === "reject") {
      return hiringResultToResponse(
        await HiringOnboardingService.rejectApplication({
          supabase,
          actor: actorResult.data,
          applicationId,
          reason: parsed.data.reason,
        })
      )
    }

    return hiringResultToResponse(
      await HiringOnboardingService.waitlistApplication({
        supabase,
        actor: actorResult.data,
        applicationId,
        note: parsed.data.note,
      })
    )
  } catch (error) {
    return routeErrorToResponse(error)
  }
}
