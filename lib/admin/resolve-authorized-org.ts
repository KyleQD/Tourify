import { createClient } from '@supabase/supabase-js'
import { resolveAdminOrgIdForUser } from '@/app/api/events/_lib/admin-event-persistence'

function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey)
    throw new Error('Missing Supabase environment variables')

  return createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export interface AuthorizedOrgScope {
  orgId: string | null
  eventIds: string[]
  tourIds: string[]
  /** Service client — use only after withAdminAuth / membership verification */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  service: any
}

/**
 * Resolve the caller's authorized organization and its event/tour IDs.
 * Mirrors tours admin scoping: org_members first, then organizer fallback via
 * resolveAdminOrgIdForUser. Returns empty ID lists when no org is available
 * (caller should still allow created_by = userId rows).
 */
export async function resolveAuthorizedOrgLogisticsScope(args: {
  userId: string
  requestedOrgId?: string | null
  eventId?: string | null
  tourId?: string | null
}): Promise<AuthorizedOrgScope> {
  const service = createServiceClient()
  const { userId, requestedOrgId, eventId, tourId } = args

  const { data: memberships, error: memberErr } = await service
    .from('org_members')
    .select('org_id')
    .eq('user_id', userId)

  if (memberErr) throw new Error(memberErr.message)

  const memberOrgIds = (memberships ?? [])
    .map((row: { org_id?: string | null }) => row.org_id)
    .filter((id: string | null | undefined): id is string => Boolean(id))

  let orgId: string | null = null

  if (requestedOrgId) {
    if (!memberOrgIds.includes(requestedOrgId))
      throw new Error('Organization is not available to this admin account.')
    orgId = requestedOrgId
  } else if (memberOrgIds[0]) {
    orgId = memberOrgIds[0]
  } else {
    orgId = await resolveAdminOrgIdForUser(service, userId, tourId)
  }

  if (!orgId) {
    return { orgId: null, eventIds: [], tourIds: [], service }
  }

  const [{ data: events, error: eventsErr }, { data: tours, error: toursErr }] = await Promise.all([
    service.from('events_v2').select('id').eq('org_id', orgId),
    service.from('tours').select('id').eq('org_id', orgId),
  ])

  if (eventsErr) throw new Error(eventsErr.message)
  if (toursErr) throw new Error(toursErr.message)

  let eventIds = (events ?? []).map((row: { id: string }) => row.id)
  let tourIds = (tours ?? []).map((row: { id: string }) => row.id)

  if (eventId) {
    if (!eventIds.includes(eventId))
      throw new Error('Event is not available to this admin account.')
    eventIds = [eventId]
  }

  if (tourId) {
    if (!tourIds.includes(tourId))
      throw new Error('Tour is not available to this admin account.')
    tourIds = [tourId]
  }

  return { orgId, eventIds, tourIds, service }
}

/**
 * Apply org-scoped filters to a logistics_tasks-style query.
 * When both event and tour lists are empty, restrict to created_by = userId
 * (only for tables that have created_by — pass includeCreatedBy: false otherwise).
 */
export function applyOrgLogisticsTaskFilter(args: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any
  userId: string
  eventIds: string[]
  tourIds: string[]
  eventId?: string | null
  tourId?: string | null
  includeCreatedBy?: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
}): any {
  const {
    query,
    userId,
    eventIds,
    tourIds,
    eventId,
    tourId,
    includeCreatedBy = true,
  } = args

  if (eventId) return query.eq('event_id', eventId)
  if (tourId) return query.eq('tour_id', tourId)

  if (eventIds.length === 0 && tourIds.length === 0) {
    if (includeCreatedBy) return query.eq('created_by', userId)
    // No org entities and no created_by column — return impossible match
    return query.eq('id', '00000000-0000-0000-0000-000000000000')
  }

  const parts: string[] = []
  if (includeCreatedBy) parts.push(`created_by.eq.${userId}`)
  if (eventIds.length > 0) parts.push(`event_id.in.(${eventIds.join(',')})`)
  if (tourIds.length > 0) parts.push(`tour_id.in.(${tourIds.join(',')})`)

  if (parts.length === 1 && !includeCreatedBy)
    return eventIds.length > 0
      ? query.in('event_id', eventIds)
      : query.in('tour_id', tourIds)

  if (parts.length === 1) return query.or(parts[0])
  return query.or(parts.join(','))
}
