import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { getTrustedMusicWriteClient } from "@/lib/music/music-access"
import { resolveMusicRightsFlags } from "@/lib/music-rights/music-rights-flags"
import {
  assertOwnedProject,
  enqueueRightsOutboxEvent,
  writeRightsAuditEvent,
} from "@/lib/music-rights/rights-access"
import { createRateLimiter } from "@/lib/utils/rate-limit"

export const dynamic = "force-dynamic"
const limiter = createRateLimiter({ namespace: "music:rights:evidence", limit: 40, windowSec: 60 })

const createSchema = z.object({
  project_id: z.string().uuid(),
  evidence_category: z.enum([
    "master_audio", "stems", "project_export", "demo", "session_record",
    "invoice", "communication", "agreement_copy", "registration",
    "identity", "ai_disclosure", "other",
  ]),
  title: z.string().max(300).optional(),
  original_filename: z.string().min(1).max(400),
  mime_type: z.string().min(1).max(200),
  byte_size: z.number().int().min(1).max(104857600),
  content_sha256: z.string().regex(/^[a-f0-9]{64}$/i).optional(),
})

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveMusicRightsFlags(supabase, user.id)
  const projectId = request.nextUrl.searchParams.get("projectId")
  if (!projectId) return jsonError({ status: 400, code: "project_id_required", message: "projectId is required." })
  const { data, error } = await supabase
    .from("music_rights_evidence")
    .select("id, public_id, project_id, evidence_category, title, original_filename, mime_type, byte_size, content_sha256, scan_status, processing_status, legal_hold, created_at, updated_at")
    .eq("owner_user_id", user.id)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
  if (error) return jsonError({ status: 500, code: "evidence_query_failed", message: "Unable to load evidence.", retryable: true })
  return NextResponse.json({
    data: data || [],
    enabled: flags.music_human_origin_v2_enabled || flags.music_rights_passport_enabled,
  })
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    if (!(await limiter.check(user.id)).success)
      return jsonError({ status: 429, code: "rate_limited", message: "Too many evidence requests.", retryable: true })

    const flags = await resolveMusicRightsFlags(supabase, user.id)
    if (!flags.music_human_origin_v2_enabled && !flags.music_rights_passport_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Evidence upload is not available.", retryable: false })

    const payload = createSchema.parse(await request.json())
    const trusted = await getTrustedMusicWriteClient(supabase)
    const project = await assertOwnedProject({ supabase: trusted, userId: user.id, projectId: payload.project_id })
    if (!project) return jsonError({ status: 404, code: "project_not_found", message: "Rights project not found.", retryable: false })

    const storagePath = `${user.id}/${project.id}/${crypto.randomUUID()}-${payload.original_filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`
    const { data: signed, error: signError } = await trusted.storage
      .from("music-rights-evidence")
      .createSignedUploadUrl(storagePath)
    if (signError || !signed)
      return jsonError({ status: 500, code: "evidence_upload_url_failed", message: "Unable to prepare evidence upload.", retryable: true })

    const { data: evidence, error } = await trusted
      .from("music_rights_evidence")
      .insert({
        project_id: project.id,
        owner_user_id: user.id,
        evidence_category: payload.evidence_category,
        title: payload.title || payload.original_filename,
        original_filename: payload.original_filename,
        mime_type: payload.mime_type,
        byte_size: payload.byte_size,
        content_sha256: payload.content_sha256?.toLowerCase() || null,
        storage_bucket: "music-rights-evidence",
        storage_path: storagePath,
        scan_status: "pending",
        processing_status: "uploaded",
      })
      .select("id, public_id, project_id, evidence_category, title, original_filename, mime_type, byte_size, content_sha256, scan_status, processing_status, created_at")
      .single()
    if (error || !evidence)
      return jsonError({ status: 500, code: "evidence_create_failed", message: "Unable to create evidence record.", retryable: true })

    await Promise.all([
      writeRightsAuditEvent({
        supabase: trusted,
        projectId: project.id,
        actorUserId: user.id,
        eventType: "music.rights.evidence.uploaded",
        entityType: "evidence",
        entityId: evidence.id,
        eventData: { category: payload.evidence_category },
      }),
      enqueueRightsOutboxEvent({
        supabase: trusted,
        projectId: project.id,
        eventType: "music.rights.evidence.uploaded",
        dedupeKey: `evidence:${evidence.id}:uploaded`,
        payload: { evidenceId: evidence.id },
      }),
      trusted.from("music_rights_verification_checks").insert({
        project_id: project.id,
        check_type: "evidence_intake_triage",
        status: "needs_review",
        summary: "Evidence uploaded; automated detectors are advisory only and do not decide certification.",
        signals: [{ code: "human_review_required", matched: true }],
        actor_type: "system",
      }),
    ])

    return NextResponse.json({
      data: evidence,
      upload: {
        bucket: "music-rights-evidence",
        path: storagePath,
        token: signed.token,
        signed_url: signed.signedUrl,
      },
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "invalid_request", message: "Invalid evidence request.", issues: error.issues })
    console.error("Evidence create failed", error)
    return jsonError({ status: 500, code: "evidence_internal_error", message: "Unexpected evidence error.", retryable: true })
  }
}
