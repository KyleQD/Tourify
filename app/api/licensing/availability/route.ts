import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { LICENSING_DISCLAIMER } from "@/lib/music/licensing/delivery-gate"
import { resolveMusicLicensingFlags } from "@/lib/music/licensing/music-licensing-flags"
import { resolveAvailability } from "@/lib/music/licensing/rights-availability"

export const dynamic = "force-dynamic"

const upsertSchema = z.object({
  artist_music_id: z.string().uuid(),
  asset_kind: z.enum(["composition", "recording", "artwork", "likeness", "other"]).default("recording"),
  right_category: z.string().min(1).max(120),
  territories: z.array(z.string()).default([]),
  permitted_uses: z.array(z.unknown()).default([]),
  exclusions: z.array(z.unknown()).default([]),
  configured: z.boolean().default(true),
  active_authority: z.boolean().default(false),
  disputed: z.boolean().default(false),
  expired: z.boolean().default(false),
  territory_allowed: z.boolean().default(false),
  use_allowed: z.boolean().default(false),
  pre_clearance_envelope_matches: z.boolean().default(false),
  quote_rule_exists: z.boolean().default(false),
  valid_until: z.string().datetime().optional().nullable(),
})

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveMusicLicensingFlags(supabase, user.id)
  if (!flags.music_licensing_availability_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Licensing availability is not available.", retryable: false })

  const artistMusicId = request.nextUrl.searchParams.get("artist_music_id")
  let query = supabase
    .from("music_license_availability")
    .select("id, artist_music_id, asset_kind, right_category, status, territories, valid_from, valid_until, created_at")
    .eq("created_by", user.id)
    .order("created_at", { ascending: false })
    .limit(100)
  if (artistMusicId) query = query.eq("artist_music_id", artistMusicId)

  const { data, error } = await query
  if (error)
    return jsonError({ status: 500, code: "availability_query_failed", message: "Unable to load availability.", retryable: true })

  return NextResponse.json({ data: data || [], disclaimer: LICENSING_DISCLAIMER, enabled: true })
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveMusicLicensingFlags(supabase, user.id)
    if (!flags.music_licensing_availability_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Licensing availability is not available.", retryable: false })

    const payload = upsertSchema.parse(await request.json())
    const status = resolveAvailability({
      configured: payload.configured,
      activeAuthority: payload.active_authority,
      disputed: payload.disputed,
      expired: payload.expired,
      territoryAllowed: payload.territory_allowed,
      useAllowed: payload.use_allowed,
      preClearanceEnvelopeMatches: payload.pre_clearance_envelope_matches,
      quoteRuleExists: payload.quote_rule_exists,
    })

    const { data, error } = await supabase
      .from("music_license_availability")
      .insert({
        artist_music_id: payload.artist_music_id,
        asset_kind: payload.asset_kind,
        right_category: payload.right_category,
        territories: payload.territories,
        permitted_uses: payload.permitted_uses,
        exclusions: payload.exclusions,
        status,
        valid_until: payload.valid_until || null,
        created_by: user.id,
        version: 1,
      })
      .select("id, artist_music_id, status, right_category")
      .single()

    if (error)
      return jsonError({ status: 500, code: "availability_upsert_failed", message: "Unable to save availability.", retryable: true })

    return NextResponse.json({
      data,
      disclaimer: LICENSING_DISCLAIMER,
      note: "Passport claims are evidence, not automatic licensing authority. Incomplete authority defaults to deny.",
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "validation_error", message: "Invalid availability payload.", retryable: false, issues: error.issues })
    return jsonError({ status: 500, code: "availability_upsert_failed", message: "Unable to save availability.", retryable: true })
  }
}
