import type { SupabaseClient } from '@supabase/supabase-js'

import {
  accountAuthorNeedsRefresh,
  getAccountAuthor,
  getAccountAuthorPath,
  isAccountAttributionSchemaError,
} from '@/lib/accounts/account-author'
import { resolveAccountAuthorSnapshot } from '@/lib/accounts/acting-account-snapshot'

export const PUBLIC_ARTICLE_SELECT = `
  id,
  title,
  slug,
  excerpt,
  content,
  featured_image_url,
  tags,
  categories,
  stats,
  status,
  published_at,
  created_at,
  updated_at,
  user_id,
  feed_post_id,
  posted_as_profile_id,
  posted_as_type,
  account_display_name,
  account_username,
  account_avatar_url,
  account_is_verified
`

export const PUBLIC_ARTICLE_SELECT_LEGACY = `
  id,
  title,
  slug,
  excerpt,
  content,
  featured_image_url,
  tags,
  categories,
  stats,
  status,
  published_at,
  created_at,
  updated_at,
  user_id
`

const PUBLIC_ARTICLE_PROFILE_SELECT = `
  id,
  username,
  full_name,
  avatar_url,
  is_verified
`

const OPTIONAL_PUBLIC_ARTICLE_FIELDS = [
  'feed_post_id',
  'posted_as_profile_id',
  'posted_as_type',
  'account_display_name',
  'account_username',
  'account_avatar_url',
  'account_is_verified',
]

export interface PublicArticle {
  id: string
  title: string
  slug: string
  excerpt: string
  content: string
  featuredImageUrl: string | null
  tags: string[]
  categories: string[]
  publishedAt: string
  createdAt: string
  updatedAt: string | null
  status: string
  feedPostId: string | null
  ownerUserId: string
  author: {
    id: string
    type: string
    name: string
    username: string | null
    avatarUrl: string | null
    isVerified: boolean
    profilePath: string | null
  }
  metrics: {
    likes: number
    comments: number
    shares: number
    views: number
  }
  readingTime: number
}

export interface PublicArticleSitemapEntry {
  slug: string
  publishedAt: string
  updatedAt: string | null
}

function isPublicArticleSelectSchemaError(error: unknown): boolean {
  if (isAccountAttributionSchemaError(error)) return true
  if (!error || typeof error !== 'object') return false

  const record = error as Record<string, unknown>
  const code = String(record.code || '')
  const message = String(record.message || '')
  const details = String(record.details || '')
  const hint = String(record.hint || '')
  const combined = `${message} ${details} ${hint}`

  if (code === 'PGRST200' && combined.includes('profiles')) return true
  if (code !== '42703' && code !== 'PGRST204') return false

  return OPTIONAL_PUBLIC_ARTICLE_FIELDS.some(field =>
    combined.includes(field) ||
    combined.includes(`'${field}'`) ||
    combined.includes(`.${field}`)
  )
}

async function attachResolvedAuthor(supabase: SupabaseClient, row: any): Promise<any> {
  if (!row?.user_id) return row

  if (row.posted_as_profile_id && accountAuthorNeedsRefresh(row)) {
    const resolvedAuthor = await resolveAccountAuthorSnapshot({
      supabase,
      accountType: row.posted_as_type || 'general',
      profileId: row.posted_as_profile_id,
      userId: row.user_id,
    })

    return { ...row, resolved_author: resolvedAuthor }
  }

  if (!row?.user_id || row.profiles) return row

  const hasAccountSnapshot =
    !accountAuthorNeedsRefresh(row) && (
      row.account_display_name ||
      row.account_username ||
      row.account_avatar_url
    )

  if (hasAccountSnapshot) return row

  const { data, error } = await supabase
    .from('profiles')
    .select(PUBLIC_ARTICLE_PROFILE_SELECT)
    .eq('id', row.user_id)
    .maybeSingle()

  if (error) {
    console.warn('[PublicArticle] Legacy author profile lookup failed.', {
      articleId: row.id,
      userId: row.user_id,
      code: error.code,
      message: error.message,
    })
    return row
  }

  return data ? { ...row, profiles: data } : row
}

function normalizeArticle(row: any): PublicArticle {
  const author = getAccountAuthor(row)
  const stats = row.stats && typeof row.stats === 'object' ? row.stats : {}

  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt || String(row.content || '').slice(0, 220),
    content: row.content || '',
    featuredImageUrl: row.featured_image_url || null,
    tags: Array.isArray(row.tags) ? row.tags : [],
    categories: Array.isArray(row.categories) ? row.categories : [],
    publishedAt: row.published_at || row.created_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at || null,
    status: row.status || 'published',
    feedPostId: row.feed_post_id || null,
    ownerUserId: row.user_id,
    author: {
      id: author.id,
      type: author.type,
      name: author.name,
      username: author.username,
      avatarUrl: author.avatarUrl,
      isVerified: author.isVerified,
      profilePath: getAccountAuthorPath(author),
    },
    metrics: {
      likes: Number(stats.likes || 0),
      comments: Number(stats.comments || 0),
      shares: Number(stats.shares || 0),
      views: Number(stats.views || 0),
    },
    readingTime: Math.max(1, Math.ceil(String(row.content || '').trim().split(/\s+/).filter(Boolean).length / 200)),
  }
}

export async function getPublicArticleBySlug(
  supabase: SupabaseClient,
  slug: string
): Promise<PublicArticle | null> {
  let articleData: any | null = null
  let articleError: any | null = null

  const result = await supabase
    .from('artist_blog_posts')
    .select(PUBLIC_ARTICLE_SELECT)
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()

  articleData = result.data
  articleError = result.error

  if (articleError && isPublicArticleSelectSchemaError(articleError)) {
    console.warn('[PublicArticle] Full article select failed; retrying with legacy select.', {
      slug,
      code: articleError.code,
      message: articleError.message,
    })

    const legacyResult = await supabase
      .from('artist_blog_posts')
      .select(PUBLIC_ARTICLE_SELECT_LEGACY)
      .eq('slug', slug)
      .eq('status', 'published')
      .maybeSingle()

    articleData = legacyResult.data
    articleError = legacyResult.error
  }

  if (articleError) {
    console.warn('[PublicArticle] Published article lookup failed.', {
      slug,
      code: articleError.code,
      message: articleError.message,
    })
    return null
  }

  if (!articleData) {
    console.info('[PublicArticle] Published article not found.', { slug })
    return null
  }

  return normalizeArticle(await attachResolvedAuthor(supabase, articleData))
}

export async function getMoreFromAuthor(
  supabase: SupabaseClient,
  article: Pick<PublicArticle, 'id' | 'author' | 'ownerUserId'>,
  limit: number = 3
): Promise<PublicArticle[]> {
  let articlesData: any[] | null = null
  let articlesError: any | null = null

  const result = await supabase
    .from('artist_blog_posts')
    .select(PUBLIC_ARTICLE_SELECT)
    .eq('status', 'published')
    .or(`posted_as_profile_id.eq.${article.author.id},user_id.eq.${article.ownerUserId}`)
    .neq('id', article.id)
    .order('published_at', { ascending: false })
    .limit(limit)

  articlesData = result.data
  articlesError = result.error

  if (articlesError && isPublicArticleSelectSchemaError(articlesError)) {
    console.warn('[PublicArticle] Related article select failed; retrying with legacy select.', {
      articleId: article.id,
      code: articlesError.code,
      message: articlesError.message,
    })

    const legacyResult = await supabase
      .from('artist_blog_posts')
      .select(PUBLIC_ARTICLE_SELECT_LEGACY)
      .eq('status', 'published')
      .eq('user_id', article.ownerUserId)
      .neq('id', article.id)
      .order('published_at', { ascending: false })
      .limit(limit)

    articlesData = legacyResult.data
    articlesError = legacyResult.error
  }

  if (articlesError) {
    console.warn('[PublicArticle] Related article lookup failed.', {
      articleId: article.id,
      code: articlesError.code,
      message: articlesError.message,
    })
    return []
  }

  const hydratedRows = await Promise.all(
    (articlesData || []).map(row => attachResolvedAuthor(supabase, row))
  )

  return hydratedRows.map(normalizeArticle)
}

export async function getPublishedArticleSitemapEntries(
  supabase: SupabaseClient,
  limit: number = 5000
): Promise<PublicArticleSitemapEntry[]> {
  const { data, error } = await supabase
    .from('artist_blog_posts')
    .select('slug, published_at, updated_at, created_at')
    .eq('status', 'published')
    .not('slug', 'is', null)
    .order('published_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.warn('[PublicArticle] Published article sitemap lookup failed.', {
      code: error.code,
      message: error.message,
    })
    return []
  }

  return (data || [])
    .filter(row => row.slug)
    .map(row => ({
      slug: row.slug,
      publishedAt: row.published_at || row.created_at,
      updatedAt: row.updated_at || null,
    }))
}
