import { NextResponse, type NextRequest } from "next/server"

import { readJsonBody, resolveHiringActorFromRequest, routeErrorToResponse } from "@/lib/api/hiring-route-helpers"
import { createRosterMemberSchema, listRosterQuerySchema } from "@/lib/hiring/roster-schema"
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
      return NextResponse.json(
        { error: actorResult.error.message, details: actorResult.error.details },
        { status: actorResult.error.code === "UNAUTHORIZED" ? 401 : 403 }
      )
    }

    const service = new HiringRosterService({ supabase })
    const data = await service.listRosterMembers({
      employer: actorResult.data.employer,
      status: parsed.data.status,
      complianceStatus: parsed.data.compliance_status,
      department: parsed.data.department,
      search: parsed.data.search,
      eventId: parsed.data.event_id,
      tourId: parsed.data.tour_id,
      limit: parsed.data.limit,
      offset: parsed.data.offset,
    })

    return NextResponse.json({ ok: true, data })
  } catch (error) {
    return routeErrorToResponse(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createHiringServiceClient()
    const bodyResult = await readJsonBody({ request })
    if (!bodyResult.ok) {
      return NextResponse.json({ error: bodyResult.error.message, details: bodyResult.error.details }, { status: 400 })
    }

    const parsed = createRosterMemberSchema.safeParse(bodyResult.data)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid roster member payload", details: parsed.error.flatten() }, { status: 400 })
    }

    const actorResult = await resolveHiringActorFromRequest({ request, supabase, body: bodyResult.data, requirePermission: true })
    if (!actorResult.ok) {
      return NextResponse.json(
        { error: actorResult.error.message, details: actorResult.error.details },
        { status: actorResult.error.code === "UNAUTHORIZED" ? 401 : 403 }
      )
    }

    const service = new HiringRosterService({ supabase })
    const data = await service.createRosterMember({
      employer: actorResult.data.employer,
      actorUserId: actorResult.data.userId,
      source: parsed.data.source,
      userId: parsed.data.user_id ?? null,
      name: parsed.data.name ?? null,
      email: parsed.data.email ?? null,
      phone: parsed.data.phone ?? null,
      position: parsed.data.position ?? null,
      department: parsed.data.department ?? null,
      employmentType: parsed.data.employment_type ?? null,
      notes: parsed.data.notes ?? null,
      onboardingTemplateId: parsed.data.onboarding_template_id ?? null,
    })

    return NextResponse.json({ ok: true, data }, { status: 201 })
  } catch (error) {
    return routeErrorToResponse(error)
  }
}
