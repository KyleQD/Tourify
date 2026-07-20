import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { userCanReviewMusicCertification } from "@/lib/music/music-certification-access"
import { validateCertificationTransition } from "@/lib/music/music-certification"
import { getTrustedMusicWriteClient } from "@/lib/music/music-access"
import { hashMusicDeclarationStatement } from "@/lib/music/music-origin-manifest"
import { MUSIC_CERTIFICATION_STANDARD_VERSION, type MusicCertificationStatus } from "@/lib/music/music-trust"
import { resolveMusicTrustFlags } from "@/lib/music/music-trust-flags"
import { createRateLimiter } from "@/lib/utils/rate-limit"

export const dynamic = "force-dynamic"
const limiter = createRateLimiter({ namespace: "music:certification:review", limit: 40, windowSec: 60 })

const decisionSchema = z.object({
  action: z.enum(["start_review", "needs_information", "approve", "reject", "suspend", "reactivate", "revoke", "supersede", "evidence_download"]),
  case_id: z.string().uuid(),
  evidence_id: z.string().uuid().optional(),
  reason_codes: z.array(z.string().min(1).max(100)).max(20).default([]),
  findings: z.record(z.string(), z.unknown()).default({}),
  artist_message: z.string().max(4000).nullable().optional(),
  internal_notes: z.string().max(8000).nullable().optional(),
  certification_level: z.number().int().min(0).max(5).optional(),
  request_id: z.string().min(8).max(200),
})

async function authorize(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult
  const { user, supabase } = authResult.auth
  if (!(await userCanReviewMusicCertification(supabase, user.id))) {
    return { success: false as const, response: jsonError({ status: 403, code: "reviewer_permission_required", message: "Music certification reviewer permission is required." }) }
  }
  const flags = await resolveMusicTrustFlags(supabase, user.id)
  if (!flags.music_certification_admin_review_enabled) {
    return { success: false as const, response: jsonError({ status: 404, code: "feature_disabled", message: "Certification review is not available." }) }
  }
  return authResult
}

export async function GET(request: NextRequest) {
  const authResult = await authorize(request)
  if (!authResult.success) return authResult.response
  const { supabase } = authResult.auth
  const trusted = await getTrustedMusicWriteClient(supabase)
  const status = request.nextUrl.searchParams.get("status")
  let query = trusted.from("music_certification_cases").select(`
    id, public_id, track_id, user_id, case_version, certification_type, standard_version,
    status, requested_level, disclosures, contributor_confirmation, submitted_at,
    review_started_at, decided_at, created_at, updated_at,
    artist_music!inner(id, title, ai_use_category, origin_status, certification_status),
    music_certification_evidence(id, evidence_type, original_filename, mime_type, byte_size, status, locked_at, created_at)
  `).order("submitted_at", { ascending: true, nullsFirst: false }).limit(200)
  query = status ? query.eq("status", status) : query.in("status", ["submitted", "in_review", "needs_information"])
  const { data, error } = await query
  if (error) return jsonError({ status: 500, code: "review_queue_query_failed", message: "Unable to load review queue.", retryable: true })
  return NextResponse.json({ data: data || [] })
}

export async function PATCH(request: NextRequest) {
  try {
    const authResult = await authorize(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    if (!(await limiter.check(user.id)).success) return jsonError({ status: 429, code: "rate_limited", message: "Too many review actions.", retryable: true })
    const payload = decisionSchema.parse(await request.json())
    const trusted = await getTrustedMusicWriteClient(supabase)
    const { data: certificationCase } = await trusted.from("music_certification_cases").select("*").eq("id", payload.case_id).maybeSingle()
    if (!certificationCase) return jsonError({ status: 404, code: "case_not_found", message: "Certification case not found." })

    if (payload.action === "evidence_download") {
      if (!payload.evidence_id) return jsonError({ status: 400, code: "evidence_id_required", message: "Evidence ID is required." })
      const { data: evidence } = await trusted.from("music_certification_evidence").select("id, storage_bucket, storage_path")
        .eq("id", payload.evidence_id).eq("case_id", payload.case_id).maybeSingle()
      if (!evidence) return jsonError({ status: 404, code: "evidence_not_found", message: "Evidence not found." })
      const { data, error } = await trusted.storage.from(evidence.storage_bucket).createSignedUrl(evidence.storage_path, 60)
      if (error || !data?.signedUrl) return jsonError({ status: 500, code: "evidence_sign_failed", message: "Unable to prepare evidence access.", retryable: true })
      await trusted.from("music_certification_events").insert({
        case_id: payload.case_id, actor_user_id: user.id, actor_type: "reviewer", event_type: "reviewer_evidence_accessed",
        event_data: { evidence_id: evidence.id }, artist_visible: false, request_id: payload.request_id,
      })
      return NextResponse.json({ data: { signed_url: data.signedUrl, expires_in: 60 } })
    }

    const targetByAction: Record<string, MusicCertificationStatus> = {
      start_review: "in_review", needs_information: "needs_information", approve: "approved",
      reject: "rejected", suspend: "suspended", reactivate: "approved", revoke: "revoked",
      supersede: "revoked",
    }
    const target = targetByAction[payload.action]
    const { data: existingDecision } = await trusted.from("music_certification_reviews").select("id")
      .eq("idempotency_key", payload.request_id).maybeSingle()
    if (existingDecision && certificationCase.status === target) {
      return NextResponse.json({ data: certificationCase, idempotent: true })
    }
    const transition = validateCertificationTransition(certificationCase.status as MusicCertificationStatus, target)
    if (!transition.allowed) return jsonError({ status: 409, code: "invalid_transition", message: transition.reason || "Invalid certification transition." })

    const now = new Date().toISOString()
    if (!existingDecision) {
      const { error: reviewError } = await trusted.from("music_certification_reviews").insert({
        case_id: payload.case_id, reviewer_user_id: user.id, decision: payload.action,
        reason_codes: payload.reason_codes, findings: payload.findings,
        artist_message: payload.artist_message || null, internal_notes: payload.internal_notes || null,
        standard_version: MUSIC_CERTIFICATION_STANDARD_VERSION, idempotency_key: payload.request_id,
      })
      if (reviewError) return jsonError({ status: 500, code: "review_write_failed", message: "Unable to record review decision.", retryable: true })
    }

    let certificatePublicId: string | null = null
    const level = payload.certification_level ?? certificationCase.requested_level
    if (payload.action === "approve") {
      const { data: existingCertificate } = await trusted.from("music_certificates").select("public_id")
        .eq("case_id", certificationCase.id).maybeSingle()
      if (existingCertificate) certificatePublicId = existingCertificate.public_id
      else {
        const { data: latest } = await trusted.from("music_certificates").select("certificate_version")
          .eq("track_id", certificationCase.track_id).order("certificate_version", { ascending: false }).limit(1).maybeSingle()
        const manifest = {
          manifest_type: "tourify.music-certificate", standard_version: MUSIC_CERTIFICATION_STANDARD_VERSION,
          case_public_id: certificationCase.public_id, track_id: certificationCase.track_id,
          certification_level: level, issued_at: now,
        }
        const { data: certificate, error: certificateError } = await trusted.from("music_certificates").insert({
          case_id: certificationCase.id, track_id: certificationCase.track_id, user_id: certificationCase.user_id,
          certificate_version: Number(latest?.certificate_version || 0) + 1,
          standard_version: MUSIC_CERTIFICATION_STANDARD_VERSION, certification_level: level,
          manifest_json: manifest, manifest_hash: hashMusicDeclarationStatement(manifest), issued_at: now,
        }).select("public_id").single()
        if (certificateError || !certificate) return jsonError({ status: 500, code: "certificate_issue_failed", message: "Unable to issue certificate.", retryable: true })
        certificatePublicId = certificate.public_id
      }
    } else if (["suspend", "reactivate", "revoke", "supersede"].includes(payload.action)) {
      const { data: certificate } = await trusted.from("music_certificates").select("id, public_id")
        .eq("track_id", certificationCase.track_id).in("status", ["active", "suspended"]).order("certificate_version", { ascending: false }).limit(1).maybeSingle()
      if (certificate) {
        if (payload.action === "reactivate") certificatePublicId = certificate.public_id
        await trusted.from("music_certificates").update({
        status: payload.action === "reactivate" ? "active" : payload.action === "suspend" ? "suspended" : payload.action === "supersede" ? "superseded" : "revoked",
        ...(payload.action === "suspend" ? { suspended_at: now } : {}),
        ...(payload.action === "reactivate" ? { reactivated_at: now, suspended_at: null } : {}),
        ...(payload.action === "revoke" ? { revoked_at: now } : {}),
        ...(payload.action === "supersede" ? { superseded_at: now } : {}),
        }).eq("id", certificate.id)
      }
    }

    const caseUpdate: Record<string, unknown> = { status: target, updated_at: now }
    if (payload.action === "start_review") caseUpdate.review_started_at = now
    if (["approve", "reject", "revoke"].includes(payload.action)) caseUpdate.decided_at = now
    const { data: updated } = await trusted.from("music_certification_cases").update(caseUpdate).eq("id", payload.case_id).select("*").single()
    await Promise.all([
      trusted.from("music_certification_events").upsert({
        case_id: payload.case_id, actor_user_id: user.id, actor_type: "reviewer", event_type: `review_${payload.action}`,
        from_status: certificationCase.status, to_status: target,
        event_data: { reason_codes: payload.reason_codes, artist_message: payload.artist_message || null },
        artist_visible: true, request_id: payload.request_id,
      }, { onConflict: "case_id,event_type,request_id", ignoreDuplicates: true }),
      trusted.from("artist_music").update({
        certification_status: target, certification_level: target === "approved" ? level : certificationCase.status === "approved" ? level : 0,
        certification_public_id: target === "approved" ? certificatePublicId : null,
        certification_standard_version: MUSIC_CERTIFICATION_STANDARD_VERSION, certification_updated_at: now,
      }).eq("id", certificationCase.track_id),
      !existingDecision ? trusted.from("notifications").insert({
        user_id: certificationCase.user_id,
        type: "music_certification_status",
        title: target === "approved" ? "Music certification approved" : `Music certification: ${target.replaceAll("_", " ")}`,
        content: payload.artist_message || "Your music certification case has a new status.",
        metadata: { case_id: certificationCase.id, track_id: certificationCase.track_id, status: target },
      }) : Promise.resolve(),
    ])
    return NextResponse.json({ data: updated })
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError({ status: 400, code: "invalid_request", message: "Invalid review action.", issues: error.issues })
    console.error("Certification review failed", error)
    return jsonError({ status: 500, code: "review_internal_error", message: "Unexpected review error.", retryable: true })
  }
}
