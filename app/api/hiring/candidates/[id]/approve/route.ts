import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"

import { readJsonBody, resolveHiringActorFromRequest, routeErrorToResponse } from "@/lib/api/hiring-route-helpers"
import { HiringOnboardingService } from "@/lib/services/hiring-onboarding.service"
import { createHiringServiceClient } from "@/lib/supabase/hiring-service-client"

interface RouteContext {
  params: Promise<{ id: string }>
}

const reviewSchema = z.object({
  action: z.enum(["approve", "reject", "request_changes"]),
  notes: z.string().max(2000).nullish(),
  review_notes: z.string().max(2000).nullish(),
})

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const supabase = createHiringServiceClient()
    const bodyResult = await readJsonBody({ request })
    if (!bodyResult.ok) {
      return NextResponse.json({ error: bodyResult.error.message, details: bodyResult.error.details }, { status: 400 })
    }

    const parsed = reviewSchema.safeParse(bodyResult.data)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid review payload", details: parsed.error.flatten() }, { status: 400 })
    }

    const actorResult = await resolveHiringActorFromRequest({
      request,
      supabase,
      body: bodyResult.data,
      requirePermission: true,
    })
    if (!actorResult.ok) {
      return NextResponse.json({ error: actorResult.error.message, details: actorResult.error.details }, { status: 403 })
    }

    const { id } = await context.params
    const notes = parsed.data.notes ?? parsed.data.review_notes ?? null

    if (parsed.data.action === "request_changes") {
      const result = await HiringOnboardingService.requestOnboardingChanges({
        supabase,
        actor: actorResult.data,
        candidateId: id,
        notes,
      })
      if (!result.ok) {
        return NextResponse.json({ error: result.error.message, details: result.error.details }, { status: 400 })
      }
      return NextResponse.json({ data: result.data })
    }

    if (parsed.data.action === "reject") {
      const result = await HiringOnboardingService.rejectOnboardingCandidate({
        supabase,
        actor: actorResult.data,
        candidateId: id,
        notes,
      })
      if (!result.ok) {
        return NextResponse.json({ error: result.error.message, details: result.error.details }, { status: 400 })
      }
      return NextResponse.json({ data: result.data })
    }

    const result = await HiringOnboardingService.approveOnboardingCandidate({
      supabase,
      actor: actorResult.data,
      candidateId: id,
      notes,
    })
    if (!result.ok) {
      return NextResponse.json({ error: result.error.message, details: result.error.details }, { status: 400 })
    }

    return NextResponse.json({ data: result.data })
  } catch (error) {
    return routeErrorToResponse(error)
  }
}
