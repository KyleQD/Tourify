import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createHash } from "crypto"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { CREATOR_COOPERATIVE_DISCLAIMER } from "@/lib/music/creator-cooperative/cooperative-disclaimer"
import { resolveCreatorCooperativeFlags } from "@/lib/music/creator-cooperative/creator-cooperative-flags"
import { permitsContributionUse } from "@/lib/music/creator-cooperative/data-contribution-license"

export const dynamic = "force-dynamic"

const createSchema = z.object({
  member_id: z.string().uuid(),
  permitted_purposes: z.array(z.string()).min(1),
  prohibited_purposes: z.array(z.string()).default([]),
  data_categories: z.array(z.string()).min(1),
  source_ids: z.array(z.string()).min(1),
  recipient_ids: z.array(z.string()).min(1),
  ai_training_allowed: z.boolean().default(false),
  commercial_research_allowed: z.boolean().default(false),
  ends_at: z.string().datetime().optional().nullable(),
})

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveCreatorCooperativeFlags(supabase, user.id)
  if (!flags.creator_data_contribution_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Data contribution is not available.", retryable: false })

  const { data: members } = await supabase
    .from("creator_cooperative_members")
    .select("id")
    .eq("user_id", user.id)

  const memberIds = (members || []).map((m: { id: string }) => m.id)
  if (memberIds.length === 0)
    return NextResponse.json({ data: [], disclaimer: CREATOR_COOPERATIVE_DISCLAIMER, enabled: true })

  const { data, error } = await supabase
    .from("creator_data_contribution_licenses")
    .select("id, member_id, status, version, permitted_purposes, data_categories, ai_training_allowed, commercial_research_allowed, starts_at, ends_at, revoked_at")
    .in("member_id", memberIds)
    .order("created_at", { ascending: false })
    .limit(50)

  if (error)
    return jsonError({ status: 500, code: "contributions_query_failed", message: "Unable to load contribution licences.", retryable: true })

  return NextResponse.json({
    data: data || [],
    disclaimer: CREATOR_COOPERATIVE_DISCLAIMER,
    note: "Phase 8 intelligence consent is not a contribution licence.",
    enabled: true,
  })
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveCreatorCooperativeFlags(supabase, user.id)
    if (!flags.creator_data_contribution_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Data contribution is not available.", retryable: false })

    const payload = createSchema.parse(await request.json())
    if (payload.ai_training_allowed)
      return jsonError({ status: 403, code: "ai_training_gated", message: "AI training contribution remains separately gated pending counsel.", retryable: false })

    const { data: member } = await supabase
      .from("creator_cooperative_members")
      .select("id, status")
      .eq("id", payload.member_id)
      .eq("user_id", user.id)
      .maybeSingle()

    if (!member || !["approved", "active", "applied", "under_review"].includes(member.status))
      return jsonError({ status: 403, code: "membership_required", message: "Valid cooperative membership record required.", retryable: false })

    const documentHash = createHash("sha256").update(JSON.stringify(payload)).digest("hex")
    const nowIso = new Date().toISOString()
    const { data, error } = await supabase
      .from("creator_data_contribution_licenses")
      .insert({
        member_id: payload.member_id,
        status: "active",
        permitted_purposes: payload.permitted_purposes,
        prohibited_purposes: payload.prohibited_purposes,
        data_categories: payload.data_categories,
        source_ids: payload.source_ids,
        recipient_ids: payload.recipient_ids,
        ai_training_allowed: false,
        commercial_research_allowed: payload.commercial_research_allowed,
        starts_at: nowIso,
        ends_at: payload.ends_at || null,
        accepted_at: nowIso,
        document_hash: documentHash,
      })
      .select("id, status, version, permitted_purposes")
      .single()

    if (error)
      return jsonError({ status: 500, code: "contribution_create_failed", message: "Unable to create contribution licence.", retryable: true })

    const permitted = permitsContributionUse({
      request: {
        purpose: payload.permitted_purposes[0],
        dataCategory: payload.data_categories[0],
        sourceId: payload.source_ids[0],
        recipientId: payload.recipient_ids[0],
        requestedAt: nowIso,
        aiTraining: false,
        commercialUse: false,
      },
      licence: {
        status: "active",
        permittedPurposes: payload.permitted_purposes,
        dataCategories: payload.data_categories,
        sourceIds: payload.source_ids,
        recipientIds: payload.recipient_ids,
        aiTrainingAllowed: false,
        commercialResearchAllowed: payload.commercial_research_allowed,
        startsAt: nowIso,
        endsAt: payload.ends_at || undefined,
      },
      now: nowIso,
    })

    return NextResponse.json({
      data,
      permittedCheck: permitted,
      disclaimer: CREATOR_COOPERATIVE_DISCLAIMER,
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "validation_error", message: "Invalid contribution payload.", retryable: false, issues: error.issues })
    return jsonError({ status: 500, code: "contribution_create_failed", message: "Unable to create contribution licence.", retryable: true })
  }
}

export async function DELETE(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveCreatorCooperativeFlags(supabase, user.id)
  if (!flags.creator_data_contribution_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Data contribution is not available.", retryable: false })

  const licenceId = request.nextUrl.searchParams.get("id")
  if (!licenceId)
    return jsonError({ status: 400, code: "validation_error", message: "Licence id is required.", retryable: false })

  const nowIso = new Date().toISOString()
  const { data: licence } = await supabase
    .from("creator_data_contribution_licenses")
    .select("id, member_id")
    .eq("id", licenceId)
    .maybeSingle()

  if (!licence)
    return jsonError({ status: 404, code: "not_found", message: "Licence not found.", retryable: false })

  const { data: member } = await supabase
    .from("creator_cooperative_members")
    .select("id")
    .eq("id", licence.member_id)
    .eq("user_id", user.id)
    .maybeSingle()

  if (!member)
    return jsonError({ status: 403, code: "forbidden", message: "Not your contribution licence.", retryable: false })

  const { data, error } = await supabase
    .from("creator_data_contribution_licenses")
    .update({ status: "revoked", revoked_at: nowIso })
    .eq("id", licenceId)
    .select("id, status, revoked_at")
    .single()

  if (error)
    return jsonError({ status: 500, code: "contribution_revoke_failed", message: "Unable to revoke contribution licence.", retryable: true })

  await supabase.from("creator_cooperative_outbox").insert({
    event_type: "contribution.revoked",
    aggregate_id: data.id,
    payload: { user_id: user.id, licence_id: data.id },
    idempotency_key: `contribution-revoke:${data.id}:${nowIso}`,
  })

  return NextResponse.json({ data, disclaimer: CREATOR_COOPERATIVE_DISCLAIMER, revokeQueued: true })
}
