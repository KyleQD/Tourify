import { NextRequest, NextResponse } from "next/server"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { CREATOR_FEDERATION_DISCLAIMER } from "@/lib/music/creator-federation/federation-disclaimer"
import { resolveCreatorFederationFlags } from "@/lib/music/creator-federation/creator-federation-flags"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveCreatorFederationFlags(supabase, user.id)

  return NextResponse.json({
    data: {
      representation: { available: false, gated: !flags.creator_federation_representation_network_enabled },
      collective_licensing: { available: false, gated: !flags.creator_federation_collective_licensing_enabled },
      collective_bargaining: { available: false, gated: !flags.creator_federation_collective_bargaining_enabled },
      research: { available: false, gated: !flags.creator_federation_research_enabled },
      finance: { available: false, gated: !flags.creator_federation_finance_enabled },
    },
    disclaimer: CREATOR_FEDERATION_DISCLAIMER,
    note: "Feature flags are never legal authority for collective action.",
  })
}

export async function POST(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  return jsonError({
    status: 403,
    code: "collective_action_blocked",
    message: "Representation, collective licensing, and bargaining remain counsel/entity gated.",
    retryable: false,
  })
}
