import { type NextRequest } from "next/server"

import { getListFiltersFromRequest, hiringResultToResponse, resolveHiringActorFromRequest, routeErrorToResponse } from "@/lib/api/hiring-route-helpers"
import { createHiringServiceClient } from "@/lib/supabase/hiring-service-client"
import { fail, ok } from "@/types/hiring-service"

export async function GET(request: NextRequest) {
  try {
    const supabase = createHiringServiceClient()
    const actorResult = await resolveHiringActorFromRequest({ request, supabase })
    if (!actorResult.ok) return hiringResultToResponse(actorResult)

    const filters = getListFiltersFromRequest(request)
    const limit = filters.limit ?? 50
    const offset = filters.offset ?? 0

    let query = supabase
      .from("staff_onboarding_candidates")
      .select("*")
      .eq("employer_entity_type", actorResult.data.employer.entityType)
      .eq("employer_entity_id", actorResult.data.employer.entityId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (filters.status) query = query.eq("status", filters.status)
    if (filters.department) query = query.eq("department", filters.department)
    if (filters.position) query = query.eq("position", filters.position)

    const { data, error } = await query

    if (error) {
      return hiringResultToResponse(fail({ code: "DATABASE_ERROR", message: "Unable to list onboarding candidates.", details: error }))
    }

    return hiringResultToResponse(ok(data ?? []))
  } catch (error) {
    return routeErrorToResponse(error)
  }
}
