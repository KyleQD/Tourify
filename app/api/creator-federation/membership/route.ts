import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { CREATOR_FEDERATION_DISCLAIMER } from "@/lib/music/creator-federation/federation-disclaimer"
import { resolveCreatorFederationFlags } from "@/lib/music/creator-federation/creator-federation-flags"
import { canTransitionFederationMembership } from "@/lib/music/creator-federation/membership-state-machine"
import { getTrustedMusicWriteClient } from "@/lib/music/music-access"

export const dynamic = "force-dynamic"

const applySchema = z.object({
  federation_entity_id: z.string().uuid(),
  organization_name: z.string().min(1),
  member_organization_id: z.string().uuid().optional(),
})

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveCreatorFederationFlags(supabase, user.id)
  if (!flags.creator_federation_membership_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Federation membership is not available.", retryable: false })

  const { data, error } = await supabase
    .from("creator_federation_memberships")
    .select("id, federation_entity_id, organization_name, status, version, effective_at, withdrawn_at, created_at")
    .eq("applicant_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50)

  if (error)
    return jsonError({ status: 500, code: "membership_query_failed", message: "Unable to load memberships.", retryable: true })

  return NextResponse.json({
    data: data || [],
    disclaimer: CREATOR_FEDERATION_DISCLAIMER,
    note: "Tourify account and Phase 9 membership do not create federation membership.",
    enabled: true,
  })
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveCreatorFederationFlags(supabase, user.id)
    if (!flags.creator_federation_membership_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Federation membership is not available.", retryable: false })

    if (flags.creator_federation_tokenized_membership_enabled)
      return jsonError({ status: 403, code: "tokenized_membership_blocked", message: "Tokenized membership remains separately gated.", retryable: false })

    const payload = applySchema.parse(await request.json())
    if (!canTransitionFederationMembership({ from: "draft", to: "submitted" }))
      return jsonError({ status: 400, code: "invalid_transition", message: "Invalid membership transition.", retryable: false })

    const orgId = payload.member_organization_id || crypto.randomUUID()
    const trusted = await getTrustedMusicWriteClient(supabase)
    const { data, error } = await trusted
      .from("creator_federation_memberships")
      .insert({
        federation_entity_id: payload.federation_entity_id,
        member_organization_id: orgId,
        applicant_user_id: user.id,
        organization_name: payload.organization_name,
        status: "submitted",
      })
      .select("id, federation_entity_id, organization_name, status, member_organization_id")
      .single()

    if (error)
      return jsonError({ status: 500, code: "membership_apply_failed", message: "Unable to apply for federation membership.", retryable: true })

    if (flags.creator_federation_sovereignty_controls_enabled) {
      await trusted.from("creator_federation_reserved_powers").insert([
        { membership_id: data.id, power_key: "local_membership", policy_version: "1.0.0" },
        { membership_id: data.id, power_key: "local_pricing", policy_version: "1.0.0" },
        { membership_id: data.id, power_key: "local_governing_documents", policy_version: "1.0.0" },
        { membership_id: data.id, power_key: "local_enforcement", policy_version: "1.0.0" },
      ])
    }

    return NextResponse.json({
      data,
      disclaimer: CREATOR_FEDERATION_DISCLAIMER,
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "validation_error", message: "Invalid membership payload.", retryable: false, issues: error.issues })
    return jsonError({ status: 500, code: "membership_apply_failed", message: "Unable to apply for federation membership.", retryable: true })
  }
}

export async function DELETE(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveCreatorFederationFlags(supabase, user.id)
  if (!flags.creator_federation_membership_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Federation membership is not available.", retryable: false })

  const membershipId = request.nextUrl.searchParams.get("id")
  if (!membershipId)
    return jsonError({ status: 400, code: "validation_error", message: "Membership id is required.", retryable: false })

  const { data: existing } = await supabase
    .from("creator_federation_memberships")
    .select("id, status")
    .eq("id", membershipId)
    .eq("applicant_user_id", user.id)
    .maybeSingle()

  if (!existing)
    return jsonError({ status: 404, code: "not_found", message: "Membership not found.", retryable: false })

  if (!canTransitionFederationMembership({ from: existing.status as any, to: "withdrawn" }))
    return jsonError({ status: 403, code: "invalid_transition", message: "Cannot withdraw from current state.", retryable: false })

  const nowIso = new Date().toISOString()
  const { data, error } = await supabase
    .from("creator_federation_memberships")
    .update({ status: "withdrawn", withdrawn_at: nowIso })
    .eq("id", membershipId)
    .select("id, status, withdrawn_at")
    .single()

  if (error)
    return jsonError({ status: 500, code: "membership_withdraw_failed", message: "Unable to withdraw.", retryable: true })

  await supabase.from("creator_federation_outbox_events").insert({
    event_type: "membership.withdrawn",
    aggregate_type: "creator_federation_memberships",
    aggregate_id: data.id,
    payload: { user_id: user.id },
    idempotency_key: `fed-membership-withdraw:${data.id}:${nowIso}`,
  })

  return NextResponse.json({ data, disclaimer: CREATOR_FEDERATION_DISCLAIMER, withdrawalQueued: true })
}
