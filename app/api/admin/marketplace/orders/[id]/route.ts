import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { resolveCommerceContext } from "@/lib/admin/commerce/resolve-context"
import { commerceErrorResponse, commerceJsonResponse } from "@/lib/admin/commerce/errors"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const commerce = await resolveCommerceContext(request, {
      requiredPermission: "commerce.view",
    })
    if (commerce instanceof NextResponse) return commerce

    const supabase = await createClient()

    const { id } = await params
    const { data: order, error: orderError } = await supabase
      .from("marketplace_orders")
      .select("*, marketplace_order_items(*), marketplace_payout_ledger(*)")
      .eq("id", id)
      .single()

    if (orderError || !order) {
      return commerceErrorResponse({
        status: 404,
        code: "order_not_found",
        message: "Order not found.",
        correlationId: commerce.request.correlationId,
      })
    }
    return commerceJsonResponse({ data: order }, {
      correlationId: commerce.request.correlationId,
    })
  } catch (error) {
    console.error("Unexpected admin marketplace order GET error", error)
    return commerceErrorResponse({
      status: 500,
      code: "unexpected_order_detail_error",
      message: "Unexpected order detail error.",
      retryable: true,
    })
  }
}
