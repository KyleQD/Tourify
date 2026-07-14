import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiRequest } from '@/lib/auth/api-auth'
import { buildUniqueEventSlug } from '../../_lib/events-v2-admin'
import {
  ensureAdminOrgScope,
  ensureEventOrganizerRole,
  verifyEventsV2Row,
} from '../../_lib/admin-event-persistence'
import { logAuditEvent } from '@/lib/audit'

function combineDateTimeToIso(date?: string, time?: string): string {
  if (!date?.trim()) return new Date().toISOString()
  const t = (time?.trim() || '00:00').slice(0, 5)
  const ms = Date.parse(`${date.trim()}T${t}:00`)
  if (Number.isNaN(ms)) return new Date().toISOString()
  return new Date(ms).toISOString()
}

export async function POST(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { event_id, plannerId, ...plannerData } = body

    // Validate required planner fields
    const missingItems: string[] = []
    const title = (plannerData.name || plannerData.title || '').trim()
    if (!title) missingItems.push('Event name')

    const firstVenue = Array.isArray(plannerData.venues) ? plannerData.venues[0] : null
    if (!firstVenue?.name) missingItems.push('Venue')
    if (!firstVenue?.selectedDate) missingItems.push('Event date')
    if (!Array.isArray(plannerData.ticketTypes) || plannerData.ticketTypes.length === 0) {
      missingItems.push('At least one ticket type')
    }

    if (missingItems.length > 0) {
      return NextResponse.json(
        { error: 'Event not ready for publishing', missingItems },
        { status: 400 },
      )
    }

    const tourId = typeof plannerData.tour_id === 'string' && plannerData.tour_id.trim()
      ? plannerData.tour_id.trim()
      : null
    const orgId = await ensureAdminOrgScope(auth.supabase, auth.user.id, tourId)

    const startAt = combineDateTimeToIso(firstVenue?.selectedDate, firstVenue?.selectedTime)
    const endAt = new Date(new Date(startAt).getTime() + 2 * 60 * 60 * 1000).toISOString()
    const capacity = firstVenue?.capacity ? Number(firstVenue.capacity) : null
    const plannerSettings = {
      ...plannerData,
      _planner_draft: false,
      venue_label: firstVenue?.name ?? '',
      venue_address: firstVenue?.address ?? '',
      description: plannerData.description ?? '',
    }

    let eventRecord: any

    // If we have an existing draft event_id, update it to confirmed
    if (event_id) {
      const { data, error } = await auth.supabase
        .from('events_v2')
        .update({
          title,
          status: 'confirmed',
          start_at: startAt,
          end_at: endAt,
          capacity,
          settings: plannerSettings,
          updated_at: new Date().toISOString(),
        })
        .eq('id', event_id)
        .eq('created_by', auth.user.id)
        .select()
        .single()

      if (error) {
        console.error('[Event Planner Publish] update error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      if (!data) return NextResponse.json({ error: 'Event not found' }, { status: 404 })
      eventRecord = await verifyEventsV2Row(auth.supabase, data.id, auth.user.id)
    } else {
      // Create a brand-new confirmed event from the planner data
      const slug = await buildUniqueEventSlug(auth.supabase as any, orgId, title)

      const { data, error } = await auth.supabase
        .from('events_v2')
        .insert({
          org_id: orgId,
          title,
          slug,
          status: 'confirmed',
          start_at: startAt,
          end_at: endAt,
          capacity,
          timezone: 'UTC',
          created_by: auth.user.id,
          settings: plannerSettings,
        })
        .select('id')
        .single()

      if (error || !data?.id) {
        console.error('[Event Planner Publish] insert error:', error)
        return NextResponse.json(
          { error: error?.message || 'Failed to create event' },
          { status: 500 },
        )
      }
      eventRecord = await verifyEventsV2Row(auth.supabase, data.id, auth.user.id)
    }

    await ensureEventOrganizerRole(auth.user.id, eventRecord.id)

    if (tourId) {
      const { data: existingLink, error: linkLookupError } = await auth.supabase
        .from('tour_events')
        .select('id')
        .eq('tour_id', tourId)
        .eq('event_id', eventRecord.id)
        .maybeSingle()

      if (linkLookupError) {
        console.error('[Event Planner Publish] tour link lookup error:', linkLookupError)
      } else if (!existingLink) {
        const { error: linkError } = await auth.supabase
          .from('tour_events')
          .insert({ tour_id: tourId, event_id: eventRecord.id })
        if (linkError) console.error('[Event Planner Publish] tour link insert error:', linkError)
      }
    }

    // Create ticket types in ticket_types table
    if (Array.isArray(plannerData.ticketTypes) && plannerData.ticketTypes.length > 0) {
      const { data: existingTicketTypes, error: ticketLookupError } = await auth.supabase
        .from('ticket_types')
        .select('id')
        .eq('event_id', eventRecord.id)
        .limit(1)

      if (ticketLookupError) {
        console.error('[Event Planner Publish] ticket_types lookup error:', ticketLookupError)
      } else if (!existingTicketTypes || existingTicketTypes.length === 0) {
        const ticketInserts = plannerData.ticketTypes.map((t: any) => ({
          event_id: eventRecord.id,
          name: t.name || 'General Admission',
          description: t.description ?? null,
          price: Number(t.price) || 0,
          quantity_available: Number(t.quantity) || 100,
          quantity_sold: 0,
          category: t.type ?? 'general',
          is_active: true,
        }))

        const { error: ticketError } = await auth.supabase
          .from('ticket_types')
          .insert(ticketInserts)

        if (ticketError) {
          console.error('[Event Planner Publish] ticket_types insert error:', ticketError)
        }
      }
    }

    // Create event_participants for team members (especially artists)
    if (Array.isArray(plannerData.teamMembers) && plannerData.teamMembers.length > 0) {
      const participantInserts = plannerData.teamMembers
        .filter((m: any) => m.id && m.id !== auth.user.id) // Skip the creator (already organizer)
        .map((m: any) => ({
          event_id: eventRecord.id,
          participant_id: m.id,
          participant_type: 'Individual',
          role: m.accountType === 'artist' ? 'headliner' : (m.role || 'staff'),
          status: 'invited',
          metadata: { invited_from_planner: true, account_type: m.accountType },
        }))

      if (participantInserts.length > 0) {
        const { error: partError } = await auth.supabase
          .from('event_participants')
          .upsert(participantInserts, { onConflict: 'event_id,participant_id', ignoreDuplicates: true })

        if (partError) {
          console.error('[Event Planner Publish] event_participants insert error:', partError)
        }
      }
    }

    await logAuditEvent({
      actorId: auth.user.id,
      orgId,
      action: 'publish',
      entityType: 'event',
      entityId: eventRecord.id,
      newValues: { title: eventRecord.title, status: 'confirmed' },
    })

    return NextResponse.json(
      {
        message: 'Event published successfully',
        event: eventRecord,
        event_id: eventRecord.id,
      },
      { status: 201 },
    )
  } catch (error: any) {
    console.error('[Event Planner Publish] exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
