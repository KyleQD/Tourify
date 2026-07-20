import { NextRequest, NextResponse } from "next/server"
import { jsonError } from "@/lib/api/route-helpers"
import { resolveMusicRightsFlags } from "@/lib/music-rights/music-rights-flags"
import { toPublicPassportVerificationDto } from "@/lib/music-rights/passport-manifest"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createRateLimiter } from "@/lib/utils/rate-limit"

export const dynamic = "force-dynamic"
const limiter = createRateLimiter({ namespace: "music:public:rights-passport", limit: 60, windowSec: 60 })

export async function GET(request: NextRequest, context: { params: Promise<{ publicId: string }> }) {
  const subject = request.headers.get("x-forwarded-for")?.split(",")[0] || "anonymous"
  if (!(await limiter.check(subject)).success)
    return jsonError({ status: 429, code: "rate_limited", message: "Too many verification requests.", retryable: true })

  const service = createServiceRoleClient()
  const flags = await resolveMusicRightsFlags(service, subject)
  if (!flags.music_public_passport_verification_enabled)
    return jsonError({ status: 404, code: "not_found", message: "Passport not found." })

  const { publicId } = await context.params
  const { data: passport } = await service
    .from("music_rights_passports")
    .select(`
      public_id, status, standard_version, current_version, artist_music_id,
      artist_music!inner(id, title, is_public, is_visible, moderation_status),
      music_rights_passport_versions!inner(version, status, public_manifest, public_manifest_hash, issued_at),
      music_rights_credentials(public_id, status, issued_at)
    `)
    .eq("public_id", publicId)
    .in("status", ["issued", "suspended", "revoked", "superseded"])
    .eq("artist_music.is_public", true)
    .eq("artist_music.is_visible", true)
    .eq("artist_music.moderation_status", "approved")
    .maybeSingle()

  if (!passport || !passport.current_version)
    return jsonError({ status: 404, code: "not_found", message: "Passport not found." })

  const versions = Array.isArray(passport.music_rights_passport_versions)
    ? passport.music_rights_passport_versions
    : [passport.music_rights_passport_versions]
  const current = versions.find((row: any) => row.version === passport.current_version)
  if (!current) return jsonError({ status: 404, code: "not_found", message: "Passport not found." })

  const credentials = Array.isArray(passport.music_rights_credentials)
    ? passport.music_rights_credentials
    : passport.music_rights_credentials
      ? [passport.music_rights_credentials]
      : []
  const credential = credentials.sort((left: any, right: any) =>
    String(right.issued_at).localeCompare(String(left.issued_at)),
  )[0]
  const track = Array.isArray(passport.artist_music) ? passport.artist_music[0] : passport.artist_music

  return NextResponse.json({
    data: toPublicPassportVerificationDto({
      publicId: passport.public_id,
      status: passport.status,
      standardVersion: passport.standard_version,
      passportVersion: current.version,
      publicManifest: current.public_manifest,
      publicManifestHash: current.public_manifest_hash,
      issuedAt: current.issued_at,
      credentialPublicId: credential?.public_id,
      credentialStatus: credential?.status,
      trackTitle: track?.title,
    }),
  })
}
