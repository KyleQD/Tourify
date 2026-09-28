import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { resolveActingContext, recordActingSnapshot } from '@/lib/auth/acting-context'
import { resolveActingAccountSnapshot } from '@/lib/accounts/acting-account-snapshot'
import {
  buildEventSharePreview,
  canShareArtistEvent,
} from '@/lib/feed/event-share-preview'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value)
}

function normalizeArticlePreview(input: unknown, fallbackId: string) {
  if (!input || typeof input !== 'object') return null
  const preview = input as Record<string, any>
  const title = String(preview.title || '').trim()
  const url = typeof preview.url === 'string' ? preview.url.trim() : null
  const readingTime = Number(preview.readingTime || 1)

  if (!title || !url) return null

  return {
    id: String(preview.id || fallbackId),
    slug: String(preview.slug || ''),
    url,
    title,
    excerpt: String(preview.excerpt || '').slice(0, 500),
    featuredImageUrl: typeof preview.featuredImageUrl === 'string' && preview.featuredImageUrl.trim()
      ? preview.featuredImageUrl.trim()
      : null,
    categories: Array.isArray(preview.categories) ? preview.categories.map(String).slice(0, 8) : [],
    tags: Array.isArray(preview.tags) ? preview.tags.map(String).slice(0, 12) : [],
    readingTime: Number.isFinite(readingTime) ? Math.max(1, Math.min(60, readingTime)) : 1,
    publishedAt: typeof preview.publishedAt === 'string' ? preview.publishedAt : null,
  }
}

async function incrementArticleShareCount(supabase: any, articleId: string) {
  try {
    const { data: article } = await supabase
      .from('artist_blog_posts')
      .select('id, stats')
      .eq('id', articleId)
      .maybeSingle()

    if (!article) return

    const stats = article.stats && typeof article.stats === 'object' ? article.stats : {}
    await supabase
      .from('artist_blog_posts')
      .update({ stats: { ...stats, shares: Number(stats.shares || 0) + 1 } })
      .eq('id', articleId)
  } catch (error) {
    console.warn('[ShareAPI] Failed to increment article share count:', error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await resolveActingContext(request)
    if (ctx instanceof NextResponse) return ctx
    const { userId, accountType, profileId, supabase } = ctx
    const author = await resolveActingAccountSnapshot(ctx)

    const body = await request.json()
    const {
      type = 'share',
      shared_content_type,
      shared_content_id,
      content,
      visibility = 'public',
      article_preview,
    } = body

    if (!shared_content_type || !shared_content_id) {
      return NextResponse.json(
        { error: 'shared_content_type and shared_content_id are required' },
        { status: 400 }
      )
    }

    let sharedMetadata: Record<string, any> = {
      shared_content_type,
      shared_content_id,
    }
    let contentRefType: string | null = null
    let contentRefId: string | null = null
    let defaultPostContent = 'Shared a post'

    if (shared_content_type === 'job') {
      const { data: job } = await supabase
        .from('artist_jobs')
        .select('id, title, description, payment_type, payment_amount, location, city, state, job_type, posted_by')
        .eq('id', shared_content_id)
        .single()

      if (job) {
        sharedMetadata = {
          ...sharedMetadata,
          job_title: job.title,
          job_description: job.description?.substring(0, 200),
          job_payment_type: job.payment_type,
          job_payment_amount: job.payment_amount,
          job_location: [job.city, job.state].filter(Boolean).join(', ') || job.location,
          job_type: job.job_type,
          job_url: `/jobs/${shared_content_id}?source=artist`,
        }
      }
      defaultPostContent = sharedMetadata.job_title
        ? `Check out this opportunity: ${sharedMetadata.job_title}`
        : defaultPostContent
    } else if (shared_content_type === 'job_posting') {
      const { data: posting } = await supabase
        .from('job_posting_templates')
        .select('id, title, description, employment_type, location, department')
        .eq('id', shared_content_id)
        .single()

      if (posting) {
        sharedMetadata = {
          ...sharedMetadata,
          job_title: posting.title,
          job_description: posting.description?.substring(0, 200),
          job_employment_type: posting.employment_type,
          job_location: posting.location,
          job_department: posting.department,
          job_url: `/jobs/${posting.id}?source=venue`,
        }
      }
      defaultPostContent = sharedMetadata.job_title
        ? `Check out this opportunity: ${sharedMetadata.job_title}`
        : defaultPostContent
    } else if (shared_content_type === 'article') {
      const normalizedPreview = normalizeArticlePreview(article_preview, shared_content_id)
      if (!normalizedPreview) {
        return NextResponse.json(
          { error: 'article_preview with title and url is required for article shares' },
          { status: 400 }
        )
      }

      contentRefType = 'article'
      contentRefId = isUuid(shared_content_id) ? shared_content_id : null
      sharedMetadata = {
        ...sharedMetadata,
        article_preview: normalizedPreview,
        article_source: contentRefId ? 'internal' : 'external',
      }
      defaultPostContent = `Shared an article: ${normalizedPreview.title}`
    } else if (shared_content_type === 'listing') {
      if (!isUuid(shared_content_id)) {
        return NextResponse.json({ error: 'listing id must be a valid UUID' }, { status: 400 })
      }

      const { data: listing } = await supabase
        .from('marketplace_listings')
        .select('id, seller_user_id, title, description, base_price, currency, cover_image_url, status, category, product_type')
        .eq('id', shared_content_id)
        .maybeSingle()

      if (!listing || listing.seller_user_id !== userId) {
        return NextResponse.json({ error: 'You can only share your own listings' }, { status: 403 })
      }
      if (listing.status !== 'published') {
        return NextResponse.json({ error: 'Only published listings can be shared to the feed' }, { status: 400 })
      }

      contentRefType = 'marketplace_listing'
      contentRefId = listing.id
      sharedMetadata = {
        ...sharedMetadata,
        listing_preview: {
          id: listing.id,
          title: listing.title,
          description: listing.description,
          price: listing.base_price,
          currency: listing.currency || 'USD',
          coverImageUrl: listing.cover_image_url,
          category: listing.category,
          productType: listing.product_type,
          url: `/marketplace/listings/${listing.id}`,
        },
      }
      defaultPostContent = `Check out my drop: ${listing.title}`
    } else if (shared_content_type === 'event') {
      if (!isUuid(shared_content_id)) {
        return NextResponse.json({ error: 'event id must be a valid UUID' }, { status: 400 })
      }

      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('id, slug, title, name, status, event_date, venue_name, city, state, country, poster_url, artist_id, created_by, producer_settings, is_public')
        .eq('id', shared_content_id)
        .maybeSingle()

      if (eventError || !event) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 })
      }

      if (!canShareArtistEvent({ event, viewerId: userId })) {
        return NextResponse.json(
          { error: 'Only published, non-private events can be shared' },
          { status: 403 },
        )
      }

      const eventPreview = buildEventSharePreview(event)
      contentRefType = 'event'
      contentRefId = event.id
      sharedMetadata = {
        ...sharedMetadata,
        event_preview: eventPreview,
        event_id: event.id,
        event_slug: eventPreview.slug,
      }
      defaultPostContent = `Shared an event: ${eventPreview.title}`
    }

    if (shared_content_type === 'post') {
      if (!isUuid(shared_content_id)) {
        return NextResponse.json({ error: 'post id must be a valid UUID' }, { status: 400 })
      }
      const { data: existing, error: existingError } = await supabase
        .from('posts')
        .select('id')
        .eq('id', shared_content_id)
        .maybeSingle()
      if (existingError || !existing) {
        return NextResponse.json({ error: 'Post not found' }, { status: 404 })
      }
      contentRefType = 'post'
      contentRefId = existing.id
    }

    const safeVisibility = visibility === 'followers' ? 'followers' : 'public'
    const postContent = content?.trim() || defaultPostContent

    const postMutation = shared_content_type === 'post'
      ? await supabase
          .rpc('create_post_reshare', {
            target_post_id: shared_content_id,
            reshare_content: postContent,
            reshare_visibility: safeVisibility,
            acting_type: accountType,
            acting_profile_id: profileId,
            acting_display_name: author.name,
            acting_username: author.username,
            acting_avatar_url: author.avatarUrl,
            reshare_metadata: sharedMetadata,
          })
          .single()
      : await supabase
          .from('posts')
          .insert({
            user_id: userId,
            content: postContent,
            type: 'share',
            visibility: safeVisibility,
            content_ref_type: contentRefType,
            content_ref_id: contentRefId,
            posted_as_type: accountType,
            posted_as_profile_id: profileId,
            account_display_name: author.name,
            account_username: author.username,
            account_avatar_url: author.avatarUrl,
            metadata: sharedMetadata,
          })
          .select()
          .single()
    const { data: post, error: postError } = postMutation

    if (postError) {
      console.error('Failed to create share post:', postError)
      return NextResponse.json(
        { error: 'Failed to share: ' + postError.message },
        { status: 500 }
      )
    }

    if (shared_content_type === 'article' && contentRefId) {
      await incrementArticleShareCount(supabase, contentRefId)
    }

    await recordActingSnapshot(ctx, {
      action: 'post.share',
      resourceType: 'post',
      resourceId: post?.id,
      metadata: { shared_content_type, shared_content_id },
    })

    return NextResponse.json({
      success: true,
      post,
      message: 'Shared successfully',
    })
  } catch (error) {
    console.error('Share API error:', error)
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    )
  }
}
