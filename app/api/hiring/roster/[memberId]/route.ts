import { NextResponse, type NextRequest } from "next/server"

import { readJsonBody, resolveHiringActorFromRequest, routeErrorToResponse } from "@/lib/api/hiring-route-helpers"
import { updateRosterMemberSchema } from "@/lib/hiring/roster-schema"
import { HiringRosterService } from "@/lib/services/hiring-roster.service"
import { createHiringServiceClient } from "@/lib/supabase/hiring-service-client"

interface RouteContext {
  params: Promise<{ memberId: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const supabase = createHiringServiceClient()
    const actorResult = await resolveHiringActorFromRequest({ request, supabase, requirePermission: true })
    if (!actorResult.ok) {
      return NextResponse.json({ error: actorResult.error.message, details: actorResult.error.details }, { status: 403 })
    }

    const { memberId } = await context.params
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

    const parsed = updateRosterMemberSchema.safeParse(bodyResult.data)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid roster status payload", details: parsed.error.flatten() }, { status: 400 })
    }

    const actorResult = await resolveHiringActorFromRequest({ request, supabase, body: bodyResult.data, requirePermission: true })
    if (!actorResult.ok) {
      return NextResponse.json({ error: actorResult.error.message, details: actorResult.error.details }, { status: 403 })
    }

    const { memberId } = await context.params
    const service = new HiringRosterService({ supabase })
    const data = await service.updateRosterMember({
      employer: actorResult.data.employer,
      memberId,
      actorUserId: actorResult.data.userId,
      status: parsed.data.status,
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      position: parsed.data.position,
      department: parsed.data.department,
      employmentType: parsed.data.employment_type,
      notes: parsed.data.notes,
      permissions: parsed.data.permissions as any,
      reason: parsed.data.reason,
    })

    return NextResponse.json({ data })
  } catch (error) {
    return routeErrorToResponse(error)
  }
}
