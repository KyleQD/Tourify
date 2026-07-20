import { NextRequest, NextResponse } from "next/server"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { CREATOR_INTEROP_ORG_DISCLAIMER } from "@/lib/music/creator-interoperability-organization/organization-disclaimer"
import { resolveCreatorInteropOrgFlags } from "@/lib/music/creator-interoperability-organization/creator-interop-org-flags"
import { evaluateOrganizationActivation } from "@/lib/music/creator-interoperability-organization/organization-activation-gate"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveCreatorInteropOrgFlags(supabase, user.id)
  if (!flags.creator_interop_org_readiness_enabled && !flags.creator_interop_org_public_registry_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Interop organization status is not available.", retryable: false })

  const [{ data: organizations }, { data: packages }] = await Promise.all([
    supabase
      .from("creator_interop_org_organizations")
      .select("id, public_name, legal_character, status, claims_treaty_status, claims_io_status, claims_un_relationship, production_authority, created_at")
      .order("created_at", { ascending: false })
      .limit(25),
    supabase
      .from("future_phase15_approval_packages")
      .select("id, package_key, status, legal_character, title, created_at")
      .order("created_at", { ascending: false })
      .limit(25),
  ])

  const activation = evaluateOrganizationActivation({
    phase14EvidenceApproved: false,
    legalFeasibilityApproved: false,
    constitutiveInstrumentEffective: false,
    participantAuthorityVerified: false,
    governanceOperational: false,
    hostAndHeadquartersReady: false,
    fundingAndBudgetApproved: false,
    oversightAndStaffJusticeReady: false,
    privacySecurityAccessibilityApproved: false,
    independentOperationProven: false,
    criticalBlockers: 1,
  })

  return NextResponse.json({
    data: {
      organizations: organizations || [],
      approvalPackages: packages || [],
      legalClaims: {
        internationalOrganization: false,
        treaty: false,
        privilege: false,
        immunity: false,
        memberStateStatus: false,
        unRelationship: false,
        specializedAgency: false,
        diplomaticStatus: false,
      },
      activation,
    },
    disclaimer: CREATOR_INTEROP_ORG_DISCLAIMER,
    note: "No international organization, treaty, privilege, immunity, member-state status, or UN relationship exists.",
    enabled: true,
  })
}
