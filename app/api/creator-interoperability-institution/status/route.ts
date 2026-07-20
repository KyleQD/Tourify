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
  if (!flags.creator_interop_institution_readiness_enabled && !flags.creator_interop_institution_public_registry_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Interop institution status is not available.", retryable: false })

  const [{ data: institutions }, { data: packages }] = await Promise.all([
    supabase
      .from("creator_interop_institution_institutions")
      .select("id, public_name, legal_character, lifecycle_state, claims_treaty_status, claims_io_status, claims_un_relationship, claims_specialized_agency, production_authority, created_at")
      .order("created_at", { ascending: false })
      .limit(25),
    supabase
      .from("future_phase16_approval_packages")
      .select("id, package_key, status, legal_character, title, sunset_at, created_at")
      .order("created_at", { ascending: false })
      .limit(25),
  ])

  const activation = evaluateInstitutionActivation({
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
  })

  return NextResponse.json({
    data: {
      institutions: institutions || [],
      approvalPackages: packages || [],
      legalClaims: {
        internationalOrganization: false,
        treaty: false,
        privilege: false,
        immunity: false,
        formalDepositary: false,
        article102Registration: false,
        unRelationship: false,
        specializedAgency: false,
        regulatoryPower: false,
        globalRepresentation: false,
      },
      activation,
    },
    disclaimer: CREATOR_INTEROP_INSTITUTION_DISCLAIMER,
    note: "No treaty system, international organization, privilege, formal depositary, or UN relationship exists.",
    enabled: true,
  })
}
