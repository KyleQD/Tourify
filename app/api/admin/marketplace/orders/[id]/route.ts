import { NextRequest, NextResponse } from "next/server"
import { withPlatformAdmin } from "@/lib/auth/api-auth"

export const dynamic = "force-dynamic"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  return withPlatformAdmin(async (_request, { supabase }) => {
    try {
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
  })(request)
}
