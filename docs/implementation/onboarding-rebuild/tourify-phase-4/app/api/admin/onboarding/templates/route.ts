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
      .from("staff_onboarding_templates")
      .select("*")
      .eq("employer_entity_type", actorResult.data.employer.entityType)
      .eq("employer_entity_id", actorResult.data.employer.entityId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (filters.department) query = query.eq("department", filters.department)
    if (filters.position) query = query.eq("position", filters.position)

    const { data, error } = await query
    if (error) return hiringResultToResponse(fail({ code: "DATABASE_ERROR", message: "Unable to list onboarding templates.", details: error }))

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
      .from("staff_onboarding_templates")
      .insert({
        employer_entity_type: actorResult.data.employer.entityType,
        employer_entity_id: actorResult.data.employer.entityId,
        venue_id: actorResult.data.employer.entityType === "venue" ? actorResult.data.employer.entityId : actorResult.data.employer.scope?.venueId ?? null,
        name: bodyResult.data.name,
        description: bodyResult.data.description ?? null,
        department: bodyResult.data.department ?? null,
        position: bodyResult.data.position ?? null,
        employment_type: bodyResult.data.employment_type ?? "contractor",
        fields: bodyResult.data.fields ?? [],
        required_documents: bodyResult.data.required_documents ?? [],
        estimated_days: bodyResult.data.estimated_days ?? 1,
        is_default: bodyResult.data.is_default ?? false,
        tags: bodyResult.data.tags ?? [],
        created_by: actorResult.data.userId,
        created_at: getNowIso(),
        updated_at: getNowIso(),
      })
      .select("*")
      .single()

    if (error) return hiringResultToResponse(fail({ code: "DATABASE_ERROR", message: "Unable to create onboarding template.", details: error }))

    return hiringResultToResponse(ok(data), { status: 201 })
  } catch (error) {
    return routeErrorToResponse(error)
  }
}
