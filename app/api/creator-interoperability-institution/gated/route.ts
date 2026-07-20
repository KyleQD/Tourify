import { NextRequest, NextResponse } from "next/server"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { CREATOR_INTEROP_INSTITUTION_DISCLAIMER } from "@/lib/music/creator-interoperability-institution/institution-disclaimer"
import { resolveCreatorInteropInstitutionFlags } from "@/lib/music/creator-interoperability-institution/creator-interop-institution-flags"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  await resolveCreatorInteropInstitutionFlags(supabase, user.id)

  return NextResponse.json({
    data: {
      formal_depositary: { available: false, hard_disabled: true },
      article102_registration: { available: false, hard_disabled: true },
      un_relationship: { available: false, hard_disabled: true },
      specialized_agency_claim: { available: false, hard_disabled: true },
      privileges: { available: false, hard_disabled: true },
      assessed_contributions: { available: false, hard_disabled: true },
      collective_action: { available: false, hard_disabled: true },
      global_representation: { available: false, hard_disabled: true },
      regulatory_power: { available: false, hard_disabled: true },
      production: { available: false, hard_disabled: true },
      phase15_launch: { available: false, note: "Phase 16 cannot launch from Phase 15 flags" },
      phase17_features: { available: false, note: "Phase 17 forbidden under Phase 16 flags" },
    },
    disclaimer: CREATOR_INTEROP_INSTITUTION_DISCLAIMER,
  })
}

export async function POST(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  return jsonError({
    status: 403,
    code: "hard_gated",
    message: "Public-law powers (depositary, Article 102, UN, privileges, regulatory, production) remain blocked.",
    retryable: false,
  })
}
