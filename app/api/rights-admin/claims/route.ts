import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { evaluateOutboundActionGate, RIGHTS_ADMIN_DISCLAIMER } from "@/lib/music/rights-admin/action-safety"
import { canTransitionClaim } from "@/lib/music/rights-admin/claim-state-machine"
import { resolveMusicRightsAdminFlags } from "@/lib/music/rights-admin/music-rights-admin-flags"
import { buildPhase3RecoveryHandoff } from "@/lib/music/rights-admin/phase3-recovery-handoff"
import { getTrustedMusicWriteClient } from "@/lib/music/music-access"

export const dynamic = "force-dynamic"

const createSchema = z.object({
  case_id: z.string().uuid(),
  claim_type: z.enum(["royalty", "mechanical", "neighboring", "platform_monetization", "ugc", "other"]),
  amount_minor: z.number().int().nonnegative().optional().nullable(),
  currency: z.string().length(3).default("USD"),
  human_reviewed: z.boolean().default(false),
  submit: z.boolean().default(false),
  authority_snapshot: z.record(z.unknown()).default({}),
})

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveMusicRightsAdminFlags(supabase, user.id)
  if (!flags.music_rights_admin_claims_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Claims are not available.", retryable: false })

  const caseId = request.nextUrl.searchParams.get("case_id")
  if (!caseId)
    return jsonError({ status: 400, code: "validation_error", message: "case_id required.", retryable: false })

  const { data, error } = await supabase
    .from("music_rights_claims")
    .select("id, case_id, claim_type, status, amount_minor, currency, human_reviewed, phase3_handoff_id, created_at")
    .eq("case_id", caseId)
    .order("created_at", { ascending: false })
    .limit(50)

  if (error)
    return jsonError({ status: 500, code: "claims_query_failed", message: "Unable to load claims.", retryable: true })

  return NextResponse.json({ data: data || [], disclaimer: RIGHTS_ADMIN_DISCLAIMER, enabled: true })
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveMusicRightsAdminFlags(supabase, user.id)
    if (!flags.music_rights_admin_claims_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Claims are not available.", retryable: false })

    const payload = createSchema.parse(await request.json())
    if (payload.claim_type === "mechanical" && !flags.music_rights_admin_mechanical_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Mechanical claims are not available.", retryable: false })
    if (payload.claim_type === "neighboring" && !flags.music_rights_admin_neighboring_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Neighboring claims are not available.", retryable: false })

    const trusted = await getTrustedMusicWriteClient(supabase)
    const { data: caseRow } = await trusted
      .from("music_rights_admin_cases")
      .select("id, status, mandate_id")
      .eq("id", payload.case_id)
      .eq("owner_user_id", user.id)
      .single()
    if (!caseRow)
      return jsonError({ status: 404, code: "not_found", message: "Case not found.", retryable: false })

    const action = payload.claim_type === "platform_monetization" ? "monetize" : "claim"
    const gate = evaluateOutboundActionGate({
      hasActiveMandate: Boolean(caseRow.mandate_id) && caseRow.status !== "needs_authority",
      humanReviewed: payload.human_reviewed,
      automatedSubmissionEnabled: flags.music_rights_admin_automated_submission_enabled,
      autoTakedownEnabled: flags.music_rights_admin_auto_takedown_enabled,
      action,
    })

    let status: "draft" | "review" | "approved" | "submitted" = "draft"
    if (payload.submit) {
      if (!gate.allowed)
        return jsonError({ status: 403, code: "action_blocked", message: gate.reason, retryable: false })
      if (!canTransitionClaim("draft", "review") || !canTransitionClaim("review", "approved") || !canTransitionClaim("approved", "submitted"))
        return jsonError({ status: 409, code: "invalid_transition", message: "Invalid claim transition.", retryable: false })
      status = "submitted"
    } else if (payload.human_reviewed) {
      status = "review"
    }

    const { data, error } = await trusted
      .from("music_rights_claims")
      .insert({
        case_id: payload.case_id,
        claim_type: payload.claim_type,
        amount_minor: payload.amount_minor ?? null,
        currency: payload.currency,
        status,
        authority_snapshot: payload.authority_snapshot,
        human_reviewed: payload.human_reviewed,
      })
      .select("id, case_id, claim_type, status, amount_minor")
      .single()

    if (error)
      return jsonError({ status: 500, code: "claim_create_failed", message: "Unable to create claim.", retryable: true })

    let handoff = null
    if (status === "submitted" && payload.amount_minor != null) {
      handoff = buildPhase3RecoveryHandoff({
        caseId: payload.case_id,
        claimId: data.id,
        amountMinor: payload.amount_minor,
        currency: payload.currency,
      })
      await trusted.from("music_rights_claims").update({
        phase3_handoff_id: `intent-${data.id}`,
      }).eq("id", data.id)
      await trusted.from("music_rights_admin_outbox").insert({
        event_type: "phase3.claim_handoff",
        aggregate_id: payload.case_id,
        payload: handoff,
        idempotency_key: `claim-handoff-${data.id}`,
      })
    }

    return NextResponse.json({
      data,
      gate,
      handoff,
      disclaimer: RIGHTS_ADMIN_DISCLAIMER,
      note: "Claims require mandate + human review; recoveries hand off to Phase 3 only.",
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "validation_error", message: "Invalid claim payload.", retryable: false, issues: error.issues })
    return jsonError({ status: 500, code: "claim_create_failed", message: "Unable to create claim.", retryable: true })
  }
}
