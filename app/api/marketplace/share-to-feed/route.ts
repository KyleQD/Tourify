import { type NextRequest, NextResponse } from 'next/server'
import { resolveActingContext } from '@/lib/auth/acting-context'
import { requireMarketplaceEnabled } from '@/lib/marketplace/require-marketplace-enabled'
import { isFeedCommerceEnabled } from '@/lib/marketplace/feature-flags'
import { jsonError } from '@/lib/api/route-helpers'

export const dynamic = 'force-dynamic'

/**
 * POST /api/marketplace/share-to-feed
 *
 * Creates a marketplace_post_attachments record linked to a newly created post.
 *
 * Body (listing share):
 *   { type: 'listing', listingId: string, caption?: string, visibility?: string }
 *
 * Body (storefront share):
 *   { type: 'storefront', storeId: string, caption?: string, visibility?: string }
 *
 * The post is created via the posts table, content_ref_type = 'marketplace_listing'
 * or 'marketplace_store', and a marketplace_post_attachments row is inserted
 * preserving the original_seller_user_id for reshare attribution.
 *
 * Returns: { data: { postId, attachmentId } }
 */
export async function POST(request: NextRequest) {
  const guard = requireMarketplaceEnabled()
  if (guard) return guard

  if (!isFeedCommerceEnabled()) {
    return jsonError({ status: 503, code: 'feed_commerce_disabled', message: 'Feed commerce is not currently available.' })
  }

  const ctx = await resolveActingContext(request)
  if (ctx instanceof NextResponse) return ctx

  const { userId, profileId, accountType, supabase } = ctx

  let body: {
    type: 'listing' | 'storefront'
    listingId?: string
    storeId?: string
    caption?: string
    visibility?: string
  }

  try {
    body = await request.json()
  } catch {
    return jsonError({ status: 400, code: 'invalid_body', message: 'Invalid JSON.' })
  }

  const { type, listingId, storeId, caption = '', visibility = 'public' } = body

  if (type !== 'listing' && type !== 'storefront') {
    return jsonError({ status: 400, code: 'invalid_type', message: 'type must be "listing" or "storefront".' })
  }
  if (type === 'listing' && !listingId) {
    return jsonError({ status: 400, code: 'missing_listing_id', message: 'listingId is required for listing shares.' })
  }
  if (type === 'storefront' && !storeId) {
    return jsonError({ status: 400, code: 'missing_store_id', message: 'storeId is required for storefront shares.' })
  }

  // ---------------------------------------------------------------------------
  // Listing share: verify ownership + listing is eligible to share
  // ---------------------------------------------------------------------------
  let originalSellerUserId: string = userId
  let originalStoreId: string | null = null
  let resolvedStoreId: string | null = storeId ?? null

  if (type === 'listing') {
    const { data: listing } = await supabase
      .from('marketplace_listings')
      .select('id, seller_user_id, status, moderation_status, storefront_id')
      .eq('id', listingId!)
      .maybeSingle()

    if (!listing) {
      return jsonError({ status: 404, code: 'listing_not_found', message: 'Listing not found.' })
    }

    // Only the seller (or an authorized team member via resolveActingContext) can share
    if (listing.seller_user_id !== userId) {
      return jsonError({ status: 403, code: 'forbidden', message: 'Only the seller can share this listing.' })
    }

    // Listing must be published to share
    if (listing.status !== 'published' || listing.moderation_status !== 'approved') {
      return jsonError({ status: 422, code: 'listing_not_published', message: 'Only published listings can be shared.' })
    }

    originalSellerUserId = listing.seller_user_id
    originalStoreId = listing.storefront_id ?? null
    resolvedStoreId = listing.storefront_id ?? null
  }

  // ---------------------------------------------------------------------------
  // Storefront share: verify ownership
  // ---------------------------------------------------------------------------
  if (type === 'storefront') {
    const { data: sf } = await supabase
      .from('marketplace_storefronts')
      .select('id, seller_user_id, is_active')
      .eq('id', storeId!)
      .maybeSingle()

    if (!sf) {
      return jsonError({ status: 404, code: 'storefront_not_found', message: 'Storefront not found.' })
    }

    if (sf.seller_user_id !== userId) {
      return jsonError({ status: 403, code: 'forbidden', message: 'Only the storefront owner can share it.' })
    }

    if (!sf.is_active) {
      return jsonError({ status: 422, code: 'storefront_inactive', message: 'Only active storefronts can be shared.' })
    }

    originalSellerUserId = sf.seller_user_id
    originalStoreId = sf.id
  }

  // ---------------------------------------------------------------------------
  // Create the post
  // ---------------------------------------------------------------------------
  const contentRefType = type === 'listing' ? 'marketplace_listing' : 'marketplace_store'
  const contentRefId = type === 'listing' ? listingId! : storeId!

  const { data: post, error: postError } = await supabase
    .from('posts')
    .insert({
      user_id: userId,
      content: caption.slice(0, 2000),
      type: 'marketplace',
      visibility,
      posted_as_profile_id: profileId !== userId ? profileId : null,
      posted_as_type: profileId !== userId ? accountType : null,
      content_ref_type: contentRefType,
      content_ref_id: contentRefId,
    })
    .select('id')
    .single()

  if (postError || !post) {
    console.error('[marketplace/share-to-feed] Post creation failed', postError)
    return jsonError({ status: 500, code: 'post_create_failed', message: 'Failed to create post.' })
  }

  // ---------------------------------------------------------------------------
  // Create the attachment record (preserves original seller for reshares)
  // ---------------------------------------------------------------------------
  const { data: attachment, error: attachError } = await supabase
    .from('marketplace_post_attachments')
    .insert({
      post_id: post.id,
      listing_id: type === 'listing' ? listingId : null,
      store_id: type === 'storefront' ? storeId : (resolvedStoreId ?? null),
      original_seller_user_id: originalSellerUserId,
      original_store_id: originalStoreId,
      source_surface: 'feed_share',
    })
    .select('id')
    .single()

  if (attachError || !attachment) {
    // Roll back the post so we don't orphan it
    await supabase.from('posts').delete().eq('id', post.id)
    console.error('[marketplace/share-to-feed] Attachment creation failed', attachError)
    return jsonError({ status: 500, code: 'attachment_create_failed', message: 'Failed to link listing to post.' })
  }

  return NextResponse.json({ data: { postId: post.id, attachmentId: attachment.id } }, { status: 201 })
}
