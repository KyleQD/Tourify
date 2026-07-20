import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { CREATOR_PROTOCOL_CONSTITUTION_DISCLAIMER } from "@/lib/music/creator-protocol-constitution/constitution-disclaimer"
import { resolveCreatorProtocolConstitutionFlags } from "@/lib/music/creator-protocol-constitution/creator-protocol-constitution-flags"
import { canTransitionRatification } from "@/lib/music/creator-protocol-constitution/compact-ratification-state-machine"
import { getTrustedMusicWriteClient } from "@/lib/music/music-access"

export const dynamic = "force-dynamic"

const applySchema = z.object({
  constitution_id: z.string().uuid(),
  organization_name: z.string().min(1),
  organization_id: z.string().uuid().optional(),
  policy_version: z.string().min(1).default("1.0.0"),
})

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveCreatorProtocolConstitutionFlags(supabase, user.id)
  if (!flags.creator_protocol_compact_membership_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Compact membership is not available.", retryable: false })

  const { data, error } = await supabase
    .from("creator_protocol_compact_memberships")
    .select("id, constitution_id, organization_name, status, reservations, effective_at, withdrawal_at, created_at")
    .eq("applicant_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50)

  if (error)
    return jsonError({ status: 500, code: "membership_query_failed", message: "Unable to load memberships.", retryable: true })

  return NextResponse.json({
    data: data || [],
    disclaimer: CREATOR_PROTOCOL_CONSTITUTION_DISCLAIMER,
    note: "Tourify account and Phase 12 commons participation do not create compact membership.",
    enabled: true,
  })
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveCreatorProtocolConstitutionFlags(supabase, user.id)
    if (!flags.creator_protocol_compact_membership_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Compact membership is not available.", retryable: false })

    if (flags.creator_protocol_tokenized_governance_enabled)
      return jsonError({ status: 403, code: "tokenized_governance_blocked", message: "Tokenized governance remains hard-disabled.", retryable: false })

    const payload = applySchema.parse(await request.json())
    if (!canTransitionRatification("draft", "local_review"))
      return jsonError({ status: 400, code: "invalid_transition", message: "Invalid ratification transition.", retryable: false })

    const orgId = payload.organization_id || crypto.randomUUID()
    const trusted = await getTrustedMusicWriteClient(supabase)
    const { data, error } = await trusted
      .from("creator_protocol_compact_memberships")
      .insert({
        constitution_id: payload.constitution_id,
        organization_id: orgId,
        applicant_user_id: user.id,
        organization_name: payload.organization_name,
        status: "local_review",
        policy_version: payload.policy_version,
      })
      .select("id, constitution_id, organization_name, status, organization_id")
      .single()

    if (error)
      return jsonError({ status: 500, code: "membership_apply_failed", message: "Unable to apply for compact membership.", retryable: true })

    if (flags.creator_protocol_local_sovereignty_enabled) {
      await trusted.from("creator_protocol_reserved_powers").insert([
        { constitution_id: payload.constitution_id, organization_id: orgId, power_key: "local_membership", status: "active", version: "1.0.0" },
        { constitution_id: payload.constitution_id, organization_id: orgId, power_key: "local_pricing", status: "active", version: "1.0.0" },
        { constitution_id: payload.constitution_id, organization_id: orgId, power_key: "local_governing_documents", status: "active", version: "1.0.0" },
        { constitution_id: payload.constitution_id, organization_id: orgId, power_key: "local_enforcement", status: "active", version: "1.0.0" },
      ])
    }

    await trusted.from("creator_protocol_audit_events").insert({
      event_type: "membership.applied",
      actor_type: "user",
      actor_id: user.id,
      subject_type: "creator_protocol_compact_memberships",
      subject_id: data.id,
      payload: { constitution_id: payload.constitution_id },
      event_hash: `cpc-membership:${data.id}:${Date.now()}`,
    })

    return NextResponse.json({ data, disclaimer: CREATOR_PROTOCOL_CONSTITUTION_DISCLAIMER }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "validation_error", message: "Invalid membership payload.", retryable: false, issues: error.issues })
    return jsonError({ status: 500, code: "membership_apply_failed", message: "Unable to apply for compact membership.", retryable: true })
  }
}

export async function DELETE(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveCreatorProtocolConstitutionFlags(supabase, user.id)
  if (!flags.creator_protocol_compact_membership_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Compact membership is not available.", retryable: false })

  const membershipId = request.nextUrl.searchParams.get("id")
  if (!membershipId)
    return jsonError({ status: 400, code: "validation_error", message: "Membership id is required.", retryable: false })

  const { data: existing } = await supabase
    .from("creator_protocol_compact_memberships")
    .select("id, status")
    .eq("id", membershipId)
    .eq("applicant_user_id", user.id)
    .maybeSingle()

  if (!existing)
    return jsonError({ status: 404, code: "not_found", message: "Membership not found.", retryable: false })

  const from = existing.status === "effective" || existing.status === "suspended" ? existing.status : "effective"
  if (!canTransitionRatification(from as any, "withdrawn") && !canTransitionRatification(from as any, "withdrawal_pending"))
    return jsonError({ status: 403, code: "invalid_transition", message: "Cannot withdraw from current state.", retryable: false })

  const nowIso = new Date().toISOString()
  const { data, error } = await supabase
    .from("creator_protocol_compact_memberships")
    .update({ status: "withdrawn", withdrawal_at: nowIso })
    .eq("id", membershipId)
    .select("id, status, withdrawal_at")
    .single()

  if (error)
    return jsonError({ status: 500, code: "membership_withdraw_failed", message: "Unable to withdraw.", retryable: true })

  const trusted = await getTrustedMusicWriteClient(supabase)
  await trusted.from("creator_protocol_outbox").insert({
    event_type: "membership.withdrawn",
    aggregate_type: "creator_protocol_compact_memberships",
    aggregate_id: data.id,
    payload: { user_id: user.id },
    idempotency_key: `cpc-membership-withdraw:${data.id}:${nowIso}`,
  })

  return NextResponse.json({ data, disclaimer: CREATOR_PROTOCOL_CONSTITUTION_DISCLAIMER, withdrawalQueued: true })
}
