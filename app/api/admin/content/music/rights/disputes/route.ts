import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { getTrustedMusicWriteClient } from "@/lib/music/music-access"
import { resolveMusicRightsFlags } from "@/lib/music-rights/music-rights-flags"
import { userCanReviewMusicRights } from "@/lib/music-rights/rights-review-access"
import { enqueueRightsOutboxEvent, writeRightsAuditEvent } from "@/lib/music-rights/rights-access"
import { createRateLimiter } from "@/lib/utils/rate-limit"

export const dynamic = "force-dynamic"
const limiter = createRateLimiter({ namespace: "music:rights:disputes", limit: 40, windowSec: 60 })

const disputeTypeSchema = z.enum([
  "identity", "public_credit", "contributor_role", "composition_share", "master_ownership",
  "administration", "license", "sample_clearance", "authority", "signature_validity",
  "ai_disclosure", "public_display", "identifier", "duplicate_upload", "other",
])

const createSchema = z.object({
  project_id: z.string().uuid(),
  passport_id: z.string().uuid().optional(),
  dispute_type: disputeTypeSchema,
  summary: z.string().min(8).max(4000),
  severity: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  freeze_derivatives: z.boolean().default(false),
  suspend_passport: z.boolean().default(false),
  linked_dmca_case_id: z.string().uuid().optional(),
  request_id: z.string().min(8).max(200),
})

const patchSchema = z.object({
  dispute_id: z.string().uuid(),
  action: z.enum([
    "start_review", "request_evidence", "resolve", "appeal", "close",
    "suspend_passport", "reactivate_passport", "revoke_passport",
  ]),
  resolution_type: z.enum([
    "unanimous_amendment", "replacement_agreement", "authority_confirmation",
    "registry_correction", "withdrawal", "court_order", "admin_metadata_correction",
    "legal_escalation", "dismissed",
  ]).optional(),
  resolution_notes: z.string().max(8000).optional(),
  reason_codes: z.array(z.string().min(1).max(100)).max(20).default([]),
  artist_visible_message: z.string().max(4000).optional(),
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
        code: "ops_permission_required",
        message: "Music rights operations permission is required.",
      }),
    }
  }
  const flags = await resolveMusicRightsFlags(supabase, user.id)
  if (!flags.music_rights_ops_enabled) {
    return {
      success: false as const,
      response: jsonError({
        status: 404,
        code: "feature_disabled",
        message: "Rights operations are not available.",
      }),
    }
  }
  return authResult
}

async function applyPassportStatus(params: {
  trusted: any
  passportId: string | null | undefined
  projectId: string
  status: "suspended" | "issued" | "revoked"
  actorUserId: string
  requestId: string
  reasonCodes: string[]
}) {
  if (!params.passportId) return null
  const now = new Date().toISOString()
  const { data: passport } = await params.trusted
    .from("music_rights_passports")
    .select("id, status, current_version, project_id")
    .eq("id", params.passportId)
    .maybeSingle()
  if (!passport) return null

  await params.trusted.from("music_rights_passports").update({
    status: params.status === "issued" ? "issued" : params.status,
    updated_at: now,
  }).eq("id", passport.id)

  if (passport.current_version > 0) {
    await params.trusted.from("music_rights_passport_versions").update({
      status: params.status === "issued" ? "issued" : params.status,
    }).eq("passport_id", passport.id).eq("version", passport.current_version)
  }

  const { data: credential } = await params.trusted
    .from("music_rights_credentials")
    .select("id")
    .eq("passport_id", passport.id)
    .in("status", ["active", "suspended"])
    .order("issued_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (credential) {
    const credentialStatus = params.status === "issued" ? "active" : params.status
    await params.trusted.from("music_rights_credentials").update({ status: credentialStatus }).eq("id", credential.id)
    await params.trusted.from("music_rights_credential_status").insert({
      credential_id: credential.id,
      status: credentialStatus,
      reason_codes: params.reasonCodes,
      actor_user_id: params.actorUserId,
      actor_type: "reviewer",
      notes: `dispute_action:${params.requestId}`,
    })
  }

  await writeRightsAuditEvent({
    supabase: params.trusted,
    projectId: params.projectId,
    actorUserId: params.actorUserId,
    actorType: "reviewer",
    eventType: params.status === "suspended"
      ? "music.rights.passport.suspended"
      : params.status === "revoked"
        ? "music.rights.passport.revoked"
        : "music.rights.passport.reactivated",
    entityType: "passport",
    entityId: passport.id,
    eventData: { requestId: params.requestId, reasonCodes: params.reasonCodes },
  })

  return passport
}

export async function GET(request: NextRequest) {
  const authResult = await authorize(request)
  if (!authResult.success) return authResult.response
  const { supabase } = authResult.auth
  const trusted = await getTrustedMusicWriteClient(supabase)
  const status = request.nextUrl.searchParams.get("status")
  let query = trusted
    .from("music_rights_disputes")
    .select("*, music_rights_dispute_events(id, event_type, actor_type, artist_visible, created_at)")
    .order("opened_at", { ascending: true })
    .limit(200)
  query = status
    ? query.eq("status", status)
    : query.in("status", ["open", "under_review", "awaiting_evidence", "appealed"])
  const { data, error } = await query
  if (error) return jsonError({ status: 500, code: "disputes_query_failed", message: "Unable to load disputes.", retryable: true })
  return NextResponse.json({ data: data || [] })
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await authorize(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    if (!(await limiter.check(user.id)).success)
      return jsonError({ status: 429, code: "rate_limited", message: "Too many dispute actions.", retryable: true })

    const payload = createSchema.parse(await request.json())
    const trusted = await getTrustedMusicWriteClient(supabase)
    const { data: project } = await trusted
      .from("music_rights_projects")
      .select("id")
      .eq("id", payload.project_id)
      .maybeSingle()
    if (!project) return jsonError({ status: 404, code: "project_not_found", message: "Rights project not found." })

    const { data: existing } = await trusted
      .from("music_rights_disputes")
      .select("*")
      .contains("metadata", { request_id: payload.request_id })
      .maybeSingle()
    if (existing) return NextResponse.json({ data: existing, idempotent: true })

    const { data: dispute, error } = await trusted
      .from("music_rights_disputes")
      .insert({
        project_id: payload.project_id,
        passport_id: payload.passport_id || null,
        opened_by_user_id: user.id,
        dispute_type: payload.dispute_type,
        summary: payload.summary,
        severity: payload.severity,
        freeze_derivatives: payload.freeze_derivatives,
        suspend_passport: payload.suspend_passport,
        linked_dmca_case_id: payload.linked_dmca_case_id || null,
        metadata: { request_id: payload.request_id },
        effects: {
          freeze_derivatives: payload.freeze_derivatives,
          suspend_passport: payload.suspend_passport,
          dmca_linked: Boolean(payload.linked_dmca_case_id),
        },
      })
      .select("*")
      .single()
    if (error || !dispute)
      return jsonError({ status: 500, code: "dispute_create_failed", message: "Unable to open dispute.", retryable: true })

    await trusted.from("music_rights_dispute_events").insert({
      dispute_id: dispute.id,
      actor_user_id: user.id,
      actor_type: "reviewer",
      event_type: "dispute_opened",
      event_data: { dispute_type: payload.dispute_type, severity: payload.severity },
      artist_visible: true,
    })

    if (payload.suspend_passport) {
      await applyPassportStatus({
        trusted,
        passportId: payload.passport_id,
        projectId: payload.project_id,
        status: "suspended",
        actorUserId: user.id,
        requestId: payload.request_id,
        reasonCodes: ["dispute_opened"],
      })
    }

    await writeRightsAuditEvent({
      supabase: trusted,
      projectId: payload.project_id,
      actorUserId: user.id,
      actorType: "reviewer",
      eventType: "music.rights.claim.disputed",
      entityType: "dispute",
      entityId: dispute.id,
    })

    return NextResponse.json({ data: dispute }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "invalid_payload", message: "Invalid dispute payload.", details: error.flatten() })
    return jsonError({ status: 500, code: "dispute_create_failed", message: "Unable to open dispute.", retryable: true })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authResult = await authorize(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    if (!(await limiter.check(user.id)).success)
      return jsonError({ status: 429, code: "rate_limited", message: "Too many dispute actions.", retryable: true })

    const payload = patchSchema.parse(await request.json())
    const trusted = await getTrustedMusicWriteClient(supabase)
    const { data: dispute } = await trusted
      .from("music_rights_disputes")
      .select("*")
      .eq("id", payload.dispute_id)
      .maybeSingle()
    if (!dispute) return jsonError({ status: 404, code: "dispute_not_found", message: "Dispute not found." })

    const now = new Date().toISOString()
    const updates: Record<string, unknown> = { updated_at: now }

    if (payload.action === "start_review") updates.status = "under_review"
    if (payload.action === "request_evidence") updates.status = "awaiting_evidence"
    if (payload.action === "appeal") updates.status = "appealed"
    if (payload.action === "close") {
      updates.status = "closed"
      updates.resolved_at = now
    }
    if (payload.action === "resolve") {
      if (!payload.resolution_type)
        return jsonError({ status: 400, code: "resolution_required", message: "resolution_type is required to resolve." })
      updates.status = "resolved"
      updates.resolved_at = now
      updates.resolution_type = payload.resolution_type
      updates.resolution_notes = payload.resolution_notes || null
      updates.freeze_derivatives = false
    }

    if (["suspend_passport", "reactivate_passport", "revoke_passport"].includes(payload.action)) {
      const status =
        payload.action === "suspend_passport" ? "suspended"
          : payload.action === "revoke_passport" ? "revoked"
            : "issued"
      await applyPassportStatus({
        trusted,
        passportId: dispute.passport_id,
        projectId: dispute.project_id,
        status,
        actorUserId: user.id,
        requestId: payload.request_id,
        reasonCodes: payload.reason_codes,
      })
      if (payload.action === "suspend_passport") updates.suspend_passport = true
      if (payload.action === "reactivate_passport") updates.suspend_passport = false
    }

    const { data: updated, error } = await trusted
      .from("music_rights_disputes")
      .update(updates)
      .eq("id", dispute.id)
      .select("*")
      .single()
    if (error || !updated)
      return jsonError({ status: 500, code: "dispute_update_failed", message: "Unable to update dispute.", retryable: true })

    await trusted.from("music_rights_dispute_events").insert({
      dispute_id: dispute.id,
      actor_user_id: user.id,
      actor_type: "reviewer",
      event_type: `dispute_${payload.action}`,
      event_data: {
        request_id: payload.request_id,
        reason_codes: payload.reason_codes,
        resolution_type: payload.resolution_type || null,
      },
      artist_visible: Boolean(payload.artist_visible_message),
    })

    if (payload.action === "resolve" || payload.action === "suspend_passport" || payload.action === "revoke_passport") {
      await enqueueRightsOutboxEvent({
        supabase: trusted,
        projectId: dispute.project_id,
        eventType: `music.rights.dispute.${payload.action}`,
        dedupeKey: `dispute:${dispute.id}:${payload.action}:${payload.request_id}`,
        payload: { disputeId: dispute.id, action: payload.action },
      })
    }

    return NextResponse.json({ data: updated })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "invalid_payload", message: "Invalid dispute action.", details: error.flatten() })
    return jsonError({ status: 500, code: "dispute_update_failed", message: "Unable to update dispute.", retryable: true })
  }
}
