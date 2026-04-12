import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireApiUser } from "@/lib/api/route-helpers"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth

    const role = request.nextUrl.searchParams.get("role") || "buyer"
    let query = supabase
      .from("marketplace_orders")
      .select("*, marketplace_order_items(*)")
      .order("created_at", { ascending: false })
      .limit(100)

    if (role === "seller") query = query.eq("seller_user_id", user.id)
    else query = query.eq("buyer_user_id", user.id)

    const { data, error } = await query
    if (error) {
      console.error("Failed to load marketplace orders", error)
      return NextResponse.json({ error: "Failed to load orders" }, { status: 500 })
    }

    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error("Unexpected marketplace orders error", error)
    return NextResponse.json({ error: "Unexpected error loading orders" }, { status: 500 })
  }
}
