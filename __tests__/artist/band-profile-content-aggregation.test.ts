import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import {
  bandProductsToMarketplaceListings,
} from '@/lib/public-artist/band-storefront'
import type {
  PublicArtistProductDTO,
  PublicArtistProductsDTO,
} from '@/lib/public-artist/public-artist-types'

const root = process.cwd()

function read(path: string) {
  return readFileSync(join(root, path), 'utf8')
}

function product(overrides: Partial<PublicArtistProductDTO> = {}): PublicArtistProductDTO {
  return {
    id: 'listing-1',
    name: 'Tour Tee',
    description: 'Band tee',
    type: 'physical',
    price: 25,
    currency: 'USD',
    inventoryCount: null,
    imageUrl: 'https://cdn.example/sku.jpg',
    isFeatured: false,
    status: 'published',
    ...overrides,
  }
}

describe('ARTIST-006 band storefront mapper (bandProductsToMarketplaceListings)', () => {
  it('maps aggregated band products into the storefront listing shape', () => {
    const products: PublicArtistProductsDTO = {
      featuredProducts: [],
      products: [
        product({
          category: 'merch',
          productType: 'physical',
          featuredRank: 2,
          variants: [
            { id: 'v1', title: 'S', price: 25, inventoryCount: 4 },
            { id: 'v2', title: 'M', price: 25, inventoryCount: 0 },
          ],
        }),
      ],
    }

    const listings = bandProductsToMarketplaceListings(products)
    expect(listings).toHaveLength(1)
    expect(listings[0]).toMatchObject({
      id: 'listing-1',
      title: 'Tour Tee',
      description: 'Band tee',
      category: 'merch',
      product_type: 'physical',
      currency: 'USD',
      base_price: 25,
      cover_image_url: 'https://cdn.example/sku.jpg',
      featured_rank: 2,
    })
    expect(listings[0].marketplace_listing_variants).toEqual([
      { id: 'v1', title: 'S', price: 25 },
      { id: 'v2', title: 'M', price: 25 },
    ])
  })

  it('falls back to a generic merch row when listing fields are absent', () => {
    const listings = bandProductsToMarketplaceListings({
      featuredProducts: [],
      products: [product()],
    })
    expect(listings[0]).toMatchObject({
      category: 'merch',
      product_type: 'physical',
      currency: 'USD',
      featured_rank: null,
    })
    expect(listings[0].marketplace_listing_variants).toEqual([])
  })

  it('derives featured_rank from isFeatured when the rank column is absent', () => {
    const listings = bandProductsToMarketplaceListings({
      featuredProducts: [],
      products: [product({ isFeatured: true })],
    })
    expect(listings[0].featured_rank).toBe(0)
  })

  it('keeps zero products a coherent empty list', () => {
    expect(bandProductsToMarketplaceListings({ featuredProducts: [], products: [] })).toEqual([])
  })
})

describe('ARTIST-006 band DTO aggregation (source contracts)', () => {
  it('loads artist public-artist content aggregation', () => {
    const source = read('lib/public-artist/get-public-artist-profile.ts')
    expect(source).toContain("from('organization_artist_members')")
    expect(source).toContain("select('artist_profiles(id, user_id, settings)')")
    expect(source).toContain("eq('status', 'accepted')")
    expect(source).toContain('isArtistProfilePublic(settings)')
  })

  it('aggregates member music with the single-artist public filter', () => {
    const source = read('lib/public-artist/get-public-artist-profile.ts')
    expect(source).toContain("from('artist_music')")
    expect(source).toContain("in('user_id', contentMemberUserIds)")
    expect(source).toContain("eq('is_public', true)")
    expect(source).toContain("eq('is_visible', true)")
    expect(source).toContain("eq('moderation_status', 'approved')")
    expect(source).toContain("eq('rights_confirmed', true)")
    expect(source).toContain('.limit(20)')
  })

  it('aggregates member storefront listings with the public listing filter', () => {
    const source = read('lib/public-artist/get-public-artist-profile.ts')
    expect(source).toContain("from('marketplace_listings')")
    expect(source).toContain("in('seller_user_id', contentMemberUserIds)")
    expect(source).toContain("eq('status', 'published')")
    expect(source).toContain("eq('moderation_status', 'approved')")
  })

  it('no longer hardcodes empty band tracks, media, or products', () => {
    const source = read('lib/public-artist/get-public-artist-profile.ts')
    expect(source).toContain('featuredTrack: bandFeaturedTrack')
    expect(source).toContain('tracks: bandTracks')
    expect(source).toContain('items: bandMediaItems')
    expect(source).toContain('featuredProducts: bandFeaturedProducts')
    expect(source).toContain('products: bandProducts')
  })

  it('keeps hidden members out of the band content aggregation (ARTIST-005 parity)', () => {
    const source = read('lib/public-artist/get-public-artist-profile.ts')
    expect(source).toContain('profile.settings')
    expect(source).toContain("isArtistProfilePublic(settings)")
  })
})

describe('ARTIST-006 band public page storefront wiring (source contracts)', () => {
  it('seeds the band storefront grid from the server-aggregated DTO products', () => {
    const page = read('components/public-artist/public-artist-page.tsx')
    expect(page).toContain('bandProductsToMarketplaceListings')
    expect(page).toContain('isBand ? bandProductsToMarketplaceListings(dto.products) : []')
    expect(page).toContain('useState<MarketplaceListing[]>(bandStorefrontListings)')
  })

  it('loads the band storefront banner config instead of skipping the store', () => {
    const page = read('components/public-artist/public-artist-page.tsx')
    expect(page).toContain('void loadStorefrontLinks()')
    expect(page).toContain('setHasLoadedStorefront(true)')
  })

  it('renders the band storefront when aggregated listings exist and hides it when empty', () => {
    const page = read('components/public-artist/public-artist-page.tsx')
    expect(page).toContain('isBand\n    ? marketplaceListings.length > 0')
    expect(page).not.toContain('const showStorefront = !isBand &&')
  })

  it('extends the product DTO with storefront listing attributes for the band aggregation', () => {
    const types = read('lib/public-artist/public-artist-types.ts')
    expect(types).toContain('category?: string | null')
    expect(types).toContain('productType?: string | null')
    expect(types).toContain('featuredRank?: number | null')
    expect(types).toContain('variants?: Array<{')
  })
})