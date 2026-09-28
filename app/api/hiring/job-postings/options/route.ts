import { type NextRequest } from "next/server"

import {
  hiringResultToResponse,
  resolveHiringActorFromRequest,
  routeErrorToResponse,
} from "@/lib/api/hiring-route-helpers"
import { resolveSchedulingOrgId } from "@/lib/hiring/resolve-scheduling-org-id"
import { listTemplatesForEmployer } from "@/lib/services/hiring-onboarding-templates.service"
import { createHiringServiceClient } from "@/lib/supabase/hiring-service-client"
import { fail, ok } from "@/types/hiring-service"

export async function GET(request: NextRequest) {
  try {
    const supabase = createHiringServiceClient()
    const actorResult = await resolveHiringActorFromRequest({ request, supabase })
    if (!actorResult.ok) return hiringResultToResponse(actorResult)

    const actor = actorResult.data
    const orgId = await resolveSchedulingOrgId({ supabase, employer: actor.employer })
    const templatesResult = await listTemplatesForEmployer({ supabase, employer: actor.employer })
    if (templatesResult.error) {
      return hiringResultToResponse(
        fail({ code: "DATABASE_ERROR", message: "Unable to load onboarding packets.", details: templatesResult.error }),
      )
    }

    const [eventsResult, toursResult] = orgId
      ? await Promise.all([
          supabase
            .from("events_v2")
            .select("id,title,start_at,end_at,timezone,venue_id,status")
            .eq("org_id", orgId)
            .neq("status", "archived")
            .order("start_at", { ascending: true, nullsFirst: false }),
          supabase
            .from("tours")
            .select("id,name,start_date,end_date,status")
            .eq("org_id", orgId)
            .or("status.is.null,status.neq.archived")
            .order("start_date", { ascending: true, nullsFirst: false }),
        ])
      : [{ data: [], error: null }, { data: [], error: null }]

    if (eventsResult.error || toursResult.error) {
      return hiringResultToResponse(
        fail({
          code: "DATABASE_ERROR",
          message: "Unable to load event and tour options.",
          details: eventsResult.error ?? toursResult.error,
        }),
      )
    }

    const templates = templatesResult.data ?? []
    const defaultTemplate = templates.find((template) => template.is_default === true) ?? templates[0] ?? null

    return hiringResultToResponse(
      ok({
        organizationSeatAvailable: Boolean(orgId && actor.employer.entityType === "organization"),
        events: eventsResult.data ?? [],
        tours: toursResult.data ?? [],
        onboardingTemplates: templates,
        defaultOnboardingTemplateId: defaultTemplate?.id ?? null,
      }),
    )
  } catch (error) {
    return routeErrorToResponse(error)
  }
}
