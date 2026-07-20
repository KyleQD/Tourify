import { NextRequest, NextResponse } from "next/server"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { CREATOR_PROTOCOL_CONSTITUTION_DISCLAIMER } from "@/lib/music/creator-protocol-constitution/constitution-disclaimer"
import { resolveCreatorProtocolConstitutionFlags } from "@/lib/music/creator-protocol-constitution/creator-protocol-constitution-flags"
import { evaluateAssetTransfer } from "@/lib/music/creator-protocol-constitution/asset-lock-transfer-gate"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveCreatorProtocolConstitutionFlags(supabase, user.id)
  if (!flags.creator_protocol_asset_covenant_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Asset covenant is not available.", retryable: false })

  const { data, error } = await supabase
    .from("creator_protocol_constitutional_assets")
    .select("id, constitution_id, asset_kind, display_name, classification, status, public_projection, policy_version, created_at")
    .order("created_at", { ascending: false })
    .limit(100)

  if (error)
    return jsonError({ status: 500, code: "assets_query_failed", message: "Unable to load constitutional assets.", retryable: true })

  const transferGate = evaluateAssetTransfer({
    classification: "inalienable",
    authorityApproved: false,
    publicNoticeComplete: false,
    conflictsCleared: false,
    replacementPlanApproved: false,
    rollbackAvailable: false,
  })

  return NextResponse.json({
    data: data || [],
    transferGate,
    irreversibleTransferBlocked: !flags.creator_protocol_irreversible_asset_transfer_enabled,
    disclaimer: CREATOR_PROTOCOL_CONSTITUTION_DISCLAIMER,
    note: "Asset schedule/projection only — irreversible transfer hard-disabled.",
    enabled: true,
  })
}

export async function POST(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  return jsonError({
    status: 403,
    code: "irreversible_transfer_blocked",
    message: "Irreversible constitutional asset transfer remains hard-disabled.",
    retryable: false,
  })
}
