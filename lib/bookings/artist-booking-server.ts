import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import type { ActingContext } from '@/lib/auth/acting-context'
import { normalizeAccountType, type ProfileType } from '@/lib/accounts/account-types'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import type {
  ArtistBookingAttachableEvent,
  ArtistBookingSummary,
  ArtistBookingDetails,
  ArtistBookingEventPermissions,
  ArtistBookingParticipantRole,
  ArtistBookingParty,
  ArtistBookingRequest,
  ArtistBookingStatus,
  ArtistBookingView,
} from '@/lib/bookings/artist-booking-types'

type BookingRow = Record<string, any>

export const ARTIST_BOOKING_EVENT_PERMISSIONS: ArtistBookingEventPermissions = {
  promote: true,
  view_public_details: true,
  view_artist_activity: true,
  view_limited_insights: true,
  edit_event: false,
  assign_roles: false,
  manage_financials: false,
}

export function getArtistBookingService(): SupabaseClient {
  return createServiceRoleClient()
}

export function normalizeArtistBookingStatus(status: unknown): ArtistBookingStatus {
  if (status === 'approved') return 'accepted'
  if (status === 'rejected') return 'declined'
  if (status === 'needs_info' || status === 'accepted' || status === 'declined' || status === 'expired' || status === 'cancelled')
    return status
  return 'pending'
}

export function getInitialArtistBookingStatus(
  requestedStatus: unknown,
  isPublicProfileRequest: boolean,
): ArtistBookingStatus {
  return isPublicProfileRequest ? 'pending' : normalizeArtistBookingStatus(requestedStatus)
}

export function shouldIncludeArtistBookingForView(
  role: ArtistBookingParticipantRole,
  statusValue: unknown,
  view: ArtistBookingView,
): boolean {
  const status = normalizeArtistBookingStatus(statusValue)
  if (view === 'incoming') return role === 'artist' && status === 'pending'
  if (view === 'needs_info') return status === 'needs_info'
  if (view === 'sent') return role === 'requester' && status === 'pending'
  if (view === 'active') return status === 'accepted'
  return status === 'declined' || status === 'expired' || status === 'cancelled'
}

export function summarizeArtistBookingViews(
  rows: Array<{ role: ArtistBookingParticipantRole; status: unknown }>,
): ArtistBookingSummary {
  const summary: ArtistBookingSummary = {
    incoming: 0,
    needs_info: 0,
    sent: 0,
    active: 0,
    history: 0,
  }

  for (const row of rows) {
    for (const view of Object.keys(summary) as ArtistBookingView[]) {
      if (shouldIncludeArtistBookingForView(row.role, row.status, view)) summary[view] += 1
    }
  }

  return summary
}

export function canDecideArtistBooking(
  role: ArtistBookingParticipantRole,
  statusValue: unknown,
): boolean {
  return role === 'artist' && (statusValue === 'pending' || statusValue === 'needs_info')
}

export function canEditArtistBookingDetails(
  role: ArtistBookingParticipantRole,
  statusValue: unknown,
): boolean {
  return role === 'requester' && statusValue === 'accepted'
}

export function canUseArtistBookingChat(
  role: ArtistBookingParticipantRole,
  statusValue: unknown,
): boolean {
  const status = normalizeArtistBookingStatus(statusValue)
  return (role === 'requester' || role === 'artist')
    && (status === 'pending' || status === 'needs_info' || status === 'accepted')
}

export function canRequesterAnswerInfoRequest(
  role: ArtistBookingParticipantRole,
  statusValue: unknown,
): boolean {
  return role === 'requester' && normalizeArtistBookingStatus(statusValue) === 'needs_info'
}

export function normalizeArtistBookingDetails(value: unknown): ArtistBookingDetails {
  const details = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  return {
    performanceType: String(details.performanceType || 'General project'),
    performanceDate: String(details.performanceDate || ''),
    venue: String(details.venue || ''),
    location: String(details.location || ''),
    description: String(details.description || ''),
    compensation: String(details.compensation || ''),
    additionalNotes: String(details.additionalNotes || ''),
    requirements: details.requirements ? String(details.requirements) : undefined,
    soundcheckTime: details.soundcheckTime ? String(details.soundcheckTime) : undefined,
    performanceTime: details.performanceTime ? String(details.performanceTime) : undefined,
    duration: details.duration ? String(details.duration) : undefined,
  }
}

function accountTypeMatches(actual: unknown, expected: ProfileType): boolean {
  return normalizeAccountType(String(actual || 'general')) === normalizeAccountType(expected)
}

export function getArtistBookingParticipantRole(
  row: BookingRow,
  context: Pick<ActingContext, 'userId' | 'profileId' | 'accountType'>,
): ArtistBookingParticipantRole | null {
  const isArtistUser = row.artist_id === context.userId
  const isArtistScope = row.artist_profile_id
    ? row.artist_profile_id === context.profileId && ['artist', 'service'].includes(context.accountType)
    : ['artist', 'service'].includes(context.accountType)
  if (isArtistUser && isArtistScope) return 'artist'

  const isRequesterUser = row.requester_id === context.userId
  const isRequesterScope = row.requester_profile_id
    ? row.requester_profile_id === context.profileId
      && accountTypeMatches(row.requester_account_type, context.accountType)
    : context.accountType === 'general' && context.profileId === context.userId
  if (isRequesterUser && isRequesterScope) return 'requester'

  return null
}

export async function loadAuthorizedArtistBooking(
  context: Pick<ActingContext, 'userId' | 'profileId' | 'accountType'>,
  bookingId: string,
): Promise<{ row: BookingRow; role: ArtistBookingParticipantRole } | null> {
  const service = getArtistBookingService()
  const { data, error } = await service
    .from('booking_requests')
    .select('*')
    .eq('id', bookingId)
    .maybeSingle()

  if (error || !data) return null
  const role = getArtistBookingParticipantRole(data as BookingRow, context)
  return role ? { row: data as BookingRow, role } : null
}

async function loadPartyMaps(rows: BookingRow[]) {
  const service = getArtistBookingService()
  const userIds = Array.from(new Set(rows.flatMap((row) => [row.requester_id, row.artist_id]).filter(Boolean)))
  const artistProfileIds = Array.from(new Set(rows.map((row) => row.artist_profile_id).filter(Boolean)))
  const scopedProfileIds = Array.from(new Set(rows.map((row) => row.requester_profile_id).filter(Boolean)))
  const eventIds = Array.from(new Set(rows.map((row) => row.event_id).filter(Boolean)))

  const [{ data: profiles }, { data: artists }, { data: accounts }, { data: linkedEvents }] = await Promise.all([
    userIds.length
      ? service.from('profiles').select('id, full_name, username, avatar_url').in('id', userIds)
      : Promise.resolve({ data: [] }),
    artistProfileIds.length
      ? service.from('artist_profiles').select('id, artist_name, user_id').in('id', artistProfileIds)
      : Promise.resolve({ data: [] }),
    scopedProfileIds.length
      ? service.from('accounts').select('profile_id, account_type, display_name, avatar_url, owner_user_id').in('profile_id', scopedProfileIds)
      : Promise.resolve({ data: [] }),
    eventIds.length
      ? service.from('events_v2').select('id, title, slug, status, start_at').in('id', eventIds)
      : Promise.resolve({ data: [] }),
  ])

  return {
    profiles: new Map((profiles || []).map((profile: any) => [profile.id, profile])),
    artists: new Map((artists || []).map((artist: any) => [artist.id, artist])),
    accounts: new Map((accounts || []).map((account: any) => [
      `${account.profile_id}:${normalizeAccountType(account.account_type)}`,
      account,
    ])),
    linkedEvents: new Map((linkedEvents || []).map((event: any) => [event.id, event])),
  }
}

function partyFallback(userId: string | null, profileId: string | null, accountType: ProfileType | null): ArtistBookingParty {
  return {
    userId,
    profileId,
    accountType,
    displayName: 'Tourify member',
    avatarUrl: null,
  }
}

export async function serializeArtistBookings(
  rows: BookingRow[],
  context: Pick<ActingContext, 'userId' | 'profileId' | 'accountType'>,
): Promise<ArtistBookingRequest[]> {
  const maps = await loadPartyMaps(rows)

  return rows.flatMap((row) => {
    const role = getArtistBookingParticipantRole(row, context)
    if (!role) return []

    const requesterType = row.requester_account_type
      ? normalizeAccountType(row.requester_account_type)
      : null
    const requesterProfile = row.requester_id ? maps.profiles.get(row.requester_id) : null
    const requesterAccount = row.requester_profile_id && requesterType
      ? maps.accounts.get(`${row.requester_profile_id}:${requesterType}`)
      : null
    const requester = partyFallback(row.requester_id || null, row.requester_profile_id || null, requesterType)
    requester.displayName = requesterAccount?.display_name
      || requesterProfile?.full_name
      || requesterProfile?.username
      || requester.displayName
    requester.avatarUrl = requesterAccount?.avatar_url || requesterProfile?.avatar_url || null

    const artistType = normalizeAccountType(row.recipient_account_type || 'artist')
    const artistProfile = row.artist_profile_id ? maps.artists.get(row.artist_profile_id) : null
    const artistUserProfile = row.artist_id ? maps.profiles.get(row.artist_id) : null
    const artist = partyFallback(row.artist_id || null, row.artist_profile_id || null, artistType)
    artist.displayName = artistProfile?.artist_name
      || artistUserProfile?.full_name
      || artistUserProfile?.username
      || artist.displayName
    artist.avatarUrl = artistUserProfile?.avatar_url || null

    const linkedEvent = row.event_id ? maps.linkedEvents.get(row.event_id) : null

    return [{
      ...row,
      status: normalizeArtistBookingStatus(row.status),
      booking_details: normalizeArtistBookingDetails(row.booking_details),
      linked_event: linkedEvent ? {
        id: String(linkedEvent.id),
        title: String(linkedEvent.title || 'Linked event'),
        slug: linkedEvent.slug ? String(linkedEvent.slug) : null,
        status: linkedEvent.status ? String(linkedEvent.status) : null,
        startAt: linkedEvent.start_at ? String(linkedEvent.start_at) : null,
        collaboratorStatus: row.event_collaboration_status || (row.status === 'accepted' ? 'linked' : 'not_linked'),
        permissions: ARTIST_BOOKING_EVENT_PERMISSIONS,
      } : null,
      participant_role: role,
      requester,
      artist,
    } as ArtistBookingRequest]
  })
}

export async function serializeArtistBooking(
  row: BookingRow,
  context: Pick<ActingContext, 'userId' | 'profileId' | 'accountType'>,
): Promise<ArtistBookingRequest | null> {
  return (await serializeArtistBookings([row], context))[0] || null
}

export async function listArtistBookingAttachableEvents(
  context: Pick<ActingContext, 'userId' | 'supabase'>,
): Promise<ArtistBookingAttachableEvent[]> {
  const service = getArtistBookingService()
  const { data: memberships } = await context.supabase
    .from('org_members')
    .select('org_id')
    .eq('user_id', context.userId)

  const orgIds = Array.from(new Set((memberships || []).map((row: any) => row.org_id).filter(Boolean)))
  const [ownedResult, orgResult] = await Promise.all([
    service
      .from('events_v2')
      .select('id, title, slug, status, start_at, created_by, org_id')
      .eq('created_by', context.userId)
      .order('start_at', { ascending: true })
      .limit(50),
    orgIds.length
      ? service
          .from('events_v2')
          .select('id, title, slug, status, start_at, created_by, org_id')
          .in('org_id', orgIds)
          .order('start_at', { ascending: true })
          .limit(50)
      : Promise.resolve({ data: [] }),
  ])

  const byId = new Map<string, any>()
  for (const row of [...(ownedResult.data || []), ...(orgResult.data || [])]) {
    if (row?.id && !['cancelled', 'completed'].includes(String(row.status || '').toLowerCase())) {
      byId.set(String(row.id), row)
    }
  }

  return Array.from(byId.values()).map((event: any) => ({
    id: String(event.id),
    title: String(event.title || 'Untitled event'),
    slug: event.slug ? String(event.slug) : null,
    status: event.status ? String(event.status) : null,
    startAt: event.start_at ? String(event.start_at) : null,
  }))
}

export async function canAttachArtistBookingToEvent(
  context: Pick<ActingContext, 'userId' | 'supabase'>,
  eventId: string,
): Promise<boolean> {
  const service = getArtistBookingService()
  const { data: event } = await service
    .from('events_v2')
    .select('id, created_by, org_id')
    .eq('id', eventId)
    .maybeSingle()

  if (!event?.id) return false
  if (event.created_by === context.userId) return true

  if (event.org_id) {
    const { data: membership } = await context.supabase
      .from('org_members')
      .select('org_id')
      .eq('org_id', event.org_id)
      .eq('user_id', context.userId)
      .maybeSingle()
    if (membership?.org_id) return true
  }

  const { data: hasPermission } = await context.supabase.rpc('has_entity_permission', {
    p_user_id: context.userId,
    p_entity_type: 'Event',
    p_entity_id: eventId,
    p_permission_name: 'ASSIGN_EVENT_ROLES',
  })

  return Boolean(hasPermission)
}

export async function linkAcceptedArtistBookingToEvent(
  row: BookingRow,
  acceptedByUserId: string,
): Promise<'linked' | 'not_linked' | 'failed'> {
  if (!row.event_id || !row.artist_id || normalizeArtistBookingStatus(row.status) !== 'accepted')
    return 'not_linked'

  const service = getArtistBookingService()
  const { data: event } = await service
    .from('events_v2')
    .select('id')
    .eq('id', row.event_id)
    .maybeSingle()
  if (!event?.id) {
    await service
      .from('booking_requests')
      .update({ event_collaboration_status: 'failed', event_collaboration_updated_at: new Date().toISOString() })
      .eq('id', row.id)
    return 'failed'
  }

  const now = new Date().toISOString()
  const participantId = row.artist_profile_id || row.artist_id

  const participant = await service
    .from('event_participants')
    .upsert({
      event_id: row.event_id,
      participant_type: 'Artist',
      participant_id: participantId,
      role: 'artist',
      status: 'accepted',
      metadata: {
        booking_request_id: row.id,
        artist_user_id: row.artist_id,
        artist_profile_id: row.artist_profile_id || null,
      },
    }, { onConflict: 'event_id,participant_type,participant_id' })

  if (participant.error) {
    await service
      .from('booking_requests')
      .update({ event_collaboration_status: 'failed', event_collaboration_updated_at: now })
      .eq('id', row.id)
    return 'failed'
  }

  const collaboratorPayload = {
    event_id: row.event_id,
    event_table: 'events_v2',
    user_id: row.artist_id,
    invited_by: row.requester_id || acceptedByUserId,
    role: 'artist',
    permissions: ARTIST_BOOKING_EVENT_PERMISSIONS,
    status: 'accepted',
    updated_at: now,
  }

  const collaborator = await service
    .from('event_collaborators')
    .upsert(collaboratorPayload, { onConflict: 'event_id,user_id,event_table' })

  if (collaborator.error) {
    await service
      .from('booking_requests')
      .update({ event_collaboration_status: 'failed', event_collaboration_updated_at: now })
      .eq('id', row.id)
    return 'failed'
  }

  await service
    .from('booking_requests')
    .update({ event_collaboration_status: 'linked', event_collaboration_updated_at: now })
    .eq('id', row.id)

  return 'linked'
}
