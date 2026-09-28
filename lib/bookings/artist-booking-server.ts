import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import type { ActingContext } from '@/lib/auth/acting-context'
import { normalizeAccountType, type ProfileType } from '@/lib/accounts/account-types'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import type {
  ArtistBookingDetails,
  ArtistBookingParticipantRole,
  ArtistBookingParty,
  ArtistBookingRequest,
  ArtistBookingStatus,
  ArtistBookingView,
} from '@/lib/bookings/artist-booking-types'

type BookingRow = Record<string, any>

export function getArtistBookingService(): SupabaseClient {
  return createServiceRoleClient()
}

export function normalizeArtistBookingStatus(status: unknown): ArtistBookingStatus {
  if (status === 'approved') return 'accepted'
  if (status === 'rejected') return 'declined'
  if (status === 'accepted' || status === 'declined' || status === 'expired' || status === 'cancelled')
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
  if (view === 'sent') return role === 'requester' && status !== 'accepted'
  if (view === 'active') return status === 'accepted'
  return status === 'declined' || status === 'expired' || status === 'cancelled'
}

export function canDecideArtistBooking(
  role: ArtistBookingParticipantRole,
  statusValue: unknown,
): boolean {
  return role === 'artist' && statusValue === 'pending'
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
  return (role === 'requester' || role === 'artist')
    && statusValue === 'accepted'
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

  const [{ data: profiles }, { data: artists }, { data: accounts }] = await Promise.all([
    userIds.length
      ? service.from('profiles').select('id, full_name, username, avatar_url').in('id', userIds)
      : Promise.resolve({ data: [] }),
    artistProfileIds.length
      ? service.from('artist_profiles').select('id, artist_name, user_id').in('id', artistProfileIds)
      : Promise.resolve({ data: [] }),
    scopedProfileIds.length
      ? service.from('accounts').select('profile_id, account_type, display_name, avatar_url, owner_user_id').in('profile_id', scopedProfileIds)
      : Promise.resolve({ data: [] }),
  ])

  return {
    profiles: new Map((profiles || []).map((profile: any) => [profile.id, profile])),
    artists: new Map((artists || []).map((artist: any) => [artist.id, artist])),
    accounts: new Map((accounts || []).map((account: any) => [
      `${account.profile_id}:${normalizeAccountType(account.account_type)}`,
      account,
    ])),
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

    return [{
      ...row,
      status: normalizeArtistBookingStatus(row.status),
      booking_details: normalizeArtistBookingDetails(row.booking_details),
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
