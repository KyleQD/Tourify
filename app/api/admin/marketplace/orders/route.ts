import { NextRequest, NextResponse } from 'next/server'
import { resolveCommerceContext } from '@/lib/admin/commerce/resolve-context'
import {
  buildCommercePiiAwareSelect,
  projectCommercePiiValue,
} from '@/lib/admin/commerce/pii'
import { commerceErrorResponse, commerceJsonResponse } from '@/lib/admin/commerce/errors'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const commerce = await resolveCommerceContext(request, {
    requiredPermission: 'commerce.view',
  })
  if (commerce instanceof NextResponse) return commerce

  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200)
  const offset = parseInt(searchParams.get('offset') || '0', 10)

  try {
    let query = supabase
      .from('marketplace_orders')
      .select('id, buyer_user_id, total_amount, payment_status, fulfillment_status, created_at, marketplace_order_items(id, quantity, unit_price)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) query = query.eq('payment_status', status)

    const { data, error, count } = await query

    if (error) {
      return commerceErrorResponse({
        status: 500,
        code: "orders_unavailable",
        message: error.code === '42P01'
          ? "Marketplace orders are unavailable."
          : "Failed to load marketplace orders.",
        retryable: true,
        correlationId: commerce.request.correlationId,
        details: { providerCode: error.code ?? null },
      })
    }

    // Resolve buyer profiles
    const buyerIds = [...new Set((data || []).map((o: any) => o.buyer_user_id).filter(Boolean))]
    let profileMap: Record<string, any> = {}
    if (buyerIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select(buildCommercePiiAwareSelect(commerce, ['id', 'full_name', 'username'], {
          'customer.email': 'email',
        }))
        .in('id', buyerIds)
      for (const p of profiles || []) profileMap[p.id] = p
    }

    const orders = (data || []).map((o: any) => ({
      ...o,
      buyer_name: profileMap[o.buyer_user_id]?.full_name || profileMap[o.buyer_user_id]?.username || null,
      buyer_email: projectCommercePiiValue(commerce, 'customer.email', profileMap[o.buyer_user_id]?.email),
      item_count: o.marketplace_order_items?.length || 0,
    }))

    return commerceJsonResponse({ orders, total: count || 0 }, {
      correlationId: commerce.request.correlationId,
    })
  } catch {
    return commerceErrorResponse({
      status: 500,
      code: "unexpected_orders_error",
      message: "Unexpected marketplace orders error.",
      retryable: true,
      correlationId: commerce.request.correlationId,
    })
  }
}
