import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { computeDisclosureManifestHash, projectMarketingFields } from "@/lib/music/marketplace/disclosure-versions"
import { resolveMusicMarketplaceFlags } from "@/lib/music/marketplace/music-marketplace-flags"

export const dynamic = "force-dynamic"

const createSchema = z.object({
  offering_id: z.string().uuid(),
  version: z.number().int().positive(),
  instrument_terms: z.record(z.unknown()).default({}),
  risk_factors: z.array(z.unknown()).default([]),
  conflicts: z.array(z.unknown()).default([]),
  marketing_projection: z.record(z.unknown()).default({}),
  document_hashes: z.array(z.string().length(64)).default([]),
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
        message: "Marketplace disclosures are not available.",
        retryable: false,
      })

    const payload = createSchema.parse(await request.json())
    const { data: offering } = await supabase
      .from("music_marketplace_offerings")
      .select("id, issuer_id")
      .eq("id", payload.offering_id)
      .maybeSingle()
    if (!offering)
      return jsonError({ status: 404, code: "offering_not_found", message: "Offering not found.", retryable: false })

    const { data: issuer } = await supabase
      .from("music_marketplace_issuers")
      .select("id, owner_user_id")
      .eq("id", offering.issuer_id)
      .eq("owner_user_id", user.id)
      .maybeSingle()
    if (!issuer)
      return jsonError({ status: 404, code: "offering_not_found", message: "Offering not found.", retryable: false })

    const manifestHash = computeDisclosureManifestHash({
      offeringId: payload.offering_id,
      version: payload.version,
      instrumentTerms: payload.instrument_terms,
      riskFactors: payload.risk_factors,
      conflicts: payload.conflicts,
      documentHashes: payload.document_hashes,
    })

    const { data, error } = await supabase
      .from("music_marketplace_offering_versions")
      .insert({
        offering_id: payload.offering_id,
        version: payload.version,
        manifest_hash: manifestHash,
        status: "draft",
        marketing_projection: payload.marketing_projection,
        risk_factors: payload.risk_factors,
        conflicts: payload.conflicts,
      })
      .select("id, offering_id, version, manifest_hash, status, marketing_projection, created_at")
      .single()

    if (error)
      return jsonError({ status: 500, code: "disclosure_create_failed", message: "Unable to create disclosure version.", retryable: true })

    return NextResponse.json({
      data: {
        ...data,
        marketing: projectMarketingFields({
          status: data.status,
          marketingProjection: data.marketing_projection || {},
        }),
      },
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "validation_error", message: "Invalid disclosure payload.", retryable: false, issues: error.issues })
    return jsonError({ status: 500, code: "disclosure_create_failed", message: "Unable to create disclosure.", retryable: true })
  }
}
