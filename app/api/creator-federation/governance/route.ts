import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { CREATOR_FEDERATION_DISCLAIMER } from "@/lib/music/creator-federation/federation-disclaimer"
import { resolveCreatorFederationFlags } from "@/lib/music/creator-federation/creator-federation-flags"
import { evaluateFederationDecision } from "@/lib/music/creator-federation/federation-decision-state-machine"

export const dynamic = "force-dynamic"

const createSchema = z.object({
  federation_entity_id: z.string().uuid(),
  title: z.string().min(1),
  decision_class: z.string().default("administrative"),
  body: z.record(z.unknown()).default({}),
})

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveCreatorFederationFlags(supabase, user.id)
  if (!flags.creator_federation_governance_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Federation governance is not available.", retryable: false })

  const { data, error } = await supabase
    .from("creator_federation_proposals")
    .select("id, federation_entity_id, decision_class, title, status, created_at")
    .order("created_at", { ascending: false })
    .limit(50)

  if (error)
    return jsonError({ status: 500, code: "governance_query_failed", message: "Unable to load proposals.", retryable: true })

  return NextResponse.json({ data: data || [], disclaimer: CREATOR_FEDERATION_DISCLAIMER, enabled: true })
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveCreatorFederationFlags(supabase, user.id)
    if (!flags.creator_federation_governance_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Federation governance is not available.", retryable: false })

    const payload = createSchema.parse(await request.json())
    const decisionPreview = evaluateFederationDecision({
      yes: 0,
      no: 0,
      abstain: 0,
      quorum: 2,
      threshold: 0.5,
      vetoed: false,
      requiredOrganizations: [],
      ratifiedOrganizations: [],
    })

    const { data, error } = await supabase
      .from("creator_federation_proposals")
      .insert({
        federation_entity_id: payload.federation_entity_id,
        title: payload.title,
        decision_class: payload.decision_class,
        body: payload.body,
        status: "open",
        created_by: user.id,
      })
      .select("id, status, decision_class, title")
      .single()

    if (error)
      return jsonError({ status: 500, code: "proposal_create_failed", message: "Unable to create proposal.", retryable: true })

    return NextResponse.json({
      data,
      decisionPreview,
      disclaimer: CREATOR_FEDERATION_DISCLAIMER,
      note: flags.creator_federation_voting_enabled
        ? "Voting flag on but ballots still require active membership and local ratification."
        : "Voting remains gated; proposals are readiness records only.",
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "validation_error", message: "Invalid governance payload.", retryable: false, issues: error.issues })
    return jsonError({ status: 500, code: "proposal_create_failed", message: "Unable to create proposal.", retryable: true })
  }
}
