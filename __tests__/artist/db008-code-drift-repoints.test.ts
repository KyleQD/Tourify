import { describe, expect, it } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

import {
  epkMediaItemsFromRows,
  epkPhotoItemToMediaItem,
  readEpkPhotoItems,
} from '@/lib/public-artist/artist-epk-media'
import { derivePublicArtistStats } from '@/lib/public-artist/artist-stats'
import { buildArtistStats, sumTrackLikes, sumTrackPlays } from '@/lib/artist/artist-stats'
import { toMarketplaceListingInsert } from '@/lib/artist/artist-content'

const root = process.cwd()

function read(path: string) {
  return existsSync(join(root, path)) ? readFileSync(join(root, path), 'utf8') : ''
}

/** Quote-agnostic `.from('<relation>')` probe. */
function readsRelation(source: string, relation: string) {
  return new RegExp(`\\.from\\(\\s*['\"]${relation}['\"]\\s*\\)`).test(source)
}

/**
 * DB-008 code-drift cluster "artist" — Wave 34.
 *
 * Guards the repoints away from relations the active migration chain never
 * creates (`artist_photos`, `artist_videos`, `artist_merchandise`, `event_staff`,
 * `event_crew_assignments`, `get_enhanced_artist_stats`) and the column repoints
 * on `events` / `booking_requests` / `venues` / `logistics_tasks` /
 * `artist_financial_transactions` / `ticket_sales`.
 */
const RETIRED_RELATIONS = [
  'artist_photos',
  'artist_videos',
  'artist_merchandise',
  'artist_works',
  'event_staff',
  'event_crew_assignments',
]

const OWNED_SOURCES = [
  'lib/public-artist/get-public-artist-profile.ts',
  'contexts/artist-context.tsx',
  'app/artist/business/analytics/page.tsx',
  'app/artist/events/[id]/page.tsx',
  'app/artist/events/actions/manage-staff.ts',
  'app/artist/events/actions/update-event.ts',
  'app/artist/events/actions.ts',
]

describe('DB-008 canonical artist media (EPK document)', () => {
  it('reads photoItems out of the artist_epk_settings document', () => {
    const items = readEpkPhotoItems({
      id: 'epk-1',
      settings: { photoItems: [{ id: 'p1', url: 'https://cdn/1.jpg' }] },
    })
    expect(items).toHaveLength(1)
  })

  it('returns an empty list for a missing or malformed settings document', () => {
    expect(readEpkPhotoItems({})).toEqual([])
    expect(readEpkPhotoItems({ settings: null })).toEqual([])
    expect(readEpkPhotoItems({ settings: { photoItems: 'nope' } })).toEqual([])
    expect(readEpkPhotoItems({ settings: [] })).toEqual([])
  })

  it('maps one EPK item to the public media DTO', () => {
    expect(
      epkPhotoItemToMediaItem({ id: 'p1', url: ' https://cdn/1.jpg ', caption: 'Live', isHero: true }, 'fb')
    ).toEqual({
      id: 'p1',
      kind: 'photo',
      url: 'https://cdn/1.jpg',
      thumbnailUrl: null,
      caption: 'Live',
      isHero: true,
    })
  })

  it('drops items without a url and falls back to a stable id', () => {
    expect(epkPhotoItemToMediaItem({ url: '' }, 'fb')).toBeNull()
    expect(epkPhotoItemToMediaItem({ url: 'https://cdn/2.jpg' }, 'fb')?.id).toBe('fb')
  })

  it('puts the hero item first, de-duplicates, and honors the limit', () => {
    const items = epkMediaItemsFromRows(
      [
        { id: 'epk-1', settings: { photoItems: [{ id: 'a', url: 'https://cdn/a.jpg' }, { id: 'b', url: 'https://cdn/b.jpg', isHero: true }] } },
        { id: 'epk-2', settings: { photoItems: [{ id: 'a', url: 'https://cdn/a.jpg' }, { id: 'c', url: 'https://cdn/c.jpg' }] } },
      ],
      { limit: 2 }
    )
    expect(items.map(item => item.id)).toEqual(['b', 'a'])
  })

  it('keeps a missing gallery a coherent empty list', () => {
    expect(epkMediaItemsFromRows([])).toEqual([])
    expect(epkMediaItemsFromRows(null)).toEqual([])
  })
})

describe('DB-008 derived public artist stats', () => {
  it('derives track, play, event and revenue totals from canonical rows', () => {
    const stats = derivePublicArtistStats({
      followerCount: 10,
      tracks: [{ playCount: 5, likesCount: 2 }, { playCount: 7, likesCount: 1 }],
      events: [{ revenue: 100 }, { revenue: 50 }],
    })
    expect(stats).toMatchObject({
      followersCount: 10,
      totalTracks: 2,
      totalPlays: 12,
      totalStreams: 12,
      totalEvents: 2,
      totalRevenue: 150,
      engagementRate: 30,
    })
  })

  it('never reports a negative or non-finite count', () => {
    const stats = derivePublicArtistStats({
      followerCount: Number.NaN,
      tracks: [{ playCount: -5 }],
      events: [{ revenue: 'x' as unknown as number }],
    })
    expect(stats.followersCount).toBe(0)
    expect(stats.totalPlays).toBe(0)
    expect(stats.totalRevenue).toBe(0)
    expect(stats.engagementRate).toBe(0)
  })

  it('caps engagement at 100', () => {
    const stats = derivePublicArtistStats({
      followerCount: 1,
      tracks: [{ playCount: 0, likesCount: 500 }],
    })
    expect(stats.engagementRate).toBe(100)
  })
})

describe('DB-008 canonical artist dashboard stats', () => {
  it('sums plays and likes out of the artist_music stats document', () => {
    const tracks = [{ stats: { plays: 3, likes: 2 } }, { stats: null }, { stats: { plays: '4' } }]
    expect(sumTrackPlays(tracks)).toBe(7)
    expect(sumTrackLikes(tracks)).toBe(2)
  })

  it('maps canonical counts onto the dashboard stat shape', () => {
    const stats = buildArtistStats({
      followerCount: 200,
      tracks: [{ stats: { plays: 10, likes: 20 } }],
      events: 3,
      blogCount: 2,
      photoCount: 5,
      merchandiseCount: 1,
      collaborationCount: 4,
      revenue: 900,
      postCount: 6,
    })
    expect(stats).toMatchObject({
      totalFans: 200,
      totalTracks: 1,
      musicCount: 1,
      totalPlays: 10,
      totalStreams: 10,
      totalEvents: 3,
      eventCount: 3,
      blogCount: 2,
      photoCount: 5,
      merchandiseCount: 1,
      totalCollaborations: 4,
      totalRevenue: 900,
      totalViews: 6,
      // DB-008: no in-chain artist video relation exists.
      videoCount: 0,
    })
    expect(stats.engagementRate).toBe(10)
  })

  it('produces a zeroed stat set for no sources', () => {
    const stats = buildArtistStats({})
    expect(stats.totalTracks).toBe(0)
    expect(stats.totalFans).toBe(0)
    expect(stats.engagementRate).toBe(0)
  })
})

describe('DB-008 canonical merchandise write path', () => {
  it('maps a legacy artist_merchandise payload onto marketplace_listings', () => {
    const insert = toMarketplaceListingInsert(
      {
        name: 'Tour Tee',
        description: 'Band tee',
        type: 'merch',
        price: '25',
        currency: 'USD',
        inventory_count: 12,
        images: ['https://cdn/tee.jpg', 'https://cdn/tee2.jpg'],
        is_featured: true,
      },
      'user-1'
    )
    expect(insert).toMatchObject({
      seller_user_id: 'user-1',
      title: 'Tour Tee',
      category: 'merch',
      product_type: 'physical_merch',
      status: 'draft',
      currency: 'USD',
      base_price: 25,
      cover_image_url: 'https://cdn/tee.jpg',
      inventory_count: 12,
      featured_rank: 1,
      metadata: { sourceTable: 'artist_merchandise' },
    })
    expect(insert.media_urls).toHaveLength(2)
  })

  it('treats a music product as a digital asset and defaults a title and currency', () => {
    const insert = toMarketplaceListingInsert({ type: 'music' }, 'user-2')
    expect(insert.category).toBe('music')
    expect(insert.product_type).toBe('digital_asset')
    expect(insert.title).toBe('Untitled Product')
    expect(insert.currency).toBe('USD')
    expect(insert.base_price).toBe(0)
  })
})

describe('DB-008 artist-owned sources no longer read retired relations', () => {
  it.each(OWNED_SOURCES)('%s has no retired relation literal', path => {
    const source = read(path)
    expect(source.length).toBeGreaterThan(0)
    for (const relation of RETIRED_RELATIONS) {
      expect(readsRelation(source, relation)).toBe(false)
    }
  })

  it.each(OWNED_SOURCES)('%s has no get_enhanced_artist_stats call', path => {
    expect(read(path)).not.toContain("rpc('get_enhanced_artist_stats'")
  })
})

describe('DB-008 canonical replacements are used at the data boundary', () => {
  it('public profile media comes from the EPK document, not artist_photos/artist_videos', () => {
    const source = read('lib/public-artist/get-public-artist-profile.ts')
    expect(source).toContain('epkMediaItemsFromRows')
    expect(readsRelation(source, 'artist_epk_settings')).toBe(true)
    expect(source).toContain('derivePublicArtistStats')
    // Band aggregation must not select columns the chain does not create.
    expect(source).not.toContain('listing_kind')
    expect(source).not.toContain('public_slug')
    expect(source).not.toContain('service_mode')
  })

  it('artist dashboard stats come from in-chain relations', () => {
    const source = read('contexts/artist-context.tsx')
    expect(source).toContain('buildArtistStats')
    expect(readsRelation(source, 'marketplace_listings')).toBe(true)
    expect(readsRelation(source, 'collaboration_projects')).toBe(true)
    expect(readsRelation(source, 'profiles')).toBe(true)
    expect(source).toContain('readEpkPhotoItems')
  })

  it('business analytics reads the canonical marketplace surface for merch', () => {
    const source = read('app/artist/business/analytics/page.tsx')
    expect(readsRelation(source, 'marketplace_listings')).toBe(true)
    expect(source).toContain('.eq(\'seller_user_id\', user.id)')
    expect(source).toContain('item.base_price')
  })

  it('event crew is staff_members linked through event_participants', () => {
    const actions = read('app/artist/events/actions/manage-staff.ts')
    const page = read('app/artist/events/[id]/page.tsx')
    for (const source of [actions, page]) {
      expect(readsRelation(source, 'event_participants')).toBe(true)
      expect(readsRelation(source, 'staff_members')).toBe(true)
    }
    expect(actions).toContain('assertEventScope')
  })

  it('event logistics, expenses, venues and booking requests use canonical columns', () => {
    const page = read('app/artist/events/[id]/page.tsx')
    expect(readsRelation(page, 'logistics_tasks')).toBe(true)
    expect(page).toContain("task.status === 'completed'")
    expect(readsRelation(page, 'artist_financial_transactions')).toBe(true)
    expect(page).toContain('occurred_at')
    expect(readsRelation(page, 'venue_profiles')).toBe(true)
    expect(page).toContain('row.venue_name')
    expect(readsRelation(page, 'venues')).toBe(false)
    expect(page).not.toContain('request.venue_id')
    expect(page).not.toContain('booking_status')
  })

  it('event wizard writes the canonical events columns', () => {
    const update = read('app/artist/events/actions/update-event.ts')
    const actions = read('app/artist/events/actions.ts')
    for (const source of [update, actions]) {
      expect(source).toContain('poster_url')
      expect(source).not.toMatch(/cover_image_url:\s*coverImageUrl/)
      expect(source).not.toMatch(/^\s*start_date:/m)
      expect(source).not.toMatch(/^\s*base_price:/m)
    }
    expect(update).toContain('start_at: eventData.startDate')
    expect(update).toContain('venue_name: eventData.venue')
    expect(update).toContain('ticket_price_min: eventData.price')
    expect(update).toContain('event_type: eventData.category')
  })
})
