import { NextRequest, NextResponse } from "next/server"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { CREATOR_DIGITAL_COMMONS_DISCLAIMER } from "@/lib/music/creator-digital-commons/commons-disclaimer"
import { resolveCreatorDigitalCommonsFlags } from "@/lib/music/creator-digital-commons/creator-digital-commons-flags"
import { evaluateFundingConcentration } from "@/lib/music/creator-digital-commons/funding-concentration-policy"

export const dynamic = "force-dynamic"

/** Funding, limited production, irreversible transfer, universal/collective/tokenized — blocked in shell. */
export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveCreatorDigitalCommonsFlags(supabase, user.id)

  let funding: any = { available: false, reviewRequired: true }
  if (flags.creator_digital_commons_readiness_enabled) {
    const { data } = await supabase
      .from("creator_commons_funding_sources")
      .select("id, amount_minor, related_party")
      .limit(100)
    const concentration = evaluateFundingConcentration(
      (data || []).map((row: any) => ({
        id: row.id,
        amountMinor: BigInt(row.amount_minor || 0),
        relatedParty: Boolean(row.related_party),
      })),
    )
    funding = {
      available: false,
      reviewRequired: concentration.reviewRequired,
      largestShareBps: concentration.largestShareBps,
      relatedPartyShareBps: concentration.relatedPartyShareBps,
    }
  }

  return NextResponse.json({
    data: {
      funding,
      limited_production: { available: false, gated: !flags.creator_digital_commons_limited_production_enabled },
      public_api_sandbox: { available: false, gated: !flags.creator_digital_commons_public_api_sandbox_enabled },
      irreversible_asset_transfer: { available: false, hard_disabled: true },
      universal_identifier: { available: false, hard_disabled: true },
      global_mandate: { available: false, hard_disabled: true },
      collective_action: { available: false, hard_disabled: true },
      tokenized_identity: { available: false, hard_disabled: true },
      privacy_cross_border: { available: false, stub: true },
      accessibility: { available: false, stub: true },
      security_resilience: { available: false, stub: true },
    },
    disclaimer: CREATOR_DIGITAL_COMMONS_DISCLAIMER,
    note: "Hard-disabled and counsel-gated powers cannot be exercised from this shell.",
  })
}

export async function POST(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  return jsonError({
    status: 403,
    code: "hard_gated",
    message: "Funding actions, irreversible transfer, universal identifier, global mandate, collective action, and tokenized identity remain blocked.",
    retryable: false,
  })
}
