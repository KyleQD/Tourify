import type { PublicArtistProductsDTO } from './public-artist-types'

/**
 * Band storefront mapping (ARTIST-006).
 *
 * Band pages aggregate marketplace listings server-side into
 * `PublicArtistProductsDTO` because the band catalog spans every accepted
 * member's `seller_user_id` — the marketplace discover API only expresses a
 * single seller. This mapper converts that DTO into the same listing shape the
 * storefront grid uses for single artists, so the existing product card,
 * category tabs, and checkout wiring can render member listings unchanged.
 *
 * The shape intentionally mirrors the public listing projection from
 * `lib/marketplace/public-listing-query.ts` (id/title/category/price/artwork/
 * featured_rank/variants) with no private marketplace fields.
 */

export interface BandStorefrontListing {
  id: string
  title: string
  description: string | null
  category: string
  product_type: string
  currency: string
  base_price: number | null
  cover_image_url: string | null
  featured_rank?: number | null
  marketplace_listing_variants?: Array<{ id: string; title: string; price: number }>
}

export function bandProductsToMarketplaceListings(
  products: PublicArtistProductsDTO
): BandStorefrontListing[] {
  return products.products.map(product => ({
    id: product.id,
    title: product.name,
    description: product.description,
    // The DTO only carries category/productType when the server populated the
    // band aggregation; fall back to a generic merch row defensively so the
    // grid always groups into a visible tab.
    category: product.category || 'merch',
    product_type: product.productType || 'physical',
    currency: product.currency || 'USD',
    base_price: product.price,
    cover_image_url: product.imageUrl,
    featured_rank:
      product.featuredRank != null
        ? product.featuredRank
        : product.isFeatured
          ? 0
          : null,
    marketplace_listing_variants:
      product.variants?.map(variant => ({
        id: variant.id,
        title: variant.title,
        price: variant.price,
      })) || [],
  }))
}