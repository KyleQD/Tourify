import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { CREATOR_COOPERATIVE_DISCLAIMER } from "@/lib/music/creator-cooperative/cooperative-disclaimer"
import { resolveCreatorCooperativeFlags } from "@/lib/music/creator-cooperative/creator-cooperative-flags"
import { resolveResearchAccess } from "@/lib/music/creator-cooperative/research-access-policy"
import { canTransitionResearch } from "@/lib/music/creator-cooperative/research-project-state-machine"

export const dynamic = "force-dynamic"

const applySchema = z.object({
  applicant_entity_name: z.string().min(1),
  purpose: z.string().min(1),
  classification: z.string().default("internal_aggregate"),
  protocol_version: z.string().default("1.0.0"),
})

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveCreatorCooperativeFlags(supabase, user.id)
  if (!flags.research_exchange_private_beta_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Research exchange is not available.", retryable: false })

  const { data, error } = await supabase
    .from("creator_research_projects")
    .select("id, public_id, purpose, classification, status, ethics_status, privacy_status, competition_status, security_status, created_at")
    .eq("applicant_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50)

  if (error)
    return jsonError({ status: 500, code: "research_query_failed", message: "Unable to load research projects.", retryable: true })

  return NextResponse.json({
    data: data || [],
    disclaimer: CREATOR_COOPERATIVE_DISCLAIMER,
    note: "Research access is default-deny until all ethics/privacy/competition/security gates pass.",
    enabled: true,
  })
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveCreatorCooperativeFlags(supabase, user.id)
    if (!flags.research_exchange_private_beta_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Research exchange is not available.", retryable: false })

    if (flags.external_research_licensing_enabled === false) {
      // expected: licensing stays off; applications may still be submitted as readiness stubs
    }

    const payload = applySchema.parse(await request.json())
    if (!canTransitionResearch({ from: "concept", to: "application" }))
      return jsonError({ status: 400, code: "invalid_transition", message: "Invalid research project transition.", retryable: false })

    const { data, error } = await supabase
      .from("creator_research_projects")
      .insert({
        applicant_user_id: user.id,
        applicant_entity_name: payload.applicant_entity_name,
        purpose: payload.purpose,
        classification: payload.classification,
        protocol_version: payload.protocol_version,
        status: "submitted",

        ethics_status: "pending",
        privacy_status: "pending",
        competition_status: "pending",
        security_status: "pending",
      })
      .select("id, public_id, status, ethics_status")
      .single()

    if (error)
      return jsonError({ status: 500, code: "research_apply_failed", message: "Unable to submit research application.", retryable: true })

    const access = resolveResearchAccess({
      projectApproved: false,
      licenceActive: false,
      ethicsApproved: false,
      privacyApproved: false,
      competitionApproved: false,
      securityApproved: false,
      purposeMatches: true,
      cohortEligible: false,
      outputOnly: true,
    })

    return NextResponse.json({
      data,
      accessDecision: access,
      disclaimer: CREATOR_COOPERATIVE_DISCLAIMER,
      note: flags.external_research_licensing_enabled
        ? "External licensing flag is on but still requires counsel approvals."
        : "External research licensing remains gated off.",
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "validation_error", message: "Invalid research payload.", retryable: false, issues: error.issues })
    return jsonError({ status: 500, code: "research_apply_failed", message: "Unable to submit research application.", retryable: true })
  }
}
