import { type NextRequest } from "next/server"

import { HiringOnboardingService } from "@/lib/services/hiring-onboarding.service"
import { createHiringServiceClient } from "@/lib/supabase/hiring-service-client"
import { hiringResultToResponse, resolveHiringActorFromRequest, routeErrorToResponse } from "@/lib/api/hiring-route-helpers"
import { presentDashboardStats } from "@/lib/hiring/api-presenters"
import { ok } from "@/types/hiring-service"

export async function GET(request: NextRequest) {
  try {
    const supabase = createHiringServiceClient()
    const actorResult = await resolveHiringActorFromRequest({ request, supabase })
    if (!actorResult.ok) return hiringResultToResponse(actorResult)

    const view = request.nextUrl.searchParams.get("view")
    if (view === "audit") {
      const result = await HiringOnboardingService.listAuditEvents({
        supabase,
        actor: actorResult.data,
      })
      return hiringResultToResponse(result)
    }

    const [statsResult, activityResult] = await Promise.all([
      HiringOnboardingService.getDashboardStats({
        supabase,
        actor: actorResult.data,
      }),
      HiringOnboardingService.listAuditEvents({
        supabase,
        actor: actorResult.data,
      }),
    ])

    if (!statsResult.ok) return hiringResultToResponse(statsResult)

    return hiringResultToResponse(ok(presentDashboardStats({
      stats: statsResult.data,
      recentActivity: activityResult.ok ? activityResult.data : [],
    })))
  } catch (error) {
    return routeErrorToResponse(error)
  }
}
