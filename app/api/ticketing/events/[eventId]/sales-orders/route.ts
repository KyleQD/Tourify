import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { authenticateApiRequest } from '@/lib/auth/api-auth'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { isUnifiedGuestListEnabled } from '@/lib/ticketing/guest-list'
import { getTicketingActorAccess, ticketingErrorResponse } from '@/lib/ticketing/guest-list.server'
import { hasTicketingPermission } from '@/lib/ticketing/permissions'

const typeSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).optional().nullable(),
  price: z.coerce.number().finite().min(0),
  quantity_available: z.coerce.number().int().min(1),
  category: z.string().trim().min(1).max(40),
  sale_start: z.string().optional().nullable(),
  sale_end: z.string().optional().nullable(),
  is_active: z.boolean().optional(),
})

async function requireTypeManager(auth: any, eventId: string) {
  const allowed = await hasTicketingPermission({ supabase: auth.supabase, userId: auth.user.id, eventId, permission: 'manage_ticket_types' })
  if (!allowed) throw Object.assign(new Error('Ticket type management permission required'), { status: 403 })
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  if (!isUnifiedGuestListEnabled()) return NextResponse.json({ error: 'Feature disabled' }, { status: 404 })
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { eventId } = await params
    const access = await getTicketingActorAccess({ supabase: auth.supabase, userId: auth.user.id, eventId })
    if (!access.canViewOrders && !access.isCreator) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const service = createServiceRoleClient()
    const [types, orders] = await Promise.all([
      service.from('ticket_types').select('*').eq('event_id', eventId).order('priority_order'),
      service.from('ticket_sales').select('id,buyer_name,buyer_email,quantity,unit_price,total_amount,payment_status,created_at,checked_in,ticket_types(name)').eq('event_id', eventId).order('created_at', { ascending: false }).limit(500),
    ])
    if (types.error || orders.error) throw new Error(types.error?.message || orders.error?.message)
    const sales = (orders.data || []).map((order: any) => ({
      ...order,
      buyer_email: access.canViewContact ? order.buyer_email : null,
    }))
    return NextResponse.json({ ticket_types: types.data || [], sales })
  } catch (error) {
    const response = ticketingErrorResponse(error)
    return NextResponse.json({ error: response.message }, { status: response.status })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  if (!isUnifiedGuestListEnabled()) return NextResponse.json({ error: 'Feature disabled' }, { status: 404 })
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { eventId } = await params
    await requireTypeManager(auth, eventId)
    const body = typeSchema.parse(await request.json())
    const service = createServiceRoleClient()
    const { data, error } = await service.from('ticket_types').insert({
      event_id: eventId,
      name: body.name,
      description: body.description || null,
      price: body.price,
      quantity_available: body.quantity_available,
      category: body.category,
      sale_start: body.sale_start || null,
      sale_end: body.sale_end || null,
      is_active: body.is_active ?? true,
    }).select('*').single()
    if (error) throw new Error(error.message)
    return NextResponse.json({ ticket_type: data }, { status: 201 })
  } catch (error) {
    const response = ticketingErrorResponse(error)
    return NextResponse.json({ error: response.message }, { status: response.status })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  if (!isUnifiedGuestListEnabled()) return NextResponse.json({ error: 'Feature disabled' }, { status: 404 })
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { eventId } = await params
    await requireTypeManager(auth, eventId)
    const body = typeSchema.partial().extend({ id: z.string().uuid() }).parse(await request.json())
    const service = createServiceRoleClient()
    const { data: current } = await service.from('ticket_types').select('quantity_sold,quantity_reserved').eq('id', body.id).eq('event_id', eventId).maybeSingle()
    if (!current) return NextResponse.json({ error: 'Ticket type not found' }, { status: 404 })
    if (body.quantity_available !== undefined && body.quantity_available < current.quantity_sold + current.quantity_reserved) {
      return NextResponse.json({ error: 'Capacity cannot be below sold plus reserved inventory' }, { status: 409 })
    }
    const { id, ...updates } = body
    const { data, error } = await service.from('ticket_types').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).eq('event_id', eventId).select('*').single()
    if (error) throw new Error(error.message)
    return NextResponse.json({ ticket_type: data })
  } catch (error) {
    const response = ticketingErrorResponse(error)
    return NextResponse.json({ error: response.message }, { status: response.status })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  if (!isUnifiedGuestListEnabled()) return NextResponse.json({ error: 'Feature disabled' }, { status: 404 })
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { eventId } = await params
    await requireTypeManager(auth, eventId)
    const id = z.string().uuid().parse(new URL(request.url).searchParams.get('id'))
    const service = createServiceRoleClient()
    const { data: current } = await service.from('ticket_types').select('quantity_sold,quantity_reserved').eq('id', id).eq('event_id', eventId).maybeSingle()
    if (!current) return NextResponse.json({ error: 'Ticket type not found' }, { status: 404 })
    if (current.quantity_sold > 0 || current.quantity_reserved > 0) return NextResponse.json({ error: 'Sold or reserved ticket types cannot be deleted' }, { status: 409 })
    const { error } = await service.from('ticket_types').delete().eq('id', id).eq('event_id', eventId)
    if (error) throw new Error(error.message)
    return NextResponse.json({ success: true })
  } catch (error) {
    const response = ticketingErrorResponse(error)
    return NextResponse.json({ error: response.message }, { status: response.status })
  }
}

