import { NextRequest, NextResponse } from "next/server"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { CREATOR_INTEROP_CONVENTION_DISCLAIMER } from "@/lib/music/creator-interoperability-convention/interop-convention-disclaimer"
import { resolveCreatorInteropConventionFlags } from "@/lib/music/creator-interoperability-convention/creator-interop-convention-flags"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveCreatorInteropConventionFlags(supabase, user.id)

  return NextResponse.json({
    data: {
      limited_production: { available: false, gated: !flags.creator_interop_limited_production_enabled },
      treaty_status: { available: false, hard_disabled: true },
      universal_representation: { available: false, hard_disabled: true },
      state_io_participation: { available: false, hard_disabled: true },
      collective_action: { available: false, hard_disabled: true },
      irreversible_asset_transfer: { available: false, hard_disabled: true },
      emergency_override: { available: false, hard_disabled: true },
      phase13_launch: { available: false, note: "Phase 14 cannot launch from Phase 13 flags" },
    },
    disclaimer: CREATOR_INTEROP_CONVENTION_DISCLAIMER,
  })
}

export async function POST(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  return jsonError({
    status: 403,
    code: "hard_gated",
    message: "Treaty status, universal representation, state/IO participation, collective action, irreversible transfer, and emergency override remain blocked.",
    retryable: false,
  })
}
