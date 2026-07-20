import { NextRequest, NextResponse } from "next/server"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { CREATOR_INTEROP_ORG_DISCLAIMER } from "@/lib/music/creator-interoperability-organization/organization-disclaimer"
import { resolveCreatorInteropOrgFlags } from "@/lib/music/creator-interoperability-organization/creator-interop-org-flags"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  await resolveCreatorInteropOrgFlags(supabase, user.id)

  return NextResponse.json({
    data: {
      privileges: { available: false, hard_disabled: true },
      member_state_status: { available: false, hard_disabled: true },
      io_membership: { available: false, hard_disabled: true },
      treaty_status: { available: false, hard_disabled: true },
      depositary: { available: false, hard_disabled: true },
      un_relationship: { available: false, hard_disabled: true },
      specialized_agency_claim: { available: false, hard_disabled: true },
      assessed_contributions: { available: false, hard_disabled: true },
      collective_action: { available: false, hard_disabled: true },
      regulatory_power: { available: false, hard_disabled: true },
      diplomatic_status: { available: false, hard_disabled: true },
      production: { available: false, hard_disabled: true },
      phase14_launch: { available: false, note: "Phase 15 cannot launch from Phase 14 flags" },
      phase16_features: { available: false, note: "Phase 16 forbidden under Phase 15 flags" },
    },
    disclaimer: CREATOR_INTEROP_ORG_DISCLAIMER,
  })
}

export async function POST(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  return jsonError({
    status: 403,
    code: "hard_gated",
    message: "Public-law powers (treaty, privileges, UN, diplomatic, regulatory, production) remain blocked.",
    retryable: false,
  })
}
