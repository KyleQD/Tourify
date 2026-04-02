import type { SupabaseClient } from '@supabase/supabase-js'

export interface EventReference {
  id: string
  table: 'artist_events' | 'events' | 'events_v2'
  status: string | null
  ownerUserId: string | null
  isPublic: boolean | null
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function isPublishedLikeStatus(reference: EventReference) {
  if (reference.table === 'artist_events') {
    if (reference.isPublic === true) return true
    return reference.status === 'published'
  }
  if (reference.table === 'events') return reference.status === 'published'
  return !['inquiry', 'hold', 'offer'].includes((reference.status || '').toLowerCase())
}

export function canAccessEventAsViewer(reference: EventReference, userId?: string | null) {
  if (userId && reference.ownerUserId === userId) return true
  return isPublishedLikeStatus(reference)
}

export async function resolveEventReference(
  supabase: SupabaseClient,
  eventIdOrSlug: string
): Promise<EventReference | null> {
  const isEventId = isUuid(eventIdOrSlug)

  if (isEventId) {
    const { data: artistEvent } = await supabase
      .from('artist_events')
      .select('id, status, user_id, is_public')
      .eq('id', eventIdOrSlug)
      .maybeSingle()

    if (artistEvent) {
      return {
        id: artistEvent.id,
        table: 'artist_events',
        status: artistEvent.status,
        ownerUserId: artistEvent.user_id,
        isPublic: artistEvent.is_public,
      }
    }

    const { data: eventV2 } = await supabase
      .from('events_v2')
      .select('id, status, created_by')
      .eq('id', eventIdOrSlug)
      .maybeSingle()

    if (eventV2) {
      return {
        id: eventV2.id,
        table: 'events_v2',
        status: eventV2.status,
        ownerUserId: eventV2.created_by,
        isPublic: null,
      }
    }

    const { data: eventLegacy } = await supabase
      .from('events')
      .select('id, status, artist_id')
      .eq('id', eventIdOrSlug)
      .maybeSingle()

    if (eventLegacy) {
      return {
        id: eventLegacy.id,
        table: 'events',
        status: eventLegacy.status,
        ownerUserId: eventLegacy.artist_id,
        isPublic: null,
      }
    }

    return null
  }

  const { data: artistEventBySlug } = await supabase
    .from('artist_events')
    .select('id, status, user_id, is_public')
    .eq('slug', eventIdOrSlug)
    .maybeSingle()

  if (artistEventBySlug) {
    return {
      id: artistEventBySlug.id,
      table: 'artist_events',
      status: artistEventBySlug.status,
      ownerUserId: artistEventBySlug.user_id,
      isPublic: artistEventBySlug.is_public,
    }
  }

  const { data: eventV2BySlug } = await supabase
    .from('events_v2')
    .select('id, status, created_by')
    .eq('slug', eventIdOrSlug)
    .maybeSingle()

  if (eventV2BySlug) {
    return {
      id: eventV2BySlug.id,
      table: 'events_v2',
      status: eventV2BySlug.status,
      ownerUserId: eventV2BySlug.created_by,
      isPublic: null,
    }
  }

  const { data: eventLegacyBySlug } = await supabase
    .from('events')
    .select('id, status, artist_id')
    .eq('slug', eventIdOrSlug)
    .maybeSingle()

  if (!eventLegacyBySlug) return null

  return {
    id: eventLegacyBySlug.id,
    table: 'events',
    status: eventLegacyBySlug.status,
    ownerUserId: eventLegacyBySlug.artist_id,
    isPublic: null,
  }
}
