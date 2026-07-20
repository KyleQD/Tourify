import { NextRequest, NextResponse } from "next/server"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { RIGHTS_INTELLIGENCE_DISCLAIMER } from "@/lib/music/rights-intelligence/intelligence-disclaimer"
import { resolveMusicRightsIntelligenceFlags } from "@/lib/music/rights-intelligence/music-rights-intelligence-flags"

export const dynamic = "force-dynamic"

/** S9 readiness stubs — always blocked without separate counsel/entity approvals. */
export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveMusicRightsIntelligenceFlags(supabase, user.id)

  return NextResponse.json({
    data: {
      collective_licensing: {
        available: false,
        gated: !flags.music_rights_intelligence_collective_licensing_enabled,
        status: "readiness_stub_only",
      },
      platform_negotiation: {
        available: false,
        gated: !flags.music_rights_intelligence_external_negotiation_enabled,
        status: "readiness_stub_only",
      },
      ai_training_collective: {
        available: false,
        status: "readiness_stub_only",
      },
      representation: {
        available: false,
        gated: !flags.music_rights_intelligence_representation_enabled,
        status: "requires_separate_entity_and_mandate",
      },
    },
    disclaimer: RIGHTS_INTELLIGENCE_DISCLAIMER,
    note: "Feature flags are never legal authority. External collective action remains blocked.",
  })
}

export async function POST(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  return jsonError({
    status: 403,
    code: "collective_action_blocked",
    message: "Collective licensing, representation, and external negotiation remain counsel/entity gated.",
    retryable: false,
  })
}
