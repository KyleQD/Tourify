import { type NextRequest } from "next/server"

import {
  hiringResultToResponse,
  resolveHiringActorFromRequest,
  routeErrorToResponse,
} from "@/lib/api/hiring-route-helpers"
import { assertCanViewHiringPii } from "@/lib/auth/hiring-permissions"
import { createHiringServiceClient } from "@/lib/supabase/hiring-service-client"
import { StaffOnboardingSensitiveVaultService } from "@/lib/services/staff-onboarding-sensitive-vault.service"
import { fail, ok } from "@/types/hiring-service"

interface RouteContext {
  params: Promise<{ candidateId: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { candidateId } = await context.params
    const supabase = createHiringServiceClient()
    const actorResult = await resolveHiringActorFromRequest({ request, supabase })
    if (!actorResult.ok) return hiringResultToResponse(actorResult)

    const actor = actorResult.data
    const piiGate = await assertCanViewHiringPii({
      supabase,
      userId: actor.userId,
      employer: actor.employer,
    })
    if (!piiGate.ok) return hiringResultToResponse(piiGate)

    const { data: candidate, error: candidateError } = await supabase
      .from("staff_onboarding_candidates")
      .select("id, employer_entity_type, employer_entity_id, job_application_id")
      .eq("id", candidateId)
      .maybeSingle()

    if (candidateError) {
      return hiringResultToResponse(
        fail({ code: "DATABASE_ERROR", message: "Unable to load candidate.", details: candidateError })
      )
    }

    if (!candidate) {
      return hiringResultToResponse(fail({ code: "NOT_FOUND", message: "Candidate was not found." }))
    }

    if (
      candidate.employer_entity_type !== actor.employer.entityType ||
      candidate.employer_entity_id !== actor.employer.entityId
    ) {
      return hiringResultToResponse(
        fail({ code: "FORBIDDEN", message: "Candidate does not belong to this employer." })
      )
    }

    const reveal = await StaffOnboardingSensitiveVaultService.reveal({
      supabase,
      candidateId,
      employer: actor.employer,
    })

    if (!reveal.ok) {
      return hiringResultToResponse(
        fail({
          code: reveal.notFound ? "NOT_FOUND" : "DATABASE_ERROR",
          message: reveal.error,
        })
      )
    }

    const applicationId =
      typeof candidate.job_application_id === "string" ? candidate.job_application_id : null

    if (applicationId) {
      await supabase.from("hiring_audit_events").insert({
        employer_entity_type: actor.employer.entityType,
        employer_entity_id: actor.employer.entityId,
        application_id: applicationId,
        venue_id: actor.employer.entityType === "venue" ? actor.employer.entityId : null,
        actor_user_id: actor.userId,
        action: "pii_revealed",
        from_status: "secured",
        to_status: "revealed",
        title: "Sensitive onboarding data revealed",
        content: `Admin revealed sensitive onboarding fields for candidate ${candidateId}`,
        metadata: {
          entity_table: "staff_onboarding_sensitive_vault",
          entity_id: candidateId,
          candidateId,
          fieldCount: Object.keys(reveal.data.fields).length,
        },
        created_at: new Date().toISOString(),
      })
    }

    return hiringResultToResponse(
      ok({
        candidateId,
        fields: reveal.data.fields,
        summaries: reveal.data.summaries,
        updatedAt: reveal.data.updatedAt,
      })
    )
  } catch (error) {
    return routeErrorToResponse(error)
  }
}
