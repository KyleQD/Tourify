import type { ResolverClient } from './account-resolver'

/**
 * VEN-149 — Resolves the canonical Venue account bound to an event so venue
 * authority (entity RBAC / staff permissions) can map onto event ticketing
 * capabilities without duplicating grant semantics.
 */
export async function resolveEventVenueProfileId(
  supabase: ResolverClient,
  eventId: string,
): Promise<string | null> {
  const { data: event } = await supabase
    .from('events_v2')
    .select('settings, venue_id')
    .eq('id', eventId)
    .maybeSingle()
  if (!event) return null

  const linked = typeof event.settings?.venue_profile_id === 'string' ? event.settings.venue_profile_id : null
  if (linked) return linked

  if (!event.venue_id) return null
  const { data: bridge } = await supabase
    .from('venue_identity_bridges')
    .select('venue_profile_id')
    .eq('venues_v2_id', event.venue_id)
    .maybeSingle()
  return bridge?.venue_profile_id || null
}
