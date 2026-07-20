import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { getTrustedMusicWriteClient } from "@/lib/music/music-access"
import { classifyCatalogMatch, type CatalogImportNormalized } from "@/lib/music-rights/catalog-import"
import { resolveMusicRightsFlags } from "@/lib/music-rights/music-rights-flags"
import { assertOwnedProject, writeRightsAuditEvent } from "@/lib/music-rights/rights-access"
import { createRateLimiter } from "@/lib/utils/rate-limit"

export const dynamic = "force-dynamic"
const limiter = createRateLimiter({ namespace: "music:rights:catalog-imports", limit: 30, windowSec: 60 })

const createSchema = z.object({
  project_id: z.string().uuid().optional(),
  source_type: z.enum([
    "spotify_url", "apple_music_url", "youtube_url", "soundcloud_url", "bandcamp_url",
    "isrc_list", "upc", "distributor_csv", "label_export", "manual", "other",
  ]),
  source_payload: z.record(z.string(), z.unknown()).default({}),
  normalized: z.object({
    title: z.string().max(300).optional().nullable(),
    artistName: z.string().max(300).optional().nullable(),
    isrc: z.string().max(32).optional().nullable(),
    upc: z.string().max(32).optional().nullable(),
    durationSeconds: z.number().int().min(0).optional().nullable(),
    releaseDate: z.string().max(32).optional().nullable(),
    externalUrl: z.string().url().optional().nullable(),
    provider: z.string().max(100).optional().nullable(),
  }).default({}),
  confirm_track_id: z.string().uuid().optional(),
})

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveMusicRightsFlags(supabase, user.id)
  const projectId = request.nextUrl.searchParams.get("projectId")
  let query = supabase
    .from("music_rights_catalog_imports")
    .select("*")
    .eq("owner_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100)
  if (projectId) query = query.eq("project_id", projectId)
  const { data, error } = await query
  if (error) return jsonError({ status: 500, code: "catalog_imports_query_failed", message: "Unable to load catalog imports.", retryable: true })
  return NextResponse.json({ data: data || [], enabled: flags.music_catalog_import_enabled })
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    if (!(await limiter.check(user.id)).success)
      return jsonError({ status: 429, code: "rate_limited", message: "Too many catalog import requests.", retryable: true })

    const flags = await resolveMusicRightsFlags(supabase, user.id)
    if (!flags.music_catalog_import_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Catalog import is not available.", retryable: false })

    const payload = createSchema.parse(await request.json())
    const trusted = await getTrustedMusicWriteClient(supabase)

    if (payload.project_id) {
      const project = await assertOwnedProject({ supabase: trusted, userId: user.id, projectId: payload.project_id })
      if (!project) return jsonError({ status: 404, code: "project_not_found", message: "Rights project not found.", retryable: false })
    }

    const { data: tracks, error: tracksError } = await trusted
      .from("artist_music")
      .select("id, title, duration, release_date, metadata")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(200)
    if (tracksError)
      return jsonError({ status: 500, code: "catalog_candidate_query_failed", message: "Unable to load catalog candidates.", retryable: true })

    const normalized: CatalogImportNormalized = payload.normalized
    const candidates = (tracks || []).map((track: any) => ({
      trackId: track.id,
      title: track.title,
      artistName: user.email || null,
      isrc: track.metadata?.isrc || track.metadata?.ISRC || null,
      durationSeconds: typeof track.duration === "number" ? track.duration : null,
      releaseDate: track.release_date || null,
    }))

    let match = classifyCatalogMatch({ normalized, candidates })
    if (payload.confirm_track_id) {
      const confirmed = candidates.find((candidate) => candidate.trackId === payload.confirm_track_id)
      if (!confirmed) return jsonError({ status: 404, code: "track_not_found", message: "Confirmed track not found.", retryable: false })
      match = {
        ...match,
        status: "confirmed",
        candidateTrackId: confirmed.trackId,
        confidence: Math.max(match.confidence, 1),
      }
    }

    const { data: row, error } = await trusted
      .from("music_rights_catalog_imports")
      .insert({
        owner_user_id: user.id,
        project_id: payload.project_id || null,
        artist_music_id: match.candidateTrackId || null,
        source_type: payload.source_type,
        source_payload: payload.source_payload,
        normalized,
        match_status: match.status,
        match_confidence: match.confidence,
        match_signals: match.signals,
        discrepancy_report: match.discrepancies,
        status: match.status === "confirmed" ? "linked" : "needs_confirmation",
      })
      .select("*")
      .single()
    if (error || !row)
      return jsonError({ status: 500, code: "catalog_import_create_failed", message: "Unable to create catalog import.", retryable: true })

    if (payload.project_id && match.candidateTrackId && match.status === "confirmed") {
      await trusted.from("music_rights_external_catalog_refs").insert({
        project_id: payload.project_id,
        owner_user_id: user.id,
        artist_music_id: match.candidateTrackId,
        catalog_import_id: row.id,
        provider: normalized.provider || payload.source_type,
        external_url: normalized.externalUrl || null,
        isrc: normalized.isrc || null,
        upc: normalized.upc || null,
        title: normalized.title || null,
        artist_name: normalized.artistName || null,
        release_date: normalized.releaseDate || null,
        duration_seconds: normalized.durationSeconds ?? null,
        raw: payload.source_payload,
        match_status: "confirmed",
      })
      await writeRightsAuditEvent({
        supabase: trusted,
        projectId: payload.project_id,
        actorUserId: user.id,
        eventType: "music.rights.catalog_import.linked",
        entityType: "catalog_import",
        entityId: row.id,
        eventData: { trackId: match.candidateTrackId, matchStatus: match.status },
      })
    }

    return NextResponse.json({ data: row, match }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "invalid_request", message: "Invalid catalog import request.", issues: error.issues })
    console.error("Catalog import failed", error)
    return jsonError({ status: 500, code: "catalog_import_internal_error", message: "Unexpected catalog import error.", retryable: true })
  }
}
