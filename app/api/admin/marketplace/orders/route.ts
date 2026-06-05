import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/auth/api-auth'

export const GET = withAdminAuth(async (request: NextRequest, { supabase }) => {
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
      if (error.code === '42P01') return NextResponse.json({ orders: [], total: 0 })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Resolve buyer profiles
    const buyerIds = [...new Set((data || []).map((o: any) => o.buyer_user_id).filter(Boolean))]
    let profileMap: Record<string, any> = {}
    if (buyerIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, username, email')
        .in('id', buyerIds)
      for (const p of profiles || []) profileMap[p.id] = p
    }

    const orders = (data || []).map((o: any) => ({
      ...o,
      buyer_name: profileMap[o.buyer_user_id]?.full_name || profileMap[o.buyer_user_id]?.username || null,
      buyer_email: profileMap[o.buyer_user_id]?.email || null,
      item_count: o.marketplace_order_items?.length || 0,
    }))

    return NextResponse.json({ orders, total: count || 0 })
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})
