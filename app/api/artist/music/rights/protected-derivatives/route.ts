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
const limiter = createRateLimiter({ namespace: "music:rights:derivatives", limit: 20, windowSec: 60 })

const createSchema = z.object({
  project_id: z.string().uuid(),
  derivative_type: z.enum(["streaming", "downloadable", "promotional", "licensing_delivery", "preview"]),
  watermark: z.boolean().optional().default(false),
  c2pa: z.boolean().optional().default(true),
  processing_recipe: z.record(z.string(), z.unknown()).optional().default({}),
  idempotency_key: z.string().min(8).max(200),
  passport_id: z.string().uuid().optional(),
  source_asset_commitment: z.string().min(8).max(200).optional(),
})

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveMusicRightsFlags(supabase, user.id)
  const projectId = request.nextUrl.searchParams.get("projectId")
  let query = supabase
    .from("music_rights_derivatives")
    .select("*, music_rights_c2pa_manifests(id, status, manifest_store_hash), music_rights_watermarks(id, status, algorithm)")
    .eq("owner_user_id", user.id)
    .order("created_at", { ascending: false })
  if (projectId) query = query.eq("project_id", projectId)
  const { data, error } = await query
  if (error) return jsonError({ status: 500, code: "derivatives_query_failed", message: "Unable to load protected derivatives.", retryable: true })
  return NextResponse.json({
    data: data || [],
    enabled: flags.music_c2pa_derivatives_enabled,
    watermark_beta: flags.music_watermark_beta_enabled,
  })
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    if (!(await limiter.check(user.id)).success)
      return jsonError({ status: 429, code: "rate_limited", message: "Too many derivative requests.", retryable: true })

    const flags = await resolveMusicRightsFlags(supabase, user.id)
    if (!flags.music_c2pa_derivatives_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Protected derivatives are not available.", retryable: false })

    const payload = createSchema.parse(await request.json())
    if (payload.watermark && !flags.music_watermark_beta_enabled)
      return jsonError({ status: 400, code: "watermark_disabled", message: "Watermark beta is not enabled.", retryable: false })

    const trusted = await getTrustedMusicWriteClient(supabase)
    const project = await assertOwnedProject({ supabase: trusted, userId: user.id, projectId: payload.project_id })
    if (!project) return jsonError({ status: 404, code: "project_not_found", message: "Rights project not found.", retryable: false })

    const { data: openDispute } = await trusted
      .from("music_rights_disputes")
      .select("id")
      .eq("project_id", project.id)
      .eq("freeze_derivatives", true)
      .in("status", ["open", "under_review", "awaiting_evidence", "appealed"])
      .limit(1)
      .maybeSingle()
    if (openDispute)
      return jsonError({ status: 409, code: "derivatives_frozen", message: "Protected derivative issuance is frozen for an active dispute.", retryable: false })

    const { data: existing } = await trusted
      .from("music_rights_derivatives")
      .select("*")
      .eq("project_id", project.id)
      .eq("derivative_type", payload.derivative_type)
      .eq("idempotency_key", payload.idempotency_key)
      .maybeSingle()
    if (existing) return NextResponse.json({ data: existing, idempotent: true })

    const { data: recording } = await trusted
      .from("music_rights_sound_recordings")
      .select("id")
      .eq("project_id", project.id)
      .maybeSingle()

    const { data: derivative, error } = await trusted
      .from("music_rights_derivatives")
      .insert({
        project_id: project.id,
        owner_user_id: user.id,
        artist_music_id: project.artist_music_id,
        source_recording_id: recording?.id || null,
        passport_id: payload.passport_id || null,
        derivative_type: payload.derivative_type,
        status: "requested",
        processing_recipe: payload.processing_recipe,
        source_asset_commitment: payload.source_asset_commitment || null,
        watermark_enabled: payload.watermark,
        c2pa_enabled: payload.c2pa,
        adversarial_audio_prohibited: true,
        idempotency_key: payload.idempotency_key,
        metadata: { requested_by: user.id },
      })
      .select("*")
      .single()
    if (error || !derivative)
      return jsonError({ status: 500, code: "derivative_create_failed", message: "Unable to request protected derivative.", retryable: true })

    await Promise.all([
      writeRightsAuditEvent({
        supabase: trusted,
        projectId: project.id,
        actorUserId: user.id,
        eventType: "music.rights.derivative.requested",
        entityType: "derivative",
        entityId: derivative.id,
        eventData: { derivativeType: payload.derivative_type, watermark: payload.watermark, c2pa: payload.c2pa },
      }),
      enqueueRightsOutboxEvent({
        supabase: trusted,
        projectId: project.id,
        eventType: "music.rights.derivative.requested",
        dedupeKey: `derivative:${derivative.id}:requested`,
        payload: { derivativeId: derivative.id, projectId: project.id },
      }),
    ])

    return NextResponse.json({ data: derivative }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "invalid_payload", message: "Invalid protected derivative request.", issues: error.flatten() })
    return jsonError({ status: 500, code: "derivative_request_failed", message: "Unable to request protected derivative.", retryable: true })
  }
}
