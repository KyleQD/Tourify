import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { isPublicShareRoute } from '@/lib/routing/public-share-routes'
import {
  buildArtistPreviewMetadata,
  buildEpkPreviewMetadata,
  buildEventPreviewMetadata,
  buildJobPreviewMetadata,
  buildOrganizationPreviewMetadata,
  buildProfilePreviewMetadata,
  buildVenuePreviewMetadata,
} from '@/lib/seo/public-preview-metadata'
import { getMetadataBase, getSiteOrigin } from '@/lib/seo/site'

const root = process.cwd()

function read(path: string) {
  return readFileSync(join(root, path), 'utf8')
}

function ogImages(metadata: any) {
  return metadata.openGraph?.images || []
}

describe('public share route matcher', () => {
  it('allows exact public dynamic share pages', () => {
    expect(isPublicShareRoute('/events/summer-show')).toBe(true)
    expect(isPublicShareRoute('/artist/neon-pulse')).toBe(true)
    expect(isPublicShareRoute('/profile/kyle')).toBe(true)
    expect(isPublicShareRoute('/organization/indie-promoters')).toBe(true)
    expect(isPublicShareRoute('/epk/neon-pulse')).toBe(true)
    expect(isPublicShareRoute('/jobs/job-123')).toBe(true)
    expect(isPublicShareRoute('/venues/echo-lounge')).toBe(true)
    expect(isPublicShareRoute('/music/verify/origin/abc123')).toBe(true)
    expect(isPublicShareRoute('/music/verify/passport/abc123')).toBe(true)
    expect(isPublicShareRoute('/music/verify/certificate/abc123')).toBe(true)
    expect(isPublicShareRoute('/posts/11111111-1111-1111-1111-111111111111')).toBe(true)
  })

  it('keeps protected lookalikes gated', () => {
    expect(isPublicShareRoute('/artist/feed')).toBe(false)
    expect(isPublicShareRoute('/artist/events')).toBe(false)
    expect(isPublicShareRoute('/events/create')).toBe(false)
    expect(isPublicShareRoute('/events/summer-show/hq')).toBe(false)
    expect(isPublicShareRoute('/jobs/my-applications')).toBe(false)
    expect(isPublicShareRoute('/profile')).toBe(false)
  })
})

describe('public preview metadata builders', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('uses the unified tourify.live fallback origin', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '')

    expect(getSiteOrigin()).toBe('https://tourify.live')
    expect(getMetadataBase().toString()).toBe('https://tourify.live/')
    expect(read('app/layout.tsx')).not.toContain('https://demo.tourify.live')
    expect(read('app/blog/[slug]/page.tsx')).toContain("DEFAULT_SITE_ORIGIN = 'https://tourify.live'")
  })

  it('keeps global social image routes on the shared logo-only PNG generator', () => {
    const ogRoute = read('app/opengraph-image.tsx')
    const twitterRoute = read('app/twitter-image.tsx')
    const graphic = read('lib/og/tourify-link-preview-graphic.tsx')
    const rootLayout = read('app/layout.tsx')

    expect(ogRoute).toBe('export { default, size, contentType } from "@/lib/og/tourify-link-preview-graphic"\n')
    expect(twitterRoute).toBe('export { default, size, contentType } from "@/lib/og/tourify-link-preview-graphic"\n')
    expect(graphic).toContain('width: 1200')
    expect(graphic).toContain('height: 630')
    expect(graphic).toContain('export const contentType = "image/png"')
    expect(graphic).toContain('width: 920')
    expect(graphic).toContain('height: 409')
    expect(graphic).not.toContain('The all-in-one platform for the music industry.')
    expect(graphic).not.toContain('tourify.live')
    expect(graphic).not.toContain('Open the link to join the network')
    expect(graphic).not.toContain('Connect · Create · Tour')
    expect(rootLayout).toContain('url: "/opengraph-image"')
    expect(rootLayout).toContain('images: ["/twitter-image"]')
    expect(rootLayout).toContain('The all-in-one platform for the music industry.')
  })

  it('builds event metadata with a specific image', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://example.test')

    const metadata = buildEventPreviewMetadata({
      title: 'Summer Show',
      eventDate: '2026-08-15',
      venueName: 'The Room',
      path: '/events/summer-show',
      imageUrl: '/posters/summer.png',
    }) as any

    expect(metadata.title).toBe('Summer Show')
    expect(metadata.alternates.canonical).toBe('/events/summer-show')
    expect(metadata.description).toContain('August 15, 2026')
    expect(ogImages(metadata)[0].url).toBe('https://example.test/posters/summer.png')
  })

  it('falls back to the global OG image when an entity has no image', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://example.test')

    const metadata = buildArtistPreviewMetadata({
      artistName: 'Neon Pulse',
      genres: ['Synthpop'],
      path: '/artist/neon-pulse',
    }) as any

    expect(metadata.title).toBe('Neon Pulse')
    expect(metadata.description).toContain('Synthpop')
    expect(ogImages(metadata)[0].url).toBe('https://example.test/opengraph-image')
  })

  it('builds profile, organization, EPK, job, and venue metadata', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://example.test')

    const profile = buildProfilePreviewMetadata({
      displayName: 'Kyle',
      accountType: 'general',
      path: '/profile/kyle',
      imageUrl: 'https://cdn.example.test/kyle.jpg',
    }) as any
    const organization = buildOrganizationPreviewMetadata({
      name: 'Indie Promoters',
      subtypeLabel: 'Promoter',
      specialties: ['Booking'],
      path: '/organization/indie-promoters',
    }) as any
    const epk = buildEpkPreviewMetadata({
      artistName: 'Neon Pulse',
      genre: 'Synthpop',
      path: '/epk/neon-pulse',
    }) as any
    const job = buildJobPreviewMetadata({
      title: 'Front of House',
      employerName: 'The Room',
      location: 'Atlanta, GA',
      path: '/jobs/job-123',
    }) as any
    const venue = buildVenuePreviewMetadata({
      venueName: 'The Room',
      city: 'Atlanta',
      state: 'GA',
      path: '/venues/the-room',
      imageUrl: '/venues/the-room.jpg',
    }) as any

    expect(profile.title).toBe('Kyle on Tourify')
    expect(ogImages(profile)[0].url).toBe('https://cdn.example.test/kyle.jpg')
    expect(organization.description).toContain('Promoter')
    expect(epk.title).toBe('Neon Pulse EPK')
    expect(job.description).toContain('The Room')
    expect(venue.description).toContain('Atlanta, GA')
    expect(ogImages(venue)[0].url).toBe('https://example.test/venues/the-room.jpg')
  })
})
