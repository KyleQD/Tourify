/**
 * app/api/music/import/route.ts
 *
 * POST /api/music/import
 *
 * Imports an external provider track into the authenticated user's artist profile.
 * Creates a canonical artist_music row + music_provider_references row.
 * Idempotent: repeated imports for the same (provider, externalTrackId, user)
 * return the existing canonical track record.
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, readJson, requireApiUser } from "@/lib/api/route-helpers"
import { createRateLimiter } from "@/lib/utils/rate-limit"
import { isAudiusEnabled } from "@/lib/music/providers/audius/audius-config"
import { audiusAdapter } from "@/lib/music/providers/audius/audius-adapter"
import { buildAudiusMetadataSnapshot, mapAudiusTrackToNormalized } from "@/lib/music/providers/audius/audius-mappers"
import { AudiusSingleTrackResponseSchema } from "@/lib/music/providers/audius/audius-schemas"
import { audiusSchemaError } from "@/lib/music/providers/audius/audius-errors"
import { getAudiusConfig } from "@/lib/music/providers/audius/audius-config"
import { audiusGet } from "@/lib/music/providers/audius/audius-client"
import { TourifyMusicError } from "@/lib/music/providers/contracts"
import { getTrustedMusicWriteClient } from "@/lib/music/music-access"

export const dynamic = "force-dynamic"

const importLimiter = createRateLimiter({
  namespace: "audius:import",
  limit: 20,
  windowSec: 60,
})

const ImportBodySchema = z.object({
  provider: z.enum(["audius"]),
  externalTrackId: z.string().min(1).max(200),
  artistProfileId: z.string().uuid().optional().nullable(),
  sourceSurface: z.string().max(100).optional().nullable(),
})

export async function POST(request: NextRequest) {
  if (!isAudiusEnabled()) {
    return jsonError({ status: 403, code: "FEATURE_DISABLED", message: "Audius integration is not enabled.", retryable: false })
  }

  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth

  const bodyResult = await readJson(request, ImportBodySchema)
  if (!bodyResult.success) return bodyResult.response
  const { externalTrackId, artistProfileId, sourceSurface } = bodyResult.data

  // Rate limit by user ID
  const rl = await importLimiter.check(user.id)
  if (!rl.success) {
    return jsonError({ status: 429, code: "PROVIDER_RATE_LIMITED", message: "Too many import requests. Please slow down.", retryable: true })
  }

  // If artistProfileId provided, verify ownership
  if (artistProfileId) {
    const { data: profile } = await supabase
      .from("artist_profiles")
      .select("id, user_id")
      .eq("id", artistProfileId)
      .eq("user_id", user.id)
      .maybeSingle()
    if (!profile) {
      return jsonError({ status: 403, code: "FORBIDDEN", message: "You do not own this artist profile.", retryable: false })
    }
  }

  try {
    // ── 1. Check for existing provider reference (idempotency) ──────────────
    const { data: existingRef } = await supabase
      .from("music_provider_references")
      .select("id, track_id")
      .eq("provider", "audius")
      .eq("external_track_id", externalTrackId)
      .maybeSingle()

    if (existingRef) {
      // Check if the existing track belongs to this user
      const { data: existingTrack } = await supabase
        .from("artist_music")
        .select("id, title, cover_art_url, duration, genre, is_public, metadata")
        .eq("id", existingRef.track_id)
        .eq("user_id", user.id)
        .maybeSingle()

      if (existingTrack) {
        return NextResponse.json({
          data: { ...existingTrack, alreadyImported: true },
          error: null,
        })
      }
      // The reference exists but belongs to a different user — allow this user to import too
      // (different users can link the same Audius track to their own profiles)
    }

    // ── 2. Fetch fresh metadata from Audius ──────────────────────────────────
    const config = getAudiusConfig()
    const raw = await audiusGet(`/v1/tracks/${encodeURIComponent(externalTrackId)}`, {}, { config })
    const parsed = AudiusSingleTrackResponseSchema.safeParse(raw)
    if (!parsed.success || !parsed.data.data) {
      throw audiusSchemaError(parsed.success ? undefined : parsed.error)
    }
    const audiusTrack = parsed.data.data
    const normalized = mapAudiusTrackToNormalized(audiusTrack)

    if (normalized.availability === "unavailable") {
      return jsonError({ status: 422, code: "TRACK_UNAVAILABLE", message: "This Audius track is not available for import.", retryable: false })
    }

    const metadataSnapshot = buildAudiusMetadataSnapshot(audiusTrack)

    // ── 3. Create canonical artist_music row ─────────────────────────────────
    const writeClient = await getTrustedMusicWriteClient(supabase)

    const { data: newTrack, error: trackInsertError } = await writeClient
      .from("artist_music")
      .insert({
        user_id: user.id,
        artist_profile_id: artistProfileId ?? null,
        title: normalized.title,
        type: "single",
        genre: normalized.availability === "available" ? (audiusTrack.genre ?? null) : null,
        duration: audiusTrack.duration ?? null,
        cover_art_url: normalized.artworkUrl ?? null,
        // No file_url — Audius tracks resolve at playback time
        file_url: null,
        is_public: true,
        access_mode: "free",
        preview_mode: "full",
        preview_duration_seconds: 15,
        allow_library_add: true,
        allow_profile_feature: true,
        allow_downloads: false,
        rights_confirmed: true,
        rights_confirmed_at: new Date().toISOString(),
        moderation_status: "approved",
        is_visible: true,
        metadata: {
          provider: "audius",
          provider_track_id: externalTrackId,
          canonical_url: metadataSnapshot.canonical_url,
          audius_metadata: metadataSnapshot,
        },
      })
      .select("id, title, cover_art_url, duration, genre, is_public, metadata")
      .single()

    if (trackInsertError || !newTrack) {
      console.error("[music import] failed to insert artist_music", trackInsertError)
      return jsonError({ status: 500, code: "INTERNAL_ERROR", message: "Failed to create track record.", retryable: true })
    }

    // ── 4. Create provider reference ─────────────────────────────────────────
    const { data: newRef, error: refError } = await writeClient
      .from("music_provider_references")
      .insert({
        track_id: newTrack.id,
        provider: "audius",
        external_track_id: externalTrackId,
        external_artist_id: audiusTrack.user?.id ?? null,
        canonical_url: String(metadataSnapshot.canonical_url ?? ""),
        metadata: metadataSnapshot,
        availability_status: normalized.availability,
        last_synced_at: new Date().toISOString(),
      })
      .select("id")
      .single()

    if (refError || !newRef) {
      console.error("[music import] failed to insert provider reference", refError)
      // Track was created but ref failed — still return the track
    }

    // ── 5. Record import audit ────────────────────────────────────────────────
    if (newRef) {
      await writeClient.from("music_provider_imports").insert({
        provider_reference_id: newRef.id,
        imported_by: user.id,
        source_surface: sourceSurface ?? "unknown",
        import_context: { artist_profile_id: artistProfileId ?? null },
      }).catch((err: unknown) => {
        console.warn("[music import] failed to record import audit", err)
      })
    }

    return NextResponse.json({
      data: { ...newTrack, alreadyImported: false },
      error: null,
    }, { status: 201 })
  } catch (err) {
    if (err instanceof TourifyMusicError) {
      const status = err.code === "TRACK_NOT_FOUND" ? 404
        : err.code === "TRACK_UNAVAILABLE" ? 422
        : err.code === "FORBIDDEN" ? 403
        : err.code === "FEATURE_DISABLED" ? 403
        : err.code === "PROVIDER_TIMEOUT" ? 504
        : 502
      return jsonError({ status, code: err.code, message: err.message, retryable: err.retryable })
    }
    console.error("[music import] unexpected error", err)
    return jsonError({ status: 500, code: "INTERNAL_ERROR", message: "An unexpected error occurred.", retryable: true })
  }
}
