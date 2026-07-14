import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"

import { readJsonBody, resolveHiringActorFromRequest, routeErrorToResponse } from "@/lib/api/hiring-route-helpers"
import { HiringOnboardingService } from "@/lib/services/hiring-onboarding.service"
import { createHiringServiceClient } from "@/lib/supabase/hiring-service-client"

interface RouteContext {
  params: Promise<{ id: string }>
}

const assignOnboardingSchema = z.object({
  template_id: z.string().uuid().nullish(),
  send_notification: z.boolean().optional(),
  is_resend: z.boolean().optional(),
})

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const supabase = createHiringServiceClient()
    const bodyResult = await readJsonBody({ request })
    if (!bodyResult.ok) {
      return NextResponse.json({ error: bodyResult.error.message, details: bodyResult.error.details }, { status: 400 })
    }

    const parsed = assignOnboardingSchema.safeParse(bodyResult.data)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid onboarding payload", details: parsed.error.flatten() }, { status: 400 })
    }

    const actorResult = await resolveHiringActorFromRequest({ request, supabase, body: bodyResult.data, requirePermission: true })
    if (!actorResult.ok) {
      return NextResponse.json({ error: actorResult.error.message, details: actorResult.error.details }, { status: 403 })
    }

    const { id } = await context.params
    const result = await HiringOnboardingService.assignOnboardingTemplateToCandidate({
      supabase,
      actor: actorResult.data,
      candidateId: id,
      templateId: parsed.data.template_id ?? null,
      sendNotification: parsed.data.send_notification ?? true,
      isResend: parsed.data.is_resend ?? false,
    })

    if (!result.ok) {
      return NextResponse.json({ error: result.error.message, details: result.error.details }, { status: 400 })
    }

    return NextResponse.json({ data: result.data })
  } catch (error) {
    return routeErrorToResponse(error)
  }
}
