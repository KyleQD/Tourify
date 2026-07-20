import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { CREATOR_DIGITAL_COMMONS_DISCLAIMER } from "@/lib/music/creator-digital-commons/commons-disclaimer"
import { resolveCreatorDigitalCommonsFlags } from "@/lib/music/creator-digital-commons/creator-digital-commons-flags"
import { getTrustedMusicWriteClient } from "@/lib/music/music-access"

export const dynamic = "force-dynamic"

const applySchema = z.object({
  steward_id: z.string().uuid(),
  scopes: z.array(z.string()).default(["sandbox_readiness"]),
  policy_version: z.string().min(1).default("1.0.0"),
})

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveCreatorDigitalCommonsFlags(supabase, user.id)
  if (!flags.creator_digital_commons_participation_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Commons participation is not available.", retryable: false })

  const { data, error } = await supabase
    .from("creator_commons_participations")
    .select("id, steward_id, status, scopes, policy_version, activated_at, withdrawn_at, created_at")
    .eq("participant_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50)

  if (error)
    return jsonError({ status: 500, code: "participation_query_failed", message: "Unable to load participations.", retryable: true })

  return NextResponse.json({
    data: data || [],
    disclaimer: CREATOR_DIGITAL_COMMONS_DISCLAIMER,
    note: "Tourify account and Phase 8–11 relationships do not create commons participation.",
    enabled: true,
  })
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveCreatorDigitalCommonsFlags(supabase, user.id)
    if (!flags.creator_digital_commons_participation_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Commons participation is not available.", retryable: false })

    if (flags.creator_digital_commons_tokenized_identity_enabled)
      return jsonError({ status: 403, code: "tokenized_identity_blocked", message: "Tokenized identity remains hard-disabled.", retryable: false })

    const payload = applySchema.parse(await request.json())
    const trusted = await getTrustedMusicWriteClient(supabase)
    const nowIso = new Date().toISOString()
    const { data, error } = await trusted
      .from("creator_commons_participations")
      .insert({
        steward_id: payload.steward_id,
        participant_user_id: user.id,
        status: "active",
        scopes: payload.scopes,
        policy_version: payload.policy_version,
        activated_at: nowIso,
      })
      .select("id, steward_id, status, scopes, activated_at")
      .single()

    if (error)
      return jsonError({ status: 500, code: "participation_apply_failed", message: "Unable to apply for participation.", retryable: true })

    await trusted.from("creator_commons_audit_events").insert({
      actor_user_id: user.id,
      event_type: "participation.enrolled",
      aggregate_type: "creator_commons_participations",
      aggregate_id: data.id,
      payload: { steward_id: payload.steward_id },
      policy_version: payload.policy_version,
      idempotency_key: `cc-participation-enroll:${data.id}:${nowIso}`,
    })

    return NextResponse.json({ data, disclaimer: CREATOR_DIGITAL_COMMONS_DISCLAIMER }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "validation_error", message: "Invalid participation payload.", retryable: false, issues: error.issues })
    return jsonError({ status: 500, code: "participation_apply_failed", message: "Unable to apply for participation.", retryable: true })
  }
}

export async function DELETE(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveCreatorDigitalCommonsFlags(supabase, user.id)
  if (!flags.creator_digital_commons_participation_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Commons participation is not available.", retryable: false })

  const participationId = request.nextUrl.searchParams.get("id")
  if (!participationId)
    return jsonError({ status: 400, code: "validation_error", message: "Participation id is required.", retryable: false })

  const { data: existing } = await supabase
    .from("creator_commons_participations")
    .select("id, status")
    .eq("id", participationId)
    .eq("participant_user_id", user.id)
    .maybeSingle()

  if (!existing)
    return jsonError({ status: 404, code: "not_found", message: "Participation not found.", retryable: false })

  if (!["applied", "active", "suspended"].includes(existing.status))
    return jsonError({ status: 403, code: "invalid_transition", message: "Cannot withdraw from current state.", retryable: false })

  const nowIso = new Date().toISOString()
  const { data, error } = await supabase
    .from("creator_commons_participations")
    .update({ status: "withdrawn", withdrawn_at: nowIso, updated_at: nowIso })
    .eq("id", participationId)
    .select("id, status, withdrawn_at")
    .single()

  if (error)
    return jsonError({ status: 500, code: "participation_withdraw_failed", message: "Unable to withdraw.", retryable: true })

  const trusted = await getTrustedMusicWriteClient(supabase)
  await trusted.from("creator_commons_outbox").insert({
    topic: "participation.withdrawn",
    aggregate_id: data.id,
    payload: { user_id: user.id },
    idempotency_key: `cc-participation-withdraw:${data.id}:${nowIso}`,
  })

  return NextResponse.json({ data, disclaimer: CREATOR_DIGITAL_COMMONS_DISCLAIMER, withdrawalQueued: true })
}
