import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withAuth } from '@/lib/auth/api-auth'
import { hasEventPermission } from '../../_lib/event-permissions'
import { resolveEventReference } from '../../_lib/event-reference'

const createVendorRequestSchema = z.object({
  vendor_name: z.string().min(1),
  service_type: z.string().min(1),
  contact_email: z.string().email().optional(),
  contact_phone: z.string().optional(),
  budget_estimate: z.number().min(0).optional(),
  notes: z.string().optional(),
  status: z.enum(['pending', 'confirmed', 'declined', 'cancelled']).default('pending'),
})

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: eventParam } = await context.params
  return withAuth(async (_req, { supabase, user }) => {
    try {
      const reference = await resolveEventReference(supabase as any, eventParam)
      if (!reference) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 })
      }
      const canViewVendors = await hasEventPermission({
        supabase,
        eventId: reference.id,
        userId: user.id,
        ownerUserId: reference.ownerUserId,
        permissionName: 'EDIT_EVENT_LOGISTICS',
      })
      if (!canViewVendors) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      }

      const { data, error } = await supabase
        .from('event_vendor_requests')
        .select('*')
        .eq('event_id', reference.id)
        .order('created_at', { ascending: false })

      if (error) {
        if (error.code === '42P01') {
          return NextResponse.json({ success: true, vendors: [], message: 'Vendor table not yet created' })
        }
        console.error('[event vendors GET]', error)
        return NextResponse.json({ error: 'Failed to fetch vendors' }, { status: 500 })
      }

      return NextResponse.json({ success: true, vendors: data || [] })
    } catch (err) {
      console.error('[event vendors GET]', err)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  })(request)
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: eventParam } = await context.params
  return withAuth(async (_req, { supabase, user }) => {
    try {
      const reference = await resolveEventReference(supabase as any, eventParam)
      if (!reference) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 })
      }
      if (reference.table !== 'events_v2') {
        return NextResponse.json(
          { error: 'Vendor requests currently require an events_v2 event' },
          { status: 400 }
        )
      }
      const canEditVendors = await hasEventPermission({
        supabase,
        eventId: reference.id,
        userId: user.id,
        ownerUserId: reference.ownerUserId,
        permissionName: 'EDIT_EVENT_LOGISTICS',
      })
      if (!canEditVendors) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      }

      const body = await request.json()
      const validated = createVendorRequestSchema.parse(body)

      const { data: event } = await supabase
        .from('events_v2')
        .select('org_id')
        .eq('id', reference.id)
        .single()

      if (!event) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 })
      }

      const { data, error } = await supabase
        .from('event_vendor_requests')
        .insert({
          ...validated,
          event_id: reference.id,
          org_id: event.org_id,
          created_by: user.id,
        })
        .select()
        .single()

      if (error) {
        console.error('[event vendors POST]', error)
        return NextResponse.json({ error: 'Failed to create vendor request' }, { status: 500 })
      }

      return NextResponse.json({ success: true, vendor: data })
    } catch (err) {
      if (err instanceof z.ZodError) {
        return NextResponse.json({ error: 'Validation error', details: err.errors }, { status: 400 })
      }
      console.error('[event vendors POST]', err)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  })(request)
}
