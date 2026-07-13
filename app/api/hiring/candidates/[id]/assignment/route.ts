import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"

import { readJsonBody, resolveHiringActorFromRequest, routeErrorToResponse } from "@/lib/api/hiring-route-helpers"
import { assignCandidate } from "@/lib/services/hiring-candidate-assignment.service"
import { createHiringServiceClient } from "@/lib/supabase/hiring-service-client"

interface RouteContext {
  params: Promise<{ id: string }>
}

const assignmentSchema = z.object({
  assigned_manager_id: z.string().uuid().nullish(),
  assigned_manager_name: z.string().max(200).nullish(),
  intended_event_id: z.string().uuid().nullish(),
  intended_shift_id: z.string().uuid().nullish(),
  role_template_id: z.string().uuid().nullish(),
  position: z.string().max(200).nullish(),
  department: z.string().max(200).nullish(),
  notes: z.string().max(2000).nullish(),
})

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const supabase = createHiringServiceClient()
    const bodyResult = await readJsonBody({ request })
    if (!bodyResult.ok) {
      return NextResponse.json({ error: bodyResult.error.message, details: bodyResult.error.details }, { status: 400 })
    }

    const parsed = assignmentSchema.safeParse(bodyResult.data)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid assignment payload", details: parsed.error.flatten() }, { status: 400 })
    }

    const actorResult = await resolveHiringActorFromRequest({ request, supabase, body: bodyResult.data, requirePermission: true })
    if (!actorResult.ok) {
      return NextResponse.json({ error: actorResult.error.message, details: actorResult.error.details }, { status: 403 })
    }

    const { id } = await context.params
    const result = await assignCandidate({
      supabase,
      actor: actorResult.data,
      candidateId: id,
      assignedManagerId: parsed.data.assigned_manager_id,
      assignedManagerName: parsed.data.assigned_manager_name,
      intendedEventId: parsed.data.intended_event_id,
      intendedShiftId: parsed.data.intended_shift_id,
      roleTemplateId: parsed.data.role_template_id,
      position: parsed.data.position,
      department: parsed.data.department,
      notes: parsed.data.notes,
    })

    if (!result.ok) {
      return NextResponse.json({ error: result.error.message, details: result.error.details }, { status: 400 })
    }

    return NextResponse.json({ data: result.data })
  } catch (error) {
    return routeErrorToResponse(error)
  }
}
