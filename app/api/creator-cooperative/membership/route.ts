import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { CREATOR_COOPERATIVE_DISCLAIMER } from "@/lib/music/creator-cooperative/cooperative-disclaimer"
import { resolveCreatorCooperativeFlags } from "@/lib/music/creator-cooperative/creator-cooperative-flags"
import { canTransitionMembership } from "@/lib/music/creator-cooperative/membership-state-machine"

export const dynamic = "force-dynamic"

const applySchema = z.object({
  entity_id: z.string().uuid(),
  membership_class: z.string().default("applicant"),
  application_notes: z.string().optional(),
  governing_document_version: z.string().default("draft"),
})

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveCreatorCooperativeFlags(supabase, user.id)
  if (!flags.creator_cooperative_membership_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Cooperative membership is not available.", retryable: false })

  const { data, error } = await supabase
    .from("creator_cooperative_members")
    .select("id, entity_id, membership_class, status, governing_document_version, joined_at, withdrawn_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50)

  if (error)
    return jsonError({ status: 500, code: "membership_query_failed", message: "Unable to load membership.", retryable: true })

  return NextResponse.json({
    data: data || [],
    disclaimer: CREATOR_COOPERATIVE_DISCLAIMER,
    note: "Tourify account status is not cooperative membership.",
    enabled: true,
  })
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveCreatorCooperativeFlags(supabase, user.id)
    if (!flags.creator_cooperative_membership_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Cooperative membership is not available.", retryable: false })

    if (flags.cooperative_token_or_transfer_enabled)
      return jsonError({ status: 403, code: "token_transfer_blocked", message: "Transferable membership remains separately gated.", retryable: false })

    const payload = applySchema.parse(await request.json())
    if (!canTransitionMembership({ from: "draft", to: "applied" }))
      return jsonError({ status: 400, code: "invalid_transition", message: "Invalid membership transition.", retryable: false })

    const { data, error } = await supabase
      .from("creator_cooperative_members")
      .insert({
        entity_id: payload.entity_id,
        user_id: user.id,
        membership_class: payload.membership_class,
        status: "applied",
        governing_document_version: payload.governing_document_version,
        application_notes: payload.application_notes || null,
      })
      .select("id, entity_id, status, membership_class")
      .single()

    if (error)
      return jsonError({ status: 500, code: "membership_apply_failed", message: "Unable to apply for membership.", retryable: true })

    return NextResponse.json({
      data,
      disclaimer: CREATOR_COOPERATIVE_DISCLAIMER,
      note: "Application is not active membership. Phase 8 consent does not grant membership.",
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "validation_error", message: "Invalid membership payload.", retryable: false, issues: error.issues })
    return jsonError({ status: 500, code: "membership_apply_failed", message: "Unable to apply for membership.", retryable: true })
  }
}

export async function DELETE(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveCreatorCooperativeFlags(supabase, user.id)
  if (!flags.creator_cooperative_membership_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Cooperative membership is not available.", retryable: false })

  const memberId = request.nextUrl.searchParams.get("id")
  if (!memberId)
    return jsonError({ status: 400, code: "validation_error", message: "Membership id is required.", retryable: false })

  const { data: existing } = await supabase
    .from("creator_cooperative_members")
    .select("id, status")
    .eq("id", memberId)
    .eq("user_id", user.id)
    .maybeSingle()

  if (!existing)
    return jsonError({ status: 404, code: "not_found", message: "Membership not found.", retryable: false })

  if (!canTransitionMembership({ from: existing.status as any, to: "withdrawn" }))
    return jsonError({ status: 403, code: "invalid_transition", message: "Membership cannot be withdrawn from current state.", retryable: false })

  const nowIso = new Date().toISOString()
  const { data, error } = await supabase
    .from("creator_cooperative_members")
    .update({ status: "withdrawn", withdrawn_at: nowIso })
    .eq("id", memberId)
    .eq("user_id", user.id)
    .select("id, status, withdrawn_at")
    .single()

  if (error)
    return jsonError({ status: 500, code: "membership_withdraw_failed", message: "Unable to withdraw membership.", retryable: true })

  await supabase.from("creator_cooperative_outbox").insert({
    event_type: "membership.withdrawn",
    aggregate_id: data.id,
    payload: { user_id: user.id, member_id: data.id },
    idempotency_key: `membership-withdraw:${data.id}:${nowIso}`,
  })

  return NextResponse.json({ data, disclaimer: CREATOR_COOPERATIVE_DISCLAIMER, withdrawalQueued: true })
}
