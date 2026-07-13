import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()

function read(path: string) {
  return readFileSync(join(root, path), 'utf8')
}

describe('public artist preview-as-public empty states', () => {
  it('hides empty Events for everyone and keeps Hire gated to non-owners', () => {
    const source = read('components/public-artist/events/public-artist-events-section.tsx')

    expect(source).toContain('viewer: PublicArtistViewerDTO')
    expect(source).toContain('if (isEmpty) return null')
    expect(source).not.toContain('Add your first event')
    expect(source).toContain('!viewer.isOwner ? (')
    expect(source).toContain('Hire This')
    expect(source).toContain('onBookThisArtist')
  })

  it('hides empty music and posts for everyone and keeps owner pins', () => {
    const music = read('components/public-artist/music/public-artist-music-section.tsx')
    const posts = read('components/public-artist/posts/public-artist-posts-section.tsx')

    expect(music).toContain('if (tracks.length === 0) return null')
    expect(music).not.toContain('Upload first sample')
    expect(music).not.toContain('showUploadEmptyState')
    expect(music).toContain('viewer.isOwner ? (')
    expect(music).toContain('togglePin')

    expect(posts).toContain('if (ordered.length === 0) return null')
    expect(posts).not.toContain('Create a post')
    expect(posts).toContain('viewer.isOwner ? (')
    expect(posts).toContain('togglePin')
  })

  it('hides empty storefront/EPK/media/about for everyone on the public page', () => {
    const page = read('components/public-artist/public-artist-page.tsx')
    const epk = read('components/public-artist/epk/public-artist-epk-section.tsx')

    expect(page).toContain('const showStorefront = !hasLoadedStorefront || marketplaceListings.length > 0')
    expect(page).not.toContain('Add your first item')
    expect(page).not.toContain('Add to storefront')
    expect(page).toContain('about.bio ? (')
    expect(page).toContain('media.items.length > 0 ? (')
    expect(page).toContain('creator.serviceOfferings.length > 0 && (')
    expect(page).not.toContain('(about.bio || dto.viewer.isOwner)')
    expect(page).not.toContain('(media.items.length > 0 || dto.viewer.isOwner)')
    expect(epk).toContain('if (!epk.epk) return null')
    expect(epk).not.toContain('No public EPK yet.')
  })

  it('shows owner preview bar and hero Edit Profile; hides Follow/Message/Hire for owner', () => {
    const page = read('components/public-artist/public-artist-page.tsx')
    const hero = read('components/public-artist/hero/public-artist-hero.tsx')
    const events = read('components/public-artist/events/public-artist-events-section.tsx')

    expect(page).toContain('You’re viewing your public profile')
    expect(page).toContain('This profile is private — visitors cannot see it')
    expect(page).toContain('href="/artist/profile"')
    expect(page).toContain('href="/artist"')
    expect(page).toContain('hasMusic={hasMusic}')

    expect(hero).toContain('Edit Profile')
    expect(hero).toContain('hasMusic')
    expect(hero).not.toContain('Viewing as owner')
    expect(hero).toContain('Hire / Book')
    expect(hero).toContain('viewer.isOwner ? (')
    expect(events).toContain('!viewer.isOwner ? (')
  })

  it('passes viewer and isPublicProfile through the public artist DTO path', () => {
    const page = read('components/public-artist/public-artist-page.tsx')
    const types = read('lib/public-artist/public-artist-types.ts')
    const loader = read('lib/public-artist/get-public-artist-profile.ts')

    expect(page).toContain('<PublicArtistEventsSection')
    expect(page).toContain('viewer={dto.viewer}')
    expect(page).toContain('<PublicArtistEPKSection hero={hero} stats={stats} epk={epk} viewer={dto.viewer} />')
    expect(types).toContain('isPublicProfile: boolean')
    expect(loader).toContain('isPublicProfile')
  })
})
