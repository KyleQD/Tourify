import { describe, expect, it } from 'vitest'
import {
  mergeSocialLinksForStorage,
  normalizeSocialLinksForStorage,
  validateSocialField,
} from '@/lib/artist/profile-social-validation'
import { buildPlatformAnalyticsFromIntegrations } from '@/lib/artist/build-platform-analytics-from-integrations'
import type { ArtistSocialIntegration } from '@/types/social-integrations.type'

describe('profile-social-validation', () => {
  it('normalizes the canonical social field set', () => {
    const normalized = normalizeSocialLinksForStorage({
      website: ' https://tourify.com ',
      instagram: '@artist',
      twitter: 'handle',
      youtube: 'https://youtube.com/@artist',
      tiktok: '@tiktoker',
      facebook: 'page',
      spotify: 'https://open.spotify.com/artist/1',
      apple_music: 'https://music.apple.com/us/artist/x',
      soundcloud: 'https://soundcloud.com/x',
    })

    expect(normalized.instagram).toBe('artist')
    expect(normalized.tiktok).toBe('tiktoker')
    expect(normalized.facebook).toBe('page')
    expect(normalized.website).toBe('https://tourify.com')
  })

  it('merges without dropping unrelated keys', () => {
    const merged = mergeSocialLinksForStorage(
      { bandcamp: 'https://bandcamp.com/x', instagram: 'old' },
      { instagram: '@new', tiktok: '@tk' }
    )
    expect(merged.bandcamp).toBe('https://bandcamp.com/x')
    expect(merged.instagram).toBe('new')
    expect(merged.tiktok).toBe('tk')
  })

  it('validates handle platforms', () => {
    expect(validateSocialField('tiktok', '@ok')).toBeNull()
    expect(validateSocialField('facebook', 'not a url!!!')).toBeTruthy()
  })
})

describe('buildPlatformAnalyticsFromIntegrations', () => {
  it('returns honest unsupported / needs_oauth states instead of fake zeros as synced', () => {
    const integrations: ArtistSocialIntegration[] = [
      {
        id: '1',
        user_id: 'u1',
        platform: 'instagram',
        account_handle: 'artist',
        access_token: 'token',
        refresh_token: null,
        token_expires_at: null,
        is_connected: true,
        last_sync: new Date().toISOString(),
        analytics: { status: 'synced', followers: 1200, engagement: 4.5 },
        created_at: '',
        updated_at: '',
      },
      {
        id: '2',
        user_id: 'u1',
        platform: 'youtube',
        account_handle: 'channel',
        access_token: 'token',
        refresh_token: null,
        token_expires_at: null,
        is_connected: true,
        last_sync: null,
        analytics: { status: 'unsupported' },
        created_at: '',
        updated_at: '',
      },
    ]

    const platforms = buildPlatformAnalyticsFromIntegrations(integrations)
    expect(platforms.instagram.status).toBe('synced')
    expect(platforms.instagram.followers).toBe(1200)
    expect(platforms.youtube.status).toBe('unsupported')
    expect(platforms.spotify.status).toBe('unsupported')
  })
})
