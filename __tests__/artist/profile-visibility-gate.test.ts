import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import {
  isArtistProfileHidden,
  isArtistProfilePublic,
  privacySettingsToPublicProfileFlag,
  resolveArtistProfileVisibility,
  type ArtistPrivacySetting,
} from '@/lib/artist/profile-visibility'

const root = process.cwd()

function read(path: string) {
  return readFileSync(join(root, path), 'utf8')
}

describe('ARTIST-005 profile visibility mapping contract', () => {
  it('maps the visibility selector to the canonical public_profile boolean', () => {
    expect(privacySettingsToPublicProfileFlag('public')).toBe(true)
    expect(privacySettingsToPublicProfileFlag('verified')).toBe(true)
    expect(privacySettingsToPublicProfileFlag('private')).toBe(false)
    // Missing/empty selector keeps the default public visibility.
    expect(privacySettingsToPublicProfileFlag(undefined)).toBe(true)
    expect(privacySettingsToPublicProfileFlag(null)).toBe(true)
    expect(privacySettingsToPublicProfileFlag('')).toBe(true)
  })

  it('treats a missing public_profile flag as public (read gate parity)', () => {
    expect(isArtistProfileHidden(undefined)).toBe(false)
    expect(isArtistProfileHidden(null)).toBe(false)
    expect(isArtistProfileHidden({})).toBe(false)
    expect(isArtistProfileHidden({ public_profile: true })).toBe(false)
    expect(isArtistProfileHidden({ public_profile: false })).toBe(true)
    expect(isArtistProfileHidden({ public_profile: 'false' })).toBe(false)
    expect(isArtistProfilePublic({})).toBe(true)
    expect(isArtistProfilePublic({ public_profile: false })).toBe(false)
  })

  it('round-trips every selector value through save → load', () => {
    const values: ArtistPrivacySetting[] = ['public', 'verified', 'private']
    for (const selector of values) {
      const savedSettings = {
        public_profile: privacySettingsToPublicProfileFlag(selector),
        preferences: { privacy_settings: selector },
      }
      expect(resolveArtistProfileVisibility(savedSettings)).toBe(selector)
    }
  })

  it('resolves the selector for the settings UI from canonical + legacy state', () => {
    expect(resolveArtistProfileVisibility(undefined)).toBe('public')
    expect(resolveArtistProfileVisibility({})).toBe('public')
    expect(resolveArtistProfileVisibility({ public_profile: false })).toBe('private')
    expect(
      resolveArtistProfileVisibility({
        public_profile: true,
        preferences: { privacy_settings: 'verified' },
      })
    ).toBe('verified')
    expect(
      resolveArtistProfileVisibility({
        public_profile: true,
        preferences: { privacy_settings: 'private' },
      })
    ).toBe('private')
    // Canonical hidden flag wins over a stale legacy string.
    expect(
      resolveArtistProfileVisibility({
        public_profile: false,
        preferences: { privacy_settings: 'public' },
      })
    ).toBe('private')
  })
})

describe('ARTIST-005 visibility selector wiring (source contracts)', () => {
  it('writes settings.public_profile from the selector in updateDetailedProfile', () => {
    const context = read('contexts/artist-context.tsx')
    expect(context).toContain('privacySettingsToPublicProfileFlag')
    expect(context).toContain('public_profile: privacySettingsToPublicProfileFlag')
  })

  it('loads the selector value from the canonical flag in the artist profile page', () => {
    const page = read('app/artist/profile/page.tsx')
    expect(page).toContain('resolveArtistProfileVisibility')
    expect(page).toContain('privacy_settings: resolveArtistProfileVisibility(settings)')
  })

  it('gates the public artist-name API route at the data boundary', () => {
    const route = read('app/api/artist/[artistName]/route.ts')
    expect(route).toContain('isArtistProfileHidden')
    expect(route).toContain('isOwner')
    expect(route).toContain("'Artist profile not found'")
    expect(route).toContain('{ status: 404 }')
  })
})

describe('ARTIST-005 public read and discovery gates (source contracts)', () => {
  it('denies non-owners in getPublicArtistProfileDTO when public_profile is false', () => {
    const source = read('lib/public-artist/get-public-artist-profile.ts')
    expect(source).toContain('const isPublicProfile = artistSettings.public_profile !== false')
    expect(source).toContain('if (!isPublicProfile && !isOwner) return null')
    expect(source).toContain('isOwner')
  })

  it('shows the owner-only private preview banner on the public page', () => {
    const page = read('components/public-artist/public-artist-page.tsx')
    expect(page).toContain('dto.viewer.isOwner && !dto.viewer.isPublicProfile')
    expect(page).toContain('Only you can see this profile')
  })

  it('excludes hidden artists from enhanced search projection', () => {
    const route = read('app/api/search/enhanced/route.ts')
    expect(route).toContain('settings.public_profile !== false')
  })

  it('excludes hidden artists from account search projection', () => {
    const service = read('lib/search/global-search-service.ts')
    expect(service).toContain('row.settings.public_profile !== false')
  })

  it('keeps artist visibility defaults public at profile creation', () => {
    const onboarding = read('app/api/onboarding/create-account/route.ts')
    expect(onboarding).toContain('public_profile: true')
  })
})