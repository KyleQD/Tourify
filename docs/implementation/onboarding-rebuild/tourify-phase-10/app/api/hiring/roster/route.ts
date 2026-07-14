import { NextResponse, type NextRequest } from "next/server"

import { resolveHiringActorFromRequest, routeErrorToResponse } from "@/lib/api/hiring-route-helpers"
import { listRosterQuerySchema } from "@/lib/hiring/roster-schema"
import { HiringRosterService } from "@/lib/services/hiring-roster.service"
import { createHiringServiceClient } from "@/lib/supabase/hiring-service-client"

export async function GET(request: NextRequest) {
  try {
    const supabase = createHiringServiceClient()
    const parsed = listRosterQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()))

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid roster query", details: parsed.error.flatten() }, { status: 400 })
    }

    const actorResult = await resolveHiringActorFromRequest({ request, supabase, requirePermission: true })
    if (!actorResult.ok) {
      return NextResponse.json({ error: actorResult.error.message, details: actorResult.error.details }, { status: 403 })
    }

    const service = new HiringRosterService({ supabase })
    const data = await service.listRosterMembers({
      employer: actorResult.data.employer,
      status: parsed.data.status,
      complianceStatus: parsed.data.compliance_status,
      department: parsed.data.department,
      search: parsed.data.search,
      limit: parsed.data.limit,
      offset: parsed.data.offset,
    })

    return NextResponse.json({ data })
  } catch (error) {
    return routeErrorToResponse(error)
  }
}
