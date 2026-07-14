import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { getSellerPayoutReadiness } from "@/lib/marketplace/seller-payout-readiness"
import { getTrackFullStoragePath, getTrackPreviewStoragePath, getTrackStorageBucket, getTrustedMusicWriteClient } from "@/lib/music/music-access"
import { enqueueMusicPreviewJob, previewStatusForTrack } from "@/lib/music/preview-jobs"

export const dynamic = "force-dynamic"

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
        "id, title, description, genre, duration, file_url, preview_file_url, storage_bucket, storage_path, preview_storage_bucket, preview_storage_path, preview_status, preview_error, preview_generated_at, cover_art_url, tags, type, is_public, is_featured, is_pinned, access_mode, preview_mode, preview_duration_seconds, allow_library_add, allow_profile_feature, allow_downloads, rights_confirmed, rights_confirmed_at, listing_sync_status, listing_sync_error, stats, release_date, lyrics, spotify_url, apple_music_url, soundcloud_url, youtube_url, metadata, created_at, updated_at",
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

    return NextResponse.json({ data: data || [], total: count ?? (data?.length || 0) })
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

    const payload = createTrackSchema.parse(await request.json())
    const nextPreviewStatus = previewStatusForTrack({
      previewMode: payload.preview_mode || "full",
      previewStoragePath: payload.preview_storage_path,
      previewFileUrl: payload.preview_file_url,
    })
    const wantsPublic = payload.is_public !== false
    const rightsConfirmed = payload.rights_confirmed === true

    if (wantsPublic && !rightsConfirmed) {
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
      is_public: wantsPublic,
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

    if ((payload.access_mode || "free") === "paid") {
      await syncPaidMusicListing({
        supabase,
        userId: user.id,
        track: data,
        payload,
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
        metadata: { source: "api_artist_music_create" },
      })
    }

    return NextResponse.json({ data })
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

    const payload = updateTrackSchema.parse(await request.json())
    const { id, price, currency, license_type, ...updates } = payload
    const commercePayload = { price, currency, license_type, metadata: payload.metadata }

    const hasCommerceUpdates = price !== undefined || currency !== undefined || license_type !== undefined
    if (Object.keys(updates).length === 0 && !hasCommerceUpdates)
      return jsonError({ status: 400, code: "no_updates", message: "No fields to update", retryable: false })

    if (updates.is_public === true && updates.rights_confirmed !== true) {
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
      .select("id, user_id, preview_mode, preview_storage_path, preview_file_url, storage_bucket, storage_path")
      .eq("id", id)
      .single()

    if (!existing)
      return jsonError({ status: 404, code: "track_not_found", message: "Track not found", retryable: false })
    if (existing.user_id !== user.id)
      return jsonError({ status: 403, code: "forbidden", message: "You can only edit your own tracks", retryable: false })

    const computedUpdates: Record<string, unknown> = { ...updates }
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

    const { data, error } = await supabase
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

    if (error) {
      console.error("Failed to update track", error)
      return jsonError({ status: 500, code: "track_update_failed", message: "Failed to update track", retryable: true })
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

    return NextResponse.json({ data })
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
