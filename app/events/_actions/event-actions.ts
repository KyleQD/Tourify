'use server'

import { z } from 'zod'
import { createSafeActionClient } from 'next-safe-action'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const action = createSafeActionClient()

/**
 * Object-level authorization for org-scoped event operations (AUDIT H8).
 * Authentication alone is never sufficient: the caller must hold
 * `event.manage` on the organization referenced by client input.
 */
async function assertOrgEventManager(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  orgId: string,
): Promise<boolean> {
  const { data: allowed, error } = await supabase.rpc('has_perm', {
    uid: userId,
    oid: orgId,
    perm: 'event.manage',
  })
  if (error) return false
  return allowed === true
}

/** Resolve the owning org of an event and authorize the caller against it. */
async function resolveAuthorizedEventOrgId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  eventId: string,
): Promise<string | null> {
  const { data: row, error } = await supabase
    .from('events_v2')
    .select('org_id')
    .eq('id', eventId)
    .maybeSingle()
  if (error || !row?.org_id) return null
  return (await assertOrgEventManager(supabase, userId, row.org_id)) ? row.org_id : null
}

const eventDateTimeSchema = z.string().trim().min(1).refine(
  (value) => Number.isFinite(Date.parse(value)),
  'Invalid event date and time',
)

function hasForwardTimeRange(input: { startAt: string; endAt: string }) {
  return Date.parse(input.endAt) > Date.parse(input.startAt)
}

const createCalendarSchema = z.object({
  orgId: z.string().uuid(),
  name: z.string().min(2).max(80),
  venueId: z.string().uuid().optional(),
  color: z.string().optional()
})

export const createCalendarAction = action.schema(createCalendarSchema).action(async ({ parsedInput }) => {
  const supabase = await createClient()
  const { data: user } = await supabase.auth.getUser()
  if (!user?.user) return { ok: false, error: 'not_authenticated' }

  if (!(await assertOrgEventManager(supabase, user.user.id, parsedInput.orgId))) {
    return { ok: false, error: 'not_authorized' }
  }

  const { data, error } = await supabase
    .from('calendars')
    .insert({ org_id: parsedInput.orgId, venue_id: parsedInput.venueId ?? null, name: parsedInput.name, color: parsedInput.color ?? null })
    .select('id')
    .single()

  if (error) return { ok: false, error: 'create_failed' }
  revalidatePath('/calendar')
  return { ok: true, calendarId: data.id }
})

const createEventSchema = z.object({
  orgId: z.string().uuid(),
  title: z.string().min(3).max(120),
  startAt: eventDateTimeSchema,
  endAt: eventDateTimeSchema,
  timezone: z.string().default('UTC'),
  venueId: z.string().uuid().optional()
}).refine(hasForwardTimeRange, {
  path: ['endAt'],
  message: 'Event end must be after its start',
})

export const createEventAction = action.schema(createEventSchema).action(async ({ parsedInput }) => {
  const supabase = await createClient()
  const { data: user } = await supabase.auth.getUser()
  if (!user?.user) return { ok: false, error: 'not_authenticated' }

  if (!(await assertOrgEventManager(supabase, user.user.id, parsedInput.orgId))) {
    return { ok: false, error: 'not_authorized' }
  }

  const slug = parsedInput.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60)

  const { data, error } = await supabase
    .from('events_v2')
    .insert({
      org_id: parsedInput.orgId,
      venue_id: parsedInput.venueId ?? null,
      title: parsedInput.title,
      slug,
      status: 'inquiry',
      start_at: parsedInput.startAt,
      end_at: parsedInput.endAt,
      timezone: parsedInput.timezone,
      created_by: user.user.id
    })
    .select('id, slug')
    .single()

  if (error) return { ok: false, error: 'create_failed' }
  revalidatePath('/events')
  return { ok: true, eventId: data.id, slug: data.slug }
})

const updateStatusSchema = z.object({
  eventId: z.string().uuid(),
  status: z.enum(['inquiry','hold','offer','confirmed','advancing','onsite','settled','archived'])
})

export const updateEventStatusAction = action.schema(updateStatusSchema).action(async ({ parsedInput }) => {
  const supabase = await createClient()
  const { data: user } = await supabase.auth.getUser()
  if (!user?.user) return { ok: false, error: 'not_authenticated' }

  // Authorize against the event's actual owning org — never trust the client
  // to name the resource AND the authority together.
  const authorizedOrgId = await resolveAuthorizedEventOrgId(
    supabase,
    user.user.id,
    parsedInput.eventId,
  )
  if (!authorizedOrgId) {
    return { ok: false, error: 'not_authorized' }
  }

  const { data: updatedEvent, error } = await supabase
    .from('events_v2')
    .update({ status: parsedInput.status })
    .eq('id', parsedInput.eventId)
    .eq('org_id', authorizedOrgId)
    .select('id')
    .maybeSingle()

  if (error) return { ok: false, error: 'update_failed' }
  if (!updatedEvent) return { ok: false, error: 'not_authorized' }
  revalidatePath(`/events/${parsedInput.eventId}`)
  return { ok: true }
})

const createHoldSchema = z.object({
  orgId: z.string().uuid(),
  calendarId: z.string().uuid(),
  startAt: eventDateTimeSchema,
  endAt: eventDateTimeSchema,
  status: z.enum(['soft','hard','confirmed']).default('soft'),
  note: z.string().optional()
}).refine(hasForwardTimeRange, {
  path: ['endAt'],
  message: 'Hold end must be after its start',
})

export const createHoldAction = action.schema(createHoldSchema).action(async ({ parsedInput }) => {
  const supabase = await createClient()
  const { data: user } = await supabase.auth.getUser()
  if (!user?.user) return { ok: false, error: 'not_authenticated' }

  if (!(await assertOrgEventManager(supabase, user.user.id, parsedInput.orgId))) {
    return { ok: false, error: 'not_authorized' }
  }

  // Defense in depth: the hold must land on a calendar that belongs to the
  // same authorized org.
  const { data: calendar, error: calendarError } = await supabase
    .from('calendars')
    .select('id, org_id')
    .eq('id', parsedInput.calendarId)
    .eq('org_id', parsedInput.orgId)
    .maybeSingle()
  if (calendarError || !calendar || calendar.org_id !== parsedInput.orgId) {
    return { ok: false, error: 'not_authorized' }
  }

  const { error } = await supabase
    .from('holds')
    .insert({
      org_id: parsedInput.orgId,
      calendar_id: parsedInput.calendarId,
      start_at: parsedInput.startAt,
      end_at: parsedInput.endAt,
      status: parsedInput.status,
      note: parsedInput.note ?? null,
      created_by: user.user.id
    })

  if (error) return { ok: false, error: 'create_failed' }
  revalidatePath('/calendar')
  return { ok: true }
})
