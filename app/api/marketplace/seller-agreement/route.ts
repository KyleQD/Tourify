import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

const CURRENT_AGREEMENT_VERSION = "1.0"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data: storefront } = await supabase
      .from("marketplace_storefronts")
      .select("accepted_seller_agreement_at, seller_agreement_version")
      .eq("seller_user_id", user.id)
      .maybeSingle()

    return NextResponse.json({
      data: {
        accepted: Boolean(storefront?.accepted_seller_agreement_at),
        acceptedAt: storefront?.accepted_seller_agreement_at || null,
        acceptedVersion: storefront?.seller_agreement_version || null,
        currentVersion: CURRENT_AGREEMENT_VERSION,
        needsUpdate: storefront?.seller_agreement_version !== CURRENT_AGREEMENT_VERSION,
      },
    })
  } catch (error) {
    console.error("Seller agreement status error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json()
    if (body.version !== CURRENT_AGREEMENT_VERSION) {
      return NextResponse.json({
        error: "Agreement version mismatch. Please refresh and try again.",
        currentVersion: CURRENT_AGREEMENT_VERSION,
      }, { status: 400 })
    }

    const { data: existingStorefront } = await supabase
      .from("marketplace_storefronts")
      .select("id")
      .eq("seller_user_id", user.id)
      .maybeSingle()

    if (existingStorefront) {
      const { error: updateError } = await supabase
        .from("marketplace_storefronts")
        .update({
          accepted_seller_agreement_at: new Date().toISOString(),
          seller_agreement_version: CURRENT_AGREEMENT_VERSION,
        })
        .eq("seller_user_id", user.id)

      if (updateError) {
        console.error("Failed to update seller agreement acceptance", updateError)
        return NextResponse.json({ error: "Failed to save agreement acceptance" }, { status: 500 })
      }
    } else {
      const { error: insertError } = await supabase
        .from("marketplace_storefronts")
        .insert({
          seller_user_id: user.id,
          display_name: "My Store",
          accepted_seller_agreement_at: new Date().toISOString(),
          seller_agreement_version: CURRENT_AGREEMENT_VERSION,
        })

      if (insertError) {
        console.error("Failed to create storefront with agreement", insertError)
        return NextResponse.json({ error: "Failed to save agreement acceptance" }, { status: 500 })
      }
    }

    return NextResponse.json({
      data: {
        accepted: true,
        acceptedAt: new Date().toISOString(),
        acceptedVersion: CURRENT_AGREEMENT_VERSION,
      },
    })
  } catch (error) {
    console.error("Seller agreement accept error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
