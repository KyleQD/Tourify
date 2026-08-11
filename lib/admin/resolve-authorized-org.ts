import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

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
  orgId: string
  eventIds: string[]
  tourIds: string[]
  /** Service client — use only after withAdminAuth / membership verification */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  service: any
}

export class AdminActingContextRequiredError extends Error {
  readonly code = 'acting_context_required'
  readonly status = 409
  constructor() {
    super('Select an organization account before continuing.')
    this.name = 'AdminActingContextRequiredError'
  }
}

export class AdminOrganizationAccessDeniedError extends Error {
  readonly code = 'organization_access_denied'
  readonly status = 403
  constructor() {
    super('Organization is not available to this admin account.')
    this.name = 'AdminOrganizationAccessDeniedError'
  }
}

export function resolveExplicitAuthorizedOrgId(
  requestedOrgId: string | null | undefined,
  authorizedOrgIds: readonly string[],
): string {
  const orgId = requestedOrgId?.trim()
  if (!orgId) throw new AdminActingContextRequiredError()
  if (!authorizedOrgIds.includes(orgId)) throw new AdminOrganizationAccessDeniedError()
  return orgId
}

export function mergeAuthorizedOrgIds(
  memberOrgIds: readonly string[],
  ownerOrgIds: readonly string[],
): string[] {
  return Array.from(new Set([...memberOrgIds, ...ownerOrgIds].filter(Boolean)))
}

export function authorizedOrgScopeErrorResponse(error: unknown): NextResponse | null {
  if (error instanceof AdminActingContextRequiredError || error instanceof AdminOrganizationAccessDeniedError) {
    return NextResponse.json(
      { success: false, error: error.message, code: error.code },
      { status: error.status },
    )
  }
  return null
}

/**
 * Resolve the caller's authorized organization and its event/tour IDs.
 * Resolves only the explicitly selected acting organization. It never infers an
 * organization from membership ordering, which is ambiguous for multi-org admins.
 */
export async function resolveAuthorizedOrgLogisticsScope(args: {
  userId: string
  requestedOrgId: string | null | undefined
  eventId?: string | null
  tourId?: string | null
}): Promise<AuthorizedOrgScope> {
  const service = createServiceClient()
  const { userId, requestedOrgId, eventId, tourId } = args

  const [
    { data: memberships, error: memberErr },
    { data: ownedOrganizations, error: ownedErr },
  ] = await Promise.all([
    service
      .from('org_members')
      .select('org_id')
      .eq('user_id', userId),
    service
      .from('organizer_accounts')
      .select('ops_org_id')
      .eq('user_id', userId)
      .eq('is_active', true),
  ])

  if (memberErr) throw new Error(memberErr.message)
  if (ownedErr) throw new Error(ownedErr.message)

  const memberOrgIds = (memberships ?? [])
    .map((row: { org_id?: string | null }) => row.org_id)
    .filter((id: string | null | undefined): id is string => Boolean(id))
  const ownerOrgIds = (ownedOrganizations ?? [])
    .map((row: { ops_org_id?: string | null }) => row.ops_org_id)
    .filter((id: string | null | undefined): id is string => Boolean(id))

  const orgId = resolveExplicitAuthorizedOrgId(
    requestedOrgId,
    mergeAuthorizedOrgIds(memberOrgIds, ownerOrgIds),
  )

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
