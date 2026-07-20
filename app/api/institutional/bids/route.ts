import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { assertClassificationAllowsAction } from "@/lib/music/institutional/classification-gate"
import { resolveMusicInstitutionalFlags } from "@/lib/music/institutional/music-institutional-flags"
import { evaluateInstitutionalEligibility } from "@/lib/music/institutional/institutional-eligibility"

export const dynamic = "force-dynamic"

const createSchema = z.object({
  transaction_case_id: z.string().uuid(),
  bidder_organization_id: z.string().uuid(),
  version: z.number().int().positive().default(1),
  amount_minor: z.number().int().positive(),
  currency: z.string().length(3).default("USD"),
  auction_id: z.string().uuid().optional().nullable(),
})

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveMusicInstitutionalFlags(supabase, user.id)
    if (!flags.music_institutional_bids_auctions_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Institutional bids are not available.", retryable: false })

    const payload = createSchema.parse(await request.json())
    const { data: caseRow } = await supabase
      .from("music_institutional_transaction_cases")
      .select("id, classification_status, approved_path")
      .eq("id", payload.transaction_case_id)
      .maybeSingle()
    if (!caseRow)
      return jsonError({ status: 404, code: "case_not_found", message: "Transaction case not found.", retryable: false })

    const gate = assertClassificationAllowsAction({
      classificationStatus: caseRow.classification_status,
      approvedPath: caseRow.approved_path as any,
      action: "bid",
      planningFacts: { transfersCopyrightOrContractRights: true },
    })
    if (!gate.allowed)
      return jsonError({ status: 409, code: "classification_gate", message: gate.reason || "Classification gate failed.", retryable: false })

    const { data: assertions } = await supabase
      .from("music_institutional_eligibility_assertions")
      .select("assertion_type, provider_id, verified, effective_at, expires_at, revoked_at, permitted_product_classes, maximum_amount_minor")
      .eq("organization_id", payload.bidder_organization_id)
      .eq("verified", true)

    const eligibility = evaluateInstitutionalEligibility({
      now: new Date(),
      requiredProductClass: caseRow.approved_path || "direct_asset_sale",
      requestedAmountMinor: BigInt(payload.amount_minor),
      assertions: (assertions || []).map((row: Record<string, any>) => ({
        assertionType: row.assertion_type,
        providerId: row.provider_id,
        verified: row.verified,
        effectiveAt: row.effective_at,
        expiresAt: row.expires_at || undefined,
        revokedAt: row.revoked_at || undefined,
        permittedProductClasses: (row.permitted_product_classes as string[]) || [],
        maximumAmountMinor: row.maximum_amount_minor != null ? BigInt(row.maximum_amount_minor) : undefined,
      })),
    })
    if (!eligibility.allowed)
      return jsonError({ status: 403, code: "eligibility_denied", message: eligibility.reason, retryable: false })

    const { data, error } = await supabase
      .from("music_institutional_bids")
      .insert({
        transaction_case_id: payload.transaction_case_id,
        bidder_organization_id: payload.bidder_organization_id,
        auction_id: payload.auction_id || null,
        version: payload.version,
        amount_minor: payload.amount_minor,
        currency: payload.currency,
        status: "submitted",
        submitted_at: new Date().toISOString(),
      })
      .select("id, transaction_case_id, amount_minor, currency, status, version")
      .single()

    if (error)
      return jsonError({ status: 500, code: "bid_create_failed", message: "Unable to submit bid.", retryable: true })

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "validation_error", message: "Invalid bid payload.", retryable: false, issues: error.issues })
    return jsonError({ status: 500, code: "bid_create_failed", message: "Unable to submit bid.", retryable: true })
  }
}
