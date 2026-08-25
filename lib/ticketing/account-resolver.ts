import type { TicketingOwnerType } from './permissions'

/**
 * VEN-148 — Typed ticketing owner account resolver (server mirror of
 * resolve_event_ticketing_owner_user_ids SQL). Resolves the acting account
 * recorded on event_ticketing_config to its authoritative human auth user ids.
 */

export interface ResolverClient {
  from: (table: string) => any
}

async function singleOr<T>(query: any): Promise<T | null> {
  const { data } = await query.limit(1).maybeSingle()
  return (data ?? null) as T | null
}

export async function resolveTicketingOwnerUserIds(
  supabase: ResolverClient,
  ownerType: TicketingOwnerType,
  ownerId: string,
  eventId?: string,
): Promise<string[]> {
  if (!ownerId) return []

  if (ownerType === 'user' || ownerType === 'admin') return [ownerId]

  if (ownerType === 'organization') {
    const org = await singleOr<{ created_by: string }>(
      supabase.from('organizations').select('created_by').eq('id', ownerId),
    )
    const memberResult = await supabase
      .from('org_members')
      .select('user_id')
      .eq('org_id', ownerId)
      .in('role', ['owner', 'admin'])
    // Tolerate both awaited ({data}) and raw builder shapes.
    const memberRows = Array.isArray((memberResult as any)?.data) ? (memberResult as any).data : []
    return Array.from(
      new Set([
        ...memberRows.map((m: any) => m.user_id),
        ...(org?.created_by ? [org.created_by] : []),
      ]),
    )
  }

  if (ownerType === 'artist') {
    const artist = await singleOr<{ user_id: string }>(
      supabase.from('artist_profiles').select('user_id').eq('id', ownerId),
    )
    if (artist?.user_id) return [artist.user_id]
    // Bare profile id anchor (profiles.id == auth users id).
    const profile = await singleOr<{ id: string }>(
      supabase.from('profiles').select('id').eq('id', ownerId),
    )
    return profile?.id ? [profile.id] : []
  }

  // venue — direct settings link first, then the canonical identity bridge.
  let venueProfileId: string | null = null
  if (eventId) {
    const event = await singleOr<{ settings: Record<string, unknown> | null; venue_id: string | null }>(
      supabase.from('events_v2').select('settings, venue_id').eq('id', eventId),
    )
    const linked = typeof event?.settings?.venue_profile_id === 'string' ? event.settings.venue_profile_id : null
    venueProfileId = linked || null
    if (!venueProfileId && event?.venue_id) {
      const bridge = await singleOr<{ venue_profile_id: string }>(
        supabase.from('venue_identity_bridges').select('venue_profile_id').eq('venues_v2_id', event.venue_id),
      )
      venueProfileId = bridge?.venue_profile_id || null
    }
  }

  if (!venueProfileId) {
    const direct = await singleOr<{ id: string }>(
      supabase.from('venue_profiles').select('id').eq('id', ownerId),
    )
    venueProfileId = direct?.id || null
  }
  if (!venueProfileId) return []

  const venueProfile = await singleOr<{ user_id: string; main_profile_id: string | null }>(
    supabase.from('venue_profiles').select('user_id, main_profile_id').eq('id', venueProfileId),
  )
  return Array.from(new Set([venueProfile?.user_id, venueProfile?.main_profile_id].filter(Boolean) as string[]))
}
