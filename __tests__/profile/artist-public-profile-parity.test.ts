import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  getAccountAuthorPath,
  getAccountAuthor,
} from '@/lib/accounts/account-author'
import {
  getArtistPublicProfilePath,
  resolvePublicProfilePath,
} from '@/lib/utils/public-profile-routes'

const root = process.cwd()

function read(path: string) {
  return readFileSync(join(root, path), 'utf8')
}

describe('artist public profile routing', () => {
  it('resolves artist and service personas to /artist paths', () => {
    expect(
      resolvePublicProfilePath({
        id: 'artist-1',
        username: 'neon-pulse',
        account_type: 'artist',
      })
    ).toBe('/artist/neon-pulse')

    expect(
      resolvePublicProfilePath({
        id: 'service-1',
        username: 'dj-nova',
        account_type: 'service',
      })
    ).toBe('/artist/dj-nova')

    expect(getArtistPublicProfilePath('neon-pulse')).toBe('/artist/neon-pulse')
  })

  it('keeps general profiles on /profile', () => {
    expect(
      resolvePublicProfilePath({
        id: 'user-1',
        username: 'kyle',
        account_type: 'general',
      })
    ).toBe('/profile/kyle')
  })

  it('routes feed authors by posted_as_type', () => {
    const artistAuthor = getAccountAuthor({
      posted_as_profile_id: 'artist-profile-1',
      posted_as_type: 'artist',
      account_display_name: 'Neon Pulse',
      account_username: 'neon-pulse',
    })

    expect(getAccountAuthorPath(artistAuthor)).toBe('/artist/neon-pulse')

    const generalAuthor = getAccountAuthor({
      posted_as_profile_id: 'user-1',
      posted_as_type: 'general',
      account_display_name: 'Kyle',
      account_username: 'kyle',
    })

    expect(getAccountAuthorPath(generalAuthor)).toBe('/profile/kyle')
  })

  it('uses canonical resolvers in search and feed entry points', () => {
    const accountSearch = read('components/search/account-search.tsx')
    const enhancedSearch = read('components/search/enhanced-account-search.tsx')
    const postCard = read('components/feed/post-card.tsx')
    const discoverUsers = read('app/discover/users/page.tsx')

    expect(accountSearch).toContain('resolvePublicProfilePath')
    expect(enhancedSearch).toContain('resolvePublicProfilePath')
    expect(postCard).toContain('getAccountAuthorPath')
    expect(discoverUsers).toContain('resolvePublicProfilePath')
  })

  it('links discover music cards by username/handle instead of raw UUID only', () => {
    const discoverPage = read('app/discover/page.tsx')
    const discoverApi = read('app/api/discover/route.ts')

    expect(discoverApi).toContain('artist_username: item.author?.username || null')
    expect(discoverPage).toContain('getArtistPublicProfilePath')
    expect(discoverPage).toContain('track.artist_username || track.artist_name')
  })
})

describe('artist public profile social + visibility contracts', () => {
  it('wires follow and message on the public artist hero', () => {
    const hero = read('components/public-artist/hero/public-artist-hero.tsx')
    const page = read('components/public-artist/public-artist-page.tsx')

    expect(hero).toContain('/api/social/follow-request')
    expect(hero).not.toContain('disabled className={`${paBtnRound} px-5`}')
    expect(hero).toContain('Message')
    expect(page).toContain('MessageModal')
    expect(page).toContain('onMessage={() => setShowMessageModal(true)}')
  })

  it('auto-accepts follows when artist settings allow it', () => {
    const source = read('app/api/social/follow-request/route.ts')

    expect(source).toContain('auto_accept_follows')
    expect(source).toContain("action: 'follow_created'")
    expect(source).toContain('Now following this artist')
  })

  it('excludes private artists from enhanced search', () => {
    const source = read('app/api/search/enhanced/route.ts')

    expect(source).toContain('public_profile !== false')
    expect(source).toContain('publicArtistProfiles')
  })

  it('creates artist_profiles during artist onboarding signup', () => {
    const source = read('app/api/onboarding/create-account/route.ts')

    expect(source).toContain("resolvedAccountType === 'artist'")
    expect(source).toContain("from('artist_profiles')")
    expect(source).toContain('public_profile: true')
    expect(source).toContain('auto_accept_follows: true')
    expect(source).toContain('url_slug: urlSlug')
  })

  it('hides empty posts on public artist page without setup CTAs', () => {
    const source = read('components/public-artist/posts/public-artist-posts-section.tsx')

    expect(source).toContain('if (ordered.length === 0) return null')
    expect(source).not.toContain('href="/artist/feed"')
    expect(source).not.toContain('href="/dashboard"')
    expect(source).not.toContain('Create a post')
  })

  it('cross-links personal profile to canonical artist page without mock shows', () => {
    const source = read('components/profile/enhanced-public-profile-view.tsx')

    expect(source).toContain('View Artist Page')
    expect(source).toContain('getArtistPublicProfilePath')
    expect(source).not.toContain('Midnight Dreams')
    expect(source).not.toContain('The Grand Hall')
  })
})
