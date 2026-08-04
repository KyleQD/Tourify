import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { normalizeUsername } from "@/lib/auth/tourify-auth-helpers"
import { requireMarketplaceEnabled } from "@/lib/marketplace/require-marketplace-enabled"

const externalLinkSchema = z.object({
  label: z.string().min(1).max(100),
  url: z.string().url().max(2000),
})

const themeEffectsSchema = z.object({
  animateCards: z.boolean().optional(),
  glowBorder: z.boolean().optional(),
  hoverLift: z.boolean().optional(),
  shimmerImages: z.boolean().optional(),
  floatingOrbs: z.boolean().optional(),
  gradientText: z.boolean().optional(),
  staggerEntrance: z.boolean().optional(),
}).optional()

const themeConfigSchema = z.object({
  preset: z.string().max(40).optional(),
  accentColor: z.string().max(20).optional(),
  cardStyle: z.enum(["glass", "solid", "outline", "neon"]).optional(),
  layout: z.enum(["grid", "masonry", "list", "carousel"]).optional(),
  effects: themeEffectsSchema,
  bannerGradient: z.string().max(200).optional(),
  bannerStyle: z.enum(["gradient", "solid", "image", "none"]).optional(),
  fontStyle: z.enum(["default", "elegant", "bold", "mono"]).optional(),
}).passthrough().optional()

const storefrontSchema = z.object({
  displayName: z.string().min(2).max(120),
  tagline: z.string().max(280).optional().nullable(),
  slug: z.string().min(2).max(120).regex(/^[a-z0-9-]+$/).optional().nullable(),
  isActive: z.boolean().optional(),
  themeConfig: themeConfigSchema,
  sections: z.array(z.unknown()).optional(),
  externalLinks: z.array(externalLinkSchema).max(20).optional(),
  sellerType: z.enum(["artist", "venue", "photographer", "painter", "individual", "company"]).optional().nullable(),
})

export const dynamic = "force-dynamic"

interface SellerProfilePayload {
  id: string
  username: string | null
  avatarUrl: string | null
  bio: string | null
  fullName: string | null
}

async function loadSellerProfile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sellerUserId: string
): Promise<SellerProfilePayload | null> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, avatar_url, bio, full_name")
    .eq("id", sellerUserId)
    .maybeSingle()

  if (!profile) return null

  return {
    id: profile.id,
    username: profile.username || null,
    avatarUrl: profile.avatar_url || null,
    bio: profile.bio || null,
    fullName: profile.full_name || null,
  }
}

export async function GET(request: NextRequest) {
  const guard = requireMarketplaceEnabled()
  if (guard) return guard

  try {
    const supabase = await createClient()
    const searchParams = request.nextUrl.searchParams
    const sellerUserId = searchParams.get("sellerUserId")
    const username = searchParams.get("username")

    let resolvedSellerId = sellerUserId
    if (!resolvedSellerId && !username) {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      resolvedSellerId = user?.id || null
    }

    if (!resolvedSellerId && username) {
      const normalizedUsername = normalizeUsername(username)
      if (!normalizedUsername) {
        return NextResponse.json(
          { error: { code: "seller_not_found", message: "Seller not found" } },
          { status: 404 }
        )
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", normalizedUsername)
        .maybeSingle()

      resolvedSellerId = profile?.id || null
      if (!resolvedSellerId) {
        return NextResponse.json(
          { error: { code: "seller_not_found", message: "Seller not found" } },
          { status: 404 }
        )
      }
    }

    if (!resolvedSellerId) {
      return NextResponse.json(
        { error: { code: "seller_not_found", message: "Seller not found" } },
        { status: 404 }
      )
    }

    const [storefrontResult, seller] = await Promise.all([
      supabase
        .from("marketplace_storefronts")
        .select("*")
        .eq("seller_user_id", resolvedSellerId)
        .maybeSingle(),
      loadSellerProfile(supabase, resolvedSellerId),
    ])

    const { data: storefront, error } = storefrontResult

    if (error) {
      console.error("Failed to load storefront", error)
      return NextResponse.json({ error: "Failed to load storefront" }, { status: 500 })
    }

    if (!storefront) {
      return NextResponse.json(
        {
          data: {
            seller_user_id: resolvedSellerId,
            sellerUserId: resolvedSellerId,
            displayName: seller?.fullName || seller?.username || "My Store",
            display_name: seller?.fullName || seller?.username || "My Store",
            tagline: null,
            slug: null,
            isActive: true,
            is_active: true,
            themeConfig: {},
            theme_config: {},
            sections: [],
            external_links: [],
            seller_type: null,
            accepted_seller_agreement_at: null,
            seller_agreement_version: null,
            rating_average: 0,
            rating_count: 0,
          },
          seller,
        },
        { status: 200 }
      )
    }

    return NextResponse.json({ data: storefront, seller })
  } catch (error) {
    console.error("Unexpected storefront GET error", error)
    return NextResponse.json({ error: "Unexpected error loading storefront" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const guard = requireMarketplaceEnabled()
  if (guard) return guard

  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const payload = storefrontSchema.parse(await request.json())
    const upsertPayload = {
      seller_user_id: user.id,
      display_name: payload.displayName,
      tagline: payload.tagline || null,
      slug: payload.slug || null,
      is_active: payload.isActive ?? true,
      theme_config: payload.themeConfig || {},
      sections: payload.sections || [],
      external_links: payload.externalLinks || [],
      ...(payload.sellerType !== undefined ? { seller_type: payload.sellerType } : {}),
    }

    const { data: storefront, error } = await supabase
      .from("marketplace_storefronts")
      .upsert(upsertPayload, { onConflict: "seller_user_id" })
      .select("*")
      .single()

    if (error) {
      console.error("Failed to upsert storefront", error)
      return NextResponse.json({ error: "Failed to save storefront" }, { status: 500 })
    }

    const seller = await loadSellerProfile(supabase, user.id)
    return NextResponse.json({ data: storefront, seller })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid storefront payload", issues: error.issues }, { status: 400 })
    }

    console.error("Unexpected storefront PUT error", error)
    return NextResponse.json({ error: "Unexpected error saving storefront" }, { status: 500 })
  }
}
