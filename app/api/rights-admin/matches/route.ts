import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { classifyMatchForAction, RIGHTS_ADMIN_DISCLAIMER } from "@/lib/music/rights-admin/action-safety"
import { resolveMusicRightsAdminFlags } from "@/lib/music/rights-admin/music-rights-admin-flags"
import { rankUsageCandidates } from "@/lib/music/rights-admin/usage-match"

export const dynamic = "force-dynamic"

const createSchema = z.object({
  case_id: z.string().uuid(),
  candidates: z.array(z.object({
    assetId: z.string().uuid(),
    identifierScore: z.number(),
    metadataScore: z.number(),
    audioScore: z.number(),
    versionPenalty: z.number().default(0),
  })).min(1),
  human_reviewed: z.boolean().default(false),
})

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveMusicRightsAdminFlags(supabase, user.id)
    if (!flags.music_rights_admin_matching_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Matching is not available.", retryable: false })

    const payload = createSchema.parse(await request.json())
    const ranked = rankUsageCandidates(payload.candidates)
    const safety = classifyMatchForAction(payload.candidates)

    const { data, error } = await supabase
      .from("music_rights_match_candidates")
      .insert({
        case_id: payload.case_id,
        artist_music_id: ranked.assetId || null,
        identifier_score: payload.candidates[0]?.identifierScore ?? 0,
        metadata_score: payload.candidates[0]?.metadataScore ?? 0,
        audio_score: payload.candidates[0]?.audioScore ?? 0,
        version_penalty: payload.candidates[0]?.versionPenalty ?? 0,
        decision: ranked.decision,
        human_reviewed: payload.human_reviewed,
      })
      .select("id, case_id, artist_music_id, decision, human_reviewed")
      .single()

    if (error)
      return jsonError({ status: 500, code: "match_create_failed", message: "Unable to store match.", retryable: true })

    return NextResponse.json({
      data,
      ranked,
      safety,
      disclaimer: RIGHTS_ADMIN_DISCLAIMER,
      note: "Technical match alone never authorizes takedown or monetization claim.",
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "validation_error", message: "Invalid match payload.", retryable: false, issues: error.issues })
    return jsonError({ status: 500, code: "match_create_failed", message: "Unable to store match.", retryable: true })
  }
}
