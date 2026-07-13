import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { isAuthorizedInternalRequest, unauthorizedResponse } from "@/lib/auth/route-guards"

const backfillSchema = z.object({
  dryRun: z.boolean().optional(),
  publishActiveItems: z.boolean().optional(),
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

    const [{ data: legacyItems }, { data: existingListings }] = await Promise.all([
      supabase.from("artist_merchandise").select("id, name, status").eq("user_id", user.id),
      supabase.from("marketplace_listings").select("id, metadata").eq("seller_user_id", user.id),
    ])

    const migratedIds = new Set(
      (existingListings || [])
        .map(row => (row.metadata && typeof row.metadata === "object" ? (row.metadata as Record<string, unknown>).sourceMerchandiseId : null))
        .filter((value): value is string => typeof value === "string")
    )

    const pending = (legacyItems || []).filter(item => !migratedIds.has(item.id))
    return NextResponse.json({
      data: {
        totalLegacyItems: legacyItems?.length || 0,
        alreadyMigrated: migratedIds.size,
        pendingItems: pending.length,
        pending,
      },
    })
  } catch (error) {
    console.error("Unexpected backfill preview error", error)
    return NextResponse.json({ error: "Unexpected backfill preview error" }, { status: 500 })
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
    const isDryRun = payload.dryRun ?? false
    const publishActiveItems = payload.publishActiveItems ?? true

    const { data: legacyItems, error: legacyError } = await supabase
      .from("artist_merchandise")
      .select("id, name, description, type, price, currency, inventory_count, images, status, is_featured, sku, sizes, colors")
      .eq("user_id", user.id)

    if (legacyError) {
      console.error("Failed to load artist merchandise for backfill", legacyError)
      return NextResponse.json({ error: "Failed to load source merchandise" }, { status: 500 })
    }

    const { data: existingListings } = await supabase
      .from("marketplace_listings")
      .select("id, metadata")
      .eq("seller_user_id", user.id)

    const migratedIds = new Set(
      (existingListings || [])
        .map(row => (row.metadata && typeof row.metadata === "object" ? (row.metadata as Record<string, unknown>).sourceMerchandiseId : null))
        .filter((value): value is string => typeof value === "string")
    )

    const itemsToMigrate = (legacyItems || []).filter(item => !migratedIds.has(item.id))
    if (isDryRun) {
      return NextResponse.json({
        data: {
          dryRun: true,
          wouldInsert: itemsToMigrate.length,
          items: itemsToMigrate,
        },
      })
    }

    if (!itemsToMigrate.length) {
      return NextResponse.json({
        data: {
          inserted: 0,
          skipped: legacyItems?.length || 0,
        },
      })
    }

    const { data: storefront } = await supabase
      .from("marketplace_storefronts")
      .select("id")
      .eq("seller_user_id", user.id)
      .maybeSingle()

    const insertPayload = itemsToMigrate.map(item => ({
      seller_user_id: user.id,
      storefront_id: storefront?.id || null,
      title: item.name || "Untitled Product",
      description: item.description || null,
      category: item.type === "music" ? "music" : "merch",
      product_type: item.type === "music" ? "digital_asset" : "physical_merch",
      status: publishActiveItems && item.status === "active" ? "published" : "draft",
      currency: item.currency || "USD",
      base_price: Number(item.price || 0),
      cover_image_url: Array.isArray(item.images) && item.images.length ? item.images[0] : null,
      media_urls: Array.isArray(item.images) ? item.images : [],
      inventory_count: item.inventory_count ?? 0,
      featured_rank: item.is_featured ? 1 : null,
      metadata: {
        sourceMerchandiseId: item.id,
        sourceTable: "artist_merchandise",
        sku: item.sku || null,
        sizes: item.sizes || [],
        colors: item.colors || [],
      },
    }))

    const { data: insertedRows, error: insertError } = await supabase
      .from("marketplace_listings")
      .insert(insertPayload)
      .select("id, title")

    if (insertError) {
      console.error("Failed to backfill marketplace listings", insertError)
      return NextResponse.json({ error: "Failed to backfill listings" }, { status: 500 })
    }

    return NextResponse.json({
      data: {
        inserted: insertedRows?.length || 0,
        rows: insertedRows || [],
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid backfill payload", issues: error.issues }, { status: 400 })
    }
    console.error("Unexpected backfill error", error)
    return NextResponse.json({ error: "Unexpected backfill error" }, { status: 500 })
  }
}
