import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { getTrustedMusicWriteClient } from "@/lib/music/music-access"
import { resolveMusicRightsFlags } from "@/lib/music-rights/music-rights-flags"
import { userCanReviewMusicRights } from "@/lib/music-rights/rights-review-access"
import {
  enqueueRightsOutboxEvent,
  writeRightsAuditEvent,
} from "@/lib/music-rights/rights-access"
import { createRateLimiter } from "@/lib/utils/rate-limit"

export const dynamic = "force-dynamic"
const limiter = createRateLimiter({ namespace: "music:rights:review", limit: 40, windowSec: 60 })

const decisionSchema = z.object({
  action: z.enum([
    "start_review", "needs_information", "approve", "reject",
    "suspend", "reactivate", "revoke", "supersede", "evidence_download",
  ]),
  project_id: z.string().uuid(),
  evidence_id: z.string().uuid().optional(),
  reason_codes: z.array(z.string().min(1).max(100)).max(20).default([]),
  findings: z.record(z.string(), z.unknown()).default({}),
  artist_message: z.string().max(4000).nullable().optional(),
  internal_notes: z.string().max(8000).nullable().optional(),
  human_origin_status: z.enum([
    "not_requested", "pending", "approved", "rejected", "suspended", "revoked",
  ]).optional(),
  request_id: z.string().min(8).max(200),
})

async function authorize(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult
  const { user, supabase } = authResult.auth
  if (!(await userCanReviewMusicRights(supabase, user.id))) {
    return {
      success: false as const,
      response: jsonError({
        status: 403,
        code: "reviewer_permission_required",
        message: "Music rights reviewer permission is required.",
      }),
    }
  }
  const flags = await resolveMusicRightsFlags(supabase, user.id)
  if (!flags.music_human_origin_v2_enabled && !flags.music_rights_ops_enabled) {
    return {
      success: false as const,
      response: jsonError({
        status: 404,
        code: "feature_disabled",
        message: "Rights review is not available.",
      }),
    }
  }
  return authResult
}

export async function GET(request: NextRequest) {
  const authResult = await authorize(request)
  if (!authResult.success) return authResult.response
  const { supabase } = authResult.auth
  const trusted = await getTrustedMusicWriteClient(supabase)
  const status = request.nextUrl.searchParams.get("status")
  let query = trusted
    .from("music_rights_projects")
    .select(`
      id, public_id, title, status, version, owner_user_id, artist_music_id, updated_at,
      artist_music!inner(id, title),
      music_rights_evidence(id, evidence_category, original_filename, mime_type, byte_size, scan_status, processing_status, created_at),
      music_rights_review_decisions(id, decision, human_origin_status, reason_codes, created_at)
    `)
    .order("updated_at", { ascending: false })
    .limit(200)
  query = status
    ? query.eq("status", status)
    : query.in("status", ["pending_review", "in_progress", "pending_signatures", "disputed"])
  const { data, error } = await query
  if (error) return jsonError({ status: 500, code: "rights_review_queue_failed", message: "Unable to load rights review queue.", retryable: true })
  return NextResponse.json({ data: data || [] })
}

export async function PATCH(request: NextRequest) {
  try {
    const authResult = await authorize(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    if (!(await limiter.check(user.id)).success)
      return jsonError({ status: 429, code: "rate_limited", message: "Too many review actions.", retryable: true })

    const payload = decisionSchema.parse(await request.json())
    const trusted = await getTrustedMusicWriteClient(supabase)
    const { data: project } = await trusted
      .from("music_rights_projects")
      .select("*")
      .eq("id", payload.project_id)
      .maybeSingle()
    if (!project) return jsonError({ status: 404, code: "project_not_found", message: "Rights project not found." })

    if (payload.action === "evidence_download") {
      if (!payload.evidence_id)
        return jsonError({ status: 400, code: "evidence_id_required", message: "Evidence ID is required." })
      const { data: evidence } = await trusted
        .from("music_rights_evidence")
        .select("id, storage_bucket, storage_path")
        .eq("id", payload.evidence_id)
        .eq("project_id", payload.project_id)
        .maybeSingle()
      if (!evidence) return jsonError({ status: 404, code: "evidence_not_found", message: "Evidence not found." })
      const { data, error } = await trusted.storage
        .from(evidence.storage_bucket)
        .createSignedUrl(evidence.storage_path, 60)
      if (error || !data?.signedUrl)
        return jsonError({ status: 500, code: "evidence_sign_failed", message: "Unable to prepare evidence access.", retryable: true })
      await writeRightsAuditEvent({
        supabase: trusted,
        projectId: project.id,
        actorUserId: user.id,
        actorType: "reviewer",
        eventType: "music.rights.reviewer_evidence_accessed",
        entityType: "evidence",
        entityId: evidence.id,
        eventData: { request_id: payload.request_id },
      })
      return NextResponse.json({ data: { signed_url: data.signedUrl, expires_in: 60 } })
    }

    const { data: existing } = await trusted
      .from("music_rights_review_decisions")
      .select("id, decision")
      .eq("idempotency_key", payload.request_id)
      .maybeSingle()
    if (existing) return NextResponse.json({ data: existing, idempotent: true })

    const humanOriginStatus = payload.human_origin_status || (
      payload.action === "approve" ? "approved"
        : payload.action === "reject" ? "rejected"
          : payload.action === "suspend" ? "suspended"
            : payload.action === "revoke" ? "revoked"
              : payload.action === "needs_information" ? "pending"
                : "pending"
    )

    const { data: decision, error } = await trusted
      .from("music_rights_review_decisions")
      .insert({
        project_id: project.id,
        reviewer_user_id: user.id,
        decision: payload.action,
        human_origin_status: humanOriginStatus,
        reason_codes: payload.reason_codes,
        findings: payload.findings,
        artist_message: payload.artist_message || null,
        internal_notes: payload.internal_notes || null,
        idempotency_key: payload.request_id,
      })
      .select("*")
      .single()
    if (error || !decision)
      return jsonError({ status: 500, code: "review_decision_failed", message: "Unable to record review decision.", retryable: true })

    const projectStatus =
      payload.action === "approve" ? "issued"
        : payload.action === "needs_information" ? "in_progress"
          : payload.action === "start_review" ? "pending_review"
            : payload.action === "suspend" || payload.action === "revoke" ? "suspended"
              : payload.action === "reject" ? "archived"
                : project.status

    await trusted.from("music_rights_projects").update({
      status: projectStatus,
      updated_at: new Date().toISOString(),
      metadata: {
        ...(project.metadata || {}),
        human_origin_status: humanOriginStatus,
        last_review_decision_id: decision.id,
      },
    }).eq("id", project.id)

    if (["suspend", "revoke", "supersede", "reactivate"].includes(payload.action)) {
      const { data: passport } = await trusted
        .from("music_rights_passports")
        .select("id, status, current_version")
        .eq("project_id", project.id)
        .maybeSingle()
      if (passport) {
        const nextStatus =
          payload.action === "supersede" ? "superseded"
            : payload.action === "revoke" ? "revoked"
              : payload.action === "reactivate" ? "issued"
                : "suspended"
        await trusted.from("music_rights_passports").update({
          status: nextStatus,
          updated_at: new Date().toISOString(),
        }).eq("id", passport.id)
        if (passport.current_version > 0) {
          await trusted.from("music_rights_passport_versions").update({
            status: nextStatus === "issued" ? "issued" : nextStatus,
          }).eq("passport_id", passport.id).eq("version", passport.current_version)
        }
        const credentialFilter = payload.action === "reactivate" ? ["suspended"] : ["active", "suspended"]
        const { data: credentials } = await trusted
          .from("music_rights_credentials")
          .select("id")
          .eq("passport_id", passport.id)
          .in("status", credentialFilter)
        for (const credential of credentials || []) {
          const credentialStatus = nextStatus === "issued" ? "active" : nextStatus === "suspended" ? "suspended" : nextStatus
          await trusted.from("music_rights_credentials").update({ status: credentialStatus }).eq("id", credential.id)
          await trusted.from("music_rights_credential_status").insert({
            credential_id: credential.id,
            status: credentialStatus,
            reason_codes: payload.reason_codes,
            actor_user_id: user.id,
            actor_type: "reviewer",
          })
        }
        await writeRightsAuditEvent({
          supabase: trusted,
          projectId: project.id,
          actorUserId: user.id,
          actorType: "reviewer",
          eventType:
            payload.action === "suspend" ? "music.rights.passport.suspended"
              : payload.action === "revoke" ? "music.rights.passport.revoked"
                : payload.action === "supersede" ? "music.rights.passport.superseded"
                  : "music.rights.passport.reactivated",
          entityType: "passport",
          entityId: passport.id,
          eventData: { action: payload.action, reason_codes: payload.reason_codes },
        })
      }
    }

    await Promise.all([
      writeRightsAuditEvent({
        supabase: trusted,
        projectId: project.id,
        actorUserId: user.id,
        actorType: "reviewer",
        eventType: "music.rights.certification.decided",
        entityType: "review_decision",
        entityId: decision.id,
        eventData: { action: payload.action, human_origin_status: humanOriginStatus },
      }),
      enqueueRightsOutboxEvent({
        supabase: trusted,
        projectId: project.id,
        eventType: "music.rights.certification.decided",
        dedupeKey: `rights-review:${decision.id}`,
        payload: { decisionId: decision.id, action: payload.action },
      }),
    ])

    return NextResponse.json({ data: decision })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "invalid_request", message: "Invalid review request.", issues: error.issues })
    console.error("Rights review failed", error)
    return jsonError({ status: 500, code: "rights_review_internal_error", message: "Unexpected rights review error.", retryable: true })
  }
}
