import { NextRequest, NextResponse } from "next/server"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { CREATOR_DIGITAL_COMMONS_DISCLAIMER } from "@/lib/music/creator-digital-commons/commons-disclaimer"
import { resolveCreatorDigitalCommonsFlags } from "@/lib/music/creator-digital-commons/creator-digital-commons-flags"
import { evaluateAssetTransfer } from "@/lib/music/creator-digital-commons/asset-transfer-gate"

export const dynamic = "force-dynamic"

function sanitizeProjection(projection: Record<string, unknown> | null) {
  if (!projection || typeof projection !== "object") return {}
  const blocked = ["secret", "private_key", "credentials", "tax_id", "payment", "evidence_raw"]
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(projection)) {
    if (blocked.some((token) => key.toLowerCase().includes(token))) continue
    out[key] = value
  }
  return out
}

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveCreatorDigitalCommonsFlags(supabase, user.id)
  if (!flags.creator_digital_commons_asset_register_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Asset register is not available.", retryable: false })

  const { data, error } = await supabase
    .from("creator_commons_assets")
    .select("id, steward_id, asset_kind, display_name, transfer_status, public_projection, policy_version, created_at")
    .order("created_at", { ascending: false })
    .limit(100)

  if (error)
    return jsonError({ status: 500, code: "assets_query_failed", message: "Unable to load asset inventory.", retryable: true })

  const transferGate = evaluateAssetTransfer({
    titleVerified: false,
    transferAuthorityVerified: false,
    thirdPartyRestrictionsResolved: false,
    publicNoticeComplete: false,
    conflictReviewComplete: false,
    rollbackOrReplacementPlanTested: false,
    receivingStewardApproved: false,
    creatorRightsAffected: true,
    policyVersion: "1.0.0",
  })

  return NextResponse.json({
    data: (data || []).map((row: any) => ({
      ...row,
      public_projection: sanitizeProjection(row.public_projection),
    })),
    transferGate,
    irreversibleTransferBlocked: !flags.creator_digital_commons_irreversible_asset_transfer_enabled,
    disclaimer: CREATOR_DIGITAL_COMMONS_DISCLAIMER,
    note: "Inventory/projection only — irreversible transfer remains hard-disabled.",
    enabled: true,
  })
}

export async function POST(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  return jsonError({
    status: 403,
    code: "irreversible_transfer_blocked",
    message: "Irreversible asset transfer remains hard-disabled without separate approval package.",
    retryable: false,
  })
}
