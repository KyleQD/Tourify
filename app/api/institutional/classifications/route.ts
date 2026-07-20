import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { resolveMusicInstitutionalFlags } from "@/lib/music/institutional/music-institutional-flags"
import { resolveTransactionPath } from "@/lib/music/institutional/transaction-classification"

export const dynamic = "force-dynamic"

const createSchema = z.object({
  transaction_case_id: z.string().uuid(),
  path: z.enum([
    "direct_asset_sale", "license", "entity_interest", "private_security",
    "fund_interest", "structured_finance", "readiness_only", "blocked",
  ]),
  planning_facts: z.record(z.unknown()).default({}),
  counsel_approved: z.boolean().default(false),
  partner_approved: z.boolean().default(false),
  approved_by_provider_id: z.string().max(120).optional().nullable(),
  restrictions: z.array(z.string()).default([]),
  status: z.enum(["draft", "review_required", "approved"]).default("draft"),
})

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveMusicInstitutionalFlags(supabase, user.id)
    if (!flags.music_institutional_deals_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Institutional classifications are not available.", retryable: false })

    const payload = createSchema.parse(await request.json())
    const { data: caseRow } = await supabase
      .from("music_institutional_transaction_cases")
      .select("id, artist_user_id")
      .eq("id", payload.transaction_case_id)
      .eq("artist_user_id", user.id)
      .maybeSingle()
    if (!caseRow)
      return jsonError({ status: 404, code: "case_not_found", message: "Transaction case not found.", retryable: false })

    if (payload.status === "approved" && (!payload.counsel_approved || !payload.partner_approved || !payload.approved_by_provider_id))
      return jsonError({
        status: 409,
        code: "classification_approvals_required",
        message: "Counsel, partner, and provider approvals required to approve a classification.",
        retryable: false,
      })

    const facts = payload.planning_facts as Record<string, boolean>
    const check = resolveTransactionPath({
      transfersCopyrightOrContractRights: Boolean(facts.transfersCopyrightOrContractRights),
      grantsLicenseOnly: Boolean(facts.grantsLicenseOnly),
      transfersEntityInterest: Boolean(facts.transfersEntityInterest),
      poolsInvestorCapital: Boolean(facts.poolsInvestorCapital),
      createsDebtEquityOrRevenueParticipation: Boolean(facts.createsDebtEquityOrRevenueParticipation),
      proposesTranchesOrCollateral: Boolean(facts.proposesTranchesOrCollateral),
      approvedLegalPath: payload.status === "approved" ? payload.path : undefined,
    })

    const { data, error } = await supabase
      .from("music_institutional_classifications")
      .insert({
        transaction_case_id: payload.transaction_case_id,
        path: payload.path,
        status: payload.status,
        planning_facts: payload.planning_facts,
        restrictions: payload.restrictions,
        counsel_approved: payload.counsel_approved,
        partner_approved: payload.partner_approved,
        approved_by_provider_id: payload.approved_by_provider_id || null,
        decided_by: user.id,
        effective_at: payload.status === "approved" ? new Date().toISOString() : null,
      })
      .select("id, transaction_case_id, path, status, restrictions, counsel_approved, partner_approved")
      .single()

    if (error)
      return jsonError({ status: 500, code: "classification_create_failed", message: "Unable to record classification.", retryable: true })

    if (payload.status === "approved") {
      await supabase
        .from("music_institutional_transaction_cases")
        .update({
          classification_status: "approved",
          approved_path: payload.path,
          status: "classification_review",
          updated_at: new Date().toISOString(),
        })
        .eq("id", payload.transaction_case_id)
    }

    return NextResponse.json({
      data,
      pathCheck: check,
      note: "Bids, subscriptions, closing, and tokenization remain gated until classification is approved.",
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "validation_error", message: "Invalid classification payload.", retryable: false, issues: error.issues })
    return jsonError({ status: 500, code: "classification_create_failed", message: "Unable to record classification.", retryable: true })
  }
}
