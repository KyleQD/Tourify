import { type NextRequest } from "next/server"

import { getListFiltersFromRequest, hiringResultToResponse, resolveHiringActorFromRequest, routeErrorToResponse } from "@/lib/api/hiring-route-helpers"
import { HiringOnboardingService } from "@/lib/services/hiring-onboarding.service"
import { createHiringServiceClient } from "@/lib/supabase/hiring-service-client"

export async function GET(request: NextRequest) {
  try {
    const supabase = createHiringServiceClient()
    const actorResult = await resolveHiringActorFromRequest({ request, supabase })
    if (!actorResult.ok) return hiringResultToResponse(actorResult)

    const result = await HiringOnboardingService.listRoster({
      supabase,
      actor: actorResult.data,
      filters: getListFiltersFromRequest(request),
    })

    return hiringResultToResponse(result)
  } catch (error) {
    return routeErrorToResponse(error)
  }
}
