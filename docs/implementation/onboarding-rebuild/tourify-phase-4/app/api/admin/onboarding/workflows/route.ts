import { type NextRequest } from "next/server"

import { getListFiltersFromRequest, hiringResultToResponse, readJsonBody, resolveHiringActorFromRequest, routeErrorToResponse } from "@/lib/api/hiring-route-helpers"
import { createHiringServiceClient } from "@/lib/supabase/hiring-service-client"
import { fail, ok } from "@/types/hiring-service"

function getNowIso(): string {
  return new Date().toISOString()
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createHiringServiceClient()
    const actorResult = await resolveHiringActorFromRequest({ request, supabase })
    if (!actorResult.ok) return hiringResultToResponse(actorResult)

    const filters = getListFiltersFromRequest(request)
    const limit = filters.limit ?? 50
    const offset = filters.offset ?? 0

    let query = supabase
      .from("onboarding_workflows")
      .select("*")
      .eq("employer_entity_type", actorResult.data.employer.entityType)
      .eq("employer_entity_id", actorResult.data.employer.entityId)
      .order("updated_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (filters.status) query = query.eq("status", filters.status)

    const { data, error } = await query
    if (error) return hiringResultToResponse(fail({ code: "DATABASE_ERROR", message: "Unable to list onboarding workflows.", details: error }))

    return hiringResultToResponse(ok(data ?? []))
  } catch (error) {
    return routeErrorToResponse(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createHiringServiceClient()
    const bodyResult = await readJsonBody({ request })
    if (!bodyResult.ok) return hiringResultToResponse(bodyResult)

    const actorResult = await resolveHiringActorFromRequest({ request, supabase, body: bodyResult.data })
    if (!actorResult.ok) return hiringResultToResponse(actorResult)

    const { data, error } = await supabase
      .from("onboarding_workflows")
      .insert({
        employer_entity_type: actorResult.data.employer.entityType,
        employer_entity_id: actorResult.data.employer.entityId,
        venue_id: actorResult.data.employer.entityType === "venue" ? actorResult.data.employer.entityId : actorResult.data.employer.scope?.venueId ?? null,
        candidate_id: bodyResult.data.candidate_id ?? null,
        job_posting_id: bodyResult.data.job_posting_id ?? null,
        current_stage: bodyResult.data.current_stage ?? "invitation_sent",
        status: bodyResult.data.status ?? "active",
        steps: bodyResult.data.steps ?? [],
        created_at: getNowIso(),
        updated_at: getNowIso(),
      })
      .select("*")
      .single()

    if (error) return hiringResultToResponse(fail({ code: "DATABASE_ERROR", message: "Unable to create onboarding workflow.", details: error }))

    return hiringResultToResponse(ok(data), { status: 201 })
  } catch (error) {
    return routeErrorToResponse(error)
  }
}
