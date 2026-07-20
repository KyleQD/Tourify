import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { getTrustedMusicWriteClient } from "@/lib/music/music-access"
import { resolveMusicRoyaltiesFlags } from "@/lib/music/royalties/music-royalties-flags"
import { enqueueRoyaltyOutboxEvent, minorUnitsToDb, sha256Hex } from "@/lib/music/royalties/royalties-access"
import { parseMinorUnits } from "@/lib/music/royalties/money"

export const dynamic = "force-dynamic"

const instructionSchema = z.object({
  payee_account_id: z.string().uuid(),
  payee_party_id: z.string().min(1).max(120),
  amount_minor: z.string().regex(/^[1-9]\d*$/),
  provider_recipient_id: z.string().min(1).max(200).optional(),
})

const createBatchSchema = z.object({
  currency: z.string().length(3).default("USD"),
  instructions: z.array(instructionSchema).min(1).max(100),
  metadata: z.record(z.string(), z.unknown()).default({}),
})

const approveSchema = z.object({
  batch_id: z.string().uuid(),
  action: z.enum(["approve", "cancel"]).default("approve"),
})

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveMusicRoyaltiesFlags(supabase, user.id)
    if (!flags.music_payouts_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Royalty payouts are not available.", retryable: false })

    const payload = createBatchSchema.parse(await request.json())
    const trusted = await getTrustedMusicWriteClient(supabase)

    const { data: batch, error: batchError } = await trusted
      .from("music_royalties_payout_batches")
      .insert({
        owner_user_id: user.id,
        currency: payload.currency.toUpperCase(),
        status: "pending_approval",
        maker_user_id: user.id,
        metadata: payload.metadata,
      })
      .select("*")
      .maybeSingle()

    if (batchError || !batch)
      return jsonError({ status: 500, code: "payout_batch_create_failed", message: "Unable to create payout batch.", retryable: true })

    const instructionRows = []
    for (const item of payload.instructions) {
      const { data: account } = await trusted
        .from("music_royalties_payee_accounts")
        .select("id, provider_account_id, status, music_royalties_payout_readiness(*)")
        .eq("id", item.payee_account_id)
        .eq("owner_user_id", user.id)
        .maybeSingle()
      if (!account)
        return jsonError({ status: 400, code: "payee_account_not_found", message: "Payee account not found.", retryable: false })

      const readiness = Array.isArray(account.music_royalties_payout_readiness)
        ? account.music_royalties_payout_readiness[0]
        : account.music_royalties_payout_readiness
      if (!readiness?.payout_ready)
        return jsonError({
          status: 400,
          code: "payee_not_ready",
          message: `Payee ${item.payee_party_id} is not payout-ready.`,
          retryable: false,
        })

      const recipientId = item.provider_recipient_id || account.provider_account_id
      if (!recipientId)
        return jsonError({
          status: 400,
          code: "provider_recipient_required",
          message: "Stripe Connect account id is required for payout instructions.",
          retryable: false,
        })

      const amountMinor = parseMinorUnits(item.amount_minor)
      const idempotencyKey = sha256Hex(`${batch.id}:${item.payee_account_id}:${amountMinor.toString()}`)
      instructionRows.push({
        batch_id: batch.id,
        payee_account_id: item.payee_account_id,
        payee_party_id: item.payee_party_id,
        provider: "stripe_connect",
        provider_recipient_id: recipientId,
        currency: payload.currency.toUpperCase(),
        amount_minor: minorUnitsToDb(amountMinor),
        status: "draft",
        idempotency_key: idempotencyKey,
      })
    }

    const { data: instructions, error: instructionError } = await trusted
      .from("music_royalties_payout_instructions")
      .insert(instructionRows)
      .select("*")

    if (instructionError)
      return jsonError({ status: 500, code: "payout_instructions_create_failed", message: "Unable to create payout instructions.", retryable: true })

    await enqueueRoyaltyOutboxEvent({
      supabase: trusted,
      ownerUserId: user.id,
      eventType: "music.payout.instruction.created",
      dedupeKey: batch.id,
      payload: { batchId: batch.id, instructionCount: instructions?.length || 0 },
    })

    return NextResponse.json({ data: { batch, instructions: instructions || [] } }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "invalid_request", message: "Invalid payout batch payload.", issues: error.issues })
    console.error("payout batch create failed", error)
    return jsonError({ status: 500, code: "payout_batch_internal", message: "Unexpected payout batch error.", retryable: true })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveMusicRoyaltiesFlags(supabase, user.id)
    if (!flags.music_payouts_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Royalty payouts are not available.", retryable: false })

    const payload = approveSchema.parse(await request.json())
    const trusted = await getTrustedMusicWriteClient(supabase)

    const { data: batch } = await trusted
      .from("music_royalties_payout_batches")
      .select("*")
      .eq("id", payload.batch_id)
      .eq("owner_user_id", user.id)
      .maybeSingle()
    if (!batch)
      return jsonError({ status: 404, code: "batch_not_found", message: "Payout batch not found.", retryable: false })

    if (payload.action === "cancel") {
      const { data: cancelled, error } = await trusted
        .from("music_royalties_payout_batches")
        .update({ status: "cancelled" })
        .eq("id", batch.id)
        .select("*")
        .maybeSingle()
      if (error)
        return jsonError({ status: 500, code: "batch_cancel_failed", message: "Unable to cancel batch.", retryable: true })
      return NextResponse.json({ data: cancelled })
    }

    if (batch.status !== "pending_approval")
      return jsonError({ status: 400, code: "batch_not_pending", message: "Batch is not pending approval.", retryable: false })

    if (batch.maker_user_id === user.id)
      return jsonError({
        status: 403,
        code: "maker_checker_required",
        message: "Checker must differ from maker for payout approval.",
        retryable: false,
      })

    const { data: approved, error: approveError } = await trusted
      .from("music_royalties_payout_batches")
      .update({
        status: "approved",
        checker_user_id: user.id,
        approved_at: new Date().toISOString(),
      })
      .eq("id", batch.id)
      .select("*")
      .maybeSingle()

    if (approveError)
      return jsonError({ status: 500, code: "batch_approve_failed", message: "Unable to approve batch.", retryable: true })

    await trusted
      .from("music_royalties_payout_instructions")
      .update({ status: "approved", approved_at: new Date().toISOString() })
      .eq("batch_id", batch.id)
      .eq("status", "draft")

    return NextResponse.json({ data: approved })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "invalid_request", message: "Invalid approval payload.", issues: error.issues })
    console.error("payout batch approve failed", error)
    return jsonError({ status: 500, code: "payout_batch_approve_internal", message: "Unexpected approval error.", retryable: true })
  }
}
