import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { authenticateApiRequest } from '@/lib/auth/api-auth'
import { hasTicketingPermission } from '@/lib/ticketing/permissions'
import { calculateRevenueShares } from '@/lib/ticketing/settlements'

const upsertSchema = z.object({
  event_id: z.string().uuid(),
  allocations: z.array(z.object({
    beneficiary_type: z.enum(['organization', 'venue', 'artist', 'promoter', 'platform']),
    beneficiary_id: z.string().uuid().nullable().optional(),
    share_type: z.enum(['percentage', 'flat', 'remainder']),
    share_value: z.number().min(0),
    priority: z.number().int().default(100),
    is_active: z.boolean().default(true),
  })),
})

export async function GET(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const eventId = new URL(request.url).searchParams.get('event_id')
  if (!eventId) return NextResponse.json({ error: 'event_id required' }, { status: 400 })

  const supabase = await createClient()
  const canFull = await hasTicketingPermission({
    supabase,
    userId: auth.user.id,
    eventId,
    permission: 'view_full_financials',
  })
  const canShare = await hasTicketingPermission({
    supabase,
    userId: auth.user.id,
    eventId,
    permission: 'view_assigned_share',
  })
  if (!canFull && !canShare)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const [{ data: allocations }, { data: txns }, { data: settlement }] = await Promise.all([
    supabase.from('ticket_revenue_allocations').select('*').eq('event_id', eventId).eq('is_active', true),
    supabase.from('financial_transactions').select('category, type, amount').eq('event_id', eventId),
    supabase.from('settlements').select('*').eq('event_id', eventId).maybeSingle(),
  ])

  const gross = (txns || [])
    .filter((t: any) => t.type === 'income' && t.category === 'ticket_revenue')
    .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0)

  const refunds = (txns || [])
    .filter((t: any) => t.category === 'refund')
    .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0)

  const fees = (txns || [])
    .filter((t: any) => t.category === 'platform_fee' || t.category === 'processing_fee')
    .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0)

  const net = Math.max(0, gross - refunds - fees)
  const shares = calculateRevenueShares({
    netRevenue: net,
    allocations: (allocations || []).map((a: any) => ({
      beneficiary_type: a.beneficiary_type,
      beneficiary_id: a.beneficiary_id,
      share_type: a.share_type,
      share_value: Number(a.share_value),
      priority: a.priority,
      is_active: a.is_active,
    })),
  })

  return NextResponse.json({
    gross,
    refunds,
    fees,
    net,
    allocations: allocations || [],
    shares: canFull ? shares : shares.slice(0, canShare ? shares.length : 0),
    settlement,
  })
}

export async function POST(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = upsertSchema.parse(await request.json())
  const supabase = await createClient()
  const allowed = await hasTicketingPermission({
    supabase,
    userId: auth.user.id,
    eventId: parsed.event_id,
    permission: 'view_full_financials',
  })
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await supabase.from('ticket_revenue_allocations').delete().eq('event_id', parsed.event_id)

  if (parsed.allocations.length) {
    const { error } = await supabase.from('ticket_revenue_allocations').insert(
      parsed.allocations.map((a) => ({
        event_id: parsed.event_id,
        ...a,
      }))
    )
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
