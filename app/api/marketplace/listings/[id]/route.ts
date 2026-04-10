import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

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
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const payload = updateListingSchema.parse(await request.json())

    const { data: existing, error: existingError } = await supabase
      .from("marketplace_listings")
      .select("id, seller_user_id, category, product_type, metadata")
      .eq("id", id)
      .single()

    if (existingError || !existing) return NextResponse.json({ error: "Listing not found" }, { status: 404 })
    if (existing.seller_user_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const trackIdProvided = payload.trackId !== undefined
    const nextTrackId = trackIdProvided ? payload.trackId : null

    let trackPatch: Record<string, unknown> = {}
    if (trackIdProvided && nextTrackId) {
      const { data: track, error: trackError } = await supabase
        .from("artist_music")
        .select("id, user_id, file_url, cover_art_url")
        .eq("id", nextTrackId)
        .single()

      if (trackError || !track) return NextResponse.json({ error: "Track not found" }, { status: 404 })
      if (track.user_id !== user.id) return NextResponse.json({ error: "You can only attach your own tracks" }, { status: 403 })

      trackPatch = {
        music_track_id: nextTrackId,
        cover_image_url: payload.coverImageUrl || track.cover_art_url || undefined,
        metadata: {
          ...(existing.metadata && typeof existing.metadata === "object" ? existing.metadata : {}),
          ...(payload.metadata || {}),
          musicTrackId: nextTrackId,
          assetUrl: track.file_url,
          previewUrl: track.file_url,
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
        return NextResponse.json({ error: "Failed to update listing" }, { status: 500 })
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
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid listing update payload", issues: error.issues }, { status: 400 })
    }

    console.error("Unexpected listing PATCH error", error)
    return NextResponse.json({ error: "Unexpected error updating listing" }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const { data: existing } = await supabase
      .from("marketplace_listings")
      .select("id, seller_user_id")
      .eq("id", id)
      .maybeSingle()

    if (!existing) return NextResponse.json({ error: "Listing not found" }, { status: 404 })
    if (existing.seller_user_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const { error } = await supabase.from("marketplace_listings").delete().eq("id", id)
    if (error) {
      console.error("Failed to delete listing", error)
      return NextResponse.json({ error: "Failed to delete listing" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Unexpected listing DELETE error", error)
    return NextResponse.json({ error: "Unexpected error deleting listing" }, { status: 500 })
  }
}
