import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { getTrustedMusicWriteClient } from "@/lib/music/music-access"
import { allocateRoyalty } from "@/lib/music/royalties/allocation-engine"
import { resolveMusicRoyaltiesFlags } from "@/lib/music/royalties/music-royalties-flags"
import type { IssuedPassportSnapshotV1, RoyaltyEligibleInterestV1 } from "@/lib/music/royalties/royalty-domain"
import { enqueueRoyaltyOutboxEvent, minorUnitsToDb } from "@/lib/music/royalties/royalties-access"
import { parseMinorUnits } from "@/lib/music/royalties/money"

export const dynamic = "force-dynamic"

const allocateSchema = z.object({
  journal_id: z.string().uuid(),
  rights_snapshot_id: z.string().uuid(),
  rights_category: z.string().min(1).max(80),
  usage_date: z.string().min(8).max(32),
  territory: z.string().max(16).optional(),
  allocation_policy_version: z.string().max(40).default("1.0.0"),
})

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveMusicRoyaltiesFlags(supabase, user.id)
    if (!flags.music_royalties_ledger_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Royalty ledger allocations are not available.", retryable: false })

    const payload = allocateSchema.parse(await request.json())
    const trusted = await getTrustedMusicWriteClient(supabase)

    const { data: journal } = await trusted
      .from("music_royalties_journals")
      .select("id, owner_user_id, currency, status")
      .eq("id", payload.journal_id)
      .eq("owner_user_id", user.id)
      .maybeSingle()
    if (!journal)
      return jsonError({ status: 404, code: "journal_not_found", message: "Journal not found.", retryable: false })

    const { data: snapshot } = await trusted
      .from("music_royalties_rights_snapshots")
      .select("*")
      .eq("id", payload.rights_snapshot_id)
      .eq("owner_user_id", user.id)
      .maybeSingle()
    if (!snapshot)
      return jsonError({ status: 404, code: "rights_snapshot_not_found", message: "Rights snapshot not found.", retryable: false })
    if (snapshot.freeze_status === "frozen")
      return jsonError({ status: 409, code: "rights_snapshot_frozen", message: "Frozen rights snapshot cannot be allocated.", retryable: false })

    const interests = ((snapshot.snapshot as IssuedPassportSnapshotV1)?.interests || []) as RoyaltyEligibleInterestV1[]
    if (!interests.length)
      return jsonError({ status: 400, code: "no_interests", message: "Rights snapshot has no eligible interests.", retryable: false })

    const { data: entries } = await trusted
      .from("music_royalties_journal_entries")
      .select("id, account_code, debit_minor, credit_minor, source_line_id")
      .eq("journal_id", journal.id)
      .eq("account_code", "4100")

    if (!entries?.length)
      return jsonError({ status: 400, code: "no_revenue_entries", message: "Journal has no royalty revenue entries to allocate.", retryable: false })

    const { data: run, error: runError } = await trusted
      .from("music_royalties_allocation_runs")
      .insert({
        owner_user_id: user.id,
        journal_id: journal.id,
        rights_snapshot_id: snapshot.id,
        allocation_policy_version: payload.allocation_policy_version,
        status: "draft",
      })
      .select("*")
      .maybeSingle()

    if (runError || !run)
      return jsonError({ status: 500, code: "allocation_run_failed", message: "Unable to create allocation run.", retryable: true })

    const allocationRows = []
    for (const entry of entries) {
      const amountMinor = parseMinorUnits(entry.credit_minor || entry.debit_minor || "0")
      if (amountMinor <= 0n) continue
      const allocated = allocateRoyalty({
        journalLineId: entry.id,
        amount: { currency: journal.currency, minorUnits: amountMinor },
        usageDate: payload.usage_date,
        territory: payload.territory,
        rightsCategory: payload.rights_category,
        interests,
      })
      for (const row of allocated) {
        allocationRows.push({
          allocation_run_id: run.id,
          journal_entry_id: entry.id,
          rights_interest_id: row.interest.interestId,
          payee_party_id: row.payeePartyId,
          currency: journal.currency,
          gross_minor: minorUnitsToDb(row.amount.minorUnits),
          deductions_minor: "0",
          recouped_minor: "0",
          held_minor: "0",
          payable_minor: minorUnitsToDb(row.amount.minorUnits),
          explanation: {
            share: {
              numerator: row.interest.numerator,
              denominator: row.interest.denominator,
            },
            rights_category: payload.rights_category,
            territory: payload.territory || null,
          },
        })
      }
    }

    if (!allocationRows.length)
      return jsonError({ status: 400, code: "no_eligible_allocations", message: "No eligible interests matched journal entries.", retryable: false })

    const { data: allocations, error: allocError } = await trusted
      .from("music_royalties_allocations")
      .insert(allocationRows)
      .select("*")

    if (allocError)
      return jsonError({ status: 500, code: "allocations_insert_failed", message: "Unable to store allocations.", retryable: true })

    await trusted
      .from("music_royalties_allocation_runs")
      .update({ status: "review" })
      .eq("id", run.id)

    await enqueueRoyaltyOutboxEvent({
      supabase: trusted,
      ownerUserId: user.id,
      eventType: "music.royalty.allocation.completed",
      dedupeKey: run.id,
      payload: { allocationRunId: run.id, allocationCount: allocations?.length || 0 },
    })

    return NextResponse.json({
      data: {
        allocation_run: { ...run, status: "review" },
        allocations: allocations || [],
      },
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "invalid_request", message: "Invalid allocation payload.", issues: error.issues })
    console.error("allocation failed", error)
    return jsonError({ status: 500, code: "allocation_internal", message: "Unexpected allocation error.", retryable: true })
  }
}
