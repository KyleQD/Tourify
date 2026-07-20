import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { resolveMusicMarketplaceFlags } from "@/lib/music/marketplace/music-marketplace-flags"

export const dynamic = "force-dynamic"

const createSchema = z.object({
  issuer_id: z.string().uuid(),
  artist_music_id: z.string().uuid().optional().nullable(),
  passport_version_id: z.string().uuid().optional().nullable(),
  royalty_snapshot_ref: z.string().max(200).optional().nullable(),
  valuation_id: z.string().uuid().optional().nullable(),
  finance_offering_id: z.string().uuid().optional().nullable(),
})

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveMusicMarketplaceFlags(supabase, user.id)
    if (!flags.music_marketplace_offerings_enabled)
      return jsonError({
        status: 404,
        code: "feature_disabled",
        message: "Marketplace catalog links are not available.",
        retryable: false,
      })

    const payload = createSchema.parse(await request.json())
    const { data: issuer } = await supabase
      .from("music_marketplace_issuers")
      .select("id")
      .eq("id", payload.issuer_id)
      .eq("owner_user_id", user.id)
      .maybeSingle()
    if (!issuer)
      return jsonError({ status: 404, code: "issuer_not_found", message: "Issuer not found.", retryable: false })

    const deficiencyCodes: string[] = []
    if (!payload.passport_version_id) deficiencyCodes.push("passport_snapshot_missing")
    if (!payload.royalty_snapshot_ref) deficiencyCodes.push("royalty_snapshot_missing")
    if (!payload.valuation_id) deficiencyCodes.push("valuation_snapshot_missing")

    const { data, error } = await supabase
      .from("music_marketplace_issuer_catalog_links")
      .insert({
        issuer_id: payload.issuer_id,
        artist_music_id: payload.artist_music_id || null,
        passport_version_id: payload.passport_version_id || null,
        royalty_snapshot_ref: payload.royalty_snapshot_ref || null,
        valuation_id: payload.valuation_id || null,
        finance_offering_id: payload.finance_offering_id || null,
        status: deficiencyCodes.length === 0 ? "eligible" : "candidate",
        deficiency_codes: deficiencyCodes,
      })
      .select("id, issuer_id, status, deficiency_codes, artist_music_id, valuation_id")
      .single()

    if (error)
      return jsonError({ status: 500, code: "catalog_link_failed", message: "Unable to link catalog asset.", retryable: true })

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "validation_error", message: "Invalid catalog link payload.", retryable: false, issues: error.issues })
    return jsonError({ status: 500, code: "catalog_link_failed", message: "Unable to link catalog asset.", retryable: true })
  }
}
