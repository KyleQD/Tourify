import { type NextRequest } from "next/server"

import {
  hiringResultToResponse,
  resolveHiringActorFromRequest,
  routeErrorToResponse,
} from "@/lib/api/hiring-route-helpers"
import { listRoleTemplatesForOwner } from "@/lib/staff/role-templates"
import { createHiringServiceClient } from "@/lib/supabase/hiring-service-client"
import { ok } from "@/types/hiring-service"

export async function GET(request: NextRequest) {
  try {
    const supabase = createHiringServiceClient()
    const actorResult = await resolveHiringActorFromRequest({ request, supabase })
    if (!actorResult.ok) return hiringResultToResponse(actorResult)

    const employer = actorResult.data.employer
    const owner =
      employer.entityType === "venue" || employer.entityType === "organization"
        ? { entityType: employer.entityType, entityId: employer.entityId }
        : null

    const roles = await listRoleTemplatesForOwner(supabase, owner)
    return hiringResultToResponse(ok(roles))
  } catch (error) {
    return routeErrorToResponse(error)
  }
}
