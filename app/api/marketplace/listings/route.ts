import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { isValidMarketplaceProductType } from "@/lib/marketplace/catalog"

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
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const payload = listingSchema.parse(await request.json())
    if (!isValidMarketplaceProductType(payload.productType)) {
      return NextResponse.json({ error: "Unsupported product type" }, { status: 400 })
    }

    const { data: storefront } = await supabase
      .from("marketplace_storefronts")
      .select("id")
      .eq("seller_user_id", user.id)
      .maybeSingle()

    const trackId = payload.trackId || null
    if (payload.productType === "digital_asset" && payload.category === "music" && !trackId) {
      return NextResponse.json({ error: "Music listings require a trackId" }, { status: 400 })
    }

    let track: { id: string; user_id: string; title: string; file_url: string | null; cover_art_url: string | null } | null = null
    if (trackId) {
      const { data: foundTrack, error: trackError } = await supabase
        .from("artist_music")
        .select("id, user_id, title, file_url, cover_art_url")
        .eq("id", trackId)
        .single()

      if (trackError || !foundTrack) {
        return NextResponse.json({ error: "Track not found" }, { status: 404 })
      }
      if (foundTrack.user_id !== user.id) {
        return NextResponse.json({ error: "You can only list your own tracks" }, { status: 403 })
      }
      track = foundTrack
    }

    const mergedMetadata = {
      ...(payload.metadata || {}),
      ...(track
        ? {
            musicTrackId: track.id,
            assetUrl: track.file_url,
            previewUrl: track.file_url,
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
      console.error("Failed to create listing", listingError)
      return NextResponse.json({ error: "Failed to create listing" }, { status: 500 })
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
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid listing payload", issues: error.issues }, { status: 400 })
    }

    console.error("Unexpected listings POST error", error)
    return NextResponse.json({ error: "Unexpected error creating listing" }, { status: 500 })
  }
}
