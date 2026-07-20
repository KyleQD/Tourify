import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { RIGHTS_ADMIN_DISCLAIMER } from "@/lib/music/rights-admin/action-safety"
import { reconcileCollection } from "@/lib/music/rights-admin/collection-reconciliation"
import { resolveMusicRightsAdminFlags } from "@/lib/music/rights-admin/music-rights-admin-flags"
import { buildPhase3RecoveryHandoff } from "@/lib/music/rights-admin/phase3-recovery-handoff"
import { getTrustedMusicWriteClient } from "@/lib/music/music-access"

export const dynamic = "force-dynamic"

const createSchema = z.object({
  case_id: z.string().uuid(),
  gross_minor: z.number().int().nonnegative(),
  currency: z.string().length(3).default("USD"),
  provider_fees_minor: z.number().int().nonnegative().default(0),
  withholding_minor: z.number().int().nonnegative().default(0),
  received_minor: z.number().int().nonnegative().optional(),
  terms: z.record(z.unknown()).default({}),
  counsel_approved: z.boolean().default(false),
})

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveMusicRightsAdminFlags(supabase, user.id)
  if (!flags.music_rights_admin_settlements_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Settlements are not available.", retryable: false })

  const caseId = request.nextUrl.searchParams.get("case_id")
  if (!caseId)
    return jsonError({ status: 400, code: "validation_error", message: "case_id required.", retryable: false })

  const { data, error } = await supabase
    .from("music_rights_settlements")
    .select("id, case_id, status, gross_minor, currency, counsel_approved, phase3_handoff_id, created_at")
    .eq("case_id", caseId)
    .order("created_at", { ascending: false })
    .limit(50)

  if (error)
    return jsonError({ status: 500, code: "settlements_query_failed", message: "Unable to load settlements.", retryable: true })

  return NextResponse.json({ data: data || [], disclaimer: RIGHTS_ADMIN_DISCLAIMER, enabled: true })
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveMusicRightsAdminFlags(supabase, user.id)
    if (!flags.music_rights_admin_settlements_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Settlements are not available.", retryable: false })

    const payload = createSchema.parse(await request.json())
    const received = BigInt(payload.received_minor ?? payload.gross_minor - payload.provider_fees_minor - payload.withholding_minor)
    const reconciliation = reconcileCollection({
      grossMinor: BigInt(payload.gross_minor),
      providerFeesMinor: BigInt(payload.provider_fees_minor),
      withholdingMinor: BigInt(payload.withholding_minor),
      currency: payload.currency,
    }, received)

    const trusted = await getTrustedMusicWriteClient(supabase)
    const handoff = buildPhase3RecoveryHandoff({
      caseId: payload.case_id,
      amountMinor: Number(reconciliation.netMinor),
      currency: payload.currency,
    })

    const { data, error } = await trusted
      .from("music_rights_settlements")
      .insert({
        case_id: payload.case_id,
        gross_minor: payload.gross_minor,
        currency: payload.currency,
        terms: { ...payload.terms, reconciliation },
        counsel_approved: payload.counsel_approved,
        status: payload.counsel_approved ? "pending_approval" : "draft",
        phase3_handoff_id: `intent-settle-${payload.case_id}-${Date.now()}`,
      })
      .select("id, case_id, status, gross_minor, phase3_handoff_id")
      .single()

    if (error)
      return jsonError({ status: 500, code: "settlement_create_failed", message: "Unable to create settlement.", retryable: true })

    await trusted.from("music_rights_admin_outbox").insert({
      event_type: "phase3.settlement_handoff",
      aggregate_id: payload.case_id,
      payload: { ...handoff, settlementId: data.id },
      idempotency_key: `settle-handoff-${data.id}`,
    })

    return NextResponse.json({
      data,
      reconciliation: {
        netMinor: reconciliation.netMinor.toString(),
        balanced: reconciliation.balanced,
      },
      handoff,
      disclaimer: RIGHTS_ADMIN_DISCLAIMER,
      note: "Recovered funds hand off to Phase 3; no ledger bypass.",
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "validation_error", message: "Invalid settlement payload.", retryable: false, issues: error.issues })
    return jsonError({ status: 500, code: "settlement_create_failed", message: "Unable to create settlement.", retryable: true })
  }
}
