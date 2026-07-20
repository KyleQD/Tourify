import type { ActingContext } from '@/lib/auth/acting-context'
import { recordActingSnapshot } from '@/lib/auth/acting-context'
import { resolveActingAccountSnapshot } from '@/lib/accounts/acting-account-snapshot'
import type { AccountAuthor } from '@/lib/accounts/account-author'
import { isBlogAccountAttributionSchemaError } from '@/lib/blog/account-author'
import {
  defaultDistributionForFormat,
  normalizeDistribution,
  parsePressFormat,
  publicUrlForPressItem,
  shouldSyncToFeed,
  type PressDistribution,
  type PressFormat,
} from '@/lib/press/formats'

export type ArticlePublishStatus = 'draft' | 'published' | 'scheduled' | 'archived'
export type { PressFormat, PressDistribution }

export interface ArticleWriteInput {
  title?: string
  content?: string
  excerpt?: string
  tags?: string[]
  categories?: string[]
  featuredImageUrl?: string | null
  status?: ArticlePublishStatus
  seoTitle?: string | null
  seoDescription?: string | null
  scheduledFor?: string | null
  format?: PressFormat
  subtitle?: string | null
  boilerplate?: string | null
  embargoUntil?: string | null
  distribution?: Partial<PressDistribution>
}

export interface ManagedArticle {
  id: string
  title: string
  slug: string
  content: string
  excerpt: string
  featured_image_url: string | null
  status: ArticlePublishStatus
  published_at: string | null
  scheduled_for: string | null
  seo_title: string | null
  seo_description: string | null
  tags: string[]
  categories: string[]
  format: PressFormat
  subtitle: string | null
  boilerplate: string | null
  embargo_until: string | null
  distribution: PressDistribution
  stats: {
    views: number
    likes: number
    comments: number
    shares: number
  }
  feed_post_id: string | null
  created_at: string
  updated_at: string
  user_id: string
  posted_as_profile_id?: string | null
  posted_as_type?: string | null
  account_display_name?: string | null
  account_username?: string | null
  account_avatar_url?: string | null
  account_is_verified?: boolean | null
  url: string
}

export type ArticleMutationResult =
  | {
      success: true
      article: ManagedArticle & { postedAs?: AccountAuthor }
      warning?: string
    }
  | {
      success: false
      error: string
      status: number
      article?: ManagedArticle & { postedAs?: AccountAuthor }
    }

const OWNER_ARTICLE_SELECT = `
  id,
  title,
  slug,
  content,
  excerpt,
  featured_image_url,
  status,
  published_at,
  scheduled_for,
  seo_title,
  seo_description,
  tags,
  categories,
  format,
  subtitle,
  boilerplate,
  embargo_until,
  distribution,
  stats,
  feed_post_id,
  created_at,
  updated_at,
  user_id,
  posted_as_profile_id,
  posted_as_type,
  account_display_name,
  account_username,
  account_avatar_url,
  account_is_verified
`

const OWNER_ARTICLE_SELECT_LEGACY = `
  id,
  title,
  slug,
  content,
  excerpt,
  featured_image_url,
  status,
  published_at,
  scheduled_for,
  seo_title,
  seo_description,
  tags,
  categories,
  stats,
  created_at,
  updated_at,
  user_id
`

export function isPressFormatSchemaError(error: { message?: string; code?: string } | null | undefined) {
  if (!error?.message) return false
  const message = error.message.toLowerCase()
  return (
    message.includes('format') ||
    message.includes('subtitle') ||
    message.includes('boilerplate') ||
    message.includes('embargo_until') ||
    message.includes('distribution')
  ) && (message.includes('column') || message.includes('schema') || error.code === '42703' || error.code === 'PGRST204')
}

export function generateSlug(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 120) || `pulse-article-${Date.now()}`
}

export function buildArticlePreviewMetadata(input: {
  id: string
  slug: string
  title: string
  excerpt: string
  content: string
  featuredImageUrl: string | null
  categories: string[]
  tags: string[]
  publishedAt: string | null
}) {
  return {
    id: input.id,
    slug: input.slug,
    url: `/blog/${input.slug}`,
    title: input.title,
    excerpt: input.excerpt,
    featuredImageUrl: input.featuredImageUrl,
    categories: input.categories,
    tags: input.tags,
    readingTime: Math.max(1, Math.ceil(input.content.trim().split(/\s+/).filter(Boolean).length / 200)),
    publishedAt: input.publishedAt,
  }
}

function toManagedArticle(row: Record<string, any>): ManagedArticle {
  const stats =
    row.stats && typeof row.stats === 'object'
      ? {
          views: Number(row.stats.views || 0),
          likes: Number(row.stats.likes || 0),
          comments: Number(row.stats.comments || 0),
          shares: Number(row.stats.shares || 0),
        }
      : { views: 0, likes: 0, comments: 0, shares: 0 }

  const format = parsePressFormat(row.format, 'blog')
  const distribution = normalizeDistribution(row.distribution, format)

  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    content: row.content || '',
    excerpt: row.excerpt || '',
    featured_image_url: row.featured_image_url || null,
    status: row.status,
    published_at: row.published_at || null,
    scheduled_for: row.scheduled_for || null,
    seo_title: row.seo_title || null,
    seo_description: row.seo_description || null,
    tags: Array.isArray(row.tags) ? row.tags : [],
    categories: Array.isArray(row.categories) ? row.categories : [],
    format,
    subtitle: row.subtitle || null,
    boilerplate: row.boilerplate || null,
    embargo_until: row.embargo_until || null,
    distribution,
    stats,
    feed_post_id: row.feed_post_id || null,
    created_at: row.created_at,
    updated_at: row.updated_at || row.created_at,
    user_id: row.user_id,
    posted_as_profile_id: row.posted_as_profile_id,
    posted_as_type: row.posted_as_type,
    account_display_name: row.account_display_name,
    account_username: row.account_username,
    account_avatar_url: row.account_avatar_url,
    account_is_verified: row.account_is_verified,
    url: publicUrlForPressItem({ format, slug: row.slug, id: row.id }),
  }
}

async function resolveAuthorSnapshot(ctx: ActingContext) {
  return resolveActingAccountSnapshot(ctx)
}

async function fetchOwnedArticleRow(ctx: ActingContext, articleId: string) {
  let { data, error } = await ctx.supabase
    .from('artist_blog_posts')
    .select(OWNER_ARTICLE_SELECT)
    .eq('id', articleId)
    .eq('user_id', ctx.userId)
    .eq('posted_as_profile_id', ctx.profileId)
    .maybeSingle()

  if (error && (isBlogAccountAttributionSchemaError(error) || isPressFormatSchemaError(error))) {
    const legacy = await ctx.supabase
      .from('artist_blog_posts')
      .select(OWNER_ARTICLE_SELECT_LEGACY)
      .eq('id', articleId)
      .eq('user_id', ctx.userId)
      .maybeSingle()
    data = legacy.data
    error = legacy.error
  }

  if (error) {
    console.error('[ArticlePublishing] Failed to load owned article:', error)
    return { data: null, error }
  }

  return { data, error: null }
}

async function createFeedPostForArticle(input: {
  ctx: ActingContext
  author: AccountAuthor
  article: {
    id: string
    slug: string
    title: string
    excerpt: string
    content: string
    featuredImageUrl: string | null
    categories: string[]
    tags: string[]
    publishedAt: string | null
  }
}) {
  const { ctx, author, article } = input
  const articleUrl = `/blog/${article.slug}`
  const articlePreview = buildArticlePreviewMetadata({
    id: article.id,
    slug: article.slug,
    title: article.title,
    excerpt: article.excerpt,
    content: article.content,
    featuredImageUrl: article.featuredImageUrl,
    categories: article.categories,
    tags: article.tags,
    publishedAt: article.publishedAt,
  })
  const postContent = `New article: ${article.title}\n\n${article.excerpt.slice(0, 180)}...\n\nRead more: ${articleUrl}`
  const hashtags = article.tags.slice(0, 5).map(tag =>
    tag.startsWith('#') ? tag : `#${tag.replace(/\s+/g, '')}`
  )

  const baseFeedPostPayload = {
    user_id: ctx.userId,
    content: postContent,
    type: 'text',
    visibility: 'public',
    hashtags,
    media_urls: article.featuredImageUrl ? [article.featuredImageUrl] : [],
    metadata: { article_preview: articlePreview },
  }

  let { data: feedPost, error: postError } = await ctx.supabase
    .from('posts')
    .insert({
      ...baseFeedPostPayload,
      content_ref_type: 'article',
      content_ref_id: article.id,
      posted_as_profile_id: author.id,
      posted_as_type: author.type,
      account_display_name: author.name,
      account_username: author.username,
      account_avatar_url: author.avatarUrl,
    })
    .select('id')
    .single()

  if (postError && isBlogAccountAttributionSchemaError(postError)) {
    console.warn('[ArticlePublishing] Post account attribution columns missing; sharing article with legacy feed schema.')
    const legacyFeedResult = await ctx.supabase
      .from('posts')
      .insert(baseFeedPostPayload)
      .select('id')
      .single()
    feedPost = legacyFeedResult.data
    postError = legacyFeedResult.error
  }

  if (postError) {
    console.error('[ArticlePublishing] Feed post insert error:', postError)
    return { feedPostId: null as string | null, error: 'Article was saved, but failed to share it to feeds.' }
  }

  const { error: linkError } = await ctx.supabase
    .from('artist_blog_posts')
    .update({ feed_post_id: feedPost?.id || null })
    .eq('id', article.id)

  if (linkError) {
    console.error('[ArticlePublishing] Failed to link article to feed post:', linkError)
    return {
      feedPostId: feedPost?.id || null,
      error: 'Article was published, but linking it into feeds did not finish cleanly.',
    }
  }

  return { feedPostId: feedPost?.id || null, error: null as string | null }
}

async function updateExistingFeedPost(input: {
  ctx: ActingContext
  feedPostId: string
  article: {
    id: string
    slug: string
    title: string
    excerpt: string
    content: string
    featuredImageUrl: string | null
    categories: string[]
    tags: string[]
    publishedAt: string | null
  }
  visibility: 'public' | 'private'
}) {
  const { ctx, feedPostId, article, visibility } = input
  const articleUrl = `/blog/${article.slug}`
  const articlePreview = buildArticlePreviewMetadata({
    id: article.id,
    slug: article.slug,
    title: article.title,
    excerpt: article.excerpt,
    content: article.content,
    featuredImageUrl: article.featuredImageUrl,
    categories: article.categories,
    tags: article.tags,
    publishedAt: article.publishedAt,
  })
  const postContent = `New article: ${article.title}\n\n${article.excerpt.slice(0, 180)}...\n\nRead more: ${articleUrl}`
  const hashtags = article.tags.slice(0, 5).map(tag =>
    tag.startsWith('#') ? tag : `#${tag.replace(/\s+/g, '')}`
  )

  const { error } = await ctx.supabase
    .from('posts')
    .update({
      content: postContent,
      visibility,
      hashtags,
      media_urls: article.featuredImageUrl ? [article.featuredImageUrl] : [],
      metadata: { article_preview: articlePreview },
    })
    .eq('id', feedPostId)

  if (error) {
    console.error('[ArticlePublishing] Failed to update feed post:', error)
    return { error: 'Article was updated, but the feed preview could not be synced.' }
  }

  return { error: null as string | null }
}

export async function syncArticleFeedPost(input: {
  ctx: ActingContext
  author: AccountAuthor
  article: ManagedArticle
  previousStatus: ArticlePublishStatus
  nextStatus: ArticlePublishStatus
}) {
  const { ctx, author, article, previousStatus, nextStatus } = input

  if (!shouldSyncToFeed(article.format, article.distribution)) {
    if (article.feed_post_id && (nextStatus !== 'published' || previousStatus === 'published')) {
      const updated = await updateExistingFeedPost({
        ctx,
        feedPostId: article.feed_post_id,
        article: {
          id: article.id,
          slug: article.slug,
          title: article.title,
          excerpt: article.excerpt || article.content.slice(0, 200),
          content: article.content,
          featuredImageUrl: article.featured_image_url,
          categories: article.categories,
          tags: article.tags,
          publishedAt: article.published_at,
        },
        visibility: 'private',
      })
      return { feedPostId: article.feed_post_id, warning: updated.error }
    }
    return { feedPostId: article.feed_post_id, warning: null as string | null }
  }

  const isPublishing = nextStatus === 'published'
  const wasPublished = previousStatus === 'published'
  const feedPayload = {
    id: article.id,
    slug: article.slug,
    title: article.title,
    excerpt: article.excerpt || article.content.slice(0, 200),
    content: article.content,
    featuredImageUrl: article.featured_image_url,
    categories: article.categories,
    tags: article.tags,
    publishedAt: article.published_at,
  }

  if (isPublishing && !article.feed_post_id) {
    const created = await createFeedPostForArticle({ ctx, author, article: feedPayload })
    if (created.error) return { feedPostId: created.feedPostId, warning: created.error }
    return { feedPostId: created.feedPostId, warning: null as string | null }
  }

  if (isPublishing && article.feed_post_id) {
    const updated = await updateExistingFeedPost({
      ctx,
      feedPostId: article.feed_post_id,
      article: feedPayload,
      visibility: 'public',
    })
    return { feedPostId: article.feed_post_id, warning: updated.error }
  }

  if (!isPublishing && wasPublished && article.feed_post_id) {
    const updated = await updateExistingFeedPost({
      ctx,
      feedPostId: article.feed_post_id,
      article: feedPayload,
      visibility: 'private',
    })
    return { feedPostId: article.feed_post_id, warning: updated.error }
  }

  return { feedPostId: article.feed_post_id, warning: null as string | null }
}

export async function createArticle(input: {
  ctx: ActingContext
  body: ArticleWriteInput
}): Promise<ArticleMutationResult> {
  const { ctx, body } = input
  const status: ArticlePublishStatus =
    body.status === 'draft' || body.status === 'scheduled' ? body.status : 'published'
  const format = parsePressFormat(body.format, 'blog')
  const distribution = normalizeDistribution(
    { ...defaultDistributionForFormat(format), ...body.distribution },
    format
  )
  const cleanTitle = body.title?.trim() || ''
  const cleanContent = body.content?.trim() || ''
  const cleanExcerpt = typeof body.excerpt === 'string' ? body.excerpt.trim() : ''
  const cleanFeaturedImageUrl = typeof body.featuredImageUrl === 'string' ? body.featuredImageUrl.trim() : ''
  const cleanTags = Array.isArray(body.tags)
    ? body.tags.map(tag => String(tag).trim()).filter(Boolean).slice(0, 10)
    : []
  const cleanCategories = Array.isArray(body.categories)
    ? body.categories.map(category => String(category).trim()).filter(Boolean).slice(0, 5)
    : ['Community']
  const cleanSeoTitle = typeof body.seoTitle === 'string' ? body.seoTitle.trim() : null
  const cleanSeoDescription = typeof body.seoDescription === 'string' ? body.seoDescription.trim() : null
  const cleanScheduledFor = typeof body.scheduledFor === 'string' ? body.scheduledFor.trim() || null : null
  const cleanSubtitle = typeof body.subtitle === 'string' ? body.subtitle.trim() || null : null
  const cleanBoilerplate = typeof body.boilerplate === 'string' ? body.boilerplate.trim() || null : null
  const cleanEmbargoUntil =
    typeof body.embargoUntil === 'string' ? body.embargoUntil.trim() || null : null

  if (!cleanTitle)
    return { success: false, error: 'Title is required', status: 400 }

  if (cleanTitle.length < 5)
    return { success: false, error: 'Title must be at least 5 characters', status: 400 }

  if (status === 'published' && cleanContent.length < 50)
    return { success: false, error: 'Content must be at least 50 characters', status: 400 }

  const author = await resolveAuthorSnapshot(ctx)
  const articleContent = cleanContent || 'Draft in progress...'
  const publishedAt = status === 'published' ? new Date().toISOString() : null
  const slug = generateSlug(cleanTitle)
  const supabase = ctx.supabase

  const baseArticlePayload = {
    user_id: ctx.userId,
    title: cleanTitle,
    slug: `${slug}-${Date.now().toString(36)}`,
    content: articleContent,
    excerpt: cleanExcerpt || articleContent.slice(0, 200),
    featured_image_url: cleanFeaturedImageUrl || null,
    tags: cleanTags,
    categories: cleanCategories.length > 0 ? cleanCategories : ['Community'],
    status,
    published_at: publishedAt,
    scheduled_for: status === 'scheduled' ? cleanScheduledFor : null,
    seo_title: cleanSeoTitle,
    seo_description: cleanSeoDescription,
    stats: { likes: 0, comments: 0, shares: 0, views: 0 },
  }

  const pressFields = {
    format,
    subtitle: cleanSubtitle,
    boilerplate: cleanBoilerplate,
    embargo_until: cleanEmbargoUntil,
    distribution,
  }

  let { data, error } = await supabase
    .from('artist_blog_posts')
    .insert({
      ...baseArticlePayload,
      ...pressFields,
      posted_as_profile_id: author.id,
      posted_as_type: author.type,
      account_display_name: author.name,
      account_username: author.username,
      account_avatar_url: author.avatarUrl,
      account_is_verified: author.isVerified,
    })
    .select(OWNER_ARTICLE_SELECT)
    .single()

  if (error && (isBlogAccountAttributionSchemaError(error) || isPressFormatSchemaError(error))) {
    console.warn('[ArticlePublishing] Press/account columns missing; publishing with legacy blog schema.')
    const legacyResult = await supabase
      .from('artist_blog_posts')
      .insert(baseArticlePayload)
      .select(OWNER_ARTICLE_SELECT_LEGACY)
      .single()
    data = legacyResult.data
    error = legacyResult.error
  }

  if (error) {
    console.error('[ArticlePublishing] Insert error:', error)
    return { success: false, error: 'Failed to publish article', status: 500 }
  }

  let article = toManagedArticle({ ...data, format: data?.format || format, distribution: data?.distribution || distribution })
  let warning: string | undefined

  if (status === 'published') {
    const sync = await syncArticleFeedPost({
      ctx,
      author,
      article,
      previousStatus: 'draft',
      nextStatus: 'published',
    })

    if (sync.feedPostId)
      article = { ...article, feed_post_id: sync.feedPostId }

    if (sync.warning)
      warning = sync.warning

    await recordActingSnapshot(ctx, {
      action: 'blog.publish',
      resourceType: 'artist_blog_posts',
      resourceId: article.id,
      metadata: { feed_post_id: sync.feedPostId, format: article.format },
    })

    if (warning) {
      return {
        success: false,
        error: warning,
        status: 500,
        article: { ...article, postedAs: author },
      }
    }
  }

  return {
    success: true,
    article: { ...article, postedAs: author },
    warning,
  }
}

export async function getOwnedArticle(input: {
  ctx: ActingContext
  articleId: string
}): Promise<ArticleMutationResult> {
  const { data, error } = await fetchOwnedArticleRow(input.ctx, input.articleId)
  if (error)
    return { success: false, error: 'Failed to load article', status: 500 }
  if (!data)
    return { success: false, error: 'Article not found', status: 404 }

  return { success: true, article: toManagedArticle(data) }
}

export async function listOwnedArticles(input: {
  ctx: ActingContext
  limit?: number
  format?: PressFormat | 'all'
}): Promise<{ success: true; articles: ManagedArticle[] } | { success: false; error: string; status: number }> {
  const limit = Math.min(100, Math.max(1, input.limit || 50))

  let query = input.ctx.supabase
    .from('artist_blog_posts')
    .select(OWNER_ARTICLE_SELECT)
    .eq('user_id', input.ctx.userId)
    .eq('posted_as_profile_id', input.ctx.profileId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (input.format && input.format !== 'all')
    query = query.eq('format', input.format)

  let { data, error } = await query

  if (error && (isBlogAccountAttributionSchemaError(error) || isPressFormatSchemaError(error))) {
    const legacy = await input.ctx.supabase
      .from('artist_blog_posts')
      .select(OWNER_ARTICLE_SELECT_LEGACY)
      .eq('user_id', input.ctx.userId)
      .order('created_at', { ascending: false })
      .limit(limit)
    data = legacy.data
    error = legacy.error
  }

  if (error) {
    console.error('[ArticlePublishing] Failed to list owned articles:', error)
    return { success: false, error: 'Failed to load articles', status: 500 }
  }

  return {
    success: true,
    articles: ((data || []) as Record<string, any>[]).map(toManagedArticle),
  }
}

export async function updateArticle(input: {
  ctx: ActingContext
  articleId: string
  body: ArticleWriteInput
}): Promise<ArticleMutationResult> {
  const { ctx, articleId, body } = input
  const existingResult = await getOwnedArticle({ ctx, articleId })
  if (!existingResult.success) return existingResult

  const existing = existingResult.article
  const nextStatus: ArticlePublishStatus =
    body.status === 'draft' || body.status === 'published' || body.status === 'scheduled' || body.status === 'archived'
      ? body.status
      : existing.status

  const cleanTitle = typeof body.title === 'string' ? body.title.trim() : existing.title
  const cleanContent = typeof body.content === 'string' ? body.content.trim() : existing.content
  const cleanExcerpt =
    typeof body.excerpt === 'string' ? body.excerpt.trim() : existing.excerpt
  const cleanFeaturedImageUrl =
    typeof body.featuredImageUrl === 'string'
      ? body.featuredImageUrl.trim() || null
      : body.featuredImageUrl === null
        ? null
        : existing.featured_image_url
  const cleanTags = Array.isArray(body.tags)
    ? body.tags.map(tag => String(tag).trim()).filter(Boolean).slice(0, 10)
    : existing.tags
  const cleanCategories = Array.isArray(body.categories)
    ? body.categories.map(category => String(category).trim()).filter(Boolean).slice(0, 5)
    : existing.categories
  const cleanSeoTitle =
    typeof body.seoTitle === 'string' ? body.seoTitle.trim() : body.seoTitle === null ? null : existing.seo_title
  const cleanSeoDescription =
    typeof body.seoDescription === 'string'
      ? body.seoDescription.trim()
      : body.seoDescription === null
        ? null
        : existing.seo_description
  const cleanScheduledFor =
    typeof body.scheduledFor === 'string'
      ? body.scheduledFor.trim() || null
      : body.scheduledFor === null
        ? null
        : existing.scheduled_for

  const nextFormat = body.format ? parsePressFormat(body.format, existing.format) : existing.format
  const nextDistribution = normalizeDistribution(
    body.distribution
      ? { ...existing.distribution, ...body.distribution }
      : existing.distribution,
    nextFormat
  )
  const cleanSubtitle =
    typeof body.subtitle === 'string'
      ? body.subtitle.trim() || null
      : body.subtitle === null
        ? null
        : existing.subtitle
  const cleanBoilerplate =
    typeof body.boilerplate === 'string'
      ? body.boilerplate.trim() || null
      : body.boilerplate === null
        ? null
        : existing.boilerplate
  const cleanEmbargoUntil =
    typeof body.embargoUntil === 'string'
      ? body.embargoUntil.trim() || null
      : body.embargoUntil === null
        ? null
        : existing.embargo_until

  if (!cleanTitle)
    return { success: false, error: 'Title is required', status: 400 }

  if (cleanTitle.length < 5)
    return { success: false, error: 'Title must be at least 5 characters', status: 400 }

  if (nextStatus === 'published' && cleanContent.length < 50)
    return { success: false, error: 'Content must be at least 50 characters', status: 400 }

  const publishedAt =
    nextStatus === 'published'
      ? existing.published_at || new Date().toISOString()
      : nextStatus === 'draft' || nextStatus === 'archived'
        ? existing.published_at
        : existing.published_at

  const updatePayload: Record<string, unknown> = {
    title: cleanTitle,
    content: cleanContent || 'Draft in progress...',
    excerpt: cleanExcerpt || (cleanContent || existing.excerpt).slice(0, 200),
    featured_image_url: cleanFeaturedImageUrl,
    tags: cleanTags,
    categories: cleanCategories.length > 0 ? cleanCategories : ['Community'],
    status: nextStatus,
    published_at: nextStatus === 'published' ? publishedAt : nextStatus === 'draft' ? null : publishedAt,
    scheduled_for: nextStatus === 'scheduled' ? cleanScheduledFor : null,
    seo_title: cleanSeoTitle,
    seo_description: cleanSeoDescription,
    format: nextFormat,
    subtitle: cleanSubtitle,
    boilerplate: cleanBoilerplate,
    embargo_until: cleanEmbargoUntil,
    distribution: nextDistribution,
    updated_at: new Date().toISOString(),
  }

  let { data, error } = await ctx.supabase
    .from('artist_blog_posts')
    .update(updatePayload)
    .eq('id', articleId)
    .eq('user_id', ctx.userId)
    .select(OWNER_ARTICLE_SELECT)
    .single()

  if (error && (isBlogAccountAttributionSchemaError(error) || isPressFormatSchemaError(error))) {
    const legacyPayload = { ...updatePayload }
    delete legacyPayload.format
    delete legacyPayload.subtitle
    delete legacyPayload.boilerplate
    delete legacyPayload.embargo_until
    delete legacyPayload.distribution
    const legacy = await ctx.supabase
      .from('artist_blog_posts')
      .update(legacyPayload)
      .eq('id', articleId)
      .eq('user_id', ctx.userId)
      .select(OWNER_ARTICLE_SELECT_LEGACY)
      .single()
    data = legacy.data
    error = legacy.error
  }

  if (error) {
    console.error('[ArticlePublishing] Update error:', error)
    return { success: false, error: 'Failed to update article', status: 500 }
  }

  let article = toManagedArticle(data)
  const author = await resolveAuthorSnapshot(ctx)

  const sync = await syncArticleFeedPost({
    ctx,
    author,
    article,
    previousStatus: existing.status,
    nextStatus,
  })

  if (sync.feedPostId && sync.feedPostId !== article.feed_post_id) {
    article = { ...article, feed_post_id: sync.feedPostId }
  }

  if (nextStatus === 'published' && existing.status !== 'published') {
    await recordActingSnapshot(ctx, {
      action: 'blog.publish',
      resourceType: 'artist_blog_posts',
      resourceId: article.id,
      metadata: { feed_post_id: sync.feedPostId },
    })
  } else {
    await recordActingSnapshot(ctx, {
      action: 'blog.update',
      resourceType: 'artist_blog_posts',
      resourceId: article.id,
      metadata: { status: nextStatus, feed_post_id: sync.feedPostId },
    })
  }

  if (sync.warning) {
    return {
      success: false,
      error: sync.warning,
      status: 500,
      article: { ...article, postedAs: author },
    }
  }

  return {
    success: true,
    article: { ...article, postedAs: author },
  }
}

export async function deleteArticle(input: {
  ctx: ActingContext
  articleId: string
}): Promise<{ success: true } | { success: false; error: string; status: number }> {
  const existingResult = await getOwnedArticle(input)
  if (!existingResult.success) return existingResult

  const existing = existingResult.article

  if (existing.feed_post_id) {
    const { error: feedError } = await input.ctx.supabase
      .from('posts')
      .delete()
      .eq('id', existing.feed_post_id)

    if (feedError)
      console.error('[ArticlePublishing] Failed to delete companion feed post:', feedError)
  }

  const { error } = await input.ctx.supabase
    .from('artist_blog_posts')
    .delete()
    .eq('id', input.articleId)
    .eq('user_id', input.ctx.userId)
    .eq('posted_as_profile_id', input.ctx.profileId)

  if (error) {
    console.error('[ArticlePublishing] Delete error:', error)
    return { success: false, error: 'Failed to delete article', status: 500 }
  }

  await recordActingSnapshot(input.ctx, {
    action: 'blog.delete',
    resourceType: 'artist_blog_posts',
    resourceId: input.articleId,
    metadata: { feed_post_id: existing.feed_post_id },
  })

  return { success: true }
}
