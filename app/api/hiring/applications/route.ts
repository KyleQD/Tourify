import { type NextRequest } from "next/server"

import { bulkApplicationDecisionApiSchema } from "@/lib/api/hiring-api-schemas"
import { getListFiltersFromRequest, hiringResultToResponse, readJsonBody, resolveHiringActorFromRequest, routeErrorToResponse } from "@/lib/api/hiring-route-helpers"
import { presentApplicationReviewItem } from "@/lib/hiring/api-presenters"
import { approveStaffApplication } from "@/lib/services/hiring-application-approval.service"
import { HiringOnboardingService } from "@/lib/services/hiring-onboarding.service"
import { createHiringServiceClient } from "@/lib/supabase/hiring-service-client"
import { fail, ok } from "@/types/hiring-service"

export async function GET(request: NextRequest) {
  try {
    const supabase = createHiringServiceClient()
    const actorResult = await resolveHiringActorFromRequest({ request, supabase })
    if (!actorResult.ok) return hiringResultToResponse(actorResult)

    const result = await HiringOnboardingService.listApplications({
      supabase,
      actor: actorResult.data,
      filters: getListFiltersFromRequest(request),
    })

    if (!result.ok) return hiringResultToResponse(result)

    return hiringResultToResponse(ok(result.data.map((row) => presentApplicationReviewItem(row))))
  } catch (error) {
    return routeErrorToResponse(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createHiringServiceClient()
    const bodyResult = await readJsonBody({ request })
    if (!bodyResult.ok) return hiringResultToResponse(bodyResult)

    const parsed = bulkApplicationDecisionApiSchema.safeParse(bodyResult.data)
    if (!parsed.success) {
      return hiringResultToResponse(
        fail({ code: "VALIDATION_ERROR", message: "Bulk application action payload is invalid.", details: parsed.error.flatten() })
      )
    }

    const actorResult = await resolveHiringActorFromRequest({ request, supabase, body: bodyResult.data })
    if (!actorResult.ok) return hiringResultToResponse(actorResult)

    const results = []
    for (const applicationId of parsed.data.application_ids) {
      if (parsed.data.action === "approve") {
        results.push(
          await approveStaffApplication({
            supabase,
            actorUserId: actorResult.data.userId,
            applicationId,
            options: {
              note: parsed.data.note,
              feedback: parsed.data.note,
              onboardingTemplateId: parsed.data.onboarding_template_id ?? null,
            },
          })
        )
      }

      if (parsed.data.action === "reject") {
        results.push(await HiringOnboardingService.rejectApplication({ supabase, actor: actorResult.data, applicationId, reason: parsed.data.reason }))
      }

      if (parsed.data.action === "waitlist") {
        results.push(await HiringOnboardingService.waitlistApplication({ supabase, actor: actorResult.data, applicationId, note: parsed.data.note }))
      }

      if (parsed.data.action === "shortlist") {
        results.push(await HiringOnboardingService.shortlistApplication({ supabase, actor: actorResult.data, applicationId }))
      }

      if (parsed.data.action === "mark_reviewed") {
        results.push(await HiringOnboardingService.markApplicationReviewed({ supabase, actor: actorResult.data, applicationId }))
      }
    }

    return hiringResultToResponse(ok({ action: parsed.data.action, results }))
  } catch (error) {
    return routeErrorToResponse(error)
  }
}
