import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

const storefrontSchema = z.object({
  displayName: z.string().min(2).max(120),
  tagline: z.string().max(280).optional().nullable(),
  slug: z.string().min(2).max(120).regex(/^[a-z0-9-]+$/).optional().nullable(),
  isActive: z.boolean().optional(),
  themeConfig: z.record(z.string(), z.unknown()).optional(),
  sections: z.array(z.unknown()).optional(),
})

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
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
      const { data: profile } = await supabase.from("profiles").select("id").eq("username", username).maybeSingle()
      resolvedSellerId = profile?.id || null
    }

    if (!resolvedSellerId) {
      return NextResponse.json({ error: "Seller not found" }, { status: 404 })
    }

    const { data: storefront, error } = await supabase
      .from("marketplace_storefronts")
      .select("*")
      .eq("seller_user_id", resolvedSellerId)
      .maybeSingle()

    if (error) {
      console.error("Failed to load storefront", error)
      return NextResponse.json({ error: "Failed to load storefront" }, { status: 500 })
    }

    if (!storefront) {
      return NextResponse.json(
        {
          data: {
            sellerUserId: resolvedSellerId,
            displayName: "Artist Store",
            tagline: null,
            slug: null,
            isActive: true,
            themeConfig: {},
            sections: [],
          },
        },
        { status: 200 }
      )
    }

    return NextResponse.json({ data: storefront })
  } catch (error) {
    console.error("Unexpected storefront GET error", error)
    return NextResponse.json({ error: "Unexpected error loading storefront" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
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

    return NextResponse.json({ data: storefront })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid storefront payload", issues: error.issues }, { status: 400 })
    }

    console.error("Unexpected storefront PUT error", error)
    return NextResponse.json({ error: "Unexpected error saving storefront" }, { status: 500 })
  }
}
