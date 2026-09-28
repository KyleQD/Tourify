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
    expect(music).toContain('const isPinned = t.isPinned')

    expect(posts).toContain('if (feedPosts.length === 0) return null')
    expect(posts).not.toContain('Create a post')
    expect(posts).toContain('canPin={viewer.isOwner}')
    expect(posts).toContain('handlePin')
  })

  it('hides empty storefront/EPK/media/about for everyone on the public page', () => {
    const page = read('components/public-artist/public-artist-page.tsx')
    const epk = read('components/public-artist/epk/public-artist-epk-section.tsx')

    // Bands render the storefront only when the server-aggregated member catalog
    // has listings; single artists additionally keep the loading state so the
    // section renders while fetching. Pinned as two branches rather than one
    // line so re-wrapping the ternary does not read as a contract change.
    //
    // This replaced `!isBand && (...)`, which made the storefront unreachable
    // for bands outright: a band with a fully populated catalog rendered no
    // storefront at all. The empty-storesfront contract this test exists to
    // hold still holds, and is asserted below on the render guard rather than
    // on the shape of the condition.
    expect(page).toContain('const showStorefront = isBand')
    expect(page).toContain('? marketplaceListings.length > 0')
    expect(page).toContain(': !hasLoadedStorefront || marketplaceListings.length > 0')
    expect(page).toContain('showStorefront && isSectionVisible("storefront")')
    expect(page).not.toContain('Add your first item')
    expect(page).not.toContain('Add to storefront')
    expect(page).toContain('about.bio && isSectionVisible("about")')
    expect(page).toContain('media.items.length > 0 && isSectionVisible("gallery")')
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

    expect(page).toContain('Only you can see this profile')
    expect(page).toContain('Publish it when it is ready for visitors')
    expect(page).toContain('href="/artist/profile"')
    expect(page).toContain('hasMusic={hasMusic}')

    expect(hero).toContain('"Edit profile"')
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
