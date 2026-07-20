import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { getTrustedMusicWriteClient } from "@/lib/music/music-access"
import { MUSIC_CERTIFICATION_STANDARD_VERSION } from "@/lib/music/music-trust"
import { resolveMusicTrustFlags } from "@/lib/music/music-trust-flags"
import { createRateLimiter } from "@/lib/utils/rate-limit"

export const dynamic = "force-dynamic"
const limiter = createRateLimiter({ namespace: "music:certification:owner", limit: 20, windowSec: 60 })

const createSchema = z.object({
  track_id: z.string().uuid(),
  certification_type: z.enum(["origin_record", "human_created", "rights_passport"]).default("human_created"),
  requested_level: z.number().int().min(0).max(5).default(1),
  disclosures: z.record(z.string(), z.unknown()).default({}),
  contributor_confirmation: z.boolean().default(false),
  idempotency_key: z.string().min(8).max(200),
})

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const trackId = request.nextUrl.searchParams.get("trackId")
  let query = supabase.from("music_certification_cases").select("*").eq("user_id", user.id).order("updated_at", { ascending: false })
  if (trackId) query = query.eq("track_id", trackId)
  const { data, error } = await query
  if (error) return jsonError({ status: 500, code: "certification_cases_query_failed", message: "Unable to load certification cases.", retryable: true })
  const flags = await resolveMusicTrustFlags(supabase, user.id)
  return NextResponse.json({ data: data || [], enabled: flags.music_certification_requests_enabled })
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    if (!(await limiter.check(user.id)).success) return jsonError({ status: 429, code: "rate_limited", message: "Too many certification requests.", retryable: true })
    const flags = await resolveMusicTrustFlags(supabase, user.id)
    if (!flags.music_certification_requests_enabled) return jsonError({ status: 404, code: "feature_disabled", message: "Certification requests are not available.", retryable: false })
    const payload = createSchema.parse(await request.json())
    const trusted = await getTrustedMusicWriteClient(supabase)
    const { data: existingIdempotent } = await trusted.from("music_certification_cases").select("*")
      .eq("user_id", user.id).eq("idempotency_key", payload.idempotency_key).maybeSingle()
    if (existingIdempotent) return NextResponse.json({ data: existingIdempotent, idempotent: true })

    const { data: track } = await trusted.from("artist_music")
      .select("id, user_id, active_declaration_id, rights_confirmed, ai_use_category, trust_setup_status")
      .eq("id", payload.track_id).eq("user_id", user.id).maybeSingle()
    if (!track) return jsonError({ status: 404, code: "track_not_found", message: "Track not found.", retryable: false })
    if (!track.active_declaration_id || !track.rights_confirmed || !["human_created", "assistive_ai"].includes(track.ai_use_category || "")) {
      return jsonError({ status: 400, code: "track_not_eligible", message: "Complete an eligible Rights & Origin declaration first.", retryable: false })
    }

    const { data: currentCase } = await trusted.from("music_certification_cases")
      .select("*").eq("track_id", track.id).order("case_version", { ascending: false }).limit(1).maybeSingle()
    if (currentCase?.based_on_declaration_id === track.active_declaration_id && !["rejected", "withdrawn", "revoked"].includes(currentCase.status)) {
      return NextResponse.json({ data: currentCase, idempotent: true })
    }
    const now = new Date().toISOString()
    const { data: created, error } = await trusted.from("music_certification_cases").insert({
      track_id: track.id, user_id: user.id, case_version: Number(currentCase?.case_version || 0) + 1,
      based_on_declaration_id: track.active_declaration_id,
      certification_type: payload.certification_type,
      standard_version: MUSIC_CERTIFICATION_STANDARD_VERSION,
      requested_level: payload.requested_level,
      disclosures: payload.disclosures,
      contributor_confirmation: payload.contributor_confirmation,
      idempotency_key: payload.idempotency_key,
    }).select("*").single()
    if (error || !created) return jsonError({ status: 500, code: "certification_case_create_failed", message: "Unable to create certification case.", retryable: true })
    await Promise.all([
      trusted.from("music_certification_events").insert({
        case_id: created.id, actor_user_id: user.id, actor_type: "artist", event_type: "case_created",
        from_status: null, to_status: "draft", request_id: payload.idempotency_key,
      }),
      trusted.from("artist_music").update({ certification_status: "draft", certification_updated_at: now }).eq("id", track.id),
    ])
    return NextResponse.json({ data: created }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError({ status: 400, code: "invalid_request", message: "Invalid certification request.", issues: error.issues })
    console.error("Certification create failed", error)
    return jsonError({ status: 500, code: "certification_internal_error", message: "Unexpected certification error.", retryable: true })
  }
}
