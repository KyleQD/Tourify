import { NextRequest, NextResponse } from "next/server"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { CREATOR_COOPERATIVE_DISCLAIMER } from "@/lib/music/creator-cooperative/cooperative-disclaimer"
import { resolveCreatorCooperativeFlags } from "@/lib/music/creator-cooperative/creator-cooperative-flags"
import { collectiveEntityMayActivate } from "@/lib/music/creator-cooperative/collective-entity-activation"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveCreatorCooperativeFlags(supabase, user.id)
  if (!flags.collective_entity_readiness_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Collective entity readiness is not available.", retryable: false })

  const { data, error } = await supabase
    .from("creator_collective_entity_readiness")
    .select("id, entity_id, proposed_role, jurisdiction, state, production_authority, created_at")
    .eq("production_authority", false)
    .order("created_at", { ascending: false })
    .limit(50)

  if (error)
    return jsonError({ status: 500, code: "collective_query_failed", message: "Unable to load collective readiness.", retryable: true })

  const mayActivate = collectiveEntityMayActivate({
    entityFormed: false,
    governingDocumentsApproved: false,
    counselOpinionApproved: false,
    competitionReviewApproved: false,
    laborReviewApproved: false,
    mandatesActive: false,
    regulatorRequirementsSatisfied: false,
    separateProductionApproval: false,
  })

  return NextResponse.json({
    data: data || [],
    activation: {
      mayActivate,
      representationFlag: flags.collective_representation_enabled,
      note: "Feature flags are never legal authority for collective representation.",
    },
    disclaimer: CREATOR_COOPERATIVE_DISCLAIMER,
    enabled: true,
  })
}

export async function POST(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  return jsonError({
    status: 403,
    code: "collective_activation_blocked",
    message: "Collective representation/licensing/bargaining remain counsel/entity gated.",
    retryable: false,
  })
}
