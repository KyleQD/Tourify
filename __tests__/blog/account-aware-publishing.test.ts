import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { getBlogAccountAuthor } from '@/lib/blog/account-author'
import { getPublicArticleBySlug } from '@/lib/blog/public-articles'

const root = process.cwd()

function read(path: string) {
  return readFileSync(join(root, path), 'utf8')
}

class FakeSingleQuery {
  private filters: Record<string, unknown> = {}

  constructor(
    private readonly table: string,
    private readonly rows: Record<string, any[]>
  ) {}

  select(_columns: string) {
    return this
  }

  eq(column: string, value: unknown) {
    this.filters[column] = value
    return this
  }

  maybeSingle() {
    const rows = this.rows[this.table] || []
    const row = rows.find(candidate =>
      Object.entries(this.filters).every(([key, value]) => candidate[key] === value)
    )

    return Promise.resolve({ data: row || null, error: null })
  }
}

class FakeArticleSupabase {
  constructor(private readonly rows: Record<string, any[]>) {}

  from(table: string) {
    return new FakeSingleQuery(table, this.rows)
  }
}

describe('account-aware blog publishing contracts', () => {
  it('sends active account headers from the blog composer', () => {
    const source = read('app/blog/new/page.tsx')

    expect(source).toContain('useActingContext')
    expect(source).toContain('...actingHeaders')
    expect(source).toContain('/api/pulse/articles')
  })

  it('publishes through verified acting context and stores the account snapshot', () => {
    const route = read('app/api/pulse/articles/route.ts')
    const publishing = read('lib/blog/article-publishing.ts')

    expect(route).toContain('resolveActingContext(request)')
    expect(route).toContain('createArticle')
    expect(publishing).toContain('resolveAuthorSnapshot(ctx)')
    expect(publishing).toContain('user_id: ctx.userId')
    expect(publishing).toContain('posted_as_profile_id: author.id')
    expect(publishing).toContain('posted_as_type: author.type')
    expect(publishing).toContain('account_display_name: author.name')
    expect(publishing).toContain("type: 'text'")
    expect(publishing).toContain("status === 'published'")
    expect(publishing).toContain("action: 'blog.publish'")
  })

  it('keeps drafts and scheduled articles out of feed fanout', () => {
    const route = read('app/api/pulse/articles/route.ts')
    const publishing = read('lib/blog/article-publishing.ts')

    expect(route).toContain("body.status === 'draft' || body.status === 'scheduled' ? body.status : 'published'")
    expect(publishing).toContain("body.status === 'draft' || body.status === 'scheduled' ? body.status : 'published'")
    expect(publishing).toContain("if (status === 'published')")
  })

  it('writes article preview metadata onto published feed fanout posts', () => {
    const publishing = read('lib/blog/article-publishing.ts')

    expect(publishing).toContain('buildArticlePreviewMetadata')
    expect(publishing).toContain('url: `/blog/${input.slug}`')
    expect(publishing).toContain('metadata: { article_preview: articlePreview }')
    expect(publishing).toContain('readingTime')
  })

  it('loads public blog article pages through a server-only published article reader', () => {
    const source = read('app/blog/[slug]/page.tsx')

    expect(source).toContain("import { createServiceRoleClient } from '@/lib/supabase/service-role'")
    expect(source).not.toContain("import { createClient } from '@/lib/supabase/server'")
    expect(source).toContain('const supabase = createServiceRoleClient()')
    expect(source).toContain('getPublicArticleBySlug(supabase, slug)')
    expect(source).toContain("const canonicalPath = `/blog/${article.slug}`")
    expect(source).toContain('canonical: canonicalPath')
  })

  it('emits SEO metadata and structured data for public article pages', () => {
    const source = read('app/blog/[slug]/page.tsx')

    expect(source).toContain("'@type': 'BlogPosting'")
    expect(source).toContain("'@type': 'BreadcrumbList'")
    expect(source).toContain("mainEntityOfPage")
    expect(source).toContain("datePublished")
    expect(source).toContain("dateModified")
    expect(source).toContain("isAccessibleForFree: true")
    expect(source).toContain('type="application/ld+json"')
    expect(source).toContain("'max-image-preview': 'large'")
    expect(source).toContain('openGraph')
    expect(source).toContain('twitter')
  })

  it('keeps public article reads constrained to published rows with a legacy select fallback', () => {
    const source = read('lib/blog/public-articles.ts')

    expect(source).toContain('PUBLIC_ARTICLE_SELECT_LEGACY')
    expect(source).toContain('isPublicArticleSelectSchemaError')
    expect(source).toContain(".eq('slug', slug)")
    expect(source).toContain(".eq('status', 'published')")
    expect(source).toContain('.select(PUBLIC_ARTICLE_SELECT_LEGACY)')
    expect(source).toContain('retrying with legacy select')
  })

  it('does not make public article surfaces depend on a posts-to-profiles embedded relationship', () => {
    const filesWithoutPostQueries = [
      'lib/blog/public-articles.ts',
      'app/api/pulse/articles/route.ts',
      'app/api/feed/blogs/route.ts',
    ]

    for (const file of filesWithoutPostQueries) {
      expect(read(file), file).not.toContain('profiles:user_id')
    }

    const newsFeedService = read('lib/news/feed-service.ts')
    expect(newsFeedService).not.toContain('account_is_verified,\n        profiles:user_id')
  })

  it('refreshes stale generic article author snapshots from the posting account', async () => {
    const article = await getPublicArticleBySlug(new FakeArticleSupabase({
      artist_blog_posts: [
        {
          id: 'article-1',
          slug: 'who-is-ikon',
          title: 'Who is IKON',
          content: 'Published article body with enough words to calculate reading time.',
          excerpt: 'Published article excerpt.',
          status: 'published',
          published_at: '2026-07-04T00:00:00.000Z',
          created_at: '2026-07-04T00:00:00.000Z',
          updated_at: null,
          user_id: 'owner-1',
          posted_as_profile_id: 'owner-1',
          posted_as_type: 'general',
          account_display_name: 'Community Member',
          account_username: 'community-member',
          account_avatar_url: null,
          account_is_verified: false,
          stats: {},
          tags: [],
          categories: ['General'],
        },
      ],
      profiles: [
        {
          id: 'owner-1',
          full_name: 'Kyle Daley',
          username: 'Kyle',
          avatar_url: 'https://example.com/kyle.png',
          is_verified: true,
        },
      ],
    }) as any, 'who-is-ikon')

    expect(article?.author).toMatchObject({
      id: 'owner-1',
      type: 'general',
      name: 'Kyle Daley',
      username: 'Kyle',
      avatarUrl: 'https://example.com/kyle.png',
      isVerified: true,
    })
  })

  it('keeps blog article not-found states inside the Pulse experience', () => {
    const source = read('app/blog/[slug]/not-found.tsx')

    expect(source).toContain('News / Stories')
    expect(source).toContain('This story is not available')
    expect(source).toContain('href="/news"')
    expect(source).toContain('href="/community"')
  })

  it('keeps Pulse community stories pointed at the canonical blog URL', () => {
    const source = read('components/news/community-stories.tsx')

    expect(source).toContain('href={`/blog/${article.slug}`}')
  })

  it('allows imported article cover images from Google and Blogger hosts', () => {
    const source = read('next.config.ts')

    expect(source).toContain("hostname: 'blogger.googleusercontent.com'")
    expect(source).toContain("hostname: '**.googleusercontent.com'")
    expect(source).toContain("hostname: '**.bp.blogspot.com'")
  })

  it('includes published article URLs in the sitemap', () => {
    const source = read('app/sitemap.ts')

    expect(source).toContain('getPublishedArticleSitemapEntries')
    expect(source).toContain('createServiceRoleClient')
    expect(source).toContain('`${host}/blog/${article.slug}`')
    expect(source).toContain("changeFrequency: 'weekly'")
  })

  it('reads stored account author fields on article and feed surfaces', () => {
    const files = [
      'app/blog/[slug]/page.tsx',
      'app/api/pulse/articles/route.ts',
      'app/api/feed/blogs/route.ts',
      'lib/news/feed-service.ts',
    ]

    for (const file of files) {
      const source = read(file)
      expect(source, file).toContain('getBlogAccountAuthor')
      expect(source, file).toContain('account_display_name')
      expect(source, file).toContain('posted_as_type')
    }
  })

  it('adds /pulse as a feed page alias', () => {
    expect(read('app/pulse/page.tsx')).toContain("redirect('/news')")
  })
})

describe('artist blog management unification', () => {
  it('lists and mutates artist posts through the Pulse articles API', () => {
    const page = read('app/artist/press/page.tsx')

    expect(page).toContain('/api/pulse/articles?mine=1')
    expect(page).toContain("method: 'PATCH'")
    expect(page).toContain("method: 'DELETE'")
    expect(page).toContain('useActingContext')
    expect(page).toContain('actingHeaders')
    expect(page).not.toContain("from('artist_blog_posts')")
    expect(page).toContain('openNewPost')
    expect(page).not.toContain("router.push('/blog/new')")
    expect(page).toContain('publicUrlForPressItem')
    expect(page).toContain("searchParams.get('status')")
  })

  it('creates and updates articles from the artist editor via Pulse API', () => {
    const editor = read('app/artist/press/press-editor.tsx')

    expect(editor).toContain('useActingContext')
    expect(editor).toContain('PostingAccountSelector')
    expect(editor).toContain('/api/pulse/articles')
    expect(editor).toContain("method: postId ? 'PATCH' : 'POST'")
    expect(editor).not.toContain(".from('artist_blog_posts')")
    expect(editor).not.toContain(".insert(postData)")
  })

  it('exposes owner get/update/delete article routes with feed sync helpers', () => {
    const manageRoute = read('app/api/pulse/articles/[id]/route.ts')
    const publishing = read('lib/blog/article-publishing.ts')
    const listRoute = read('app/api/pulse/articles/route.ts')

    expect(manageRoute).toContain('export async function GET')
    expect(manageRoute).toContain('export async function PATCH')
    expect(manageRoute).toContain('export async function DELETE')
    expect(manageRoute).toContain('updateArticle')
    expect(manageRoute).toContain('deleteArticle')
    expect(listRoute).toContain("searchParams.get('mine')")
    expect(listRoute).toContain('listOwnedArticles')
    expect(publishing).toContain('syncArticleFeedPost')
    expect(publishing).toContain("visibility: 'private'")
    expect(publishing).toContain("action: 'blog.delete'")
    expect(publishing).toContain('.delete()')
  })

  it('scopes mine=1 owned article list and mutations to the acting profile', () => {
    const publishing = read('lib/blog/article-publishing.ts')

    expect(publishing).toContain(".eq('posted_as_profile_id', input.ctx.profileId)")
    expect(publishing).toContain(".eq('posted_as_profile_id', ctx.profileId)")
    expect(publishing).toContain('listOwnedArticles')
    expect(publishing).toContain('fetchOwnedArticleRow')
  })

  it('persists public article engagement through the engage API', () => {
    const engage = read('app/api/pulse/articles/[id]/engage/route.ts')
    const engagement = read('lib/blog/article-engagement.ts')
    const actionBar = read('components/blog/article-action-bar.tsx')
    const blogPage = read('app/blog/[slug]/page.tsx')

    expect(engage).toContain("z.enum(['view', 'like', 'unlike', 'share'])")
    expect(engage).toContain('incrementArticleStat')
    expect(engagement).toContain('bumpArticleSharesBy')
    expect(actionBar).toContain('articleId')
    expect(actionBar).toContain("/api/pulse/articles/${articleId}/engage")
    expect(blogPage).toContain('ArticleViewTracker')
    expect(blogPage).toContain('articleId={article.id}')
  })

  it('redirects orphan artist blog id routes to the public slug or management list', () => {
    const orphan = read('app/artist/press/[id]/page.tsx')

    expect(orphan).toContain('/api/pulse/articles/${id}')
    expect(orphan).toContain('router.replace(`/blog/${data.article.slug}`)')
    expect(orphan).toContain('`/artist/press?edit=${encodeURIComponent(id)}`')
  })

  it('keeps /blog/new linked back to artist management', () => {
    const composer = read('app/blog/new/page.tsx')

    expect(composer).toContain("searchParams.get('from') === 'artist'")
    expect(composer).toContain('href="/artist/press"')
    expect(composer).toContain('Manage posts')
    expect(composer).toContain("router.push('/artist/press')")
  })
})

describe('getBlogAccountAuthor', () => {
  it('prefers stored active account snapshot over legacy profile joins', () => {
    expect(
      getBlogAccountAuthor({
        user_id: 'login-user-id',
        posted_as_profile_id: 'artist-id',
        posted_as_type: 'artist',
        account_display_name: 'The Active Artist',
        account_username: 'active-artist',
        account_avatar_url: 'https://example.com/avatar.jpg',
        account_is_verified: true,
        profiles: {
          id: 'login-user-id',
          username: 'personal',
          full_name: 'Personal User',
          avatar_url: null,
        },
      })
    ).toEqual({
      id: 'artist-id',
      type: 'artist',
      subtype: null,
      name: 'The Active Artist',
      username: 'active-artist',
      avatarUrl: 'https://example.com/avatar.jpg',
      isVerified: true,
    })
  })

  it('falls back to legacy profile author fields for older posts', () => {
    expect(
      getBlogAccountAuthor({
        user_id: 'login-user-id',
        profiles: {
          id: 'profile-id',
          username: 'personal',
          full_name: 'Personal User',
          avatar_url: 'https://example.com/personal.jpg',
          is_verified: true,
        },
      })
    ).toEqual({
      id: 'profile-id',
      type: 'general',
      subtype: null,
      name: 'Personal User',
      username: 'personal',
      avatarUrl: 'https://example.com/personal.jpg',
      isVerified: true,
    })
  })
})
