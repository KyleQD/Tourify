import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { generateUniqueSlug, slugifyName } from '@/lib/accounts/generate-unique-slug'
import { getArtistPublicProfilePath } from '@/lib/utils/public-profile-routes'
import { resolveAccountAuthorSnapshot } from '@/lib/accounts/acting-account-snapshot'

const root = process.cwd()

function read(path: string) {
  return readFileSync(join(root, path), 'utf8')
}

describe('slugifyName', () => {
  it('kebab-cases display names', () => {
    expect(slugifyName('Neon Pulse')).toBe('neon-pulse')
    expect(slugifyName('  Stage Name!! ')).toBe('stage-name')
  })

  it('uses fallback when empty', () => {
    expect(slugifyName('', 'artist-abc')).toBe('artist-abc')
    expect(slugifyName(null, 'artist-xyz')).toBe('artist-xyz')
  })
})

describe('generateUniqueSlug', () => {
  it('returns base slug when unused', async () => {
    const client = {
      from: () => ({
        select: () => ({
          eq: () => ({
            limit: async () => ({ data: [], error: null }),
          }),
        }),
      }),
    }

    const slug = await generateUniqueSlug({
      client,
      table: 'artist_profiles',
      base: 'Neon Pulse',
      fallbackPrefix: 'artist-1',
    })

    expect(slug).toBe('neon-pulse')
  })

  it('suffixes on collision', async () => {
    const taken = new Set(['neon-pulse', 'neon-pulse-1'])
    const client = {
      from: () => ({
        select: () => ({
          eq: (_col: string, value: string) => ({
            limit: async () => ({
              data: taken.has(value) ? [{ id: 'x' }] : [],
              error: null,
            }),
          }),
        }),
      }),
    }

    const slug = await generateUniqueSlug({
      client,
      table: 'artist_profiles',
      base: 'Neon Pulse',
      fallbackPrefix: 'artist-1',
    })

    expect(slug).toBe('neon-pulse-2')
  })
})

describe('artist url_slug create + resolve contracts', () => {
  it('createArtistAccount inserts url_slug via shared helper', () => {
    const source = read('lib/services/account-management.service.ts')

    expect(source).toContain("from '@/lib/accounts/generate-unique-slug'")
    expect(source).toContain("table: 'artist_profiles'")
    expect(source).toContain('url_slug: urlSlug')
    expect(source).toContain("table: 'venue_profiles'")
  })

  it('onboarding and legacy artists POST set url_slug', () => {
    const onboarding = read('app/api/onboarding/create-account/route.ts')
    const artists = read('app/api/artists/route.ts')

    expect(onboarding).toContain('generateUniqueSlug')
    expect(onboarding).toContain('url_slug: urlSlug')
    expect(artists).toContain('generateUniqueSlug')
    expect(artists).toContain('url_slug: urlSlug')
    expect(artists).not.toContain('Generate username from display name')
  })

  it('resolves public artist profiles by url_slug first', () => {
    const source = read('lib/public-artist/get-public-artist-profile.ts')

    expect(source).toContain("eq('url_slug', username)")
    expect(source.indexOf("eq('url_slug', username)")).toBeLessThan(
      source.indexOf("eq('username', username)")
    )
    expect(source).toContain("ilike('artist_name', username)")
  })

  it('prefers url_slug in search and dashboard links', () => {
    const search = read('app/api/search/enhanced/route.ts')
    const dashboard = read('components/dashboard/artist-page-client.tsx')
    const profilePage = read('app/artist/profile/page.tsx')
    const enhanced = read('components/profile/enhanced-public-profile-view.tsx')

    expect(search).toContain('artist.url_slug')
    expect(dashboard).toContain('profile?.url_slug || profile?.artist_name')
    expect(profilePage).toContain('profile?.url_slug')
    expect(enhanced).toContain('profile.profile_data?.url_slug')
  })

  it('builds artist public paths from slug handles', () => {
    expect(getArtistPublicProfilePath('neon-pulse')).toBe('/artist/neon-pulse')
  })

  it('author snapshot prefers artist url_slug over slugified name', async () => {
    const rows: Record<string, Record<string, any>> = {
      'artist-1': {
        id: 'artist-1',
        artist_name: 'Neon Pulse',
        url_slug: 'neon-pulse',
      },
    }

    const supabase = {
      from: (table: string) => ({
        select: () => ({
          eq: (column: string, value: string) => ({
            maybeSingle: async () => ({
              data: column === 'id' ? rows[value] ?? null : null,
              error: null,
            }),
          }),
        }),
      }),
    }

    const author = await resolveAccountAuthorSnapshot({
      supabase,
      accountType: 'artist',
      profileId: 'artist-1',
      userId: 'user-1',
    })

    expect(author.username).toBe('neon-pulse')
    expect(author.name).toBe('Neon Pulse')
  })
})

describe('migration presence', () => {
  it('ships artist_profiles.url_slug migration with backfill', () => {
    const migration = read('supabase/migrations/20260711013130_artist_profiles_url_slug.sql')

    expect(migration).toContain('ADD COLUMN IF NOT EXISTS url_slug TEXT')
    expect(migration).toContain('idx_artist_profiles_url_slug')
    expect(migration).toContain('profile_username')
  })
})
