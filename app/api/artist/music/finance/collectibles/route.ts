import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { getTrustedMusicWriteClient } from "@/lib/music/music-access"
import { assertNonInvestmentCollectible } from "@/lib/music/finance/offerings"
import { resolveMusicRoyaltiesFlags } from "@/lib/music/royalties/music-royalties-flags"

export const dynamic = "force-dynamic"

const createSchema = z.object({
  artist_music_id: z.string().uuid().optional().nullable(),
  title: z.string().min(1).max(200),
  utility_description: z.string().min(1).max(4000),
  status: z.enum(["draft", "published", "retired"]).default("draft"),
  implies_investment: z.literal(false).default(false),
  metadata: z.record(z.string(), z.unknown()).default({}),
})

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveMusicRoyaltiesFlags(supabase, user.id)
  if (!flags.music_fan_utility_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Fan collectibles are not available.", retryable: false })

  const { data, error } = await supabase
    .from("music_finance_fan_collectibles")
    .select("*")
    .eq("owner_user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(100)

  if (error)
    return jsonError({ status: 500, code: "collectibles_query_failed", message: "Unable to load collectibles.", retryable: true })

  return NextResponse.json({ data: data || [], enabled: true })
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveMusicRoyaltiesFlags(supabase, user.id)
    if (!flags.music_fan_utility_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Fan collectibles are not available.", retryable: false })

    const payload = createSchema.parse(await request.json())
    assertNonInvestmentCollectible(payload.implies_investment)

    if (payload.artist_music_id) {
      const { data: track } = await supabase
        .from("artist_music")
        .select("id")
        .eq("id", payload.artist_music_id)
        .eq("user_id", user.id)
        .maybeSingle()
      if (!track)
        return jsonError({ status: 404, code: "track_not_found", message: "Artist music track not found.", retryable: false })
    }

    const trusted = await getTrustedMusicWriteClient(supabase)
    const { data, error } = await trusted
      .from("music_finance_fan_collectibles")
      .insert({
        owner_user_id: user.id,
        artist_music_id: payload.artist_music_id || null,
        title: payload.title,
        utility_description: payload.utility_description,
        status: payload.status,
        implies_investment: false,
        metadata: payload.metadata,
        updated_at: new Date().toISOString(),
      })
      .select("*")
      .maybeSingle()

    if (error)
      return jsonError({ status: 500, code: "collectible_create_failed", message: "Unable to create collectible.", retryable: true })

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "invalid_request", message: "Invalid collectible payload.", issues: error.issues })
    if (error instanceof Error && error.message === "fan_utility_cannot_imply_investment")
      return jsonError({
        status: 400,
        code: "investment_implied",
        message: "Fan collectibles cannot imply investment or secondary market participation.",
        retryable: false,
      })
    console.error("collectible create failed", error)
    return jsonError({ status: 500, code: "collectible_internal", message: "Unexpected collectible error.", retryable: true })
  }
}
