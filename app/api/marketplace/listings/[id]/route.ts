import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { requireApiUser, fromZodError, jsonError } from "@/lib/api/route-helpers"
import { getStoragePathFromUrl } from "@/lib/marketplace/storage-path"

const updateVariantSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1).max(160),
  sku: z.string().max(100).optional().nullable(),
  price: z.number().min(0),
  inventoryCount: z.number().int().min(0).optional().nullable(),
  isDefault: z.boolean().optional(),
  optionValues: z.record(z.string(), z.unknown()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

const updateListingSchema = z.object({
  title: z.string().min(2).max(160).optional(),
  description: z.string().max(4000).optional().nullable(),
  category: z.string().min(1).max(80).optional(),
  productType: z.string().min(1).max(80).optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
  currency: z.string().length(3).optional(),
  basePrice: z.number().min(0).optional().nullable(),
  compareAtPrice: z.number().min(0).optional().nullable(),
  coverImageUrl: z.string().url().optional().nullable(),
  mediaUrls: z.array(z.string().url()).optional(),
  tags: z.array(z.string().max(40)).optional(),
  inventoryCount: z.number().int().min(0).optional().nullable(),
  hasUnlimitedInventory: z.boolean().optional(),
  featuredRank: z.number().int().min(0).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  trackId: z.string().uuid().optional().nullable(),
  licenseType: z.enum(["personal_use", "commercial_use", "exclusive"]).optional(),
  rightsConfirmed: z.boolean().optional(),
  variants: z.array(updateVariantSchema).optional(),
})

export const dynamic = "force-dynamic"

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()
    const { id } = await params

    const { data, error } = await supabase
      .from("marketplace_listings")
      .select("*, marketplace_listing_variants(*)")
      .eq("id", id)
      .single()

    if (error || !data) return NextResponse.json({ error: "Listing not found" }, { status: 404 })
    return NextResponse.json({ data })
  } catch (error) {
    console.error("Unexpected listing GET error", error)
    return NextResponse.json({ error: "Unexpected error loading listing" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth

    const { id } = await params
    const payload = updateListingSchema.parse(await request.json())

    const { data: existing, error: existingError } = await supabase
      .from("marketplace_listings")
      .select("id, seller_user_id, category, product_type, metadata")
      .eq("id", id)
      .single()

    if (existingError || !existing)
      return jsonError({
        status: 404,
        code: "listing_not_found",
        message: "Listing not found",
      })
    if (existing.seller_user_id !== user.id)
      return jsonError({
        status: 403,
        code: "forbidden",
        message: "Forbidden",
      })
    const nextCategory = payload.category || existing.category
    const nextProductType = payload.productType || existing.product_type
    const shouldPublish = payload.status === "published"
    if (shouldPublish && nextCategory === "music" && nextProductType === "digital_asset" && payload.rightsConfirmed === false) {
      return jsonError({
        status: 400,
        code: "rights_confirmation_required",
        message: "Rights confirmation is required before publishing music listings",
      })
    }

    const trackIdProvided = payload.trackId !== undefined
    const nextTrackId = trackIdProvided ? payload.trackId : null

    let trackPatch: Record<string, unknown> = {}
    if (trackIdProvided && nextTrackId) {
      const { data: track, error: trackError } = await supabase
        .from("artist_music")
        .select("id, user_id, file_url, cover_art_url")
        .eq("id", nextTrackId)
        .single()

      if (trackError || !track)
        return jsonError({
          status: 404,
          code: "track_not_found",
          message: "Track not found",
        })
      if (track.user_id !== user.id)
        return jsonError({
          status: 403,
          code: "forbidden_track_owner",
          message: "You can only attach your own tracks",
        })
      const storagePath = getStoragePathFromUrl(track.file_url)

      trackPatch = {
        music_track_id: nextTrackId,
        cover_image_url: payload.coverImageUrl || track.cover_art_url || undefined,
        metadata: {
          ...(existing.metadata && typeof existing.metadata === "object" ? existing.metadata : {}),
          ...(payload.metadata || {}),
          musicTrackId: nextTrackId,
          assetUrl: track.file_url,
          previewUrl: track.file_url,
          assetBucket: storagePath?.bucket || null,
          assetPath: storagePath?.path || null,
          previewBucket: storagePath?.bucket || null,
          previewPath: storagePath?.path || null,
          coverArtUrl: track.cover_art_url,
          artistAttestedOwnership: payload.rightsConfirmed ?? false,
          licenseType: payload.licenseType || "personal_use",
        },
      }
    }

    const updatePayload = {
      title: payload.title,
      description: payload.description,
      category: payload.category,
      product_type: payload.productType,
      status: payload.status,
      currency: payload.currency?.toUpperCase(),
      base_price: payload.basePrice,
      compare_at_price: payload.compareAtPrice,
      cover_image_url: payload.coverImageUrl,
      media_urls: payload.mediaUrls,
      tags: payload.tags,
      inventory_count: payload.inventoryCount,
      has_unlimited_inventory: payload.hasUnlimitedInventory,
      featured_rank: payload.featuredRank,
      metadata: payload.metadata,
      music_track_id: trackIdProvided ? nextTrackId : undefined,
      license_type: payload.licenseType,
      rights_confirmed: payload.rightsConfirmed,
      rights_confirmed_at: payload.rightsConfirmed === true ? new Date().toISOString() : undefined,
      ...trackPatch,
    }

    const cleaned = Object.fromEntries(Object.entries(updatePayload).filter(([, value]) => value !== undefined))
    if (Object.keys(cleaned).length > 0) {
      const { error: updateError } = await supabase.from("marketplace_listings").update(cleaned).eq("id", id)
      if (updateError) {
        console.error("Failed to update listing", updateError)
        return jsonError({
          status: 500,
          code: "update_listing_failed",
          message: "Failed to update listing",
          retryable: true,
        })
      }
    }

    if (payload.variants) {
      const { error: clearError } = await supabase.from("marketplace_listing_variants").delete().eq("listing_id", id)
      if (clearError) {
        console.error("Failed to clear listing variants", clearError)
      } else if (payload.variants.length > 0) {
        const variantsPayload = payload.variants.map((variant, index) => ({
          listing_id: id,
          title: variant.title,
          sku: variant.sku || null,
          price: variant.price,
          inventory_count: variant.inventoryCount ?? null,
          is_default: variant.isDefault ?? index === 0,
          option_values: variant.optionValues || {},
          metadata: variant.metadata || {},
        }))
        const { error: insertError } = await supabase.from("marketplace_listing_variants").insert(variantsPayload)
        if (insertError) console.error("Failed to insert updated variants", insertError)
      }
    }

    const { data: hydrated } = await supabase
      .from("marketplace_listings")
      .select("*, marketplace_listing_variants(*)")
      .eq("id", id)
      .single()

    return NextResponse.json({ data: hydrated })
  } catch (error) {
    const zodError = fromZodError(error, "Invalid listing update payload")
    if (zodError) return zodError

    console.error("Unexpected listing PATCH error", error)
    return jsonError({
      status: 500,
      code: "internal_error",
      message: "Unexpected error updating listing",
      retryable: true,
    })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth

    const { id } = await params
    const { data: existing } = await supabase
      .from("marketplace_listings")
      .select("id, seller_user_id")
      .eq("id", id)
      .maybeSingle()

    if (!existing)
      return jsonError({
        status: 404,
        code: "listing_not_found",
        message: "Listing not found",
      })
    if (existing.seller_user_id !== user.id)
      return jsonError({
        status: 403,
        code: "forbidden",
        message: "Forbidden",
      })

    const { error } = await supabase.from("marketplace_listings").delete().eq("id", id)
    if (error) {
      console.error("Failed to delete listing", error)
      return jsonError({
        status: 500,
        code: "delete_listing_failed",
        message: "Failed to delete listing",
        retryable: true,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Unexpected listing DELETE error", error)
    return jsonError({
      status: 500,
      code: "internal_error",
      message: "Unexpected error deleting listing",
      retryable: true,
    })
  }
}
