import { NextResponse, type NextRequest } from "next/server"

import { readJsonBody, resolveHiringActorFromRequest, routeErrorToResponse } from "@/lib/api/hiring-route-helpers"
import { updateRosterStatusSchema } from "@/lib/hiring/roster-schema"
import { HiringRosterService } from "@/lib/services/hiring-roster.service"
import { createHiringServiceClient } from "@/lib/supabase/hiring-service-client"

interface RouteContext {
  params: Promise<{ memberId: string }> | { memberId: string }
}

async function getMemberId(context: RouteContext): Promise<string> {
  const params = await context.params
  return params.memberId
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const supabase = createHiringServiceClient()
    const actorResult = await resolveHiringActorFromRequest({ request, supabase, requirePermission: true })
    if (!actorResult.ok) {
      return NextResponse.json({ error: actorResult.error.message, details: actorResult.error.details }, { status: 403 })
    }

    const memberId = await getMemberId(context)
    const service = new HiringRosterService({ supabase })
    const data = await service.getRosterMember({ employer: actorResult.data.employer, memberId })

    if (!data) return NextResponse.json({ error: "Roster member was not found." }, { status: 404 })

    return NextResponse.json({ data })
  } catch (error) {
    return routeErrorToResponse(error)
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const supabase = createHiringServiceClient()
    const bodyResult = await readJsonBody({ request })
    if (!bodyResult.ok) {
      return NextResponse.json({ error: bodyResult.error.message, details: bodyResult.error.details }, { status: 400 })
    }

    const parsed = updateRosterStatusSchema.safeParse(bodyResult.data)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid roster status payload", details: parsed.error.flatten() }, { status: 400 })
    }

    const actorResult = await resolveHiringActorFromRequest({ request, supabase, body: bodyResult.data, requirePermission: true })
    if (!actorResult.ok) {
      return NextResponse.json({ error: actorResult.error.message, details: actorResult.error.details }, { status: 403 })
    }

    const memberId = await getMemberId(context)
    const service = new HiringRosterService({ supabase })
    const data = await service.updateRosterMemberStatus({
      employer: actorResult.data.employer,
      memberId,
      actorUserId: actorResult.data.userId,
      status: parsed.data.status,
      reason: parsed.data.reason,
    })

    return NextResponse.json({ data })
  } catch (error) {
    return routeErrorToResponse(error)
  }
}
