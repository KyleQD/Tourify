import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { evaluateOutboundActionGate, RIGHTS_ADMIN_DISCLAIMER } from "@/lib/music/rights-admin/action-safety"
import { resolveMusicRightsAdminFlags } from "@/lib/music/rights-admin/music-rights-admin-flags"
import { createSandboxRegistryAdapter, hashPayload } from "@/lib/music/rights-admin/partner-adapters"
import { canTransitionRegistration } from "@/lib/music/rights-admin/registration-state-machine"
import { getTrustedMusicWriteClient } from "@/lib/music/music-access"

export const dynamic = "force-dynamic"

const createSchema = z.object({
  case_id: z.string().uuid(),
  target_provider: z.string().min(1),
  requested_action: z.string().default("register_or_claim"),
  idempotency_key: z.string().min(1),
  payload: z.record(z.unknown()).default({}),
  human_reviewed: z.boolean().default(false),
  submit: z.boolean().default(false),
})

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveMusicRightsAdminFlags(supabase, user.id)
  if (!flags.music_rights_admin_registration_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Registration orchestration is not available.", retryable: false })

  const caseId = request.nextUrl.searchParams.get("case_id")
  if (!caseId)
    return jsonError({ status: 400, code: "validation_error", message: "case_id required.", retryable: false })

  const { data, error } = await supabase
    .from("music_rights_admin_registrations")
    .select("id, case_id, target_provider, status, external_id, idempotency_key, created_at")
    .eq("case_id", caseId)
    .order("created_at", { ascending: false })
    .limit(50)

  if (error)
    return jsonError({ status: 500, code: "registrations_query_failed", message: "Unable to load registrations.", retryable: true })

  return NextResponse.json({ data: data || [], disclaimer: RIGHTS_ADMIN_DISCLAIMER, enabled: true })
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveMusicRightsAdminFlags(supabase, user.id)
    if (!flags.music_rights_admin_registration_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Registration orchestration is not available.", retryable: false })

    const payload = createSchema.parse(await request.json())
    const trusted = await getTrustedMusicWriteClient(supabase)
    const { data: caseRow } = await trusted
      .from("music_rights_admin_cases")
      .select("id, status, mandate_id, owner_user_id")
      .eq("id", payload.case_id)
      .eq("owner_user_id", user.id)
      .single()
    if (!caseRow)
      return jsonError({ status: 404, code: "not_found", message: "Case not found.", retryable: false })

    const gate = evaluateOutboundActionGate({
      hasActiveMandate: Boolean(caseRow.mandate_id) && caseRow.status !== "needs_authority",
      humanReviewed: payload.human_reviewed,
      automatedSubmissionEnabled: flags.music_rights_admin_automated_submission_enabled,
      autoTakedownEnabled: flags.music_rights_admin_auto_takedown_enabled,
      action: "register",
    })

    let status = "draft"
    let externalId: string | null = null
    if (payload.submit) {
      if (!gate.allowed)
        return jsonError({ status: 403, code: "action_blocked", message: gate.reason, retryable: false })
      if (!canTransitionRegistration("draft", "validated") || !canTransitionRegistration("validated", "approved"))
        return jsonError({ status: 409, code: "invalid_transition", message: "Invalid registration transition.", retryable: false })
      const adapter = createSandboxRegistryAdapter()
      const submitted = await adapter.submitRegistration({
        caseId: payload.case_id,
        subjectType: "musical_work",
        subjectId: payload.case_id,
        idempotencyKey: payload.idempotency_key,
      })
      status = "submitted"
      externalId = submitted.externalId
      await trusted.from("music_rights_admin_outbox").insert({
        event_type: "registration.submitted",
        aggregate_id: payload.case_id,
        payload: { provider: payload.target_provider, externalId },
        idempotency_key: payload.idempotency_key,
      })
    }

    const { data, error } = await trusted
      .from("music_rights_admin_registrations")
      .insert({
        case_id: payload.case_id,
        target_provider: payload.target_provider,
        requested_action: payload.requested_action,
        idempotency_key: payload.idempotency_key,
        payload: payload.payload,
        status,
        external_id: externalId,
        response_hash: externalId ? hashPayload({ externalId }) : null,
      })
      .select("id, case_id, status, external_id, idempotency_key")
      .single()

    if (error)
      return jsonError({ status: 500, code: "registration_create_failed", message: "Unable to create registration.", retryable: true })

    return NextResponse.json({ data, gate, disclaimer: RIGHTS_ADMIN_DISCLAIMER }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "validation_error", message: "Invalid registration payload.", retryable: false, issues: error.issues })
    return jsonError({ status: 500, code: "registration_create_failed", message: "Unable to create registration.", retryable: true })
  }
}
