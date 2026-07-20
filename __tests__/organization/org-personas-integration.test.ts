import { describe, expect, it } from 'vitest'
import {
  isOrganizationType,
  normalizeAccountType,
  ORGANIZATION_ACCOUNT_TYPE_ALIASES,
} from '@/lib/accounts/account-types'
import { OrganizerAccountSchema } from '@/lib/accounts/organization-account-schema'
import { profileIdsFromFollowedAccounts } from '@/lib/feed/feed-posts-query'
import { buildFeedPostsUrl } from '@/lib/feed/feed-client'
import {
  getArtistPublicProfilePath,
  getGeneralPublicProfilePath,
  getOrganizationPublicProfilePath,
  getVenuePublicProfilePath,
  resolvePublicProfilePath,
} from '@/lib/utils/public-profile-routes'

describe('organization dual-compat gates', () => {
  it('isOrganizationType accepts admin and organization', () => {
    expect(isOrganizationType('admin')).toBe(true)
    expect(isOrganizationType('organization')).toBe(true)
    expect(isOrganizationType('organizer')).toBe(true)
    expect(isOrganizationType('business')).toBe(true)
    expect(isOrganizationType('artist')).toBe(false)
    expect(isOrganizationType('general')).toBe(false)
  })

  it('normalizeAccountType maps legacy aliases for routing only', () => {
    expect(normalizeAccountType('admin')).toBe('organization')
    expect(normalizeAccountType('organizer')).toBe('organization')
    expect(normalizeAccountType('business')).toBe('organization')
    expect(normalizeAccountType('organization')).toBe('organization')
    expect(normalizeAccountType('artist')).toBe('artist')
  })

  it('keeps organization aliases list for DB filters', () => {
    expect(ORGANIZATION_ACCOUNT_TYPE_ALIASES).toEqual(
      expect.arrayContaining(['organization', 'admin', 'organizer', 'business'])
    )
  })
})

describe('organization account create schema', () => {
  it('accepts optional url_slug and subtype', () => {
    const parsed = OrganizerAccountSchema.parse({
      organization_name: 'Night Owl',
      organization_type: 'band',
      subtype: 'band',
      url_slug: 'night-owl',
    })
    expect(parsed.url_slug).toBe('night-owl')
    expect(parsed.subtype).toBe('band')
  })

  it('rejects invalid slug characters', () => {
    expect(() =>
      OrganizerAccountSchema.parse({
        organization_name: 'Night Owl',
        organization_type: 'band',
        url_slug: 'Night Owl!',
      })
    ).toThrow()
  })
})

describe('following feed account_follows expansion', () => {
  it('uses profile_id only and ignores owner_user_id', () => {
    expect(
      profileIdsFromFollowedAccounts([
        { profile_id: 'org-profile-1', owner_user_id: 'owner-user-leak' },
        { profile_id: 'artist-profile-2', owner_user_id: 'another-owner' },
        { profile_id: null, owner_user_id: 'should-not-appear' },
      ])
    ).toEqual(['org-profile-1', 'artist-profile-2'])
  })

  it('home feed urls are available for personalized artist home', () => {
    expect(buildFeedPostsUrl({ type: 'home', limit: 20 })).toContain('type=home')
  })
})

describe('public path helpers regression', () => {
  it('keeps general / artist / venue / organization routes distinct', () => {
    expect(getGeneralPublicProfilePath({ username: 'kyle' })).toBe('/profile/kyle')
    expect(getArtistPublicProfilePath('dj-nova')).toBe('/artist/dj-nova')
    expect(getVenuePublicProfilePath({ id: 'v1', url_slug: 'the-fillmore' })).toBe(
      '/venues/the-fillmore'
    )
    expect(getOrganizationPublicProfilePath('acme-label')).toBe('/organization/acme-label')
  })

  it('resolves search navigation for org and legacy admin types', () => {
    expect(
      resolvePublicProfilePath({
        id: '1',
        username: 'acme',
        account_type: 'organization',
      })
    ).toBe('/organization/acme')
    expect(
      resolvePublicProfilePath({
        id: '2',
        username: 'legacy-promoter',
        account_type: 'admin',
      })
    ).toBe('/organization/legacy-promoter')
    expect(
      resolvePublicProfilePath({
        id: '3',
        username: 'friend',
        account_type: 'general',
      })
    ).toBe('/profile/friend')
  })
})
