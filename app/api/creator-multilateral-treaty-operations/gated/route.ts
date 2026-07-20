import { NextRequest, NextResponse } from "next/server"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { CREATOR_TREATY_OPS_DISCLAIMER } from "@/lib/music/creator-multilateral-treaty-operations/treaty-ops-disclaimer"
import { resolveCreatorTreatyOpsFlags } from "@/lib/music/creator-multilateral-treaty-operations/creator-treaty-ops-flags"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  await resolveCreatorTreatyOpsFlags(supabase, user.id)

  return NextResponse.json({
    data: {
      formal_depositary: { available: false, hard_disabled: true },
      article102_tracking: { available: false, hard_disabled: true },
      privileges: { available: false, hard_disabled: true },
      assessed_contributions: { available: false, hard_disabled: true },
      competence_change: { available: false, hard_disabled: true },
      universal_identity: { available: false, hard_disabled: true },
      collective_authority: { available: false, hard_disabled: true },
      external_public_activation: { available: false, hard_disabled: true },
      phase16_launch: { available: false, note: "Phase 17 cannot launch from Phase 16 flags" },
      phase18_features: { available: false, note: "Phase 18 forbidden under Phase 17 flags" },
    },
    disclaimer: CREATOR_TREATY_OPS_DISCLAIMER,
  })
}

export async function POST(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  return jsonError({
    status: 403,
    code: "hard_gated",
    message: "Public-law powers (depositary, Article 102, privileges, competence change, collective authority, external activation) remain blocked.",
    retryable: false,
  })
}
