/**
 * Feed commerce attachment helpers — server-only.
 *
 * Resolves marketplace_post_attachments into a public-safe projection
 * that feed card renderers can use to show the current listing/storefront
 * state and the correct CTA.
 *
 * Design contract (from plan §P5):
 * - Card data comes from the CURRENT listing record, not a snapshot at share time.
 * - If a listing is unavailable (paused/suspended/archived/sold_out), the card
 *   reflects that state — the post is NOT deleted.
 * - CTAs are derived from listing_kind + service_mode, never hard-coded strings.
 * - Reshare attribution (original_seller_user_id) is read from the attachment
 *   and cannot be overwritten by a resharer.
 */

import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { isMarketplaceEnabled, isFeedCommerceEnabled } from '@/lib/marketplace/feature-flags'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FeedAttachmentCta =
  | 'buy_now'
  | 'request_booking'
  | 'request_quote'
  | 'book_now'
  | 'get_tickets'
  | 'view_on_provider'
  | 'view_marketplace'

export interface FeedListingAttachment {
  type: 'listing'
  attachmentId: string
  postId: string
  /** Current listing state — null if listing was deleted */
  listing: {
    id: string
    title: string
    description: string | null
    category: string
    listingKind: string
    serviceMode: string | null
    publicSlug: string | null
    currency: string
    basePrice: number | null
    coverImageUrl: string | null
    status: string
    moderation_status: string
  } | null
  /** Availability state derived from listing */
  available: boolean
  cta: FeedAttachmentCta
  /** True when listing is external — CTA routes to the redirect endpoint */
  isExternal: boolean
  /** Provider name/domain for external listings */
  providerName: string | null
  /** Opaque redirect href — only set for external listings */
  redirectHref: string | null
  /** Original seller — preserved through reshares */
  originalSellerUserId: string
  /** Original storefront slug for attribution link */
  originalStorefrontSlug: string | null
}

export interface FeedStorefrontAttachment {
  type: 'storefront'
  attachmentId: string
  postId: string
  storefront: {
    id: string
    slug: string | null
    displayName: string
    tagline: string | null
    isActive: boolean
    sellerUserId: string
    sellerType: string | null
  } | null
  available: boolean
  cta: 'view_marketplace'
  originalSellerUserId: string
}

export type FeedMarketplaceAttachment = FeedListingAttachment | FeedStorefrontAttachment

// ---------------------------------------------------------------------------
// CTA resolution
// ---------------------------------------------------------------------------

function resolveCta(
  listingKind: string,
  serviceMode: string | null,
  category: string
): FeedAttachmentCta {
  if (listingKind === 'external') return 'view_on_provider'
  if (category === 'tickets' || category === 'ticket') return 'get_tickets'
  if (listingKind === 'service') {
    if (serviceMode === 'booking_request') return 'request_booking'
    if (serviceMode === 'quote_request') return 'request_quote'
    return 'book_now'
  }
  return 'buy_now'
}

// ---------------------------------------------------------------------------
// Single attachment resolver (used by feed card renderer)
// ---------------------------------------------------------------------------

export async function resolveFeedAttachment(
  postId: string
): Promise<FeedMarketplaceAttachment | null> {
  if (!isMarketplaceEnabled() || !isFeedCommerceEnabled()) return null

  const supabase = await createClient()

  const { data: attachment } = await supabase
    .from('marketplace_post_attachments')
    .select(`
      id,
      post_id,
      listing_id,
      store_id,
      original_seller_user_id,
      original_store_id
    `)
    .eq('post_id', postId)
    .maybeSingle()

  if (!attachment) return null

  // Listing attachment
  if (attachment.listing_id) {
    const { data: listing } = await supabase
      .from('marketplace_listings')
      .select(`
        id, title, description, category, listing_kind, service_mode,
        public_slug, currency, base_price, cover_image_url, status, moderation_status
      `)
      .eq('id', attachment.listing_id)
      .maybeSingle()

    // Resolve original storefront slug for attribution link
    let originalStorefrontSlug: string | null = null
    if (attachment.original_store_id) {
      const { data: sf } = await supabase
        .from('marketplace_storefronts')
        .select('slug')
        .eq('id', attachment.original_store_id)
        .maybeSingle()
      originalStorefrontSlug = sf?.slug ?? null
    }

    // Resolve external provider name if applicable
    let providerName: string | null = null
    if (listing?.listing_kind === 'external') {
      const { data: ext } = await supabase
        .from('marketplace_external_listings')
        .select('provider_name, safety_status')
        .eq('listing_id', listing.id)
        .maybeSingle()
      if (ext?.safety_status === 'approved') providerName = ext.provider_name ?? null
    }

    const available = !!listing && listing.status === 'published' && listing.moderation_status === 'approved'
    const cta = listing
      ? resolveCta(listing.listing_kind, listing.service_mode, listing.category)
      : 'buy_now'

    return {
      type: 'listing',
      attachmentId: attachment.id,
      postId: attachment.post_id,
      listing: listing
        ? {
            id: listing.id,
            title: listing.title,
            description: listing.description,
            category: listing.category,
            listingKind: listing.listing_kind,
            serviceMode: listing.service_mode,
            publicSlug: listing.public_slug,
            currency: listing.currency,
            basePrice: listing.base_price,
            coverImageUrl: listing.cover_image_url,
            status: listing.status,
            moderation_status: listing.moderation_status,
          }
        : null,
      available,
      cta,
      isExternal: listing?.listing_kind === 'external',
      providerName,
      redirectHref: listing?.listing_kind === 'external'
        ? `/api/marketplace/listings/${listing.id}/redirect?from=feed`
        : null,
      originalSellerUserId: attachment.original_seller_user_id,
      originalStorefrontSlug,
    }
  }

  // Storefront attachment
  if (attachment.store_id) {
    const { data: storefront } = await supabase
      .from('marketplace_storefronts')
      .select('id, slug, display_name, tagline, is_active, seller_user_id, seller_type')
      .eq('id', attachment.store_id)
      .maybeSingle()

    return {
      type: 'storefront',
      attachmentId: attachment.id,
      postId: attachment.post_id,
      storefront: storefront
        ? {
            id: storefront.id,
            slug: storefront.slug,
            displayName: storefront.display_name,
            tagline: storefront.tagline,
            isActive: storefront.is_active,
            sellerUserId: storefront.seller_user_id,
            sellerType: storefront.seller_type,
          }
        : null,
      available: !!storefront?.is_active,
      cta: 'view_marketplace',
      originalSellerUserId: attachment.original_seller_user_id,
    }
  }

  return null
}

// ---------------------------------------------------------------------------
// Batch resolver — used when rendering a feed page
// ---------------------------------------------------------------------------

export async function resolveFeedAttachmentsBatch(
  postIds: string[]
): Promise<Record<string, FeedMarketplaceAttachment>> {
  if (!isMarketplaceEnabled() || !isFeedCommerceEnabled()) return {}
  if (postIds.length === 0) return {}

  const supabase = await createClient()

  const { data: attachments } = await supabase
    .from('marketplace_post_attachments')
    .select(`
      id, post_id, listing_id, store_id,
      original_seller_user_id, original_store_id
    `)
    .in('post_id', postIds)

  if (!attachments?.length) return {}

  // Batch-fetch all listing IDs in one query
  const listingIds = attachments.map((a: any) => a.listing_id).filter(Boolean) as string[]
  const storeIds = attachments.map((a: any) => a.store_id).filter(Boolean) as string[]
  const originalStoreIds = attachments.map((a: any) => a.original_store_id).filter(Boolean) as string[]

  const [listingRows, storefrontRows, originalStoreRows, externalRows] = await Promise.all([
    listingIds.length
      ? supabase
          .from('marketplace_listings')
          .select('id, title, description, category, listing_kind, service_mode, public_slug, currency, base_price, cover_image_url, status, moderation_status')
          .in('id', listingIds)
          .then((r: any) => r.data ?? [])
      : [],
    storeIds.length
      ? supabase
          .from('marketplace_storefronts')
          .select('id, slug, display_name, tagline, is_active, seller_user_id, seller_type')
          .in('id', storeIds)
          .then((r: any) => r.data ?? [])
      : [],
    originalStoreIds.length
      ? supabase
          .from('marketplace_storefronts')
          .select('id, slug')
          .in('id', originalStoreIds)
          .then((r: any) => r.data ?? [])
      : [],
    listingIds.length
      ? supabase
          .from('marketplace_external_listings')
          .select('listing_id, provider_name, safety_status')
          .in('listing_id', listingIds)
          .then((r: any) => r.data ?? [])
      : [],
  ])

  const listingMap = new Map((listingRows as any[]).map((l: any) => [l.id, l]))
  const storefrontMap = new Map((storefrontRows as any[]).map((s: any) => [s.id, s]))
  const originalStoreMap = new Map((originalStoreRows as any[]).map((s: any) => [s.id, s]))
  const externalMap = new Map((externalRows as any[]).map((e: any) => [e.listing_id, e]))

  const result: Record<string, FeedMarketplaceAttachment> = {}

  for (const att of attachments as any[]) {
    if (att.listing_id) {
      const listing = listingMap.get(att.listing_id) ?? null
      const ext = att.listing_id ? externalMap.get(att.listing_id) ?? null : null
      const originalSf = att.original_store_id ? originalStoreMap.get(att.original_store_id) : null
      const available = !!listing && listing.status === 'published' && listing.moderation_status === 'approved'
      const cta = listing ? resolveCta(listing.listing_kind, listing.service_mode, listing.category) : 'buy_now'

      result[att.post_id] = {
        type: 'listing',
        attachmentId: att.id,
        postId: att.post_id,
        listing: listing
          ? {
              id: listing.id,
              title: listing.title,
              description: listing.description,
              category: listing.category,
              listingKind: listing.listing_kind,
              serviceMode: listing.service_mode,
              publicSlug: listing.public_slug,
              currency: listing.currency,
              basePrice: listing.base_price,
              coverImageUrl: listing.cover_image_url,
              status: listing.status,
              moderation_status: listing.moderation_status,
            }
          : null,
        available,
        cta,
        isExternal: listing?.listing_kind === 'external',
        providerName: ext?.safety_status === 'approved' ? ext?.provider_name ?? null : null,
        redirectHref: listing?.listing_kind === 'external'
          ? `/api/marketplace/listings/${listing.id}/redirect?from=feed`
          : null,
        originalSellerUserId: att.original_seller_user_id,
        originalStorefrontSlug: originalSf?.slug ?? null,
      }
    } else if (att.store_id) {
      const storefront = storefrontMap.get(att.store_id) ?? null
      result[att.post_id] = {
        type: 'storefront',
        attachmentId: att.id,
        postId: att.post_id,
        storefront: storefront
          ? {
              id: storefront.id,
              slug: storefront.slug,
              displayName: storefront.display_name,
              tagline: storefront.tagline,
              isActive: storefront.is_active,
              sellerUserId: storefront.seller_user_id,
              sellerType: storefront.seller_type,
            }
          : null,
        available: !!storefront?.is_active,
        cta: 'view_marketplace',
        originalSellerUserId: att.original_seller_user_id,
      }
    }
  }

  return result
}
