import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { assertClassificationAllowsAction } from "@/lib/music/institutional/classification-gate"
import { resolveMusicInstitutionalFlags } from "@/lib/music/institutional/music-institutional-flags"

export const dynamic = "force-dynamic"

const closeSchema = z.object({
  transaction_case_id: z.string().uuid(),
  official_provider_reference: z.string().min(1).max(200),
  effective_at: z.string().datetime().optional(),
  revenue_cutover_at: z.string().datetime().optional().nullable(),
})

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveMusicInstitutionalFlags(supabase, user.id)
    if (!flags.music_institutional_closings_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Institutional closings are not available.", retryable: false })

    const payload = closeSchema.parse(await request.json())
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
      action: "closing",
      planningFacts: { transfersCopyrightOrContractRights: true },
    })
    if (!gate.allowed)
      return jsonError({ status: 409, code: "classification_gate", message: gate.reason || "Classification gate failed.", retryable: false })

    const { data, error } = await supabase
      .from("music_institutional_transaction_closings")
      .insert({
        transaction_case_id: payload.transaction_case_id,
        status: "partner_confirmed",
        official_provider_reference: payload.official_provider_reference,
        effective_at: payload.effective_at || new Date().toISOString(),
        revenue_cutover_at: payload.revenue_cutover_at || null,
      })
      .select("id, transaction_case_id, status, official_provider_reference, effective_at")
      .single()

    if (error)
      return jsonError({ status: 500, code: "closing_create_failed", message: "Unable to record closing.", retryable: true })

    await supabase
      .from("music_institutional_transaction_cases")
      .update({ status: "closed", updated_at: new Date().toISOString() })
      .eq("id", payload.transaction_case_id)

    return NextResponse.json({
      data,
      note: "Closing requires partner/official provider reference. Tourify does not hold cash or securities.",
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "validation_error", message: "Invalid closing payload.", retryable: false, issues: error.issues })
    return jsonError({ status: 500, code: "closing_create_failed", message: "Unable to record closing.", retryable: true })
  }
}
