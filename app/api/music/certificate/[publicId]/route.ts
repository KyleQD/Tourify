import { NextRequest, NextResponse } from "next/server"
import { jsonError } from "@/lib/api/route-helpers"
import { resolveMusicTrustFlags } from "@/lib/music/music-trust-flags"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createRateLimiter } from "@/lib/utils/rate-limit"
import { toPublicCertificateVerificationDto } from "@/lib/music/music-public-verification"

export const dynamic = "force-dynamic"
const limiter = createRateLimiter({ namespace: "music:public:certificate", limit: 60, windowSec: 60 })

export async function GET(request: NextRequest, context: { params: Promise<{ publicId: string }> }) {
  const subject = request.headers.get("x-forwarded-for")?.split(",")[0] || "anonymous"
  if (!(await limiter.check(subject)).success) return jsonError({ status: 429, code: "rate_limited", message: "Too many verification requests.", retryable: true })
  const service = createServiceRoleClient()
  const flags = await resolveMusicTrustFlags(service, subject)
  if (!flags.music_public_verification_enabled) return jsonError({ status: 404, code: "not_found", message: "Certificate not found." })
  const { publicId } = await context.params
  const { data } = await service.from("music_certificates").select("public_id, track_id, certificate_version, standard_version, certification_level, manifest_hash, status, issued_at, artist_music!inner(title, is_public, is_visible, moderation_status, rights_confirmed)")
    .eq("public_id", publicId).eq("status", "active")
    .eq("artist_music.is_public", true).eq("artist_music.is_visible", true)
    .eq("artist_music.moderation_status", "approved").eq("artist_music.rights_confirmed", true).maybeSingle()
  if (!data) return jsonError({ status: 404, code: "not_found", message: "Active certificate not found." })
  return NextResponse.json({ data: toPublicCertificateVerificationDto(data) })
}
