import { NextRequest, NextResponse } from "next/server"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { resolveMusicRoyaltiesFlags } from "@/lib/music/royalties/music-royalties-flags"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveMusicRoyaltiesFlags(supabase, user.id)
  if (!flags.music_payouts_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Royalty payouts are not available.", retryable: false })

  const { data: batches, error: batchError } = await supabase
    .from("music_royalties_payout_batches")
    .select(`
      id, public_id, currency, status, maker_user_id, checker_user_id, approved_at, submitted_at, created_at, metadata,
      music_royalties_payout_instructions(
        id, payee_party_id, provider, currency, amount_minor, status, idempotency_key,
        provider_transfer_id, failure_reason, created_at, submitted_at, paid_at
      )
    `)
    .eq("owner_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50)

  if (batchError)
    return jsonError({ status: 500, code: "payout_status_query_failed", message: "Unable to load payout status.", retryable: true })

  return NextResponse.json({ data: batches || [], enabled: true })
}
