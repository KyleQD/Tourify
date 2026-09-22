import type { SupabaseClient } from '@supabase/supabase-js'

export const EVENT_REFERENCE_LOOKUP_ORDER = ['events_v2', 'artist_events', 'events'] as const
export const EVENT_REFERENCE_IDENTIFIER_FORMS = ['uuid', 'slug'] as const

export type EventReferenceTable = (typeof EVENT_REFERENCE_LOOKUP_ORDER)[number]
export type EventReferenceIdentifierKind = (typeof EVENT_REFERENCE_IDENTIFIER_FORMS)[number]

export interface EventReference {
  id: string
  table: EventReferenceTable
  status: string | null
  ownerUserId: string | null
  isPublic: boolean | null
  orgId?: string | null
  venueId?: string | null
  eventDate?: string | null
  eventTime?: string | null
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const PUBLIC_EVENTS_V2_STATUSES = new Set(['confirmed', 'advancing', 'onsite'])

type EventReferenceRow = Record<string, unknown>

const LOOKUP_DEFINITIONS: ReadonlyArray<{
  table: EventReferenceTable
  select: string
}> = [
  {
    table: 'events_v2',
    select: 'id, status, created_by, org_id, venue_id, start_at',
  },
  {
    table: 'artist_events',
    select: 'id, status, user_id, is_public',
  },
  {
    table: 'events',
    select: 'id, status, artist_id',
  },
]

function identifierKind(value: string): EventReferenceIdentifierKind {
  return UUID_PATTERN.test(value) ? 'uuid' : 'slug'
}

function nullableString(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function eventScheduleFromStartAt(startAt: string | null) {
  if (!startAt) return { eventDate: null, eventTime: null }

  const [eventDate, timeWithZone] = startAt.split('T')
  return {
    eventDate: eventDate || null,
    eventTime: timeWithZone?.slice(0, 8) || null,
  }
}

function normalizeReference(table: EventReferenceTable, row: EventReferenceRow): EventReference | null {
  const id = nullableString(row.id)
  if (!id) return null

  if (table === 'events_v2') {
    const startAt = nullableString(row.start_at)
    return {
      id,
      table,
      status: nullableString(row.status),
      ownerUserId: nullableString(row.created_by),
      isPublic: null,
      orgId: nullableString(row.org_id),
      venueId: nullableString(row.venue_id),
      ...eventScheduleFromStartAt(startAt),
    }
  }

  if (table === 'artist_events') {
    return {
      id,
      table,
      status: nullableString(row.status),
      ownerUserId: nullableString(row.user_id),
      isPublic: typeof row.is_public === 'boolean' ? row.is_public : null,
    }
  }

  return {
    id,
    table,
    status: nullableString(row.status),
    ownerUserId: nullableString(row.artist_id),
    isPublic: null,
  }
}

function isPublishedLikeStatus(reference: EventReference) {
  const status = reference.status?.trim().toLowerCase() || null

  if (reference.table === 'artist_events') {
    return reference.isPublic === true || status === 'published'
  }

  if (reference.table === 'events') return status === 'published'
  return status !== null && PUBLIC_EVENTS_V2_STATUSES.has(status)
}

export function canAccessEventAsViewer(reference: EventReference, userId?: string | null) {
  if (userId && reference.ownerUserId === userId) return true
  return isPublishedLikeStatus(reference)
}

/**
 * Resolves an unqualified UUID or slug using the canonical source order above.
 *
 * The caller's authenticated Supabase client remains the authorization boundary:
 * no service-role client is created here. Query errors, malformed rows, duplicate
 * rows, and identifiers visible in more than one source all fail closed.
 */
export async function resolveEventReference(
  supabase: SupabaseClient,
  eventIdOrSlug: string
): Promise<EventReference | null> {
  const identifier = eventIdOrSlug.trim()
  if (!identifier || identifier !== eventIdOrSlug) return null

  const kind = identifierKind(identifier)
  const column = kind === 'uuid' ? 'id' : 'slug'
  let resolved: EventReference | null = null

  for (const definition of LOOKUP_DEFINITIONS) {
    const { data, error } = await supabase
      .from(definition.table)
      .select(definition.select)
      .eq(column, identifier)
      .limit(2)

    if (error || !Array.isArray(data) || data.length > 1) return null
    if (data.length === 0) continue

    const candidate = normalizeReference(definition.table, data[0] as unknown as EventReferenceRow)
    if (!candidate || resolved) return null
    resolved = candidate
  }

  return resolved
}
