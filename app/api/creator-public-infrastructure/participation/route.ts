import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { CREATOR_PUBLIC_INFRASTRUCTURE_DISCLAIMER } from "@/lib/music/creator-public-infrastructure/public-infrastructure-disclaimer"
import { resolveCreatorPublicInfrastructureFlags } from "@/lib/music/creator-public-infrastructure/creator-public-infrastructure-flags"
import { canTransitionParticipation } from "@/lib/music/creator-public-infrastructure/participation-state-machine"
import { getTrustedMusicWriteClient } from "@/lib/music/music-access"

export const dynamic = "force-dynamic"

const enrollSchema = z.object({
  entity_id: z.string().uuid(),
  organization_id: z.string().uuid().optional(),
  terms_version: z.string().min(1).default("1.0.0"),
})

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveCreatorPublicInfrastructureFlags(supabase, user.id)
  if (!flags.creator_public_infrastructure_participation_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Public-infrastructure participation is not available.", retryable: false })

  const { data, error } = await supabase
    .from("creator_public_infrastructure_participations")
    .select("id, entity_id, organization_id, status, terms_version, activated_at, withdrawn_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50)

  if (error)
    return jsonError({ status: 500, code: "participation_query_failed", message: "Unable to load participations.", retryable: true })

  return NextResponse.json({
    data: data || [],
    disclaimer: CREATOR_PUBLIC_INFRASTRUCTURE_DISCLAIMER,
    note: "Tourify account and Phase 8–10 relationships do not create public-infrastructure participation.",
    enabled: true,
  })
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveCreatorPublicInfrastructureFlags(supabase, user.id)
    if (!flags.creator_public_infrastructure_participation_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Public-infrastructure participation is not available.", retryable: false })

    if (flags.creator_public_infrastructure_tokenized_identity_enabled)
      return jsonError({ status: 403, code: "tokenized_identity_blocked", message: "Tokenized identity remains hard-disabled.", retryable: false })

    const payload = enrollSchema.parse(await request.json())
    if (!canTransitionParticipation({ from: "draft", to: "active" }))
      return jsonError({ status: 400, code: "invalid_transition", message: "Invalid participation transition.", retryable: false })

    const trusted = await getTrustedMusicWriteClient(supabase)
    const nowIso = new Date().toISOString()
    const { data, error } = await trusted
      .from("creator_public_infrastructure_participations")
      .insert({
        user_id: user.id,
        entity_id: payload.entity_id,
        organization_id: payload.organization_id || null,
        terms_version: payload.terms_version,
        status: "active",
        activated_at: nowIso,
      })
      .select("id, entity_id, status, terms_version, activated_at")
      .single()

    if (error)
      return jsonError({ status: 500, code: "participation_enroll_failed", message: "Unable to enroll.", retryable: true })

    await trusted.from("creator_public_audit_events").insert({
      actor_user_id: user.id,
      event_type: "participation.enrolled",
      object_type: "creator_public_infrastructure_participations",
      object_id: data.id,
      payload: { entity_id: payload.entity_id },
    })

    return NextResponse.json({ data, disclaimer: CREATOR_PUBLIC_INFRASTRUCTURE_DISCLAIMER }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "validation_error", message: "Invalid participation payload.", retryable: false, issues: error.issues })
    return jsonError({ status: 500, code: "participation_enroll_failed", message: "Unable to enroll.", retryable: true })
  }
}

export async function DELETE(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveCreatorPublicInfrastructureFlags(supabase, user.id)
  if (!flags.creator_public_infrastructure_participation_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Public-infrastructure participation is not available.", retryable: false })

  const participationId = request.nextUrl.searchParams.get("id")
  if (!participationId)
    return jsonError({ status: 400, code: "validation_error", message: "Participation id is required.", retryable: false })

  const { data: existing } = await supabase
    .from("creator_public_infrastructure_participations")
    .select("id, status")
    .eq("id", participationId)
    .eq("user_id", user.id)
    .maybeSingle()

  if (!existing)
    return jsonError({ status: 404, code: "not_found", message: "Participation not found.", retryable: false })

  if (!canTransitionParticipation({ from: existing.status as any, to: "withdrawn" }) &&
      !canTransitionParticipation({ from: existing.status as any, to: "withdrawing" }))
    return jsonError({ status: 403, code: "invalid_transition", message: "Cannot withdraw from current state.", retryable: false })

  const nowIso = new Date().toISOString()
  const { data, error } = await supabase
    .from("creator_public_infrastructure_participations")
    .update({
      status: "withdrawn",
      withdrawn_at: nowIso,
    })
    .eq("id", participationId)
    .select("id, status, withdrawn_at")
    .single()

  if (error)
    return jsonError({ status: 500, code: "participation_withdraw_failed", message: "Unable to withdraw.", retryable: true })

  const trusted = await getTrustedMusicWriteClient(supabase)
  await trusted.from("creator_public_outbox").insert({
    event_type: "participation.withdrawn",
    aggregate_type: "creator_public_infrastructure_participations",
    aggregate_id: data.id,
    payload: { user_id: user.id },
    idempotency_key: `cpi-participation-withdraw:${data.id}:${nowIso}`,
  })

  return NextResponse.json({ data, disclaimer: CREATOR_PUBLIC_INFRASTRUCTURE_DISCLAIMER, withdrawalQueued: true })
}
