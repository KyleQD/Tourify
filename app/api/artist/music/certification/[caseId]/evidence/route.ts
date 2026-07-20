import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { evidenceIsMutable } from "@/lib/music/music-certification"
import { getTrustedMusicWriteClient } from "@/lib/music/music-access"
import type { MusicCertificationStatus } from "@/lib/music/music-trust"
import { createRateLimiter } from "@/lib/utils/rate-limit"

export const dynamic = "force-dynamic"
const limiter = createRateLimiter({ namespace: "music:certification:evidence", limit: 20, windowSec: 60 })
const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("prepare"), file_name: z.string().min(1).max(240), content_type: z.string().min(1).max(120) }),
  z.object({ action: z.literal("register"), path: z.string().min(1).max(1000), evidence_type: z.string().min(1).max(100), original_filename: z.string().max(240).optional(), content_type: z.string().max(120).optional(), byte_size: z.number().int().nonnegative().max(52_428_800).optional(), sha256: z.string().length(64).optional() }),
  z.object({ action: z.literal("download"), evidence_id: z.string().uuid() }),
])

function safeName(name: string) { return name.replace(/[^A-Za-z0-9._-]/g, "_").slice(-160) }

export async function POST(request: NextRequest, context: { params: Promise<{ caseId: string }> }) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    if (!(await limiter.check(user.id)).success) return jsonError({ status: 429, code: "rate_limited", message: "Too many evidence requests.", retryable: true })
    const { caseId } = await context.params
    const payload = schema.parse(await request.json())
    const trusted = await getTrustedMusicWriteClient(supabase)
    const { data: certificationCase } = await trusted.from("music_certification_cases").select("*").eq("id", caseId).eq("user_id", user.id).maybeSingle()
    if (!certificationCase) return jsonError({ status: 404, code: "case_not_found", message: "Certification case not found." })

    if (payload.action === "download") {
      const { data: evidence } = await trusted.from("music_certification_evidence").select("id, storage_bucket, storage_path")
        .eq("id", payload.evidence_id).eq("case_id", caseId).eq("user_id", user.id).maybeSingle()
      if (!evidence) return jsonError({ status: 404, code: "evidence_not_found", message: "Evidence not found." })
      const { data, error } = await trusted.storage.from(evidence.storage_bucket).createSignedUrl(evidence.storage_path, 60)
      if (error || !data?.signedUrl) return jsonError({ status: 500, code: "evidence_sign_failed", message: "Unable to prepare evidence download.", retryable: true })
      await trusted.from("music_certification_events").insert({
        case_id: caseId, actor_user_id: user.id, actor_type: "artist", event_type: "evidence_accessed",
        event_data: { evidence_id: evidence.id }, artist_visible: true,
      })
      return NextResponse.json({ data: { signed_url: data.signedUrl, expires_in: 60 } })
    }

    if (!evidenceIsMutable(certificationCase.status as MusicCertificationStatus)) {
      return jsonError({ status: 409, code: "evidence_locked", message: "Evidence is locked after submission." })
    }
    if (payload.action === "prepare") {
      const path = `${user.id}/${caseId}/${crypto.randomUUID()}-${safeName(payload.file_name)}`
      const { data, error } = await trusted.storage.from("music-certification-evidence").createSignedUploadUrl(path)
      if (error || !data) return jsonError({ status: 500, code: "evidence_upload_prepare_failed", message: "Unable to prepare evidence upload.", retryable: true })
      return NextResponse.json({ data: { bucket: "music-certification-evidence", path, token: data.token, signed_url: data.signedUrl } })
    }

    const requiredPrefix = `${user.id}/${caseId}/`
    if (!payload.path.startsWith(requiredPrefix)) return jsonError({ status: 403, code: "invalid_evidence_path", message: "Evidence path is outside this case." })
    const { data: evidence, error } = await trusted.from("music_certification_evidence").upsert({
      case_id: caseId, track_id: certificationCase.track_id, user_id: user.id,
      evidence_type: payload.evidence_type, storage_bucket: "music-certification-evidence", storage_path: payload.path,
      original_filename: payload.original_filename || null, mime_type: payload.content_type || null,
      byte_size: payload.byte_size || null, sha256: payload.sha256 || null, status: "registered",
    }, { onConflict: "case_id,storage_bucket,storage_path" }).select("id, evidence_type, status, original_filename, created_at").single()
    if (error || !evidence) return jsonError({ status: 500, code: "evidence_register_failed", message: "Unable to register evidence.", retryable: true })
    await trusted.from("music_certification_events").insert({
      case_id: caseId, actor_user_id: user.id, actor_type: "artist", event_type: "evidence_registered",
      event_data: { evidence_id: evidence.id, evidence_type: evidence.evidence_type }, artist_visible: true,
    })
    return NextResponse.json({ data: evidence }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError({ status: 400, code: "invalid_request", message: "Invalid evidence request.", issues: error.issues })
    return jsonError({ status: 500, code: "evidence_internal_error", message: "Unexpected evidence error.", retryable: true })
  }
}
