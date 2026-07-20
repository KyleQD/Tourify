import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { getSellerPayoutReadiness } from "@/lib/marketplace/seller-payout-readiness"
import { getTrackFullStoragePath, getTrackPreviewStoragePath, getTrackStorageBucket, getTrustedMusicWriteClient } from "@/lib/music/music-access"
import { enqueueMusicPreviewJob, previewStatusForTrack } from "@/lib/music/preview-jobs"
import { resolveMusicTrustFlags } from "@/lib/music/music-trust-flags"
import {
  buildMusicTrustDto,
  HUMAN_MUSIC_POLICY_VERSION,
  MUSIC_AI_USE_CATEGORIES,
  MUSIC_TRAINING_USE_POLICIES,
  MUSIC_UPLOAD_POLICY_VERSION,
  resolveMusicPublicationTrust,
} from "@/lib/music/music-trust"
import { markMusicTrustRepairRequired, persistMusicDeclaration } from "@/lib/music/music-trust-persistence"
import { createRateLimiter } from "@/lib/utils/rate-limit"

export const dynamic = "force-dynamic"

const mutationLimiter = createRateLimiter({ namespace: "music:track:mutation", limit: 30, windowSec: 60 })

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth

    const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get("limit") || "100"), 1), 300)
    const offset = Number(request.nextUrl.searchParams.get("offset") || "0")
    const genre = request.nextUrl.searchParams.get("genre")
    const isPublic = request.nextUrl.searchParams.get("is_public")

    let query = supabase
      .from("artist_music")
      .select(
        "id, title, description, genre, duration, file_url, preview_file_url, storage_bucket, storage_path, preview_storage_bucket, preview_storage_path, preview_status, preview_error, preview_generated_at, cover_art_url, tags, type, is_public, is_featured, is_pinned, access_mode, preview_mode, preview_duration_seconds, allow_library_add, allow_profile_feature, allow_downloads, rights_confirmed, rights_confirmed_at, trust_schema_version, trust_setup_status, ai_use_category, training_use_policy, origin_status, certification_status, certification_level, certification_public_id, certification_standard_version, certification_updated_at, listing_sync_status, listing_sync_error, stats, release_date, lyrics, spotify_url, apple_music_url, soundcloud_url, youtube_url, metadata, created_at, updated_at",
        { count: "exact" }
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (genre) query = query.eq("genre", genre)
    if (isPublic === "true") query = query.eq("is_public", true)
    if (isPublic === "false") query = query.eq("is_public", false)

    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      console.error("Failed to fetch artist tracks", error)
      return jsonError({
        status: 500,
        code: "artist_tracks_query_failed",
        message: "Failed to fetch artist tracks",
        retryable: true,
      })
    }

    const flags = await resolveMusicTrustFlags(supabase, user.id)
    const tracks = (data || []).map((track: any) => ({ ...track, trust: buildMusicTrustDto(track) }))
    return NextResponse.json({
      data: tracks,
      total: count ?? tracks.length,
      trust_config: {
        enabled: flags.music_trust_upload_fields_enabled,
        music_upload_policy_version: MUSIC_UPLOAD_POLICY_VERSION,
        human_music_policy_version: HUMAN_MUSIC_POLICY_VERSION,
      },
    })
  } catch (error) {
    console.error("Unexpected artist tracks GET error", error)
    return jsonError({
      status: 500,
      code: "artist_tracks_internal_error",
      message: "Unexpected artist tracks error",
      retryable: true,
    })
  }
}

const updateTrackSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  genre: z.string().max(50).nullable().optional(),
  type: z.enum(["single", "album", "ep", "mixtape"]).optional(),
  is_public: z.boolean().optional(),
  is_featured: z.boolean().optional(),
  access_mode: z.enum(["free", "paid"]).optional(),
  preview_mode: z.enum(["full", "clip"]).optional(),
  preview_duration_seconds: z.number().int().min(1).max(600).optional(),
  preview_file_url: z.string().nullable().optional(),
  storage_bucket: z.string().nullable().optional(),
  storage_path: z.string().nullable().optional(),
  preview_storage_bucket: z.string().nullable().optional(),
  preview_storage_path: z.string().nullable().optional(),
  preview_status: z.enum(["not_required", "pending", "ready", "failed"]).optional(),
  preview_error: z.string().nullable().optional(),
  preview_generated_at: z.string().nullable().optional(),
  allow_library_add: z.boolean().optional(),
  allow_profile_feature: z.boolean().optional(),
  allow_downloads: z.boolean().optional(),
  rights_confirmed: z.boolean().optional(),
  rights_confirmed_at: z.string().nullable().optional(),
  file_url: z.string().nullable().optional(),
  duration: z.number().int().min(0).nullable().optional(),
  tags: z.array(z.string()).optional(),
  lyrics: z.string().nullable().optional(),
  release_date: z.string().nullable().optional(),
  cover_art_url: z.string().nullable().optional(),
  spotify_url: z.string().nullable().optional(),
  apple_music_url: z.string().nullable().optional(),
  soundcloud_url: z.string().nullable().optional(),
  youtube_url: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  price: z.union([z.number(), z.string()]).optional().nullable(),
  currency: z.string().length(3).optional(),
  license_type: z.enum(["personal_use", "commercial_use", "exclusive"]).optional(),
  ai_use_category: z.enum(MUSIC_AI_USE_CATEGORIES).optional(),
  ai_tools: z.array(z.string().min(1).max(100)).max(30).optional(),
  ai_disclosure_details: z.string().max(4000).nullable().optional(),
  synthesized_voice_or_likeness: z.boolean().optional(),
  contributor_disclosures_confirmed: z.boolean().optional(),
  source_material_available: z.boolean().optional(),
  training_use_policy: z.enum(MUSIC_TRAINING_USE_POLICIES).optional(),
  accepted_music_upload_policy: z.boolean().optional(),
  accepted_human_music_policy: z.boolean().optional(),
  music_upload_policy_version: z.string().max(32).optional(),
  human_music_policy_version: z.string().max(32).optional(),
  declaration_idempotency_key: z.string().min(8).max(200).optional(),
})

const createTrackSchema = updateTrackSchema.omit({ id: true }).extend({
  title: z.string().min(1).max(200),
  file_url: z.string().optional().nullable(),
  type: z.enum(["single", "album", "ep", "mixtape"]).default("single"),
}).refine((value) => Boolean(value.file_url || value.storage_path), {
  message: "file_url or storage_path is required",
  path: ["storage_path"],
})

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth

    const rateLimit = await mutationLimiter.check(user.id)
    if (!rateLimit.success) return jsonError({ status: 429, code: "rate_limited", message: "Too many music changes.", retryable: true })

    const payload = createTrackSchema.parse(await request.json())
    const flags = await resolveMusicTrustFlags(supabase, user.id)
    const declarationIdempotencyKey = payload.declaration_idempotency_key || request.headers.get("idempotency-key") || crypto.randomUUID()
    if (flags.music_trust_upload_fields_enabled && (payload.declaration_idempotency_key || request.headers.get("idempotency-key"))) {
      const trusted = await getTrustedMusicWriteClient(supabase)
      const { data: existingDeclaration } = await trusted.from("music_upload_declarations")
        .select("track_id").eq("user_id", user.id).eq("idempotency_key", declarationIdempotencyKey).maybeSingle()
      if (existingDeclaration) {
        const { data: existingTrack } = await trusted.from("artist_music").select("*")
          .eq("id", existingDeclaration.track_id).eq("user_id", user.id).maybeSingle()
        if (existingTrack) return NextResponse.json({
          data: existingTrack, trust: buildMusicTrustDto(existingTrack), idempotent: true,
        })
      }
    }
    const nextPreviewStatus = previewStatusForTrack({
      previewMode: payload.preview_mode || "full",
      previewStoragePath: payload.preview_storage_path,
      previewFileUrl: payload.preview_file_url,
    })
    const wantsPublic = payload.is_public !== false
    const rightsConfirmed = payload.rights_confirmed === true

    const trustFieldsEnabled = flags.music_trust_upload_fields_enabled
    const publication = resolveMusicPublicationTrust({
      rightsConfirmed,
      aiUseCategory: payload.ai_use_category || "unknown",
      policyVersionsAccepted:
        payload.accepted_music_upload_policy === true &&
        payload.accepted_human_music_policy === true &&
        (payload.music_upload_policy_version || MUSIC_UPLOAD_POLICY_VERSION) === MUSIC_UPLOAD_POLICY_VERSION &&
        (payload.human_music_policy_version || HUMAN_MUSIC_POLICY_VERSION) === HUMAN_MUSIC_POLICY_VERSION,
      isPublic: wantsPublic,
      moderationStatus: "approved",
      isVisible: true,
      previewReady: (payload.preview_mode || "full") !== "clip" || nextPreviewStatus === "ready",
      humanOnlyGateEnabled: flags.music_human_only_public_gate_enabled,
    })

    if (trustFieldsEnabled && !publication.allowed) {
      return jsonError({
        status: 400,
        code: publication.blockingReasons[0] || "music_trust_publication_blocked",
        message: "Complete the Rights & Origin requirements before publishing.",
        retryable: false,
        issues: publication.blockingReasons,
      })
    }

    if (!trustFieldsEnabled && wantsPublic && !rightsConfirmed) {
      return jsonError({
        status: 400,
        code: "rights_confirmation_required",
        message: "Rights confirmation is required before publishing music.",
        retryable: false,
      })
    }
    if (wantsPublic && (payload.preview_mode || "full") === "clip" && nextPreviewStatus !== "ready") {
      return jsonError({
        status: 400,
        code: "preview_not_ready",
        message: "A clipped preview must be generated before this track can be published.",
        retryable: false,
      })
    }

    const { data: profile } = await supabase
      .from("artist_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle()

    const insertPayload = {
      user_id: user.id,
      artist_profile_id: profile?.id || null,
      title: payload.title,
      description: payload.description || null,
      genre: payload.genre || null,
      type: payload.type,
      release_date: payload.release_date || new Date().toISOString().slice(0, 10),
      duration: payload.duration ?? null,
      file_url: payload.file_url || null,
      storage_bucket: payload.storage_bucket || "artist-music",
      storage_path: payload.storage_path || null,
      preview_file_url: payload.preview_file_url || null,
      preview_storage_bucket: payload.preview_storage_bucket || (payload.preview_storage_path ? "artist-music" : null),
      preview_storage_path: payload.preview_storage_path || null,
      preview_status: nextPreviewStatus,
      preview_error: null,
      preview_generated_at: nextPreviewStatus === "ready" ? new Date().toISOString() : null,
      cover_art_url: payload.cover_art_url || null,
      lyrics: payload.lyrics || null,
      spotify_url: payload.spotify_url || null,
      apple_music_url: payload.apple_music_url || null,
      soundcloud_url: payload.soundcloud_url || null,
      youtube_url: payload.youtube_url || null,
      tags: payload.tags || [],
      is_featured: payload.is_featured || false,
      is_public: false,
      access_mode: payload.access_mode || "free",
      preview_mode: payload.preview_mode || "full",
      preview_duration_seconds: payload.preview_duration_seconds || 15,
      allow_library_add: payload.allow_library_add ?? true,
      allow_profile_feature: payload.allow_profile_feature ?? true,
      allow_downloads: payload.allow_downloads || false,
      rights_confirmed: rightsConfirmed,
      rights_confirmed_at: rightsConfirmed ? payload.rights_confirmed_at || new Date().toISOString() : null,
      metadata: payload.metadata || {},
    }

    const { data, error } = await supabase
      .from("artist_music")
      .insert(insertPayload)
      .select("*")
      .single()

    if (error) {
      console.error("Failed to create track", error)
      return jsonError({ status: 500, code: "track_create_failed", message: "Failed to create track", retryable: true })
    }

    let declaration = null
    if (trustFieldsEnabled) {
      try {
        declaration = await persistMusicDeclaration({
          supabase,
          track: data,
          userId: user.id,
          payload,
          idempotencyKey: declarationIdempotencyKey,
          originProcessingEnabled: flags.music_origin_processing_enabled,
        })
      } catch (trustError) {
        console.error("Failed to persist music trust records", trustError)
        await markMusicTrustRepairRequired(supabase, data.id, user.id)
        return jsonError({
          status: 500,
          code: "music_trust_setup_failed",
          message: "The track was saved privately, but its trust record needs repair.",
          retryable: true,
          issues: { track_id: data.id },
        })
      }
    }

    let finalTrack = data
    if (wantsPublic) {
      const { data: published, error: publishError } = await supabase
        .from("artist_music")
        .update({ is_public: true, updated_at: new Date().toISOString() })
        .eq("id", data.id)
        .eq("user_id", user.id)
        .select("*")
        .single()
      if (publishError || !published) {
        await markMusicTrustRepairRequired(supabase, data.id, user.id)
        return jsonError({
          status: 500,
          code: "track_publish_failed",
          message: "The track was saved privately and can be repaired before publishing.",
          retryable: true,
          issues: { track_id: data.id },
        })
      }
      finalTrack = published
    }

    if ((payload.access_mode || "free") === "paid") {
      await syncPaidMusicListing({
        supabase,
        userId: user.id,
        track: finalTrack,
        payload,
      })
    }

    if (finalTrack.preview_mode === "clip" && finalTrack.preview_status === "pending" && finalTrack.storage_path) {
      await enqueueMusicPreviewJob({
        supabase,
        musicId: finalTrack.id,
        artistUserId: user.id,
        sourceBucket: finalTrack.storage_bucket || "artist-music",
        sourcePath: finalTrack.storage_path,
        durationSeconds: finalTrack.preview_duration_seconds || 15,
        metadata: { source: "api_artist_music_create" },
      })
    }

    if (!wantsPublic && trustFieldsEnabled) {
      const { data: refreshed } = await supabase.from("artist_music").select("*").eq("id", data.id).single()
      if (refreshed) finalTrack = refreshed
    }
    return NextResponse.json({ data: finalTrack, declaration, trust: buildMusicTrustDto(finalTrack, publication) })
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json({ error: "Invalid payload", issues: error.issues }, { status: 400 })
    console.error("Unexpected track POST error", error)
    return jsonError({ status: 500, code: "track_create_internal", message: "Unexpected error", retryable: true })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth

    const rateLimit = await mutationLimiter.check(user.id)
    if (!rateLimit.success) return jsonError({ status: 429, code: "rate_limited", message: "Too many music changes.", retryable: true })

    const payload = updateTrackSchema.parse(await request.json())
    const flags = await resolveMusicTrustFlags(supabase, user.id)
    const {
      id, price, currency, license_type,
      ai_tools: _aiTools,
      ai_disclosure_details: _aiDisclosureDetails,
      synthesized_voice_or_likeness: _synthesizedVoiceOrLikeness,
      contributor_disclosures_confirmed: _contributorDisclosuresConfirmed,
      source_material_available: _sourceMaterialAvailable,
      accepted_music_upload_policy: _acceptedMusicUploadPolicy,
      accepted_human_music_policy: _acceptedHumanMusicPolicy,
      music_upload_policy_version: _musicUploadPolicyVersion,
      human_music_policy_version: _humanMusicPolicyVersion,
      declaration_idempotency_key: _declarationIdempotencyKey,
      ...updates
    } = payload
    const commercePayload = { price, currency, license_type, metadata: payload.metadata }

    const hasCommerceUpdates = price !== undefined || currency !== undefined || license_type !== undefined
    if (Object.keys(updates).length === 0 && !hasCommerceUpdates)
      return jsonError({ status: 400, code: "no_updates", message: "No fields to update", retryable: false })

    if (!flags.music_trust_upload_fields_enabled && updates.is_public === true && updates.rights_confirmed !== true) {
      const { data: currentRights } = await supabase
        .from("artist_music")
        .select("rights_confirmed, rights_confirmed_at, preview_mode, preview_status, preview_storage_path, preview_file_url")
        .eq("id", id)
        .single()

      if (!currentRights?.rights_confirmed || !currentRights?.rights_confirmed_at) {
        return jsonError({
          status: 400,
          code: "rights_confirmation_required",
          message: "Rights confirmation is required before publishing music.",
          retryable: false,
        })
      }
      const publishingClip =
        (updates.preview_mode || currentRights.preview_mode || "full") === "clip"
      const hasPreview =
        updates.preview_storage_path ||
        updates.preview_file_url ||
        currentRights.preview_storage_path ||
        currentRights.preview_file_url
      const readyPreview = (updates.preview_status || currentRights.preview_status) === "ready"
      if (publishingClip && (!readyPreview || !hasPreview)) {
        return jsonError({
          status: 400,
          code: "preview_not_ready",
          message: "A clipped preview must be generated before this track can be published.",
          retryable: false,
        })
      }
    }

    const { data: existing } = await supabase
      .from("artist_music")
      .select("*")
      .eq("id", id)
      .single()

    if (!existing)
      return jsonError({ status: 404, code: "track_not_found", message: "Track not found", retryable: false })
    if (existing.user_id !== user.id)
      return jsonError({ status: 403, code: "forbidden", message: "You can only edit your own tracks", retryable: false })

    const trustFieldsChanged = [
      "rights_confirmed", "ai_use_category", "ai_tools", "ai_disclosure_details",
      "synthesized_voice_or_likeness", "contributor_disclosures_confirmed",
      "source_material_available", "training_use_policy", "accepted_music_upload_policy",
      "accepted_human_music_policy", "music_upload_policy_version", "human_music_policy_version",
      "storage_path", "file_url",
    ].some((field) => Object.prototype.hasOwnProperty.call(payload, field))

    let currentDeclaration: any = null
    if (flags.music_trust_upload_fields_enabled && existing.active_declaration_id) {
      const declarationResult = await supabase
        .from("music_upload_declarations")
        .select("accepted_music_upload_policy, accepted_human_music_policy, music_upload_policy_version, human_music_policy_version")
        .eq("id", existing.active_declaration_id)
        .maybeSingle()
      currentDeclaration = declarationResult.data
    }
    const effectivePublication = resolveMusicPublicationTrust({
      rightsConfirmed: updates.rights_confirmed ?? existing.rights_confirmed ?? false,
      aiUseCategory: (updates.ai_use_category || existing.ai_use_category || "unknown") as any,
      policyVersionsAccepted:
        (payload.accepted_music_upload_policy ?? currentDeclaration?.accepted_music_upload_policy) === true &&
        (payload.accepted_human_music_policy ?? currentDeclaration?.accepted_human_music_policy) === true &&
        (payload.music_upload_policy_version || currentDeclaration?.music_upload_policy_version || MUSIC_UPLOAD_POLICY_VERSION) === MUSIC_UPLOAD_POLICY_VERSION &&
        (payload.human_music_policy_version || currentDeclaration?.human_music_policy_version || HUMAN_MUSIC_POLICY_VERSION) === HUMAN_MUSIC_POLICY_VERSION,
      isPublic: updates.is_public ?? existing.is_public ?? false,
      moderationStatus: existing.moderation_status,
      isVisible: existing.is_visible,
      previewReady: (updates.preview_mode || existing.preview_mode || "full") !== "clip" ||
        Boolean(updates.preview_storage_path || updates.preview_file_url || existing.preview_storage_path || existing.preview_file_url),
      humanOnlyGateEnabled: flags.music_human_only_public_gate_enabled,
    })
    if (flags.music_trust_upload_fields_enabled && !effectivePublication.allowed) {
      return jsonError({
        status: 400,
        code: effectivePublication.blockingReasons[0] || "music_trust_publication_blocked",
        message: "Complete the Rights & Origin requirements before publishing.",
        retryable: false,
        issues: effectivePublication.blockingReasons,
      })
    }

    const computedUpdates: Record<string, unknown> = { ...updates }
    const shouldRepublishWithNewDeclaration =
      flags.music_trust_upload_fields_enabled && trustFieldsChanged && effectivePublication.allowed &&
      (updates.is_public ?? existing.is_public ?? false) === true
    if (shouldRepublishWithNewDeclaration) computedUpdates.is_public = false
    const effectivePreviewMode = updates.preview_mode || existing.preview_mode || "full"
    const effectivePreviewStoragePath =
      updates.preview_storage_path !== undefined ? updates.preview_storage_path : existing.preview_storage_path
    const effectivePreviewFileUrl =
      updates.preview_file_url !== undefined ? updates.preview_file_url : existing.preview_file_url
    if (effectivePreviewMode !== "clip") {
      computedUpdates.preview_status = "not_required"
      computedUpdates.preview_error = null
      computedUpdates.preview_generated_at = null
    } else if (effectivePreviewStoragePath || effectivePreviewFileUrl) {
      computedUpdates.preview_status = "ready"
      computedUpdates.preview_error = null
      computedUpdates.preview_generated_at = updates.preview_generated_at || new Date().toISOString()
    } else if (updates.storage_path || updates.preview_mode === "clip") {
      computedUpdates.preview_status = "pending"
      computedUpdates.preview_error = null
      computedUpdates.is_public = false
    }

    const updateResult = await supabase
      .from("artist_music")
      .update({
        ...computedUpdates,
        rights_confirmed_at:
          updates.rights_confirmed === true && !updates.rights_confirmed_at
            ? new Date().toISOString()
            : updates.rights_confirmed_at,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .select("*")
      .single()
    let data = updateResult.data
    const error = updateResult.error

    if (error) {
      console.error("Failed to update track", error)
      return jsonError({ status: 500, code: "track_update_failed", message: "Failed to update track", retryable: true })
    }

    let versionedDeclaration: any = null
    if (flags.music_trust_upload_fields_enabled && trustFieldsChanged) {
      try {
        versionedDeclaration = await persistMusicDeclaration({
          supabase,
          track: data,
          userId: user.id,
          payload,
          idempotencyKey: payload.declaration_idempotency_key || request.headers.get("idempotency-key") || crypto.randomUUID(),
          originProcessingEnabled: flags.music_origin_processing_enabled,
        })
      } catch (trustError) {
        console.error("Failed to version music declaration", trustError)
        await markMusicTrustRepairRequired(supabase, id, user.id)
        return jsonError({
          status: 500,
          code: "music_trust_setup_failed",
          message: "Changes were saved privately, but the trust record needs repair.",
          retryable: true,
          issues: { track_id: id },
        })
      }
    }

    if (trustFieldsChanged && existing.certification_status === "approved") {
      const trusted = await getTrustedMusicWriteClient(supabase)
      const supersededAt = new Date().toISOString()
      await trusted.from("music_certificates").update({ status: "superseded", superseded_at: supersededAt })
        .eq("track_id", id).in("status", ["active", "suspended"])
      const { data: approvedCase } = await trusted.from("music_certification_cases").select("id")
        .eq("track_id", id).eq("status", "approved").order("case_version", { ascending: false }).limit(1).maybeSingle()
      if (approvedCase) await trusted.from("music_certification_events").insert({
        case_id: approvedCase.id, actor_user_id: user.id, actor_type: "artist",
        event_type: "material_change_requires_new_case", from_status: "approved", to_status: "approved",
        event_data: { declaration_id: versionedDeclaration?.id || null }, artist_visible: true,
      })
      await trusted.from("artist_music").update({
        certification_status: "not_requested", certification_level: 0,
        certification_public_id: null, certification_updated_at: supersededAt,
      }).eq("id", id).eq("user_id", user.id)
    }

    if (shouldRepublishWithNewDeclaration) {
      const { data: republished, error: publishError } = await supabase.from("artist_music")
        .update({ is_public: true, updated_at: new Date().toISOString() })
        .eq("id", id).eq("user_id", user.id).select("*").single()
      if (publishError || !republished) {
        await markMusicTrustRepairRequired(supabase, id, user.id)
        return jsonError({
          status: 500, code: "track_publish_failed",
          message: "Changes were saved privately and can be repaired before publishing.",
          retryable: true, issues: { track_id: id },
        })
      }
      data = republished
    }

    if ((updates.access_mode || data.access_mode) === "paid") {
      await syncPaidMusicListing({
        supabase,
        userId: user.id,
        track: data,
        payload: { ...updates, ...commercePayload },
      })
    }

    if (data.preview_mode === "clip" && data.preview_status === "pending" && data.storage_path) {
      await enqueueMusicPreviewJob({
        supabase,
        musicId: data.id,
        artistUserId: user.id,
        sourceBucket: data.storage_bucket || "artist-music",
        sourcePath: data.storage_path,
        durationSeconds: data.preview_duration_seconds || 15,
        metadata: { source: "api_artist_music_update" },
      })
    }

    const { data: refreshed } = await supabase.from("artist_music").select("*").eq("id", id).single()
    const responseTrack = refreshed || data
    return NextResponse.json({ data: responseTrack, trust: buildMusicTrustDto(responseTrack, effectivePublication) })
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json({ error: "Invalid payload", issues: error.issues }, { status: 400 })
    console.error("Unexpected track PATCH error", error)
    return jsonError({ status: 500, code: "track_update_internal", message: "Unexpected error", retryable: true })
  }
}

function resolvePrice(payload: Record<string, any>) {
  const raw = payload.price ?? payload.metadata?.price ?? payload.metadata?.commerce?.price
  const value = Number(raw)
  return Number.isFinite(value) && value > 0 ? value : null
}

async function syncPaidMusicListing({
  supabase,
  userId,
  track,
  payload,
}: {
  supabase: any
  userId: string
  track: any
  payload: Record<string, any>
}) {
  const price = resolvePrice(payload)
  if (!price) {
    await supabase
      .from("artist_music")
      .update({ listing_sync_status: "blocked", listing_sync_error: "price_required" })
      .eq("id", track.id)
      .eq("user_id", userId)
    return null
  }

  const { data: existing } = await supabase
    .from("marketplace_listings")
    .select("id, status")
    .eq("seller_user_id", userId)
    .eq("category", "music")
    .eq("music_track_id", track.id)
    .maybeSingle()

  const { data: storefront } = await supabase
    .from("marketplace_storefronts")
    .select("id, accepted_seller_agreement_at")
    .eq("seller_user_id", userId)
    .maybeSingle()

  let listingStatus: "draft" | "published" = "draft"
  if (storefront?.accepted_seller_agreement_at) {
    const payoutReadiness = await getSellerPayoutReadiness({ supabase, sellerUserId: userId })
    if (payoutReadiness.ready) listingStatus = "published"
  }

  const currency = (payload.currency || payload.metadata?.currency || "USD").toUpperCase()
  const assetPath = getTrackFullStoragePath(track)
  const previewPath = getTrackPreviewStoragePath(track) || assetPath
  const metadata = {
    ...(payload.metadata || {}),
    musicTrackId: track.id,
    assetUrl: null,
    previewUrl: `/api/music/stream?trackId=${track.id}`,
    assetBucket: assetPath ? getTrackStorageBucket(track, "full") : null,
    assetPath,
    previewBucket: previewPath ? getTrackStorageBucket(track, previewPath === assetPath ? "full" : "preview") : null,
    previewPath,
    artistAttestedOwnership: track.rights_confirmed === true,
    licenseType: payload.license_type || payload.metadata?.license_type || "personal_use",
  }

  const listingPayload = {
    seller_user_id: userId,
    storefront_id: storefront?.id || null,
    title: track.title,
    description: track.description || null,
    category: "music",
    product_type: "digital_asset",
    status: listingStatus,
    currency,
    base_price: price,
    cover_image_url: track.cover_art_url || null,
    media_urls: [],
    tags: track.tags || [],
    has_unlimited_inventory: true,
    metadata,
    music_track_id: track.id,
    license_type: metadata.licenseType,
    rights_confirmed: track.rights_confirmed === true,
    rights_confirmed_at: track.rights_confirmed_at || null,
  }

  const { data: listing, error } = existing?.id
    ? await supabase
        .from("marketplace_listings")
        .update(listingPayload)
        .eq("id", existing.id)
        .eq("seller_user_id", userId)
        .select("id, status")
        .single()
    : await supabase
        .from("marketplace_listings")
        .insert(listingPayload)
        .select("id, status")
        .single()

  if (error || !listing) {
    console.error("Failed to sync paid music listing", error)
    await supabase
      .from("artist_music")
      .update({ listing_sync_status: "error", listing_sync_error: error?.message || "listing_sync_failed" })
      .eq("id", track.id)
      .eq("user_id", userId)
    return null
  }

  await supabase
    .from("artist_music")
    .update({ listing_sync_status: listing.status, listing_sync_error: null })
    .eq("id", track.id)
    .eq("user_id", userId)

  return listing
}

const deleteTrackSchema = z.object({
  id: z.string().uuid(),
})

export async function DELETE(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth

    const { id } = deleteTrackSchema.parse(await request.json())

    const { data: existing } = await supabase
      .from("artist_music")
      .select("id, user_id, file_url, preview_file_url, storage_bucket, storage_path, preview_storage_bucket, preview_storage_path")
      .eq("id", id)
      .single()

    if (!existing)
      return jsonError({ status: 404, code: "track_not_found", message: "Track not found", retryable: false })
    if (existing.user_id !== user.id)
      return jsonError({ status: 403, code: "forbidden", message: "You can only delete your own tracks", retryable: false })

    const { error } = await supabase
      .from("artist_music")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)

    if (error) {
      console.error("Failed to delete track", error)
      return jsonError({ status: 500, code: "track_delete_failed", message: "Failed to delete track", retryable: true })
    }

    const storageClient = await getTrustedMusicWriteClient(supabase)
    const removals = new Map<string, Set<string>>()
    const addRemoval = (bucket: string, path: string | null) => {
      if (!path) return
      if (!removals.has(bucket)) removals.set(bucket, new Set())
      removals.get(bucket)!.add(path)
    }
    addRemoval(getTrackStorageBucket(existing, "full"), getTrackFullStoragePath(existing))
    addRemoval(getTrackStorageBucket(existing, "preview"), getTrackPreviewStoragePath(existing))

    for (const [bucket, paths] of removals.entries()) {
      const { error: storageError } = await storageClient.storage.from(bucket).remove(Array.from(paths))
      if (storageError) console.error("Failed to remove artist music storage objects", storageError)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json({ error: "Invalid payload", issues: error.issues }, { status: 400 })
    console.error("Unexpected track DELETE error", error)
    return jsonError({ status: 500, code: "track_delete_internal", message: "Unexpected error", retryable: true })
  }
}
