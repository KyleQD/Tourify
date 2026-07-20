import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { LIQUIDITY_DISCLAIMER } from "@/lib/music/marketplace/marketplace-domain"
import { resolveMusicMarketplaceFlags } from "@/lib/music/marketplace/music-marketplace-flags"

export const dynamic = "force-dynamic"

const querySchema = z.object({
  security_class_id: z.string().uuid(),
})

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveMusicMarketplaceFlags(supabase, user.id)
  if (!flags.music_marketplace_secondary_sync_enabled)
    return jsonError({
      status: 404,
      code: "feature_disabled",
      message: "Market data sync is not available.",
      retryable: false,
    })

  const parsed = querySchema.safeParse({
    security_class_id: request.nextUrl.searchParams.get("security_class_id"),
  })
  if (!parsed.success)
    return jsonError({ status: 400, code: "validation_error", message: "security_class_id is required.", retryable: false })

  const { data, error } = await supabase
    .from("music_marketplace_market_data_ticks")
    .select("id, security_class_id, partner_id, bid_minor, ask_minor, last_minor, currency, observed_at, stale_after")
    .eq("security_class_id", parsed.data.security_class_id)
    .order("observed_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error)
    return jsonError({ status: 500, code: "market_data_query_failed", message: "Unable to load market data.", retryable: true })

  const now = Date.now()
  const stale = data ? new Date(data.stale_after).getTime() < now : true

  return NextResponse.json({
    data: data || null,
    stale,
    source: data?.partner_id || null,
    disclaimer: LIQUIDITY_DISCLAIMER,
    note: "Market data is partner-sourced and labeled for staleness. No liquidity guarantee.",
    enabled: true,
  })
}
