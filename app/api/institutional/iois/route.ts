import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { assertClassificationAllowsAction } from "@/lib/music/institutional/classification-gate"
import { resolveMusicInstitutionalFlags } from "@/lib/music/institutional/music-institutional-flags"

export const dynamic = "force-dynamic"

const createSchema = z.object({
  transaction_case_id: z.string().uuid(),
  organization_id: z.string().uuid(),
  indicative_amount_minor: z.number().int().positive().optional(),
  currency: z.string().length(3).optional(),
  notes: z.string().max(2000).optional().nullable(),
})

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveMusicInstitutionalFlags(supabase, user.id)
    if (!flags.music_institutional_bids_auctions_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Institutional IOIs are not available.", retryable: false })

    const payload = createSchema.parse(await request.json())
    const { data: caseRow } = await supabase
      .from("music_institutional_transaction_cases")
      .select("classification_status, approved_path")
      .eq("id", payload.transaction_case_id)
      .maybeSingle()
    if (!caseRow)
      return jsonError({ status: 404, code: "case_not_found", message: "Transaction case not found.", retryable: false })

    const gate = assertClassificationAllowsAction({
      classificationStatus: caseRow.classification_status,
      approvedPath: caseRow.approved_path as any,
      action: "ioi",
      planningFacts: { transfersCopyrightOrContractRights: true },
    })
    if (!gate.allowed)
      return jsonError({ status: 409, code: "classification_gate", message: gate.reason || "Classification gate failed.", retryable: false })

    const { data, error } = await supabase
      .from("music_institutional_iois")
      .insert({
        transaction_case_id: payload.transaction_case_id,
        organization_id: payload.organization_id,
        indicative_amount_minor: payload.indicative_amount_minor ?? null,
        currency: payload.currency ?? null,
        notes: payload.notes || null,
        status: "submitted",
      })
      .select("id, transaction_case_id, status, indicative_amount_minor")
      .single()

    if (error)
      return jsonError({ status: 500, code: "ioi_create_failed", message: "Unable to submit IOI.", retryable: true })

    void user
    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "validation_error", message: "Invalid IOI payload.", retryable: false, issues: error.issues })
    return jsonError({ status: 500, code: "ioi_create_failed", message: "Unable to submit IOI.", retryable: true })
  }
}
