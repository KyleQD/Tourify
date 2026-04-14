import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { requireApiUser, fromZodError, jsonError } from "@/lib/api/route-helpers"
import { isValidMarketplaceProductType } from "@/lib/marketplace/catalog"
import { getSchemaNotReadyMessage, isSchemaCacheMissingError } from "@/lib/marketplace/schema-readiness"
import { getStoragePathFromUrl } from "@/lib/marketplace/storage-path"

const listingVariantSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1).max(160),
  sku: z.string().max(100).optional().nullable(),
  price: z.number().min(0),
  inventoryCount: z.number().int().min(0).optional().nullable(),
  isDefault: z.boolean().optional(),
  optionValues: z.record(z.string(), z.unknown()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

const listingSchema = z.object({
  title: z.string().min(2).max(160),
  description: z.string().max(4000).optional().nullable(),
  category: z.string().min(1).max(80),
  productType: z.string().min(1).max(80),
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
  trackId: z.string().uuid().optional(),
  licenseType: z.enum(["personal_use", "commercial_use", "exclusive"]).optional(),
  rightsConfirmed: z.boolean().optional(),
  variants: z.array(listingVariantSchema).optional(),
})

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const searchParams = request.nextUrl.searchParams
    const sellerUserId = searchParams.get("sellerUserId")
    const includeDrafts = searchParams.get("includeDrafts") === "true"
    const category = searchParams.get("category")
    const productType = searchParams.get("productType")
    const limit = Number(searchParams.get("limit") || "24")

    let query = supabase
      .from("marketplace_listings")
      .select("*, marketplace_listing_variants(*)")
      .order("featured_rank", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(Math.min(Math.max(limit, 1), 100))

    if (sellerUserId) query = query.eq("seller_user_id", sellerUserId)
    if (category) query = query.eq("category", category)
    if (productType) query = query.eq("product_type", productType)
    if (!includeDrafts) query = query.eq("status", "published")

    const { data, error } = await query

    if (error) {
      if (isSchemaCacheMissingError(error)) {
        return NextResponse.json({
          data: [],
          warning: getSchemaNotReadyMessage({ feature: "Marketplace listings" }),
        })
      }
      console.error("Failed to fetch marketplace listings", error)
      return NextResponse.json({ error: "Failed to fetch listings" }, { status: 500 })
    }

    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error("Unexpected listings GET error", error)
    return NextResponse.json({ error: "Unexpected error fetching listings" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth

    const payload = listingSchema.parse(await request.json())
    if (!isValidMarketplaceProductType(payload.productType)) {
      return jsonError({
        status: 400,
        code: "invalid_product_type",
        message: "Unsupported product type",
      })
    }

    const { data: storefront } = await supabase
      .from("marketplace_storefronts")
      .select("id, accepted_seller_agreement_at")
      .eq("seller_user_id", user.id)
      .maybeSingle()

    if (payload.status === "published" && !storefront?.accepted_seller_agreement_at) {
      return jsonError({
        status: 403,
        code: "seller_agreement_required",
        message: "You must accept the Marketplace Seller Agreement before publishing listings. Visit /marketplace/seller-agreement to review and accept.",
      })
    }

    const trackId = payload.trackId || null
    if (payload.productType === "digital_asset" && payload.category === "music" && !trackId) {
      return jsonError({
        status: 400,
        code: "track_id_required",
        message: "Music listings require a trackId",
      })
    }
    if (payload.status === "published" && payload.productType === "digital_asset" && payload.category === "music" && !payload.rightsConfirmed) {
      return jsonError({
        status: 400,
        code: "rights_confirmation_required",
        message: "Rights confirmation is required before publishing music listings",
      })
    }

    let track: { id: string; user_id: string; title: string; file_url: string | null; cover_art_url: string | null } | null = null
    if (trackId) {
      const { data: foundTrack, error: trackError } = await supabase
        .from("artist_music")
        .select("id, user_id, title, file_url, cover_art_url")
        .eq("id", trackId)
        .single()

      if (trackError || !foundTrack) {
        return jsonError({
          status: 404,
          code: "track_not_found",
          message: "Track not found",
        })
      }
      if (foundTrack.user_id !== user.id) {
        return jsonError({
          status: 403,
          code: "forbidden_track_owner",
          message: "You can only list your own tracks",
        })
      }
      track = foundTrack
    }

    const storagePath = track?.file_url ? getStoragePathFromUrl(track.file_url) : null
    const mergedMetadata = {
      ...(payload.metadata || {}),
      ...(track
        ? {
            musicTrackId: track.id,
            assetUrl: track.file_url,
            previewUrl: track.file_url,
            assetBucket: storagePath?.bucket || null,
            assetPath: storagePath?.path || null,
            previewBucket: storagePath?.bucket || null,
            previewPath: storagePath?.path || null,
            coverArtUrl: track.cover_art_url,
            artistAttestedOwnership: payload.rightsConfirmed ?? false,
            licenseType: payload.licenseType || "personal_use",
          }
        : {}),
    }

    const insertPayload = {
      seller_user_id: user.id,
      storefront_id: storefront?.id || null,
      title: payload.title || track?.title,
      description: payload.description || null,
      category: payload.category,
      product_type: payload.productType,
      status: payload.status || "draft",
      currency: payload.currency?.toUpperCase() || "USD",
      base_price: payload.basePrice ?? null,
      compare_at_price: payload.compareAtPrice ?? null,
      cover_image_url: payload.coverImageUrl || track?.cover_art_url || null,
      media_urls: payload.mediaUrls || [],
      tags: payload.tags || [],
      inventory_count: payload.inventoryCount ?? null,
      has_unlimited_inventory: payload.hasUnlimitedInventory ?? false,
      featured_rank: payload.featuredRank ?? null,
      metadata: mergedMetadata,
      music_track_id: track?.id || null,
      license_type: payload.licenseType || "personal_use",
      rights_confirmed: payload.rightsConfirmed ?? false,
      rights_confirmed_at: payload.rightsConfirmed ? new Date().toISOString() : null,
    }

    const { data: listing, error: listingError } = await supabase
      .from("marketplace_listings")
      .insert(insertPayload)
      .select("*")
      .single()

    if (listingError || !listing) {
      if (isSchemaCacheMissingError(listingError)) {
        return jsonError({
          status: 503,
          code: "schema_not_ready",
          message: getSchemaNotReadyMessage({ feature: "Marketplace create listing" }),
          retryable: true,
        })
      }
      console.error("Failed to create listing", listingError)
      return jsonError({
        status: 500,
        code: "create_listing_failed",
        message: "Failed to create listing",
        retryable: true,
      })
    }

    if (payload.variants?.length) {
      const variantsPayload = payload.variants.map((variant, index) => ({
        listing_id: listing.id,
        title: variant.title,
        sku: variant.sku || null,
        price: variant.price,
        inventory_count: variant.inventoryCount ?? null,
        is_default: variant.isDefault ?? index === 0,
        option_values: variant.optionValues || {},
        metadata: variant.metadata || {},
      }))

      const { error: variantsError } = await supabase.from("marketplace_listing_variants").insert(variantsPayload)
      if (variantsError) console.error("Failed to create listing variants", variantsError)
    }

    const { data: hydrated } = await supabase
      .from("marketplace_listings")
      .select("*, marketplace_listing_variants(*)")
      .eq("id", listing.id)
      .single()

    return NextResponse.json({ data: hydrated || listing })
  } catch (error) {
    const zodError = fromZodError(error, "Invalid listing payload")
    if (zodError) return zodError

    console.error("Unexpected listings POST error", error)
    return jsonError({
      status: 500,
      code: "internal_error",
      message: "Unexpected error creating listing",
      retryable: true,
    })
  }
}
