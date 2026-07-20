import { NextRequest, NextResponse } from "next/server"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { CREATOR_INTEROP_INSTITUTION_DISCLAIMER } from "@/lib/music/creator-interoperability-institution/institution-disclaimer"
import { resolveCreatorInteropInstitutionFlags } from "@/lib/music/creator-interoperability-institution/creator-interop-institution-flags"
import { evaluateInstitutionActivation } from "@/lib/music/creator-interoperability-institution/institution-activation-gate"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveCreatorInteropInstitutionFlags(supabase, user.id)
  if (!flags.creator_interop_institution_readiness_enabled && !flags.creator_interop_institution_legal_character_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Institution readiness packages are not available.", retryable: false })

  const { data, error } = await supabase
    .from("future_phase16_approval_packages")
    .select("id, package_key, status, title, legal_character, jurisdiction, dual_control, legal_basis_effective, public_notice_complete, independent_review_complete, sunset_at, policy_version, schema_version, executed_at, created_at")
    .order("created_at", { ascending: false })
    .limit(50)

  if (error)
    return jsonError({ status: 500, code: "packages_query_failed", message: "Unable to load readiness packages.", retryable: true })

  return NextResponse.json({
    data: data || [],
    activation: evaluateInstitutionActivation({
      legalBasisEffective: false,
      participantAuthorityVerified: false,
      organsOperational: false,
      hostReady: false,
      fundingApproved: false,
      oversightOperational: false,
      staffRemedyAvailable: false,
      privacyApproved: false,
      securityApproved: false,
      accessibilityApproved: false,
      competitionApproved: false,
      independentImplementations: 0,
      independentOperators: 0,
      tourifyUnavailableTestPassed: false,
      unresolvedCriticalBlockers: 1,
    }),
    disclaimer: CREATOR_INTEROP_INSTITUTION_DISCLAIMER,
    enabled: true,
  })
}

export async function POST(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  return jsonError({
    status: 403,
    code: "activation_execution_blocked",
    message: "Institution activation remains blocked until legal basis, dual control, reviews, and sunset package complete.",
    retryable: false,
  })
}
