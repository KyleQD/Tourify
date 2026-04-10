import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
    if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const { id } = await params
    const { data: order, error: orderError } = await supabase
      .from("marketplace_orders")
      .select("*, marketplace_order_items(*), marketplace_payout_ledger(*)")
      .eq("id", id)
      .single()

    if (orderError || !order) return NextResponse.json({ error: "Order not found" }, { status: 404 })
    return NextResponse.json({ data: order })
  } catch (error) {
    console.error("Unexpected admin marketplace order GET error", error)
    return NextResponse.json({ error: "Unexpected order detail error" }, { status: 500 })
  }
}
