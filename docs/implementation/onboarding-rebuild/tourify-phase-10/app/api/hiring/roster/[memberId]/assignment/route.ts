import { NextResponse, type NextRequest } from "next/server"

import { readJsonBody, resolveHiringActorFromRequest, routeErrorToResponse } from "@/lib/api/hiring-route-helpers"
import { assignShiftZoneSchema } from "@/lib/hiring/roster-schema"
import { HiringRosterService } from "@/lib/services/hiring-roster.service"
import { createHiringServiceClient } from "@/lib/supabase/hiring-service-client"

interface RouteContext {
  params: Promise<{ memberId: string }> | { memberId: string }
}

async function getMemberId(context: RouteContext): Promise<string> {
  const params = await context.params
  return params.memberId
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const supabase = createHiringServiceClient()
    const bodyResult = await readJsonBody({ request })
    if (!bodyResult.ok) {
      return NextResponse.json({ error: bodyResult.error.message, details: bodyResult.error.details }, { status: 400 })
    }

    const parsed = assignShiftZoneSchema.safeParse(bodyResult.data)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid assignment payload", details: parsed.error.flatten() }, { status: 400 })
    }

    const actorResult = await resolveHiringActorFromRequest({ request, supabase, body: bodyResult.data, requirePermission: true })
    if (!actorResult.ok) {
      return NextResponse.json({ error: actorResult.error.message, details: actorResult.error.details }, { status: 403 })
    }

    const memberId = await getMemberId(context)
    const service = new HiringRosterService({ supabase })
    const data = await service.assignShiftZone({
      employer: actorResult.data.employer,
      memberId,
      actorUserId: actorResult.data.userId,
      eventId: parsed.data.event_id,
      shiftId: parsed.data.shift_id,
      zone: parsed.data.zone,
      assignedManagerId: parsed.data.assigned_manager_id,
      notes: parsed.data.notes,
    })

    return NextResponse.json({ data })
  } catch (error) {
    return routeErrorToResponse(error)
  }
}
