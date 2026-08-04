import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  FEED_POST_SELECT_VARIANTS,
  applyFeedScopeToQuery,
  fetchFeedPostsWithFallback,
  getFollowingFeedUserIds,
  isPostReadSchemaError,
} from '@/lib/feed/feed-posts-query'

const root = process.cwd()

function read(path: string) {
  return readFileSync(join(root, path), 'utf8')
}

class FakeQuery {
  operations: Array<{ method: string; column: string; value?: unknown }> = []

  constructor(
    private readonly supabase: FakeSupabase,
    readonly table: string,
    readonly selectColumns: string
  ) {}

  order(column: string) {
    this.operations.push({ method: 'order', column })
    return this
  }

  limit(value: number) {
    this.operations.push({ method: 'limit', column: 'limit', value })
    return this
  }

  range(from: number, to: number) {
    this.operations.push({ method: 'range', column: 'range', value: [from, to] })
    return this
  }

  eq(column: string, value: unknown) {
    this.operations.push({ method: 'eq', column, value })
    return this
  }

  in(column: string, value: unknown) {
    this.operations.push({ method: 'in', column, value })
    return this
  }

  or(value: string) {
    this.operations.push({ method: 'or', column: 'or', value })
    return this
  }

  then<TResult1 = unknown, TResult2 = never>(
    onfulfilled?: ((value: unknown) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ) {
    return Promise.resolve(this.supabase.resolve(this)).then(onfulfilled, onrejected)
  }
}

class FakeSupabase {
  queries: FakeQuery[] = []

  constructor(private readonly resolver: (query: FakeQuery) => unknown) {}

  from(table: string) {
    return {
      select: (columns: string) => {
        const query = new FakeQuery(this, table, columns)
        this.queries.push(query)
        return query
      },
    }
  }

  resolve(query: FakeQuery) {
    return this.resolver(query)
  }
}

class FakeRawSupabase {
  queries: FakeQuery[] = []

  constructor(private readonly rows: any[]) {}

  from(table: string) {
    return {
      select: (columns: string) => {
        const query = new FakeQuery(this as any, table, columns)
        this.queries.push(query)
        return query
      },
    }
  }

  resolve(query: FakeQuery) {
    if (query.selectColumns === '*') {
      return { data: this.rows, error: null }
    }

    return {
      data: null,
      error: {
        code: 'PGRST100',
        message: 'Unexpected filter parse error',
      },
    }
  }
}

describe('feed posts route helpers', () => {
  it('keeps unstable poll and appearance relations out of the canonical posts select', () => {
    const fullVariant = FEED_POST_SELECT_VARIANTS.find(variant => variant.name === 'full')!

    expect(fullVariant.selectColumns).toContain('posted_as_profile_id')
    expect(fullVariant.selectColumns).toContain('account_display_name')
    expect(fullVariant.selectColumns).not.toContain('poll_ends_at')
    expect(fullVariant.selectColumns).not.toContain('poll_total_votes')
    expect(fullVariant.selectColumns).not.toContain('post_appearances(')
  })
  it('includes the signed-in user and followed users in the following feed', () => {
    expect(
      getFollowingFeedUserIds('user-1', [
        { following_id: 'friend-1' },
        { following_id: 'friend-2' },
        { following_id: 'friend-1' },
        { following_id: null },
      ])
    ).toEqual(['user-1', 'friend-1', 'friend-2'])
  })

  it('keeps user ids and account profile ids in their matching following feed filters', () => {
    const fullVariant = FEED_POST_SELECT_VARIANTS.find(variant => variant.name === 'full')!
    const legacyVariant = FEED_POST_SELECT_VARIANTS.find(variant => variant.name === 'legacy_account')!
    const fullQuery = new FakeQuery(new FakeSupabase(() => ({})), 'posts', '')
    const legacyQuery = new FakeQuery(new FakeSupabase(() => ({})), 'posts', '')

    const scope = {
      type: 'following',
      userIdParam: null,
      profileIdFilter: null,
      authUserId: 'user-1',
      followingUserIds: ['user-1', 'friend-1'],
      ownedProfileIds: ['venue-1'],
      followingProfileIds: ['artist-friend-1'],
    }

    applyFeedScopeToQuery(fullQuery, fullVariant, scope)
    applyFeedScopeToQuery(legacyQuery, legacyVariant, scope)

    expect(fullQuery.operations).toContainEqual({
      method: 'or',
      column: 'or',
      value: 'user_id.in.(user-1,friend-1),posted_as_profile_id.in.(venue-1,artist-friend-1)',
    })
    expect(legacyQuery.operations).toContainEqual({
      method: 'in',
      column: 'user_id',
      value: ['user-1', 'friend-1'],
    })
  })

  it('falls personal profile filtering back to owner user_id when account columns are unavailable', () => {
    const fullVariant = FEED_POST_SELECT_VARIANTS.find(variant => variant.name === 'full')!
    const legacyVariant = FEED_POST_SELECT_VARIANTS.find(variant => variant.name === 'legacy_account')!
    const fullQuery = new FakeQuery(new FakeSupabase(() => ({})), 'posts', '')
    const legacyQuery = new FakeQuery(new FakeSupabase(() => ({})), 'posts', '')

    applyFeedScopeToQuery(fullQuery, fullVariant, {
      type: 'user',
      userIdParam: 'user-123',
      profileIdFilter: 'profile-123',
    })
    applyFeedScopeToQuery(legacyQuery, legacyVariant, {
      type: 'user',
      userIdParam: 'user-123',
      profileIdFilter: 'profile-123',
    })

    expect(fullQuery.operations).toContainEqual({
      method: 'or',
      column: 'or',
      value: 'posted_as_profile_id.eq.profile-123,user_id.in.(user-123,profile-123)',
    })
    expect(legacyQuery.operations).toContainEqual({
      method: 'in',
      column: 'user_id',
      value: ['user-123', 'profile-123'],
    })
  })

  it('filters all/discover feed to public posts when visibility is available', async () => {
    const supabase = new FakeSupabase(() => ({
      data: [{ id: 'post-1', user_id: 'user-1', content: 'Public post', created_at: '2026-07-03T00:00:00Z' }],
      error: null,
    }))

    const result = await fetchFeedPostsWithFallback(supabase, {
      type: 'all',
      userIdParam: null,
      profileIdFilter: null,
    }, 20, 0)

    expect(result.error).toBeNull()
    expect(supabase.queries[0].operations).toContainEqual({
      method: 'eq',
      column: 'visibility',
      value: 'public',
    })
  })

  it('allows public and friend-visible posts in the following feed', async () => {
    const supabase = new FakeSupabase(() => ({
      data: [],
      error: null,
    }))

    const result = await fetchFeedPostsWithFallback(supabase, {
      type: 'following',
      userIdParam: null,
      profileIdFilter: null,
      authUserId: 'user-1',
      followingUserIds: ['user-1', 'friend-1'],
    }, 20, 0)

    expect(result.error).toBeNull()
    expect(supabase.queries[0].operations).toContainEqual({
      method: 'in',
      column: 'visibility',
      value: ['public', 'followers'],
    })
  })

  it('does not surface friend-visible dashboard posts in all/discover fallback results', async () => {
    const supabase = new FakeRawSupabase([
      {
        id: 'friends-post',
        user_id: 'friend-1',
        content: 'Friends only',
        visibility: 'followers',
        created_at: '2026-07-03T01:00:00Z',
      },
      {
        id: 'public-post',
        user_id: 'user-2',
        content: 'Public',
        visibility: 'public',
        created_at: '2026-07-03T00:00:00Z',
      },
    ])

    const result = await fetchFeedPostsWithFallback(
      supabase as any,
      {
        type: 'all',
        userIdParam: null,
        profileIdFilter: null,
      },
      20,
      0
    )

    expect(result.error).toBeNull()
    expect(result.data?.map(post => post.id)).toEqual(['public-post'])
  })

  it('excludes private profile posts for non-owners', async () => {
    const supabase = new FakeRawSupabase([
      {
        id: 'private-post',
        user_id: 'owner-user-1',
        posted_as_profile_id: 'profile-1',
        content: 'Private',
        visibility: 'private',
        created_at: '2026-07-03T02:00:00Z',
      },
      {
        id: 'friends-post',
        user_id: 'owner-user-1',
        posted_as_profile_id: 'profile-1',
        content: 'Friends',
        visibility: 'followers',
        created_at: '2026-07-03T01:00:00Z',
      },
      {
        id: 'public-post',
        user_id: 'owner-user-1',
        posted_as_profile_id: 'profile-1',
        content: 'Public',
        visibility: 'public',
        created_at: '2026-07-03T00:00:00Z',
      },
    ])

    const result = await fetchFeedPostsWithFallback(
      supabase as any,
      {
        type: 'user',
        userIdParam: 'owner-user-1',
        profileIdFilter: 'profile-1',
        authUserId: 'viewer-user-1',
        viewerCanSeeFollowersPosts: false,
      },
      20,
      0
    )

    expect(result.error).toBeNull()
    expect(result.data?.map(post => post.id)).toEqual(['public-post'])
  })

  it('includes friend-visible posts on public profile reads for non-friends', async () => {
    const supabase = new FakeRawSupabase([
      {
        id: 'private-post',
        user_id: 'owner-user-1',
        posted_as_profile_id: 'profile-1',
        content: 'Private',
        visibility: 'private',
        created_at: '2026-07-03T02:00:00Z',
      },
      {
        id: 'friends-post',
        user_id: 'owner-user-1',
        posted_as_profile_id: 'profile-1',
        content: 'Friends',
        visibility: 'followers',
        created_at: '2026-07-03T01:00:00Z',
      },
      {
        id: 'public-post',
        user_id: 'owner-user-1',
        posted_as_profile_id: 'profile-1',
        content: 'Public',
        visibility: 'public',
        created_at: '2026-07-03T00:00:00Z',
      },
    ])

    const result = await fetchFeedPostsWithFallback(
      supabase as any,
      {
        type: 'user',
        userIdParam: 'owner-user-1',
        profileIdFilter: 'profile-1',
        authUserId: 'viewer-user-1',
        viewerCanSeeFollowersPosts: true,
      },
      20,
      0
    )

    expect(result.error).toBeNull()
    expect(result.data?.map(post => post.id)).toEqual(['friends-post', 'public-post'])
  })

  it('orders the all/discover feed by newest posts without global pinned priority', async () => {
    const supabase = new FakeSupabase(() => ({
      data: [],
      error: null,
    }))

    await fetchFeedPostsWithFallback(supabase, {
      type: 'all',
      userIdParam: null,
      profileIdFilter: 'active-account-1',
    }, 20, 0)

    const orderColumns = supabase.queries[0].operations
      .filter(operation => operation.method === 'order')
      .map(operation => operation.column)

    expect(orderColumns).toEqual(['created_at'])
  })

  it('orders following feeds by newest posts without global pinned priority', async () => {
    const supabase = new FakeSupabase(() => ({
      data: [],
      error: null,
    }))

    await fetchFeedPostsWithFallback(supabase, {
      type: 'following',
      userIdParam: null,
      profileIdFilter: null,
      authUserId: 'user-1',
      followingUserIds: ['user-1', 'friend-1'],
    }, 20, 0)

    const orderColumns = supabase.queries[0].operations
      .filter(operation => operation.method === 'order')
      .map(operation => operation.column)

    expect(orderColumns).toEqual(['created_at'])
  })

  it('keeps pinned-first ordering for author/profile feeds', async () => {
    const supabase = new FakeSupabase(() => ({
      data: [],
      error: null,
    }))

    await fetchFeedPostsWithFallback(supabase, {
      type: 'user',
      userIdParam: 'owner-user-1',
      profileIdFilter: 'artist-profile-1',
    }, 20, 0)

    const orderColumns = supabase.queries[0].operations
      .filter(operation => operation.method === 'order')
      .map(operation => operation.column)

    expect(orderColumns).toEqual(['is_pinned', 'created_at'])
  })

  it('retries with a safer select when optional post columns are missing', async () => {
    const supabase = new FakeSupabase(query => {
      if (query.selectColumns.includes('is_pinned')) {
        return {
          data: null,
          error: {
            code: 'PGRST204',
            message: "Could not find the 'is_pinned' column of 'posts' in the schema cache",
          },
        }
      }

      return {
        data: [{ id: 'post-1', user_id: 'user-1', content: 'Hello feed', created_at: '2026-07-03T00:00:00Z' }],
        error: null,
      }
    })

    const result = await fetchFeedPostsWithFallback(
      supabase,
      {
        type: 'following',
        userIdParam: null,
        profileIdFilter: null,
        authUserId: 'user-1',
        followingUserIds: ['user-1', 'friend-1'],
      },
      20,
      0
    )

    expect(result.error).toBeNull()
    expect(result.variantName).toBe('account_minimal')
    expect(result.data).toHaveLength(1)
    expect(supabase.queries).toHaveLength(3)
    expect(supabase.queries[2].operations).toContainEqual({
      method: 'or',
      column: 'or',
      value: 'user_id.in.(user-1,friend-1)',
    })
  })

  it('recognizes article/feed optional schema errors as retryable', () => {
    expect(
      isPostReadSchemaError({
        code: 'PGRST204',
        message: "Could not find the 'content_ref_type' column of 'posts' in the schema cache",
      })
    ).toBe(true)
  })

  it('treats missing posts-to-profiles relationship embeds as retryable schema errors', () => {
    expect(
      isPostReadSchemaError({
        code: 'PGRST200',
        message: "Could not find a relationship between 'posts' and 'user_id' in the schema cache",
        details: "Searched for a foreign key relationship between 'posts' and 'user_id' in the schema 'public', but no matches were found.",
      })
    ).toBe(true)
  })

  it('falls back to minimal rows when older posts schemas are missing media/count columns', async () => {
    const supabase = new FakeSupabase(query => {
      if (query.selectColumns.includes('media_urls')) {
        return {
          data: null,
          error: {
            code: 'PGRST204',
            message: "Could not find the 'media_urls' column of 'posts' in the schema cache",
          },
        }
      }

      return {
        data: [{ id: 'post-1', user_id: 'user-1', content: 'Legacy post', created_at: '2026-07-03T00:00:00Z' }],
        error: null,
      }
    })

    const result = await fetchFeedPostsWithFallback(
      supabase,
      {
        type: 'following',
        userIdParam: null,
        profileIdFilter: null,
        authUserId: 'user-1',
        followingUserIds: ['user-1'],
      },
      20,
      0
    )

    expect(result.error).toBeNull()
    expect(result.variantName).toBe('account_minimal')
    expect(result.data).toEqual([
      { id: 'post-1', user_id: 'user-1', content: 'Legacy post', created_at: '2026-07-03T00:00:00Z' },
    ])
  })

  it('uses raw posts fallback when Supabase rejects the shaped query with a non-schema error', async () => {
    const supabase = new FakeRawSupabase([
      {
        id: 'private-post',
        user_id: 'user-1',
        content: 'Private',
        visibility: 'private',
        created_at: '2026-07-03T01:00:00Z',
      },
      {
        id: 'public-post',
        user_id: 'user-2',
        content: 'Public',
        visibility: 'public',
        created_at: '2026-07-03T00:00:00Z',
      },
    ])

    const result = await fetchFeedPostsWithFallback(
      supabase as any,
      {
        type: 'all',
        userIdParam: null,
        profileIdFilter: null,
      },
      20,
      0
    )

    expect(result.error).toBeNull()
    expect(result.variantName).toBe('raw_star')
    const rawQuery = supabase.queries.find(query => query.selectColumns === '*')!
    const orderIndex = rawQuery.operations.findIndex(operation =>
      operation.method === 'order' && operation.column === 'created_at'
    )
    const limitIndex = rawQuery.operations.findIndex(operation =>
      operation.method === 'limit' && operation.column === 'limit'
    )
    expect(orderIndex).toBeGreaterThanOrEqual(0)
    expect(limitIndex).toBeGreaterThan(orderIndex)
    expect(result.data).toEqual([
      {
        id: 'public-post',
        user_id: 'user-2',
        content: 'Public',
        visibility: 'public',
        created_at: '2026-07-03T00:00:00Z',
      },
    ])
  })

  it('keeps account-scoped article feed posts in author feeds', async () => {
    const supabase = new FakeRawSupabase([
      {
        id: 'new-article-feed-post',
        user_id: 'owner-user-1',
        posted_as_profile_id: 'artist-profile-1',
        posted_as_type: 'artist',
        content_ref_type: 'article',
        content_ref_id: 'article-1',
        visibility: 'public',
        content: 'New article',
        created_at: '2026-07-04T10:00:00Z',
      },
      {
        id: 'legacy-owner-post',
        user_id: 'owner-user-1',
        visibility: 'public',
        content: 'Legacy owner post',
        created_at: '2026-07-04T09:00:00Z',
      },
      {
        id: 'other-artist-post',
        user_id: 'owner-user-2',
        posted_as_profile_id: 'artist-profile-2',
        visibility: 'public',
        content: 'Not this artist',
        created_at: '2026-07-04T08:00:00Z',
      },
    ])

    const result = await fetchFeedPostsWithFallback(
      supabase as any,
      {
        type: 'user',
        userIdParam: 'owner-user-1',
        profileIdFilter: 'artist-profile-1',
      },
      20,
      0
    )

    expect(result.error).toBeNull()
    expect(result.variantName).toBe('raw_star')
    expect(result.data?.map(post => post.id)).toEqual([
      'new-article-feed-post',
      'legacy-owner-post',
    ])
    expect(result.data?.[0].content_ref_type).toBe('article')
  })

  it('strict attribution keeps only posted_as_profile_id matches in author feeds', async () => {
    const fullVariant = FEED_POST_SELECT_VARIANTS.find(variant => variant.name === 'full')!
    const fullQuery = new FakeQuery(new FakeSupabase(() => ({})), 'posts', '')

    applyFeedScopeToQuery(fullQuery, fullVariant, {
      type: 'user',
      userIdParam: 'owner-user-1',
      profileIdFilter: 'artist-profile-1',
      attribution: 'strict',
    })

    expect(fullQuery.operations).toContainEqual({
      method: 'eq',
      column: 'posted_as_profile_id',
      value: 'artist-profile-1',
    })
    expect(fullQuery.operations.some(operation => operation.method === 'or')).toBe(false)

    const supabase = new FakeRawSupabase([
      {
        id: 'artist-post',
        user_id: 'owner-user-1',
        posted_as_profile_id: 'artist-profile-1',
        visibility: 'public',
        content: 'Artist post',
        created_at: '2026-07-04T10:00:00Z',
      },
      {
        id: 'venue-post',
        user_id: 'owner-user-1',
        posted_as_profile_id: 'venue-profile-1',
        visibility: 'public',
        content: 'Venue post',
        created_at: '2026-07-04T09:00:00Z',
      },
      {
        id: 'legacy-owner-post',
        user_id: 'owner-user-1',
        visibility: 'public',
        content: 'Legacy owner post',
        created_at: '2026-07-04T08:00:00Z',
      },
    ])

    const result = await fetchFeedPostsWithFallback(
      supabase as any,
      {
        type: 'user',
        userIdParam: 'owner-user-1',
        profileIdFilter: 'artist-profile-1',
        attribution: 'strict',
      },
      20,
      0
    )

    expect(result.error).toBeNull()
    expect(result.data?.map(post => post.id)).toEqual(['artist-post'])
  })

  it('routes legacy feed and pulse surfaces to News Pulse', () => {
    expect(read('app/feed/page.tsx')).toContain("redirect('/news')")
    expect(read('app/news/page.tsx')).toContain('NewsPage')
  })

  it('routes News navigation to /news', () => {
    expect(read('components/nav.tsx')).toContain("router.push('/news')")
    expect(read('components/unified-navigation.tsx')).toContain("href: '/news'")
  })

  it('loads the dashboard feed from the friends tab by default', () => {
    expect(read('components/dashboard/dashboard-feed.tsx')).toContain("useState('following')")
  })

  it('preserves just-created dashboard posts during the first refresh', () => {
    const source = read('components/dashboard/dashboard-feed.tsx')

    expect(source).toContain('recentlyCreatedPostsRef')
    expect(source).toContain('mergeRecentlyCreatedPosts')
    expect(source).toContain('handleDashboardPostCreated')
  })

  it('returns both data and post for created feed posts', () => {
    const source = read('app/api/feed/posts/route.ts')
    const createSource = read('app/api/posts/create/route.ts')

    expect(source).toContain('return createPost(createRequest)')
    expect(createSource).toContain('data: normalizedPost')
    expect(createSource).toContain('post: normalizedPost')
  })

  it('enriches feed rows before normalization so fallback reads still have authors', () => {
    const source = read('app/api/feed/posts/route.ts')

    expect(source).toContain('resolveAccountAuthorSnapshotsBatch')
    expect(source).toContain('enrichFeedPosts')
    expect(source).toContain('resolved_author')
  })

  it('hydrates and returns immutable post appearances even after a posts-query fallback', () => {
    const source = read('app/api/feed/posts/route.ts')
    const dtoSource = read('lib/feed/feed-post-dto.ts')

    expect(source).toContain('fetchPostAppearances')
    expect(source).toContain(".from('post_appearances')")
    expect(source).toContain('appearancesByPost.get(post.id)')
    expect(dtoSource).toContain('post_appearances: appearance')
    expect(dtoSource).toContain('appearance,')
  })

  it('returns the canonical author contract and current entity profile path', () => {
    const source = read('app/api/feed/posts/route.ts')
    const dtoSource = read('lib/feed/feed-post-dto.ts')

    expect(source).toContain('resolveAuthorsForPosts(supabase, safePosts)')
    expect(source).not.toContain('.filter(authorNeedsRefresh)')
    expect(dtoSource).toContain('displayName: author.name')
    expect(dtoSource).toContain('profilePath,')
    expect(dtoSource).toContain('author: {')
    expect(source).toContain('normalizeFeedPostDTO')
  })

  it('renders dashboard posts through the shared appearance boundary', () => {
    const source = read('components/dashboard/dashboard-feed.tsx')

    expect(source).toContain('PostAppearanceBoundary')
    expect(source).toContain('appearance={post.appearance ?? post.post_appearances}')
    expect(source).toContain('enabled={postStyleFlags.post_styles_read}')
  })

  it('returns article linkage metadata from normalized feed posts', () => {
    const source = read('lib/feed/feed-post-dto.ts')
    const querySource = read('lib/feed/feed-posts-query.ts')

    expect(querySource).toContain('content_ref_type')
    expect(querySource).toContain('content_ref_id')
    expect(source).toContain('content_ref_type: post.content_ref_type || null')
    expect(source).toContain('content_ref_id: post.content_ref_id || null')
  })

  it('enriches article-linked feed posts with clickable article previews', () => {
    const source = read('app/api/feed/posts/route.ts')
    const dtoSource = read('lib/feed/feed-post-dto.ts')

    expect(source).toContain('fetchArticlePreviews')
    expect(source).toContain("post?.content_ref_type === 'article'")
    expect(source).toContain("url: slug ? `/blog/${slug}` : null")
    expect(dtoSource).toContain('article_preview: post.article_preview || null')
    expect(source).toContain('.from(\'artist_blog_posts\')')
    expect(source).toContain(".eq('status', 'published')")
  })

  it('enriches music feed posts with track previews', () => {
    const source = read('app/api/feed/posts/route.ts')
    const dtoSource = read('lib/feed/feed-post-dto.ts')

    expect(source).toContain('fetchTrackPreviews')
    expect(source).toContain('track_preview: trackPreview')
    expect(dtoSource).toContain('track_preview: post.track_preview || null')
  })

  it('renders article previews in both feed surfaces', () => {
    const dashboardSource = read('components/dashboard/dashboard-feed.tsx')
    const feedSource = read('components/feed/social-feed.tsx')
    const previewSource = read('components/feed/article-feed-preview.tsx')

    for (const source of [dashboardSource, feedSource]) {
      expect(source).toContain('ArticleFeedPreview')
      expect(source).toContain("post.content_ref_type === 'article'")
      expect(source).toContain('post.article_preview')
    }

    expect(previewSource).toContain('Read article')
    expect(previewSource).toContain('href={href}')
    expect(previewSource).not.toContain('openPhotoViewer')
  })
})
