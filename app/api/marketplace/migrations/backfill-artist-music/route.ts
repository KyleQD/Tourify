import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { getStoragePathFromUrl } from "@/lib/marketplace/storage-path"
import { isAuthorizedInternalRequest, unauthorizedResponse } from "@/lib/auth/route-guards"

const backfillSchema = z.object({
  dryRun: z.boolean().optional(),
  publishTracks: z.boolean().optional(),
  defaultPrice: z.number().min(0).optional(),
})

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  if (!isAuthorizedInternalRequest(request)) return unauthorizedResponse()

  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const [{ data: tracks }, { data: listings }] = await Promise.all([
      supabase.from("artist_music").select("id, title, is_public, created_at").eq("user_id", user.id),
      supabase.from("marketplace_listings").select("id, music_track_id").eq("seller_user_id", user.id).eq("category", "music"),
    ])

    const migratedTrackIds = new Set((listings || []).map(row => row.music_track_id).filter(Boolean))
    const pendingTracks = (tracks || []).filter(track => !migratedTrackIds.has(track.id))

    return NextResponse.json({
      data: {
        totalTracks: tracks?.length || 0,
        alreadyListed: migratedTrackIds.size,
        pendingTracks: pendingTracks.length,
        rows: pendingTracks,
      },
    })
  } catch (error) {
    console.error("Unexpected artist music backfill preview error", error)
    return NextResponse.json({ error: "Unexpected artist music backfill preview error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  if (!isAuthorizedInternalRequest(request)) return unauthorizedResponse()

  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const payload = backfillSchema.parse(await request.json())
    const dryRun = payload.dryRun ?? false
    const publishTracks = payload.publishTracks ?? true
    const defaultPrice = payload.defaultPrice ?? 1.99

    const { data: tracks, error: tracksError } = await supabase
      .from("artist_music")
      .select("id, user_id, title, description, genre, duration, file_url, cover_art_url, is_public, metadata")
      .eq("user_id", user.id)

    if (tracksError) {
      console.error("Failed to load artist tracks for backfill", tracksError)
      return NextResponse.json({ error: "Failed to load source tracks" }, { status: 500 })
    }

    const { data: existingListings } = await supabase
      .from("marketplace_listings")
      .select("id, music_track_id")
      .eq("seller_user_id", user.id)
      .eq("category", "music")

    const migratedTrackIds = new Set((existingListings || []).map(row => row.music_track_id).filter(Boolean))
    const tracksToMigrate = (tracks || []).filter(track => !migratedTrackIds.has(track.id))

    if (dryRun) {
      return NextResponse.json({
        data: {
          dryRun: true,
          wouldInsert: tracksToMigrate.length,
          rows: tracksToMigrate,
        },
      })
    }

    if (!tracksToMigrate.length) {
      return NextResponse.json({
        data: {
          inserted: 0,
          skipped: tracks?.length || 0,
        },
      })
    }

    const { data: storefront } = await supabase
      .from("marketplace_storefronts")
      .select("id")
      .eq("seller_user_id", user.id)
      .maybeSingle()

    const insertPayload = tracksToMigrate.map(track => {
      const storage = getStoragePathFromUrl(track.file_url)
      return {
        seller_user_id: user.id,
        storefront_id: storefront?.id || null,
        title: track.title || "Untitled track",
        description: track.description || null,
        category: "music",
        product_type: "digital_asset",
        status: publishTracks && track.is_public ? "published" : "draft",
        currency: "USD",
        base_price: defaultPrice,
        cover_image_url: track.cover_art_url || null,
        media_urls: track.cover_art_url ? [track.cover_art_url] : [],
        has_unlimited_inventory: true,
        music_track_id: track.id,
        license_type: "personal_use",
        rights_confirmed: true,
        rights_confirmed_at: new Date().toISOString(),
        metadata: {
          sourceTrackId: track.id,
          sourceTable: "artist_music",
          genre: track.genre || null,
          duration: track.duration || null,
          assetUrl: track.file_url || null,
          previewUrl: track.file_url || null,
          assetBucket: storage?.bucket || null,
          assetPath: storage?.path || null,
          previewBucket: storage?.bucket || null,
          previewPath: storage?.path || null,
          sourceTrackMetadata: track.metadata || {},
        },
      }
    })

    const { data: inserted, error: insertError } = await supabase.from("marketplace_listings").insert(insertPayload).select("id, title")
    if (insertError) {
      console.error("Failed to backfill track listings", insertError)
      return NextResponse.json({ error: "Failed to backfill track listings" }, { status: 500 })
    }

    return NextResponse.json({
      data: {
        inserted: inserted?.length || 0,
        rows: inserted || [],
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid backfill payload", issues: error.issues }, { status: 400 })
    }

    console.error("Unexpected artist music backfill error", error)
    return NextResponse.json({ error: "Unexpected artist music backfill error" }, { status: 500 })
  }
}
