/**
 * app/api/music/playback/resolve/route.ts
 *
 * POST /api/music/playback/resolve
 *
 * Resolves a playable instruction for canonical Tourify tracks and, behind
 * disabled World flags, radio streams and world media (sound guides, archive
 * audio, narration).
 *
 * Track behavior is byte-identical to the pre-evolution route: absent `kind`
 * means `track`, and explicit `{ kind: "track" }` behaves the same way.
 * Non-track kinds dispatch through the generic media resolver registry.
 *
 * SECURITY: resolved stream URLs are returned with Cache-Control: private, no-store.
 * They are never logged or persisted. Server-only source records
 * (world_radio_streams / world_media_sources) are never returned wholesale.
 */

import { NextRequest, NextResponse } from "next/server"
import { jsonError, readJson, requireApiUser } from "@/lib/api/route-helpers"
import { createRateLimiter } from "@/lib/utils/rate-limit"
import { isAudiusEnabled } from "@/lib/music/providers/audius/audius-config"
import { audiusAdapter } from "@/lib/music/providers/audius/audius-adapter"
import { TourifyMusicError } from "@/lib/music/providers/contracts"
import { parseResolveRequest } from "@/lib/playback/normalize"
import {
  dispatchMediaResolve,
  registerMediaResolver,
} from "@/lib/playback/registry"
import { trackResolver } from "@/lib/playback/resolvers/track"
import { radioStreamResolver } from "@/lib/playback/resolvers/radio"
import {
  archiveAudioResolver,
  narrationResolver,
  soundGuideResolver,
} from "@/lib/playback/resolvers/world-media"
import { getTrustedMusicWriteClient } from "@/lib/music/music-access"

export const dynamic = "force-dynamic"

const resolveLimiter = createRateLimiter({
  namespace: "music:playback:resolve",
  limit: 60,
  windowSec: 60,
})

// Generic media resolvers (radio/world kinds). Track requests intentionally
// keep the original inline path below so legacy behavior cannot drift.
let resolversRegistered = false
function ensureResolvers() {
  if (resolversRegistered) return
  registerMediaResolver(radioStreamResolver)
  registerMediaResolver(soundGuideResolver)
  registerMediaResolver(archiveAudioResolver)
  registerMediaResolver(narrationResolver)
  resolversRegistered = true
}

export async function POST(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth

  const rawBody = await request.clone().json().catch(() => null)
  const parsed = rawBody === null ? { ok: false as const, reason: "invalid JSON body" } : parseResolveRequest(rawBody)
  if (!parsed.ok) {
    return jsonError({ status: 400, code: "INVALID_REQUEST", message: parsed.reason, retryable: false })
  }
  const body = parsed.request

  // Rate limit by user ID
  const rl = await resolveLimiter.check(user.id)
  if (!rl.success) {
    return jsonError({ status: 429, code: "PROVIDER_RATE_LIMITED", message: "Too many playback requests. Please slow down.", retryable: true })
  }

  try {
    if (body.kind !== "track") {
      ensureResolvers()
      const trustedSupabase = await getTrustedMusicWriteClient(supabase)
      const resolution = await dispatchMediaResolve(body, {
        supabase,
        trustedSupabase,
        userId: user.id,
      })
      // SECURITY: never log resolution.sourceUrl; private operational records
      // are projected into identity/attribution only.
      const response = NextResponse.json({
        data: {
          kind: resolution.identity.kind,
          identityId: resolution.identity.id,
          title: resolution.identity.title,
          creatorName: resolution.identity.creatorName ?? null,
          attribution: resolution.identity.attribution ?? null,
          sourceType: resolution.sourceType,
          sourceUrl: resolution.sourceUrl,
          expiresAt: resolution.expiresAt ?? null,
          capabilities: resolution.capabilities,
          playbackSessionId: resolution.playbackSessionId ?? null,
        },
        error: null,
      })
      response.headers.set("Cache-Control", "private, no-store")
      return response
    }

    // ── Legacy track path (unchanged) ───────────────────────────────
    const trackId = body.trackId
    const { playbackSessionId } = body

    // Load the canonical track and its provider reference
    const { data: track, error: trackError } = await supabase
      .from("artist_music")
      .select("id, user_id, metadata, is_public, is_visible, moderation_status, rights_confirmed, access_mode")
      .eq("id", trackId)
      .single()

    if (trackError || !track) {
      return jsonError({ status: 404, code: "TRACK_NOT_FOUND", message: "Track not found.", retryable: false })
    }

    // Determine provider from metadata
    const provider = (track.metadata as Record<string, unknown>)?.provider as string | undefined

    if (provider === "audius") {
      if (!isAudiusEnabled()) {
        return jsonError({ status: 403, code: "FEATURE_DISABLED", message: "Audius integration is not enabled.", retryable: false })
      }

      // Look up the Audius external track ID from provider references
      const { data: ref } = await supabase
        .from("music_provider_references")
        .select("external_track_id")
        .eq("track_id", trackId)
        .eq("provider", "audius")
        .maybeSingle()

      const externalTrackId = (ref?.external_track_id as string | undefined)
        || ((track.metadata as Record<string, unknown>)?.provider_track_id as string | undefined)

      if (!externalTrackId) {
        return jsonError({ status: 404, code: "TRACK_NOT_FOUND", message: "No Audius track reference found.", retryable: false })
      }

      const descriptor = await audiusAdapter.resolvePlayback(externalTrackId, trackId)

      // SECURITY: never log descriptor.sourceUrl
      const response = NextResponse.json({
        data: {
          trackId,
          sourceType: descriptor.sourceType,
          sourceUrl: descriptor.sourceUrl,
          expiresAt: descriptor.expiresAt,
          provider: "audius",
          playbackSessionId: playbackSessionId ?? null,
        },
        error: null,
      })
      response.headers.set("Cache-Control", "private, no-store")
      return response
    }

    // Native Tourify track — redirect client to stream endpoint
    // The stream endpoint handles access control and Supabase Storage signing.
    const response = NextResponse.json({
      data: {
        trackId,
        sourceType: "provider_proxy",
        sourceUrl: `/api/music/stream?trackId=${encodeURIComponent(trackId)}`,
        expiresAt: null,
        provider: "tourify",
        playbackSessionId: playbackSessionId ?? null,
      },
      error: null,
    })
    response.headers.set("Cache-Control", "private, no-store")
    return response
  } catch (err) {
    if (err instanceof TourifyMusicError) {
      const status = err.code === "TRACK_NOT_FOUND" ? 404
        : err.code === "TRACK_UNAVAILABLE" ? 410
        : err.code === "FEATURE_DISABLED" ? 403
        : err.code === "FORBIDDEN" ? 403
        : err.code === "INVALID_REQUEST" ? 400
        : err.code === "PROVIDER_TIMEOUT" ? 504
        : err.code === "PLAYBACK_RESOLUTION_FAILED" ? 502
        : 502
      return jsonError({ status, code: err.code, message: err.message, retryable: err.retryable })
    }
    console.error("[playback resolve] unexpected error", err)
    return jsonError({ status: 500, code: "INTERNAL_ERROR", message: "An unexpected error occurred.", retryable: true })
  }
}
