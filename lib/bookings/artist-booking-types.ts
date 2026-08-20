import type { ProfileType } from '@/lib/accounts/account-types'

export type ArtistBookingStatus = 'pending' | 'needs_info' | 'accepted' | 'declined' | 'expired' | 'cancelled'
export type ArtistBookingView = 'incoming' | 'needs_info' | 'sent' | 'active' | 'history'
export type ArtistBookingAudience = 'artist' | 'requester'
export type ArtistBookingParticipantRole = 'requester' | 'artist'
export type ArtistBookingMessageType = 'message' | 'info_request' | 'info_response'

export type ArtistBookingSummary = Record<ArtistBookingView, number>

export interface ArtistBookingDetails {
  performanceType: string
  performanceDate: string
  venue: string
  location: string
  description: string
  compensation: string
  additionalNotes: string
  requirements?: string
  soundcheckTime?: string
  performanceTime?: string
  duration?: string
}

export interface ArtistBookingParty {
  userId: string | null
  profileId: string | null
  accountType: ProfileType | null
  displayName: string
  avatarUrl: string | null
}

export interface ArtistBookingRequest {
  id: string
  artist_id: string | null
  artist_profile_id: string | null
  recipient_account_type: string | null
  requester_id: string | null
  requester_profile_id: string | null
  requester_account_type: string | null
  booking_details: ArtistBookingDetails
  email: string | null
  phone: string | null
  status: ArtistBookingStatus
  request_type: string
  response_message: string | null
  created_at: string
  updated_at: string
  accepted_at: string | null
  declined_at: string | null
  details_updated_at: string | null
  event_id: string | null
  tour_id: string | null
  token?: string | null
  linked_event?: ArtistBookingLinkedEvent | null
  participant_role: ArtistBookingParticipantRole
  requester: ArtistBookingParty
  artist: ArtistBookingParty
}

export interface ArtistBookingLinkedEvent {
  id: string
  title: string
  slug: string | null
  status: string | null
  startAt: string | null
  collaboratorStatus: 'not_linked' | 'linked' | 'failed'
  permissions: ArtistBookingEventPermissions
}

export interface ArtistBookingEventPermissions {
  promote: boolean
  view_public_details: boolean
  view_artist_activity: boolean
  view_limited_insights: boolean
  edit_event: boolean
  assign_roles: boolean
  manage_financials: boolean
}

export interface ArtistBookingAttachableEvent {
  id: string
  title: string
  slug: string | null
  status: string | null
  startAt: string | null
}

export interface ArtistBookingMessage {
  id: string
  booking_request_id: string
  sender_id: string
  content: string
  message_type: ArtistBookingMessageType
  created_at: string
}
