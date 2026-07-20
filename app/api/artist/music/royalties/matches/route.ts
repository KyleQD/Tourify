import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { getTrustedMusicWriteClient } from "@/lib/music/music-access"
import { resolveMusicRoyaltiesFlags } from "@/lib/music/royalties/music-royalties-flags"
import { enqueueRoyaltyOutboxEvent } from "@/lib/music/royalties/royalties-access"

export const dynamic = "force-dynamic"

const decisionSchema = z.object({
  action: z.enum(["accept", "reject"]),
  candidate_id: z.string().uuid(),
  normalized_line_id: z.string().uuid().optional(),
})

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveMusicRoyaltiesFlags(supabase, user.id)
  if (!flags.music_royalties_matching_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Royalty matching is not available.", retryable: false })

  const { data: batches } = await supabase
    .from("music_royalties_import_batches")
    .select("id")
    .eq("owner_user_id", user.id)
  const batchIds = (batches || []).map((row: any) => row.id)
  if (!batchIds.length) return NextResponse.json({ data: [], enabled: true })

  const { data: lines, error } = await supabase
    .from("music_royalties_normalized_lines")
    .select(`
      id, import_batch_id, provider, isrc, iswc, upc, currency, net_royalty_minor, match_status,
      matched_artist_music_id, usage_start, usage_end, territory, raw_payload,
      music_royalties_match_candidates(id, artist_music_id, confidence, match_signals, status, created_at)
    `)
    .in("import_batch_id", batchIds)
    .in("match_status", ["candidate", "ambiguous", "unmatched"])
    .order("created_at", { ascending: false })
    .limit(200)

  if (error)
    return jsonError({ status: 500, code: "match_queue_failed", message: "Unable to load match review queue.", retryable: true })

  return NextResponse.json({ data: lines || [], enabled: true })
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveMusicRoyaltiesFlags(supabase, user.id)
    if (!flags.music_royalties_matching_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Royalty matching is not available.", retryable: false })

    const payload = decisionSchema.parse(await request.json())
    const trusted = await getTrustedMusicWriteClient(supabase)

    const { data: candidate } = await trusted
      .from("music_royalties_match_candidates")
      .select("*")
      .eq("id", payload.candidate_id)
      .maybeSingle()

    if (!candidate)
      return jsonError({ status: 404, code: "candidate_not_found", message: "Match candidate not found.", retryable: false })

    const lineId = payload.normalized_line_id || candidate.normalized_line_id
    const { data: line } = await trusted
      .from("music_royalties_normalized_lines")
      .select("id, import_batch_id")
      .eq("id", lineId)
      .maybeSingle()
    if (!line)
      return jsonError({ status: 404, code: "line_not_found", message: "Normalized line not found.", retryable: false })

    const { data: batch } = await trusted
      .from("music_royalties_import_batches")
      .select("id, owner_user_id")
      .eq("id", line.import_batch_id)
      .maybeSingle()
    if (!batch || batch.owner_user_id !== user.id)
      return jsonError({ status: 403, code: "forbidden", message: "Not allowed to review this match.", retryable: false })
    const nextCandidateStatus = payload.action === "accept" ? "accepted" : "rejected"

    const { error: candidateError } = await trusted
      .from("music_royalties_match_candidates")
      .update({ status: nextCandidateStatus })
      .eq("id", candidate.id)
    if (candidateError)
      return jsonError({ status: 500, code: "candidate_update_failed", message: "Unable to update candidate.", retryable: true })

    if (payload.action === "accept") {
      if (!candidate.artist_music_id)
        return jsonError({ status: 400, code: "artist_music_required", message: "Candidate is missing artist_music_id.", retryable: false })

      const { error: lineError } = await trusted
        .from("music_royalties_normalized_lines")
        .update({
          match_status: "manual",
          matched_artist_music_id: candidate.artist_music_id,
        })
        .eq("id", lineId)
      if (lineError)
        return jsonError({ status: 500, code: "line_match_update_failed", message: "Unable to apply manual match.", retryable: true })

      await trusted
        .from("music_royalties_match_candidates")
        .update({ status: "rejected" })
        .eq("normalized_line_id", lineId)
        .neq("id", candidate.id)
        .eq("status", "open")
    }

    await enqueueRoyaltyOutboxEvent({
      supabase: trusted,
      ownerUserId: user.id,
      eventType: "music.royalty.match.review_required",
      dedupeKey: `${lineId}:${payload.action}:${candidate.id}`,
      payload: { normalizedLineId: lineId, action: payload.action, candidateId: candidate.id },
    })

    return NextResponse.json({
      data: {
        candidate_id: candidate.id,
        normalized_line_id: lineId,
        action: payload.action,
        match_status: payload.action === "accept" ? "manual" : undefined,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "invalid_request", message: "Invalid match decision.", issues: error.issues })
    console.error("royalty match decision failed", error)
    return jsonError({ status: 500, code: "match_decision_internal", message: "Unexpected match review error.", retryable: true })
  }
}
