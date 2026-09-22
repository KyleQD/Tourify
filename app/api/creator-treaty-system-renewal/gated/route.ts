import { NextRequest, NextResponse } from "next/server"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { CREATOR_TREATY_RENEWAL_DISCLAIMER } from "@/lib/music/creator-treaty-system-renewal/renewal-disclaimer"
import { resolveCreatorTreatyRenewalFlags } from "@/lib/music/creator-treaty-system-renewal/creator-treaty-renewal-flags"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  await resolveCreatorTreatyRenewalFlags(supabase, user.id)

  return NextResponse.json({
    data: {
      public_activation: { available: false, hard_disabled: true },
      privilege_revalidation: { available: false, hard_disabled: true },
      dissolution: { available: false, hard_disabled: true, note: "rehearsal records only" },
      endowment: { available: false, hard_disabled: true },
      arrangements_review: { available: false, hard_disabled: true },
      archive_public_access: { available: false, hard_disabled: true },
      conference: { available: false, hard_disabled: true },
      phase19_features: { available: false, hard_disabled: true },
      phase17_launch: { available: false, note: "Phase 18 cannot launch from Phase 17 flags" },
    },
    disclaimer: CREATOR_TREATY_RENEWAL_DISCLAIMER,
  })
}

export async function POST(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  return jsonError({
    status: 403,
    code: "hard_gated",
    message: "Public activation, privileges, live dissolution, endowment, formal conference, and Phase 19 features remain blocked.",
    retryable: false,
  })
}
