import { NextRequest, NextResponse } from "next/server"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { CREATOR_PUBLIC_INFRASTRUCTURE_DISCLAIMER } from "@/lib/music/creator-public-infrastructure/public-infrastructure-disclaimer"
import { resolveCreatorPublicInfrastructureFlags } from "@/lib/music/creator-public-infrastructure/creator-public-infrastructure-flags"
import { authorizePublicApiAccess } from "@/lib/music/creator-public-infrastructure/public-api-access"

export const dynamic = "force-dynamic"

/** Funding, regulator, research, universal/collective/tokenized surfaces — always blocked in shell. */
export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveCreatorPublicInfrastructureFlags(supabase, user.id)

  const publicApi = authorizePublicApiAccess({
    clientActive: false,
    purposeApproved: false,
    requestedScopeAllowed: false,
    rateLimitRemaining: 0,
    abuseHold: true,
  })

  return NextResponse.json({
    data: {
      funding: { available: false, gated: !flags.creator_public_infrastructure_funding_enabled },
      regulator_gateway: { available: false, gated: !flags.creator_public_infrastructure_regulator_gateway_enabled },
      research: { available: false, gated: !flags.creator_public_infrastructure_research_enabled },
      cross_border: { available: false, gated: !flags.creator_public_infrastructure_cross_border_enabled },
      public_api: { available: false, access: publicApi },
      universal_identifier: { available: false, hard_disabled: true },
      global_mandate: { available: false, hard_disabled: true },
      collective_action: { available: false, hard_disabled: true },
      tokenized_identity: { available: false, hard_disabled: true },
    },
    disclaimer: CREATOR_PUBLIC_INFRASTRUCTURE_DISCLAIMER,
    note: "Hard-disabled and counsel-gated powers cannot be exercised from this shell.",
  })
}

export async function POST(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  return jsonError({
    status: 403,
    code: "hard_gated",
    message: "Funding, regulator gateway, universal identifier, global mandate, collective action, and tokenized identity remain blocked.",
    retryable: false,
  })
}
