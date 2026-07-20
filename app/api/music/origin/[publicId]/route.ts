import { NextRequest, NextResponse } from "next/server"
import { jsonError } from "@/lib/api/route-helpers"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { resolveMusicTrustFlags } from "@/lib/music/music-trust-flags"
import { createRateLimiter } from "@/lib/utils/rate-limit"
import { toPublicOriginVerificationDto } from "@/lib/music/music-public-verification"

export const dynamic = "force-dynamic"
const limiter = createRateLimiter({ namespace: "music:public:origin", limit: 60, windowSec: 60 })

export async function GET(request: NextRequest, context: { params: Promise<{ publicId: string }> }) {
  const subject = request.headers.get("x-forwarded-for")?.split(",")[0] || "anonymous"
  if (!(await limiter.check(subject)).success) return jsonError({ status: 429, code: "rate_limited", message: "Too many verification requests.", retryable: true })
  const service = createServiceRoleClient()
  const flags = await resolveMusicTrustFlags(service, subject)
  if (!flags.music_public_verification_enabled) return jsonError({ status: 404, code: "not_found", message: "Verification record not found." })
  const { publicId } = await context.params
  const { data } = await service.from("music_origin_records").select("public_id, track_id, schema_version, manifest_hash, status, recorded_at, artist_music!inner(title, artist_profile_id, is_public, is_visible, moderation_status, rights_confirmed)")
    .eq("public_id", publicId).eq("is_public", true).eq("status", "active")
    .eq("artist_music.is_public", true).eq("artist_music.is_visible", true)
    .eq("artist_music.moderation_status", "approved").eq("artist_music.rights_confirmed", true).maybeSingle()
  if (!data) return jsonError({ status: 404, code: "not_found", message: "Verification record not found." })
  return NextResponse.json({ data: toPublicOriginVerificationDto(data) })
}
