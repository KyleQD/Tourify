import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/auth/api-auth'
import { z } from 'zod'
import { logAuditEvent } from '@/lib/audit'

async function resolveOrgId(supabase: any, userId: string): Promise<string | null> {
  const { data } = await supabase.from('org_members').select('org_id').eq('user_id', userId).limit(1).maybeSingle()
  return data?.org_id ?? null
}

const createSchema = z.object({
  event_id: z.string().uuid().optional().nullable(),
  tour_id: z.string().uuid().optional().nullable(),
  total_gross_revenue: z.number().default(0),
  total_expenses: z.number().default(0),
  artist_payout: z.number().default(0),
  venue_payout: z.number().default(0),
  promoter_payout: z.number().default(0),
  deal_type: z.enum(['guarantee', 'vs_door', 'percentage']).optional().nullable(),
  guarantee_amount: z.number().optional().nullable(),
  door_percentage: z.number().optional().nullable(),
  status: z.enum(['draft', 'finalized', 'paid']).default('draft'),
  notes: z.string().optional().nullable(),
})

export const GET = withAdminAuth(async (request: NextRequest, { supabase, user }) => {
  const { searchParams } = new URL(request.url)
  const eventId = searchParams.get('event_id')
  const tourId = searchParams.get('tour_id')
  const status = searchParams.get('status')

  const orgId = await resolveOrgId(supabase, user.id)
  if (!orgId) return NextResponse.json({ error: 'No organization found' }, { status: 400 })

  try {
    let query = supabase
      .from('settlements')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })

    if (eventId) query = query.eq('event_id', eventId)
    if (tourId) query = query.eq('tour_id', tourId)
    if (status) query = query.eq('status', status)

    const { data, error } = await query.limit(50)
    if (error) {
      if (error.code === '42P01') return NextResponse.json({ settlements: [] })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ settlements: data || [] })
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})

export const POST = withAdminAuth(async (request: NextRequest, { supabase, user }) => {
  const orgId = await resolveOrgId(supabase, user.id)
  if (!orgId) return NextResponse.json({ error: 'No organization found' }, { status: 400 })

  try {
    const body = await request.json()
    const validated = createSchema.parse(body)

    if (!validated.event_id && !validated.tour_id) {
      return NextResponse.json({ error: 'Settlement must be linked to an event or tour' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('settlements')
      .insert({ ...validated, org_id: orgId, settled_by: user.id })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    await logAuditEvent({ actorId: user.id, orgId, action: 'settle', entityType: 'settlement', entityId: data.id, newValues: { status: data.status } })
    return NextResponse.json({ settlement: data }, { status: 201 })
  } catch (err: any) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: 'Validation error', details: err.errors }, { status: 400 })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})

export const PATCH = withAdminAuth(async (request: NextRequest, { supabase, user }) => {
  try {
    const body = await request.json()
    const { id, ...updates } = body
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const patchData: any = { ...updates, updated_at: new Date().toISOString() }
    if (updates.status === 'paid') {
      patchData.settled_at = new Date().toISOString()
      patchData.settled_by = user.id
    }

    const { data, error } = await supabase
      .from('settlements')
      .update(patchData)
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const orgId2 = await resolveOrgId(supabase, user.id)
    if (orgId2) await logAuditEvent({ actorId: user.id, orgId: orgId2, action: updates.status === 'paid' ? 'settle' : 'update', entityType: 'settlement', entityId: id, newValues: updates })
    return NextResponse.json({ settlement: data })
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})
