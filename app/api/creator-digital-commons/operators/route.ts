import { NextRequest, NextResponse } from "next/server"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { CREATOR_DIGITAL_COMMONS_DISCLAIMER } from "@/lib/music/creator-digital-commons/commons-disclaimer"
import { resolveCreatorDigitalCommonsFlags } from "@/lib/music/creator-digital-commons/creator-digital-commons-flags"
import { evaluateOperatorAccreditation } from "@/lib/music/creator-digital-commons/operator-accreditation-policy"
import { evaluateContinuity } from "@/lib/music/creator-digital-commons/service-continuity-policy"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveCreatorDigitalCommonsFlags(supabase, user.id)
  if (!flags.creator_digital_commons_operator_accreditation_enabled && !flags.creator_digital_commons_conformance_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Operator accreditation is not available.", retryable: false })

  const [{ data: operators }, { data: conformance }] = await Promise.all([
    supabase
      .from("creator_commons_operators")
      .select("id, display_name, status, service_scopes, jurisdiction_profiles, conformance_expires_at, policy_version")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("creator_commons_conformance_results")
      .select("id, operator_id, implementation_id, profile_id, profile_version, status, tested_at, expires_at")
      .order("tested_at", { ascending: false })
      .limit(50),
  ])

  const accreditation = evaluateOperatorAccreditation({
    legalEntityVerified: false,
    scopeDefined: false,
    securityReviewPassed: false,
    accessibilityReviewPassed: false,
    jurisdictionApproved: false,
    exportAndExitTested: false,
    conformancePassed: false,
    conflictsDisclosed: false,
    policyVersion: "1.0.0",
  })

  const continuity = evaluateContinuity({
    tourifyUnavailable: false,
    independentBuildSucceeded: false,
    independentOperatorAvailable: false,
    currentAssetEscrowVerified: false,
    exportRestoreSucceeded: false,
    keyAndDomainRecoverySucceeded: false,
    participantRecordsPreserved: false,
    rightsSourcesUnchanged: true,
    policyVersion: "1.0.0",
  })

  return NextResponse.json({
    data: { operators: operators || [], conformance: conformance || [], accreditation, continuity },
    disclaimer: CREATOR_DIGITAL_COMMONS_DISCLAIMER,
    note: "Sandbox operator/conformance records only — production requires two independent operators.",
    enabled: true,
  })
}
