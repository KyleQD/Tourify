import { describe, expect, it } from 'vitest'
import {
  canDecideArtistBooking,
  canEditArtistBookingDetails,
  canUseArtistBookingChat,
  getInitialArtistBookingStatus,
  getArtistBookingParticipantRole,
  shouldIncludeArtistBookingForView,
} from '@/lib/bookings/artist-booking-server'
import {
  bookingDeferredDetailsSchema,
  bookingStepOneSchema,
  createBookingRequestSchema,
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
  it('accepts only the five essential public request fields', () => {
    const draft = bookingStepOneSchema.parse({
      requestType: 'performance',
      performanceType: 'DJ set',
      venue: 'Tourify Hall',
      location: 'Los Angeles, CA',
      performanceDate: '2026-09-10',
    })

    expect(draft.performanceType).toBe('DJ set')
    expect(createBookingRequestSchema.safeParse({
      artistId: artist.userId,
      artistProfileId: artist.profileId,
      requestType: draft.requestType,
      bookingDetails: {
        performanceType: draft.performanceType,
        venue: draft.venue,
        location: draft.location,
        performanceDate: draft.performanceDate,
      },
    }).success).toBe(true)
  })

  it('still rejects an incomplete essential request', () => {
    expect(bookingStepOneSchema.safeParse({
      requestType: 'performance',
      performanceType: '',
      venue: '',
      location: '',
      performanceDate: '',
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
    expect(shouldIncludeArtistBookingForView('requester', 'pending', 'sent')).toBe(true)
    expect(shouldIncludeArtistBookingForView('requester', 'rejected', 'sent')).toBe(true)
    expect(shouldIncludeArtistBookingForView('artist', 'accepted', 'active')).toBe(true)
    expect(shouldIncludeArtistBookingForView('requester', 'approved', 'active')).toBe(true)
    expect(shouldIncludeArtistBookingForView('requester', 'declined', 'history')).toBe(true)
    expect(shouldIncludeArtistBookingForView('artist', 'expired', 'history')).toBe(true)
    expect(shouldIncludeArtistBookingForView('requester', 'pending', 'history')).toBe(false)
  })

  it('enforces lifecycle permissions for decisions, details, and chat', () => {
    expect(canDecideArtistBooking('artist', 'pending')).toBe(true)
    expect(canDecideArtistBooking('requester', 'pending')).toBe(false)
    expect(canDecideArtistBooking('artist', 'accepted')).toBe(false)

    expect(canEditArtistBookingDetails('requester', 'accepted')).toBe(true)
    expect(canEditArtistBookingDetails('artist', 'accepted')).toBe(false)
    expect(canEditArtistBookingDetails('requester', 'pending')).toBe(false)

    expect(canUseArtistBookingChat('requester', 'accepted')).toBe(true)
    expect(canUseArtistBookingChat('artist', 'accepted')).toBe(true)
    expect(canUseArtistBookingChat('artist', 'declined')).toBe(false)
  })

  it('always creates public-profile requests as pending', () => {
    expect(getInitialArtistBookingStatus('accepted', true)).toBe('pending')
    expect(getInitialArtistBookingStatus('declined', true)).toBe('pending')
    expect(getInitialArtistBookingStatus('accepted', false)).toBe('accepted')
  })
})
