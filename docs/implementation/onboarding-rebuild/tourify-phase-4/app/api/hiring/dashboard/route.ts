import { type NextRequest } from "next/server"

import { HiringOnboardingService } from "@/lib/services/hiring-onboarding.service"
import { createHiringServiceClient } from "@/lib/supabase/hiring-service-client"
import { hiringResultToResponse, resolveHiringActorFromRequest, routeErrorToResponse } from "@/lib/api/hiring-route-helpers"

export async function GET(request: NextRequest) {
  try {
    const supabase = createHiringServiceClient()
    const actorResult = await resolveHiringActorFromRequest({ request, supabase })
    if (!actorResult.ok) return hiringResultToResponse(actorResult)

    const result = await HiringOnboardingService.getDashboardStats({
      supabase,
      actor: actorResult.data,
    })

    return hiringResultToResponse(result)
  } catch (error) {
    return routeErrorToResponse(error)
  }
}
