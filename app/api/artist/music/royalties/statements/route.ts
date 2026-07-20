import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { getTrustedMusicWriteClient } from "@/lib/music/music-access"
import { resolveMusicRoyaltiesFlags } from "@/lib/music/royalties/music-royalties-flags"
import { enqueueRoyaltyOutboxEvent, minorUnitsToDb, sha256Hex } from "@/lib/music/royalties/royalties-access"
import { parseMinorUnits } from "@/lib/music/royalties/money"

export const dynamic = "force-dynamic"

const issueSchema = z.object({
  allocation_run_id: z.string().uuid(),
  payee_party_id: z.string().min(1).max(120),
  payee_user_id: z.string().uuid().optional().nullable(),
  period_id: z.string().uuid().optional().nullable(),
  currency: z.string().length(3).default("USD"),
})

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveMusicRoyaltiesFlags(supabase, user.id)
  if (!flags.music_royalties_statements_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Royalty statements are not available.", retryable: false })

  const { data, error } = await supabase
    .from("music_royalties_participant_statements")
    .select("*")
    .or(`owner_user_id.eq.${user.id},payee_user_id.eq.${user.id}`)
    .order("created_at", { ascending: false })
    .limit(100)

  if (error)
    return jsonError({ status: 500, code: "statements_query_failed", message: "Unable to load statements.", retryable: true })

  return NextResponse.json({ data: data || [], enabled: true })
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveMusicRoyaltiesFlags(supabase, user.id)
    if (!flags.music_royalties_statements_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Royalty statements are not available.", retryable: false })

    const payload = issueSchema.parse(await request.json())
    const trusted = await getTrustedMusicWriteClient(supabase)

    const { data: run } = await trusted
      .from("music_royalties_allocation_runs")
      .select("id, owner_user_id, status")
      .eq("id", payload.allocation_run_id)
      .eq("owner_user_id", user.id)
      .maybeSingle()
    if (!run)
      return jsonError({ status: 404, code: "allocation_run_not_found", message: "Allocation run not found.", retryable: false })

    const { data: allocations } = await trusted
      .from("music_royalties_allocations")
      .select("*")
      .eq("allocation_run_id", run.id)
      .eq("payee_party_id", payload.payee_party_id)

    if (!allocations?.length)
      return jsonError({ status: 400, code: "no_allocations", message: "No allocations for this payee on the run.", retryable: false })

    const totals = allocations.reduce((acc: { gross: bigint; deductions: bigint; recouped: bigint; held: bigint; payable: bigint }, row: any) => ({
      gross: acc.gross + parseMinorUnits(row.gross_minor),
      deductions: acc.deductions + parseMinorUnits(row.deductions_minor),
      recouped: acc.recouped + parseMinorUnits(row.recouped_minor),
      held: acc.held + parseMinorUnits(row.held_minor),
      payable: acc.payable + parseMinorUnits(row.payable_minor),
    }), {
      gross: 0n,
      deductions: 0n,
      recouped: 0n,
      held: 0n,
      payable: 0n,
    })

    const statementPayload = {
      allocation_run_id: run.id,
      payee_party_id: payload.payee_party_id,
      currency: payload.currency.toUpperCase(),
      gross_minor: totals.gross.toString(),
      deductions_minor: totals.deductions.toString(),
      recouped_minor: totals.recouped.toString(),
      held_minor: totals.held.toString(),
      payable_minor: totals.payable.toString(),
      allocation_ids: allocations.map((row: any) => row.id),
    }
    const statementHash = sha256Hex(JSON.stringify(statementPayload))

    const { data: statement, error } = await trusted
      .from("music_royalties_participant_statements")
      .insert({
        owner_user_id: user.id,
        payee_party_id: payload.payee_party_id,
        payee_user_id: payload.payee_user_id || null,
        period_id: payload.period_id || null,
        currency: payload.currency.toUpperCase(),
        gross_minor: minorUnitsToDb(totals.gross),
        deductions_minor: minorUnitsToDb(totals.deductions),
        recouped_minor: minorUnitsToDb(totals.recouped),
        held_minor: minorUnitsToDb(totals.held),
        payable_minor: minorUnitsToDb(totals.payable),
        statement_hash: statementHash,
        status: "issued",
        issued_at: new Date().toISOString(),
        payload: statementPayload,
      })
      .select("*")
      .maybeSingle()

    if (error)
      return jsonError({ status: 500, code: "statement_issue_failed", message: "Unable to issue statement.", retryable: true })

    await enqueueRoyaltyOutboxEvent({
      supabase: trusted,
      ownerUserId: user.id,
      eventType: "music.royalty.statement.issued",
      dedupeKey: statement.id,
      payload: { statementId: statement.id, statementHash },
    })

    return NextResponse.json({ data: statement }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "invalid_request", message: "Invalid statement payload.", issues: error.issues })
    console.error("statement issue failed", error)
    return jsonError({ status: 500, code: "statement_internal", message: "Unexpected statement error.", retryable: true })
  }
}
