import { NextRequest, NextResponse } from "next/server"

import {
  getAuthenticatedUserId,
  getHiringScopeFromRequest,
  hiringResultToResponse,
  routeErrorToResponse,
} from "@/lib/api/hiring-route-helpers"
import { resolveHiringEntity } from "@/lib/auth/acting-context"
import { HiringCandidateWorkflowService } from "@/lib/services/hiring-candidate-workflow.service"
import { createHiringServiceClient } from "@/lib/supabase/hiring-service-client"

export async function GET(request: NextRequest) {
  try {
    const supabase = createHiringServiceClient()
    const userResult = await getAuthenticatedUserId({ request, supabase })
    if (!userResult.ok) return hiringResultToResponse(userResult)

    const scope = getHiringScopeFromRequest({ request })
    const employerResult = await resolveHiringEntity({
      supabase,
      userId: userResult.data,
      ...scope,
    })
    if (!employerResult.ok) return hiringResultToResponse(employerResult)

    const result = await HiringCandidateWorkflowService.listCandidates({
      actorUserId: userResult.data,
      employer: employerResult.data,
    })

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 403 })
    }

    return NextResponse.json({
      data: result.data ?? [],
      meta: {
        total: result.data?.length ?? 0,
        employer: employerResult.data,
      },
    })
  } catch (error) {
    return routeErrorToResponse(error)
  }
}
