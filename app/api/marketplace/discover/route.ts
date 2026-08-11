// PUBLIC ROUTE: unauthenticated — serves public discovery to anonymous buyers.
// Do not add seller-only auth checks here. RLS restricts to published/approved rows.
import { NextRequest, NextResponse } from "next/server"
import { queryPublicListings } from "@/lib/marketplace/public-listing-query"
import { requirePublicDiscoveryEnabled } from "@/lib/marketplace/require-marketplace-enabled"
import { normalizeUsername } from "@/lib/auth/tourify-auth-helpers"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const guard = requirePublicDiscoveryEnabled()
  if (guard) return guard

  try {
    const sp = request.nextUrl.searchParams
    const category = sp.get("category") ?? undefined
    const listingKind = sp.get("listingKind") as "physical" | "service" | "external" | undefined
    const productType = sp.get("productType") ?? undefined
    const sellerUserId = sp.get("sellerUserId") ?? undefined
    const sellerUsername = sp.get("sellerUsername") ?? undefined
    const q = sp.get("q") ?? undefined
    const featuredOnly = sp.get("featuredOnly") === "true"
    const before = sp.get("before") ?? undefined
    const limit = Math.min(Math.max(Number(sp.get("limit") ?? "24"), 1), 100)

    // Resolve seller by username to userId if needed
    let resolvedSellerId = sellerUserId
    let resolvedSellerUsername: string | null = null

    if (!resolvedSellerId && sellerUsername) {
      const normalized = normalizeUsername(sellerUsername)
      if (!normalized) {
        return NextResponse.json(
          { error: { code: "seller_not_found", message: "Seller not found" } },
          { status: 404 }
        )
      }
      const supabase = await createClient()
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, username")
        .eq("username", normalized)
        .maybeSingle()

      if (!profile?.id) {
        return NextResponse.json(
          { error: { code: "seller_not_found", message: "Seller not found" } },
          { status: 404 }
        )
      }
      resolvedSellerId = profile.id
      resolvedSellerUsername = profile.username ?? normalized
    }

    const { data, error } = await queryPublicListings({
      q,
      category,
      listingKind,
      productType,
      sellerUserId: resolvedSellerId,
      featuredOnly,
      before,
      limit,
    })

    if (error) {
      console.error("Marketplace discover error", error)
      return NextResponse.json({ error: "Failed to discover listings" }, { status: 500 })
    }

    return NextResponse.json({
      data,
      ...(resolvedSellerId
        ? { seller: { id: resolvedSellerId, username: resolvedSellerUsername } }
        : {}),
    })
  } catch (err) {
    console.error("Unexpected marketplace discover error", err)
    return NextResponse.json({ error: "Unexpected error discovering listings" }, { status: 500 })
  }
}
