import { describe, expect, it } from 'vitest'
import {
  ARTIST_BOOKING_EVENT_PERMISSIONS,
  canDecideArtistBooking,
  canEditArtistBookingDetails,
  canRequesterAnswerInfoRequest,
  canUseArtistBookingChat,
  getInitialArtistBookingStatus,
  getArtistBookingParticipantRole,
  summarizeArtistBookingViews,
  shouldIncludeArtistBookingForView,
} from '@/lib/bookings/artist-booking-server'
import {
  bookingDeferredDetailsSchema,
  bookingStepOneSchema,
  createPublicArtistBookingRequestSchema,
} from '@/lib/public-artist/booking-request-schema'

const requester = {
  userId: '11111111-1111-4111-8111-111111111111',
  profileId: '22222222-2222-4222-8222-222222222222',
  accountType: 'venue' as const,
}

const artist = {
  userId: '33333333-3333-4333-8333-333333333333',
  profileId: '44444444-4444-4444-8444-444444444444',
  accountType: 'artist' as const,
}

const row = {
  requester_id: requester.userId,
  requester_profile_id: requester.profileId,
  requester_account_type: requester.accountType,
  artist_id: artist.userId,
  artist_profile_id: artist.profileId,
  recipient_account_type: artist.accountType,
}

describe('artist booking request validation', () => {
  it('accepts the public request essentials without advanced fields', () => {
    const draft = bookingStepOneSchema.parse({
      requestType: 'performance',
      performanceType: 'DJ set',
      description: 'We are planning a sunset set and would love to discuss availability.',
      location: 'Los Angeles, CA',
    })

    expect(draft.performanceType).toBe('DJ set')
    expect(createPublicArtistBookingRequestSchema.safeParse({
      artistId: artist.userId,
      artistProfileId: artist.profileId,
      requestType: draft.requestType,
      bookingDetails: {
        performanceType: draft.performanceType,
        description: draft.description,
        location: draft.location,
      },
    }).success).toBe(true)
  })

  it('still rejects an incomplete essential request', () => {
    expect(bookingStepOneSchema.safeParse({
      requestType: 'performance',
      performanceType: '',
      description: '',
      location: '',
    }).success).toBe(false)
  })

  it('validates deferred details independently after acceptance', () => {
    expect(bookingDeferredDetailsSchema.safeParse({
      description: 'Production scope',
      compensation: '$2,500',
      additionalNotes: '',
      email: 'requester@example.com',
      phone: '',
    }).success).toBe(true)
    expect(bookingDeferredDetailsSchema.safeParse({
      description: '', compensation: '', additionalNotes: '', email: 'not-an-email', phone: '',
    }).success).toBe(false)
  })
})

describe('artist booking account scope', () => {
  it('recognizes the exact requester and recipient account contexts', () => {
    expect(getArtistBookingParticipantRole(row, requester)).toBe('requester')
    expect(getArtistBookingParticipantRole(row, artist)).toBe('artist')
  })

  it('does not leak a request into another account owned by the same user', () => {
    expect(getArtistBookingParticipantRole(row, {
      ...requester,
      profileId: '55555555-5555-4555-8555-555555555555',
      accountType: 'general',
    })).toBeNull()
    expect(getArtistBookingParticipantRole(row, {
      ...artist,
      profileId: '66666666-6666-4666-8666-666666666666',
    })).toBeNull()
  })

  it('keeps legacy recipient rows visible only in an artist surface', () => {
    const legacy = { artist_id: artist.userId, artist_profile_id: null, requester_id: null }
    expect(getArtistBookingParticipantRole(legacy, artist)).toBe('artist')
    expect(getArtistBookingParticipantRole(legacy, { ...artist, accountType: 'general' })).toBeNull()
  })

  it('partitions pending, accepted, and historical requests into manager views', () => {
    expect(shouldIncludeArtistBookingForView('artist', 'pending', 'incoming')).toBe(true)
    expect(shouldIncludeArtistBookingForView('artist', 'needs_info', 'needs_info')).toBe(true)
    expect(shouldIncludeArtistBookingForView('requester', 'needs_info', 'needs_info')).toBe(true)
    expect(shouldIncludeArtistBookingForView('requester', 'pending', 'sent')).toBe(true)
    expect(shouldIncludeArtistBookingForView('requester', 'needs_info', 'sent')).toBe(false)
    expect(shouldIncludeArtistBookingForView('requester', 'rejected', 'sent')).toBe(false)
    expect(shouldIncludeArtistBookingForView('artist', 'accepted', 'active')).toBe(true)
    expect(shouldIncludeArtistBookingForView('requester', 'approved', 'active')).toBe(true)
    expect(shouldIncludeArtistBookingForView('requester', 'declined', 'history')).toBe(true)
    expect(shouldIncludeArtistBookingForView('artist', 'expired', 'history')).toBe(true)
    expect(shouldIncludeArtistBookingForView('requester', 'pending', 'history')).toBe(false)
  })

  it('summarizes role-scoped booking views without duplicating terminal sender requests', () => {
    expect(summarizeArtistBookingViews([
      { role: 'requester', status: 'pending' },
      { role: 'requester', status: 'needs_info' },
      { role: 'requester', status: 'accepted' },
      { role: 'requester', status: 'declined' },
      { role: 'artist', status: 'pending' },
    ])).toEqual({ incoming: 1, needs_info: 1, sent: 1, active: 1, history: 1 })
  })

  it('enforces lifecycle permissions for decisions, details, and chat', () => {
    expect(canDecideArtistBooking('artist', 'pending')).toBe(true)
    expect(canDecideArtistBooking('artist', 'needs_info')).toBe(true)
    expect(canDecideArtistBooking('requester', 'pending')).toBe(false)
    expect(canDecideArtistBooking('artist', 'accepted')).toBe(false)

    expect(canEditArtistBookingDetails('requester', 'accepted')).toBe(true)
    expect(canEditArtistBookingDetails('artist', 'accepted')).toBe(false)
    expect(canEditArtistBookingDetails('requester', 'pending')).toBe(false)

    expect(canUseArtistBookingChat('requester', 'accepted')).toBe(true)
    expect(canUseArtistBookingChat('artist', 'accepted')).toBe(true)
    expect(canUseArtistBookingChat('artist', 'pending')).toBe(true)
    expect(canUseArtistBookingChat('requester', 'needs_info')).toBe(true)
    expect(canUseArtistBookingChat('artist', 'declined')).toBe(false)

    expect(canRequesterAnswerInfoRequest('requester', 'needs_info')).toBe(true)
    expect(canRequesterAnswerInfoRequest('requester', 'pending')).toBe(false)
  })

  it('always creates public-profile requests as pending', () => {
    expect(getInitialArtistBookingStatus('accepted', true)).toBe('pending')
    expect(getInitialArtistBookingStatus('declined', true)).toBe('pending')
    expect(getInitialArtistBookingStatus('accepted', false)).toBe('accepted')
  })

  it('uses limited event collaborator permissions for accepted linked bookings', () => {
    expect(ARTIST_BOOKING_EVENT_PERMISSIONS).toEqual({
      promote: true,
      view_public_details: true,
      view_artist_activity: true,
      view_limited_insights: true,
      edit_event: false,
      assign_roles: false,
      manage_financials: false,
    })
  })
})
