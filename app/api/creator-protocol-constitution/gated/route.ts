import { NextRequest, NextResponse } from "next/server"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { CREATOR_PROTOCOL_CONSTITUTION_DISCLAIMER } from "@/lib/music/creator-protocol-constitution/constitution-disclaimer"
import { resolveCreatorProtocolConstitutionFlags } from "@/lib/music/creator-protocol-constitution/creator-protocol-constitution-flags"

export const dynamic = "force-dynamic"

/** Hard-gated and counsel-gated surfaces — always blocked in shell. */
export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveCreatorProtocolConstitutionFlags(supabase, user.id)

  return NextResponse.json({
    data: {
      limited_production: { available: false, gated: !flags.creator_protocol_limited_production_enabled },
      irreversible_asset_transfer: { available: false, hard_disabled: true },
      universal_identifier: { available: false, hard_disabled: true },
      global_mandate: { available: false, hard_disabled: true },
      collective_action: { available: false, hard_disabled: true },
      tokenized_governance: { available: false, hard_disabled: true },
      emergency_override: { available: false, hard_disabled: true },
      interop_jurisdiction: { available: false, stub: true },
      privacy_due_process: { available: false, stub: true },
      security_keys: { available: false, stub: true },
    },
    disclaimer: CREATOR_PROTOCOL_CONSTITUTION_DISCLAIMER,
    note: "Hard-disabled and counsel-gated powers cannot be exercised from this shell.",
  })
}

export async function POST(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  return jsonError({
    status: 403,
    code: "hard_gated",
    message: "Irreversible transfer, universal identifier, global mandate, collective action, tokenized governance, and emergency override remain blocked.",
    retryable: false,
  })
}
