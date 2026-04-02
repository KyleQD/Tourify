import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withAuth } from '@/lib/auth/api-auth'
import { hasEventPermission } from '../../_lib/event-permissions'
import { resolveEventReference } from '../../_lib/event-reference'

const createIncidentSchema = z.object({
  title: z.string().min(1),
  notes: z.string().optional(),
  severity: z.enum(['info', 'minor', 'major', 'critical']).default('info'),
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
      const canViewIncidents = await hasEventPermission({
        supabase,
        eventId: reference.id,
        userId: user.id,
        ownerUserId: reference.ownerUserId,
        permissionName: 'EDIT_EVENT_LOGISTICS',
      })
      if (!canViewIncidents) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      }

      const { data, error } = await supabase
        .from('incidents')
        .select('*')
        .eq('event_id', reference.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('[event incidents GET]', error)
        return NextResponse.json({ error: 'Failed to fetch incidents' }, { status: 500 })
      }

      return NextResponse.json({ success: true, incidents: data || [] })
    } catch (err) {
      console.error('[event incidents GET]', err)
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
          { error: 'Incident operations currently require an events_v2 event' },
          { status: 400 }
        )
      }
      const canEditIncidents = await hasEventPermission({
        supabase,
        eventId: reference.id,
        userId: user.id,
        ownerUserId: reference.ownerUserId,
        permissionName: 'EDIT_EVENT_LOGISTICS',
      })
      if (!canEditIncidents) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      }

      const body = await request.json()
      const validated = createIncidentSchema.parse(body)

      const { data: event } = await supabase
        .from('events_v2')
        .select('org_id')
        .eq('id', reference.id)
        .single()

      if (!event) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 })
      }

      const { data, error } = await supabase
        .from('incidents')
        .insert({
          event_id: reference.id,
          org_id: event.org_id,
          title: validated.title,
          notes: validated.notes || null,
          severity: validated.severity,
          reported_by: user.id,
        })
        .select()
        .single()

      if (error) {
        console.error('[event incidents POST]', error)
        return NextResponse.json({ error: 'Failed to create incident' }, { status: 500 })
      }

      return NextResponse.json({ success: true, incident: data })
    } catch (err) {
      if (err instanceof z.ZodError) {
        return NextResponse.json({ error: 'Validation error', details: err.errors }, { status: 400 })
      }
      console.error('[event incidents POST]', err)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  })(request)
}
