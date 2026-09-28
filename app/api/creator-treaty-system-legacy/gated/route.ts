import { NextRequest, NextResponse } from "next/server"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { CREATOR_TREATY_LEGACY_DISCLAIMER } from "@/lib/music/creator-treaty-system-legacy/legacy-disclaimer"
import { resolveCreatorTreatyLegacyFlags } from "@/lib/music/creator-treaty-system-legacy/creator-treaty-legacy-flags"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  await resolveCreatorTreatyLegacyFlags(supabase, user.id)

  return NextResponse.json({
    data: {
      public_activation: { available: false, hard_disabled: true },
      perpetual_authority: { available: false, hard_disabled: true },
      future_person_representation: { available: false, hard_disabled: true },
      privacy_override: { available: false, hard_disabled: true },
      universal_identity: { available: false, hard_disabled: true },
      ownership_adjudication: { available: false, hard_disabled: true },
      local_exit_block: { available: false, hard_disabled: true },
      sensitive_archive_public_dump: { available: false, hard_disabled: true },
      century_scale_launch: { available: false, hard_disabled: true },
      phase20_features: { available: false, hard_disabled: true },
      phase18_launch: { available: false, note: "Phase 19 cannot launch from Phase 18 flags" },
    },
    disclaimer: CREATOR_TREATY_LEGACY_DISCLAIMER,
  })
}

export async function POST(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  return jsonError({
    status: 403,
    code: "hard_gated",
    message: "Public activation, perpetual authority, future-person representation, privacy override, universal identity, ownership adjudication, local-exit block, century-scale launch, and Phase 20 features remain blocked.",
    retryable: false,
  })
}
