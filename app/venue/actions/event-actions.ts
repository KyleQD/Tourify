'use server'

import { revalidatePath } from 'next/cache'
import { EventFormData } from '../components/create-event-modal'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

// Create Supabase client per function to avoid top-level await issues

const eventSchema = z.object({
  id: z.string(),
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  date: z.date(),
  startTime: z.string(),
  endTime: z.string(),
  capacity: z.number().min(1, "Capacity must be at least 1"),
  ticketPrice: z.number().min(0, "Ticket price must be 0 or more"),
  isPublic: z.boolean(),
  status: z.string(),
  type: z.string(),
})

function toIsoFromDateAndTime(date: Date, time: string) {
  const day = date.toISOString().slice(0, 10)
  const normalizedTime = (time || '00:00').slice(0, 5)
  const ms = Date.parse(`${day}T${normalizedTime}:00`)
  if (Number.isNaN(ms)) return null
  return new Date(ms).toISOString()
}

function mapVenueStatusToEventV2Status(status: string) {
  const normalized = (status || '').toLowerCase()
  if (normalized === 'confirmed') return 'confirmed'
  if (normalized === 'in_progress') return 'onsite'
  if (normalized === 'completed') return 'settled'
  if (normalized === 'cancelled') return 'archived'
  if (normalized === 'postponed') return 'hold'
  return 'inquiry'
}

function revalidateVenueOperationPaths(eventId?: string) {
  const routes = [
    '/venue',
    '/venue/bookings',
    '/venue/overview',
    '/venue/dashboard/events',
    '/venue/dashboard/calendar',
  ]

  for (const route of routes) revalidatePath(route)
  if (eventId) {
    revalidatePath(`/venue/events/${eventId}`)
    revalidatePath(`/venue/manage-event/${eventId}`)
  }
}

async function getAuthorizedVenueIds(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const [{ data: ownerRows, error: ownerError }, { data: memberRows, error: memberError }] = await Promise.all([
    supabase
      .from('venue_profiles')
      .select('id')
      .or(`user_id.eq.${userId},main_profile_id.eq.${userId}`),
    supabase
      .from('venue_team_members')
      .select('venue_id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .contains('permissions', { manage_bookings: true }),
  ])

  if (ownerError && memberError) return []

  const ownerVenueIds = (ownerRows || []).map((row: { id: string }) => row.id)
  const memberVenueIds = (memberRows || []).map((row: { venue_id: string }) => row.venue_id)
  return Array.from(new Set([...ownerVenueIds, ...memberVenueIds].filter(Boolean)))
}

async function canManageVenueEvent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  eventId: string,
  venueIds: string[]
) {
  if (!eventId || venueIds.length === 0) return false

  const { data: v2Event } = await supabase
    .from('events_v2')
    .select('id, venue_id, settings')
    .eq('id', eventId)
    .maybeSingle()

  if (v2Event) {
    const settings = v2Event.settings && typeof v2Event.settings === 'object'
      ? (v2Event.settings as Record<string, unknown>)
      : null
    const settingsVenueId = typeof settings?.venue_profile_id === 'string' ? settings.venue_profile_id : null

    return Boolean(
      (v2Event.venue_id && venueIds.includes(v2Event.venue_id)) ||
      (settingsVenueId && venueIds.includes(settingsVenueId))
    )
  }

  const { data: legacyEvent } = await supabase
    .from('events')
    .select('id, venue_id')
    .eq('id', eventId)
    .maybeSingle()

  return Boolean(legacyEvent?.venue_id && venueIds.includes(legacyEvent.venue_id))
}

export async function updateEvent(eventData: EventFormData) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const venueIds = await getAuthorizedVenueIds(supabase, user.id)
    if (venueIds.length === 0) return { success: false, error: 'Venue access required' }

    // Validate the event data
    const validatedData = eventSchema.parse(eventData)
    const canManage = await canManageVenueEvent(supabase, validatedData.id, venueIds)
    if (!canManage) return { success: false, error: 'You do not have permission to update this event' }

    const startAt = toIsoFromDateAndTime(validatedData.date, validatedData.startTime)
    const endAt = toIsoFromDateAndTime(validatedData.date, validatedData.endTime)

    let v2Updated = false
    if (startAt && endAt) {
      const { data: existingV2 } = await supabase
        .from('events_v2')
        .select('id, settings')
        .eq('id', validatedData.id)
        .maybeSingle()

      if (existingV2) {
        const nextSettings =
          existingV2.settings && typeof existingV2.settings === 'object'
            ? { ...(existingV2.settings as Record<string, unknown>) }
            : {}
        nextSettings.description = validatedData.description
        nextSettings.event_type = validatedData.type
        nextSettings.ticket_price = validatedData.ticketPrice
        nextSettings.is_public = validatedData.isPublic

        const { error: v2UpdateError } = await supabase
          .from('events_v2')
          .update({
            title: validatedData.title,
            start_at: startAt,
            end_at: endAt,
            capacity: validatedData.capacity,
            status: mapVenueStatusToEventV2Status(validatedData.status),
            settings: nextSettings,
          })
          .eq('id', validatedData.id)

        if (!v2UpdateError) v2Updated = true
      }
    }

    if (!v2Updated) {
      await supabase.from('events').update({
        title: validatedData.title,
        description: validatedData.description,
        date: validatedData.date.toISOString(),
        time: validatedData.startTime,
        capacity: validatedData.capacity,
        type: validatedData.type
      }).eq('id', validatedData.id)
    }
    
    revalidateVenueOperationPaths(validatedData.id)
    
    return { success: true }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { 
        success: false, 
        error: 'Validation failed', 
        details: error.errors 
      }
    }
    return { 
      success: false, 
      error: 'Failed to update event' 
    }
  }
}

export async function deleteEvent(eventId: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const venueIds = await getAuthorizedVenueIds(supabase, user.id)
    if (venueIds.length === 0) return { success: false, error: 'Venue access required' }

    const canManage = await canManageVenueEvent(supabase, eventId, venueIds)
    if (!canManage) return { success: false, error: 'You do not have permission to delete this event' }

    const { error: v2DeleteError } = await supabase.from('events_v2').delete().eq('id', eventId)
    if (v2DeleteError) {
      await supabase.from('events').delete().eq('id', eventId)
    } else {
      await supabase.from('events').delete().eq('id', eventId)
    }
    
    revalidateVenueOperationPaths(eventId)
    
    return { success: true }
  } catch (error) {
    return { 
      success: false, 
      error: 'Failed to delete event' 
    }
  }
}

export async function uploadEventDocument(eventId: string, file: File) {
  try {
    // Placeholder: hook to storage later
    void eventId
    void file
    
    revalidateVenueOperationPaths(eventId)
    
    return { success: true }
  } catch (error) {
    return { 
      success: false, 
      error: 'Failed to upload document' 
    }
  }
} 

// Approve booking request and optionally create event (for venue EDM nights etc.)
const approveSchema = z.object({
  requestId: z.string().uuid(),
  createEvent: z.boolean().default(true),
  responseMessage: z.string().optional()
})

const respondVenueBookingSchema = z.object({
  requestId: z.string().uuid(),
  action: z.enum(['approved', 'rejected']),
  responseMessage: z.string().optional()
})

function buildEventSlug(input: string) {
  const base = (input || 'event')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 40)
  return `${base || 'event'}-${Math.random().toString(36).slice(2, 8)}`
}

export async function approveBookingAndMaybeCreateEvent(input: { requestId: string; createEvent?: boolean; responseMessage?: string }) {
  const supabase = await createClient()
  const { requestId, createEvent, responseMessage } = approveSchema.parse(input)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const venueIds = await getAuthorizedVenueIds(supabase, user.id)
  if (venueIds.length === 0) return { success: false, error: 'Venue access required' }

  const { data: req, error: fetchErr } = await supabase.from('venue_booking_requests').select('*').eq('id', requestId).single()
  if (fetchErr || !req) return { success: false, error: fetchErr?.message || 'Request not found' }
  if (!req.venue_id || !venueIds.includes(req.venue_id)) {
    return { success: false, error: 'You do not have permission to approve this request' }
  }

  // Use RPC to approve
  const { error: rpcError } = await supabase.rpc('respond_to_booking_request', {
    p_request_id: requestId,
    p_status: 'approved',
    p_response_message: responseMessage || null
  })
  if (rpcError) return { success: false, error: rpcError.message }

  let createdEventId: string | null = null
  let createdEventV2Id: string | null = null
  if (createEvent) {
    let orgId: string | null = null
    const { data: membership } = await supabase
      .from('org_members')
      .select('org_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle()
    orgId = membership?.org_id || null

    if (orgId) {
      const startAt = req.event_date || new Date().toISOString()
      const durationMinutes = Number(req.event_duration || 120)
      const endAtDate = new Date(startAt)
      endAtDate.setMinutes(endAtDate.getMinutes() + (Number.isNaN(durationMinutes) ? 120 : durationMinutes))
      const slug = buildEventSlug(req.event_name || 'venue-event')

      const { data: v2Event, error: v2Error } = await supabase
        .from('events_v2')
        .insert([{
          org_id: orgId,
          venue_id: req.venue_id || null,
          title: req.event_name,
          slug,
          status: 'confirmed',
          start_at: startAt,
          end_at: endAtDate.toISOString(),
          timezone: 'UTC',
          capacity: req.expected_attendance || null,
          settings: {
            description: req.description || null,
            event_type: req.event_type || 'other',
            venue_profile_id: req.venue_id || null,
            venue_label: 'Venue Booking'
          },
          created_by: user.id
        }])
        .select('id')
        .single()

      if (!v2Error) {
        createdEventV2Id = v2Event?.id ?? null
      } else {
        console.error('Failed to create events_v2 record:', v2Error)
      }
    }

    if (!createdEventV2Id) {
      const { data: evt, error: evtErr } = await supabase.from('events').insert([{ 
        title: req.event_name,
        description: req.description,
        date: req.event_date,
        time: '19:00',
        location: 'Venue',
        type: req.event_type,
        capacity: req.expected_attendance || 0,
        user_id: req.requester_id,
        venue_id: req.venue_id,
        genre: req.genre
      }]).select('id').single()
      if (evtErr) return { success: false, error: evtErr.message }
      createdEventId = evt?.id ?? null
    }
  }

  revalidateVenueOperationPaths(createdEventV2Id || createdEventId || undefined)
  return { success: true, eventId: createdEventId, eventV2Id: createdEventV2Id }
}

export async function respondToVenueBookingRequest(input: { requestId: string; action: 'approved' | 'rejected'; responseMessage?: string }) {
  const supabase = await createClient()
  const { requestId, action, responseMessage } = respondVenueBookingSchema.parse(input)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const venueIds = await getAuthorizedVenueIds(supabase, user.id)
  if (venueIds.length === 0) return { success: false, error: 'Venue access required' }

  const { data: req, error: fetchErr } = await supabase
    .from('venue_booking_requests')
    .select('id, venue_id')
    .eq('id', requestId)
    .single()

  if (fetchErr || !req) return { success: false, error: fetchErr?.message || 'Request not found' }
  if (!req.venue_id || !venueIds.includes(req.venue_id)) {
    return { success: false, error: 'You do not have permission to manage this request' }
  }

  const { error: rpcError } = await supabase.rpc('respond_to_booking_request', {
    p_request_id: requestId,
    p_status: action,
    p_response_message: responseMessage || null
  })
  if (rpcError) return { success: false, error: rpcError.message }

  revalidateVenueOperationPaths()
  return { success: true }
}