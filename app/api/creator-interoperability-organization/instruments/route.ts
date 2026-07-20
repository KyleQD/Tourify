import { NextRequest, NextResponse } from "next/server"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { CREATOR_INTEROP_ORG_DISCLAIMER } from "@/lib/music/creator-interoperability-organization/organization-disclaimer"
import { resolveCreatorInteropOrgFlags } from "@/lib/music/creator-interoperability-organization/creator-interop-org-flags"
import { evaluateLegalPersonality } from "@/lib/music/creator-interoperability-organization/legal-personality-gate"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveCreatorInteropOrgFlags(supabase, user.id)
  if (!flags.creator_interop_org_constitutive_drafting_enabled && !flags.creator_interop_org_readiness_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Constitutive instruments are not available.", retryable: false })

  const { data, error } = await supabase
    .from("creator_interop_org_constitutive_instruments")
    .select("id, organization_id, version, status, authentic_languages, content_hash, effective_at, created_at")
    .order("created_at", { ascending: false })
    .limit(50)

  if (error)
    return jsonError({ status: 500, code: "instruments_query_failed", message: "Unable to load instruments.", retryable: true })

  return NextResponse.json({
    data: data || [],
    personalityGate: evaluateLegalPersonality({
      requestedCharacter: "international",
      constitutiveInstrumentEffective: false,
      competentAuthoritiesVerified: false,
      requiredDomesticRecognitionEffective: false,
    }),
    disclaimer: CREATOR_INTEROP_ORG_DISCLAIMER,
    enabled: true,
  })
}

export async function POST(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  return jsonError({
    status: 403,
    code: "instrument_effect_blocked",
    message: "Constitutive instrument entry into force remains blocked until legal feasibility and competent authority packages execute.",
    retryable: false,
  })
}
