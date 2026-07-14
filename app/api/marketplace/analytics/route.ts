import { NextRequest, NextResponse } from "next/server"
import { requireApiUser } from "@/lib/api/route-helpers"
import {
  buildSellerAnalyticsSummary,
  parseAnalyticsRangeDays,
} from "@/lib/marketplace/seller-analytics"
import { getSchemaNotReadyMessage, isSchemaCacheMissingError } from "@/lib/marketplace/schema-readiness"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth

    const rangeDays = parseAnalyticsRangeDays(request.nextUrl.searchParams.get("range"))
    const since = new Date()
    since.setUTCDate(since.getUTCDate() - (rangeDays - 1))
    since.setUTCHours(0, 0, 0, 0)

    const [{ data: orders, error: ordersError }, { data: payouts, error: payoutsError }] = await Promise.all([
      supabase
        .from("marketplace_orders")
        .select("id, payment_status, total_amount, created_at, marketplace_order_items(listing_id, title, quantity, line_total)")
        .eq("seller_user_id", user.id)
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: false })
        .limit(500),
      supabase
        .from("marketplace_payout_ledger")
        .select("net_amount, payout_status")
        .eq("seller_user_id", user.id)
        .limit(200),
    ])

    if (ordersError || payoutsError) {
      if (isSchemaCacheMissingError(ordersError) || isSchemaCacheMissingError(payoutsError)) {
        return NextResponse.json({
          data: buildSellerAnalyticsSummary({ orders: [], payouts: [], rangeDays }),
          warning: getSchemaNotReadyMessage({ feature: "Marketplace analytics" }),
        })
      }
      console.error("Failed to load marketplace analytics", ordersError || payoutsError)
      return NextResponse.json({ error: "Failed to load marketplace analytics" }, { status: 500 })
    }

    return NextResponse.json({
      data: buildSellerAnalyticsSummary({
        orders: orders || [],
        payouts: payouts || [],
        rangeDays,
      }),
    })
  } catch (error) {
    console.error("Unexpected marketplace analytics error", error)
    return NextResponse.json({ error: "Unexpected analytics error" }, { status: 500 })
  }
}
