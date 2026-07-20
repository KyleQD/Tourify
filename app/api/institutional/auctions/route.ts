import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { canTransitionAuction } from "@/lib/music/institutional/auction-state-machine"
import { assertClassificationAllowsAction } from "@/lib/music/institutional/classification-gate"
import { resolveMusicInstitutionalFlags } from "@/lib/music/institutional/music-institutional-flags"

export const dynamic = "force-dynamic"

const createSchema = z.object({
  transaction_case_id: z.string().uuid(),
  status: z.enum(["draft", "scheduled", "open"]).default("draft"),
  opens_at: z.string().datetime().optional().nullable(),
  closes_at: z.string().datetime().optional().nullable(),
})

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveMusicInstitutionalFlags(supabase, user.id)
    if (!flags.music_institutional_bids_auctions_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Institutional auctions are not available.", retryable: false })

    const payload = createSchema.parse(await request.json())
    const { data: caseRow } = await supabase
      .from("music_institutional_transaction_cases")
      .select("id, artist_user_id, classification_status, approved_path")
      .eq("id", payload.transaction_case_id)
      .eq("artist_user_id", user.id)
      .maybeSingle()
    if (!caseRow)
      return jsonError({ status: 404, code: "case_not_found", message: "Transaction case not found.", retryable: false })

    const gate = assertClassificationAllowsAction({
      classificationStatus: caseRow.classification_status,
      approvedPath: caseRow.approved_path as any,
      action: "auction",
      planningFacts: { transfersCopyrightOrContractRights: true },
    })
    if (!gate.allowed)
      return jsonError({ status: 409, code: "classification_gate", message: gate.reason || "Classification gate failed.", retryable: false })

    if (payload.status !== "draft" && !canTransitionAuction("draft", payload.status))
      return jsonError({ status: 400, code: "invalid_auction_transition", message: "Invalid auction status.", retryable: false })

    const { data, error } = await supabase
      .from("music_institutional_auctions")
      .insert({
        transaction_case_id: payload.transaction_case_id,
        status: payload.status,
        opens_at: payload.opens_at || null,
        closes_at: payload.closes_at || null,
      })
      .select("id, transaction_case_id, status, opens_at, closes_at")
      .single()

    if (error)
      return jsonError({ status: 500, code: "auction_create_failed", message: "Unable to create auction.", retryable: true })

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "validation_error", message: "Invalid auction payload.", retryable: false, issues: error.issues })
    return jsonError({ status: 500, code: "auction_create_failed", message: "Unable to create auction.", retryable: true })
  }
}
