// PUBLIC ROUTE: Intentionally unauthenticated — serves storefront/discovery to anonymous users.
// Do not add auth checks here. RLS on underlying tables restricts to published listings only.
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getSchemaNotReadyMessage, isSchemaCacheMissingError } from "@/lib/marketplace/schema-readiness"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get("category")
    const productType = searchParams.get("productType")
    const sellerUserId = searchParams.get("sellerUserId")
    const sellerUsername = searchParams.get("sellerUsername")
    const q = searchParams.get("q")
    const limit = Math.min(Math.max(Number(searchParams.get("limit") || "24"), 1), 100)

    let resolvedSellerId = sellerUserId
    if (!resolvedSellerId && sellerUsername) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", sellerUsername)
        .maybeSingle()
      resolvedSellerId = profile?.id || null
    }

    let query = supabase
      .from("marketplace_listings")
      .select("id, seller_user_id, title, description, product_type, category, currency, base_price, cover_image_url, tags, metadata, marketplace_listing_variants(id, title, price)")
      .eq("status", "published")
      .eq("moderation_status", "approved")
      .order("featured_rank", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(limit)

    if (category) query = query.eq("category", category)
    if (productType) query = query.eq("product_type", productType)
    if (resolvedSellerId) query = query.eq("seller_user_id", resolvedSellerId)

    const { data, error } = await query
    if (error) {
      if (isSchemaCacheMissingError(error)) {
        return NextResponse.json({
          data: [],
          warning: getSchemaNotReadyMessage({ feature: "Marketplace discover" }),
        })
      }
      console.error("Failed to discover marketplace listings", error)
      return NextResponse.json({ error: "Failed to discover listings" }, { status: 500 })
    }

    const normalizedSearch = q?.trim().toLowerCase()
    const filtered = normalizedSearch
      ? (data || []).filter(row =>
          `${row.title || ""} ${row.description || ""} ${(row.tags || []).join(" ")}`.toLowerCase().includes(normalizedSearch)
        )
      : data || []

    return NextResponse.json({ data: filtered })
  } catch (error) {
    console.error("Unexpected marketplace discover error", error)
    return NextResponse.json({ error: "Unexpected error discovering listings" }, { status: 500 })
  }
}
