import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiRequest } from '@/lib/auth/api-auth'
import type { AccountAuthor } from '@/lib/accounts/account-author'
import {
  resolveAccountAuthorSnapshotsBatch,
  resolveActingAccountSnapshot,
} from '@/lib/accounts/acting-account-snapshot'
import { fetchFeedPostsWithFallback, getFollowingFeedUserIds, profileIdsFromFollowedAccounts } from '@/lib/feed/feed-posts-query'
import {
  fetchTrackPreviews,
  getMusicTrackIdFromPost,
  getStoredTrackPreview,
  isMusicFeedPost,
} from '@/lib/feed/music-post-preview'
import { hydratePostsWithPolls } from '@/lib/polls/hydrate-polls'
import { startRouteTiming } from '@/lib/observability/route-timing'
import { normalizeFeedMediaUrls } from '@/lib/feed/media-url-utils'
import { normalizeFeedPostDTO } from '@/lib/feed/feed-post-dto'
import { getManageablePostIds } from '@/lib/feed/post-management'
import { POST as createPost } from '@/app/api/posts/create/route'
import { decodeFeedCursor, encodeFeedCursor } from '@/lib/feed/feed-cursor'

const ARTICLE_PREVIEW_SELECT = `
  id,
  title,
  slug,
  excerpt,
  content,
  featured_image_url,
  tags,
  categories,
  published_at,
  created_at
`

function unique(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter(Boolean) as string[]))
}

function firstRelated<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

async function safeSelectProfileIds(
  supabase: any,
  table: string,
  column: string,
  ownerIds: string[]
) {
  if (ownerIds.length === 0) return []

  try {
    const { data, error } = await supabase
      .from(table)
      .select('id')
      .in(column, ownerIds)

    if (error) {
      console.warn(`[Feed Posts API] Failed to read ${table}.${column} profile ids:`, error)
      return []
    }

    return (data || []).map((row: any) => row.id).filter(Boolean)
  } catch (error) {
    console.warn(`[Feed Posts API] Failed to read ${table}.${column} profile ids:`, error)
    return []
  }
}

async function getAccountProfileIdsForUsers(supabase: any, ownerIds: string[]) {
  const safeOwnerIds = unique(ownerIds)
  if (safeOwnerIds.length === 0) return []

  const [
    artistIds,
    venueUserIds,
    venueMainProfileIds,
    organizerIds,
  ] = await Promise.all([
    safeSelectProfileIds(supabase, 'artist_profiles', 'user_id', safeOwnerIds),
    safeSelectProfileIds(supabase, 'venue_profiles', 'user_id', safeOwnerIds),
    safeSelectProfileIds(supabase, 'venue_profiles', 'main_profile_id', safeOwnerIds),
    safeSelectProfileIds(supabase, 'organizer_accounts', 'user_id', safeOwnerIds),
  ])

  return unique([
    ...artistIds,
    ...venueUserIds,
    ...venueMainProfileIds,
    ...organizerIds,
  ])
}

function isPublicProfileAccountSettings(accountSettings: unknown) {
  const settings = accountSettings && typeof accountSettings === 'object'
    ? accountSettings as Record<string, any>
    : {}
  const privacy = settings.privacy && typeof settings.privacy === 'object'
    ? settings.privacy as Record<string, any>
    : {}

  if (typeof privacy.profile_visibility === 'string') {
    return privacy.profile_visibility === 'public'
  }

  if (typeof privacy.profile_public === 'boolean') {
    return privacy.profile_public
  }

  return true
}

async function resolveProfileFeedVisibilityAccess({
  supabase,
  viewerUserId,
  ownerUserId,
  profileId,
}: {
  supabase: any
  viewerUserId?: string | null
  ownerUserId?: string | null
  profileId?: string | null
}) {
  const visibilityTargetIds = unique([ownerUserId, profileId])
  const profileSettingsId = ownerUserId || profileId || null
  const viewerOwnsProfile = Boolean(viewerUserId && visibilityTargetIds.includes(viewerUserId))

  let profileIsPublic = true
  if (profileSettingsId) {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, account_settings')
        .eq('id', profileSettingsId)
        .maybeSingle()

      if (!error && profile) {
        profileIsPublic = isPublicProfileAccountSettings(profile.account_settings)
      }
    } catch (error) {
      console.warn('[Feed Posts API] Failed to read profile visibility settings:', error)
    }
  }

  let viewerFollowsProfileOwner = false
  if (viewerUserId && !viewerOwnsProfile && visibilityTargetIds.length > 0) {
    try {
      const { data: follows, error } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', viewerUserId)
        .in('following_id', visibilityTargetIds)
        .limit(1)

      viewerFollowsProfileOwner = !error && Boolean(follows?.length)
    } catch (error) {
      console.warn('[Feed Posts API] Failed to read profile follow relationship:', error)
    }
  }

  return {
    viewerOwnsProfile,
    viewerCanSeeFollowersPosts: viewerOwnsProfile || viewerFollowsProfileOwner,
    profileIsPublic,
  }
}

async function createFeedReadClient(authResult: Awaited<ReturnType<typeof authenticateApiRequest>>) {
  const fallbackSupabase = authResult?.supabase || await (async () => {
    const { createClient } = await import('@/lib/supabase/server')
    return createClient()
  })()

  try {
    const { createServiceRoleClient } = await import('@/lib/supabase/service-role')
    return createServiceRoleClient()
  } catch (error) {
    console.warn('[Feed Posts API] Service read client unavailable; using request-scoped Supabase client.', error)
    return fallbackSupabase
  }
}

async function fetchOwnerProfiles(supabase: any, posts: any[]) {
  const userIds = Array.from(
    new Set(posts.map(post => post?.user_id).filter(Boolean))
  )

  if (userIds.length === 0) return new Map<string, any>()

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, full_name, avatar_url, is_verified')
    .in('id', userIds)

  if (error) {
    console.warn('[Feed Posts API] Failed to enrich owner profiles:', error)
    return new Map<string, any>()
  }

  return new Map((data || []).map((profile: any) => [profile.id, profile]))
}

async function resolveAuthorsForPosts(supabase: any, posts: any[]) {
  const keys = Array.from(
    new Set(
      posts
        .map(post => {
          const profileId = post.posted_as_profile_id || post.user_id
          const accountType = post.posted_as_type || 'general'
          return profileId ? `${accountType}:${profileId}:${post.user_id || ''}` : null
        })
        .filter(Boolean) as string[]
    )
  )

  return resolveAccountAuthorSnapshotsBatch(supabase, keys)
}

function normalizeArticlePreview(row: any) {
  const content = String(row?.content || '')
  const slug = String(row?.slug || '')

  return {
    id: row?.id,
    slug,
    url: slug ? `/blog/${slug}` : null,
    title: row?.title || 'Untitled article',
    excerpt: row?.excerpt || content.slice(0, 220),
    featuredImageUrl: row?.featured_image_url || null,
    categories: Array.isArray(row?.categories) ? row.categories : [],
    tags: Array.isArray(row?.tags) ? row.tags : [],
    readingTime: Math.max(1, Math.ceil(content.trim().split(/\s+/).filter(Boolean).length / 200)),
    publishedAt: row?.published_at || row?.created_at || null,
  }
}

async function fetchArticlePreviews(supabase: any, posts: any[]) {
  const articleIds = unique(
    posts
      .filter(post => post?.content_ref_type === 'article')
      .map(post => post?.content_ref_id)
  )

  if (articleIds.length === 0) return new Map<string, any>()

  const { data, error } = await supabase
    .from('artist_blog_posts')
    .select(ARTICLE_PREVIEW_SELECT)
    .in('id', articleIds)
    .eq('status', 'published')

  if (error) {
    console.warn('[Feed Posts API] Failed to enrich article previews:', error)
    return new Map<string, any>()
  }

  return new Map((data || []).map((article: any) => [article.id, normalizeArticlePreview(article)]))
}

async function fetchActualCommentCounts(supabase: any, posts: any[]) {
  const postIds = unique(posts.map((post: any) => post?.id))
  if (postIds.length === 0) return new Map<string, number>()

  try {
    const { data, error } = await supabase
      .from('post_comments')
      .select('post_id')
      .in('post_id', postIds)

    if (error) {
      console.warn('[Feed Posts API] Failed to reconcile comment counts:', error)
      return new Map<string, number>()
    }

    const counts = new Map<string, number>()
    for (const row of data || []) {
      if (!row?.post_id) continue
      counts.set(row.post_id, (counts.get(row.post_id) || 0) + 1)
    }
    return counts
  } catch (error) {
    console.warn('[Feed Posts API] Failed to reconcile comment counts:', error)
    return new Map<string, number>()
  }
}

function getStoredArticlePreview(post: any) {
  const metadata = post?.metadata && typeof post.metadata === 'object' ? post.metadata : null
  const preview = metadata?.article_preview
  if (!preview || typeof preview !== 'object') return null

  const slug = String(preview.slug || '')
  const url = typeof preview.url === 'string' ? preview.url : (slug ? `/blog/${slug}` : null)

  return {
    id: preview.id || post.content_ref_id || null,
    slug,
    url,
    title: preview.title || 'Untitled article',
    excerpt: preview.excerpt || '',
    featuredImageUrl: preview.featuredImageUrl || null,
    categories: Array.isArray(preview.categories) ? preview.categories : [],
    tags: Array.isArray(preview.tags) ? preview.tags : [],
    readingTime: Number(preview.readingTime || 1),
    publishedAt: preview.publishedAt || post.created_at || null,
  }
}

function getStoredListingPreview(post: any) {
  const metadata = post?.metadata && typeof post.metadata === 'object' ? post.metadata : null
  const preview = metadata?.listing_preview
  if (!preview || typeof preview !== 'object') return null
  return {
    id: preview.id || post.content_ref_id || null,
    title: preview.title || 'Listing',
    description: preview.description || null,
    price: preview.price ?? null,
    currency: preview.currency || 'USD',
    coverImageUrl: preview.coverImageUrl || null,
    category: preview.category || null,
    productType: preview.productType || null,
    url: preview.url || (preview.id ? `/marketplace/listings/${preview.id}` : null),
  }
}

function getStoredEventPreview(post: any) {
  const metadata = post?.metadata && typeof post.metadata === 'object' ? post.metadata : null
  const preview = metadata?.event_preview
  if (!preview || typeof preview !== 'object') return null
  const id = preview.id || post.content_ref_id || null
  const slug = preview.slug || null
  return {
    id,
    slug,
    title: preview.title || 'Untitled event',
    url: preview.url || (slug || id ? `/events/${slug || id}` : null),
    eventDate: preview.eventDate || null,
    venueName: preview.venueName || null,
    location: preview.location || null,
    posterUrl: preview.posterUrl || null,
  }
}

async function fetchAcceptedCollaborators(supabase: any, posts: any[]) {
  const postIds = unique(posts.map((post: any) => post?.id))
  if (postIds.length === 0) return new Map<string, any[]>()

  try {
    const { data, error } = await supabase
      .from('feed_post_collaborators')
      .select('post_id, collaborator_user_id, collaborator_profile_id, status')
      .in('post_id', postIds)
      .eq('status', 'accepted')

    if (error || !data?.length) return new Map<string, any[]>()

    const userIds = unique(data.map((row: any) => row.collaborator_user_id))
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url')
      .in('id', userIds)

    const profileMap = new Map<string, { username?: string | null; full_name?: string | null; avatar_url?: string | null }>(
      (profiles || []).map((p: any) => [p.id, p])
    )
    const byPost = new Map<string, any[]>()

    for (const row of data) {
      const profile = profileMap.get(row.collaborator_user_id)
      const entry = {
        user_id: row.collaborator_user_id,
        profile_id: row.collaborator_profile_id,
        status: row.status,
        username: profile?.username || profile?.full_name || 'Collaborator',
        avatar_url: profile?.avatar_url || null,
      }
      const list = byPost.get(row.post_id) || []
      list.push(entry)
      byPost.set(row.post_id, list)
    }

    return byPost
  } catch {
    return new Map<string, any[]>()
  }
}

/**
 * Appearance snapshots are hydrated separately from the posts select so a
 * missing optional posts column cannot silently strip styles from older feed
 * rows when the query falls back to a compatibility select.
 */
async function fetchPostAppearances(supabase: any, posts: any[]) {
  const postIds = unique(posts.map((post) => post?.id))
  if (postIds.length === 0) return new Map<string, any>()

  try {
    const { data, error } = await supabase
      .from('post_appearances')
      .select('post_id, template_id, template_version, schema_version, snapshot, snapshot_hash, status')
      .in('post_id', postIds)

    if (error) {
      console.warn('[Feed Posts API] Failed to hydrate post appearances:', error)
      return new Map<string, any>()
    }

    return new Map((data || []).map((appearance: any) => [appearance.post_id, appearance]))
  } catch (error) {
    console.warn('[Feed Posts API] Post appearance hydration unavailable:', error)
    return new Map<string, any>()
  }
}

async function fetchViewerLikedPostIds(
  supabase: any,
  posts: any[],
  viewerUserId?: string | null,
) {
  if (!viewerUserId) return new Set<string>()
  const postIds = unique(posts.map((post) => post?.id))
  if (postIds.length === 0) return new Set<string>()

  try {
    const { data, error } = await supabase
      .from('post_likes')
      .select('post_id')
      .eq('user_id', viewerUserId)
      .in('post_id', postIds)

    if (error) return new Set<string>()
    return new Set<string>((data || []).map((row: any) => row.post_id).filter(Boolean))
  } catch {
    return new Set<string>()
  }
}

async function enrichFeedPosts(
  supabase: any,
  posts: any[] | null | undefined,
  viewerUserId?: string | null
) {
  const safePosts = posts || []
  if (safePosts.length === 0) return []

  const [ownerProfiles, resolvedAuthors, articlePreviews, trackPreviews, withPolls, actualCommentCounts, manageablePostIds, collaboratorsByPost, appearancesByPost, viewerLikedPostIds] = await Promise.all([
    fetchOwnerProfiles(supabase, safePosts),
    resolveAuthorsForPosts(supabase, safePosts),
    fetchArticlePreviews(supabase, safePosts),
    fetchTrackPreviews(supabase, safePosts),
    hydratePostsWithPolls({ supabase, posts: safePosts, viewerUserId }),
    fetchActualCommentCounts(supabase, safePosts),
    getManageablePostIds({ supabase, posts: safePosts, userId: viewerUserId }),
    fetchAcceptedCollaborators(supabase, safePosts),
    fetchPostAppearances(supabase, safePosts),
    fetchViewerLikedPostIds(supabase, safePosts, viewerUserId),
  ])

  return withPolls.map(post => {
    const profile = firstRelated(post.profiles) || ownerProfiles.get(post.user_id) || null
    const profileId = post.posted_as_profile_id || post.user_id
    const accountType = post.posted_as_type || 'general'
    const resolvedAuthor = resolvedAuthors.get(`${accountType}:${profileId}:${post.user_id || ''}`) || null
    const articlePreview = post.content_ref_type === 'article'
      ? articlePreviews.get(post.content_ref_id) || getStoredArticlePreview(post)
      : null
    const listingPreview = post.content_ref_type === 'marketplace_listing'
      ? getStoredListingPreview(post)
      : null
    const eventPreview =
      post.content_ref_type === 'event' || post.content_ref_type === 'event_update'
        ? post.event_preview || getStoredEventPreview(post)
        : null
    const trackId = getMusicTrackIdFromPost(post)
    const trackPreview = isMusicFeedPost(post)
      ? (trackId ? trackPreviews.get(trackId) : null) || getStoredTrackPreview(post)
      : null

    return {
      ...post,
      media_urls: normalizeFeedMediaUrls(post.media_urls),
      comments_count: actualCommentCounts.get(post.id) ?? Number(post.comments_count || 0),
      viewer_can_manage: manageablePostIds.has(post.id),
      profiles: post.profiles || profile,
      resolved_author: resolvedAuthor,
      article_preview: articlePreview,
      listing_preview: listingPreview,
      event_preview: eventPreview,
      track_preview: trackPreview,
      collaborators: collaboratorsByPost.get(post.id) || [],
      tagged_users: Array.isArray(post.tagged_users) ? post.tagged_users : [],
      post_appearances:
        appearancesByPost.get(post.id) || firstRelated(post.post_appearances) || null,
      is_liked: viewerLikedPostIds.has(post.id),
    }
  })
}

export async function GET(request: NextRequest) {
  const endTiming = startRouteTiming('/api/feed/posts')
  try {
    const authResult = await authenticateApiRequest(request)
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'all'
    const user_id = searchParams.get('user_id')
    const requestedLimit = Number.parseInt(searchParams.get('limit') || '20', 10)
    const limit = Number.isFinite(requestedLimit) ? Math.min(50, Math.max(1, requestedLimit)) : 20
    const cursorParam = searchParams.get('cursor')
    const decodedCursor = decodeFeedCursor(cursorParam)
    if (cursorParam && decodedCursor === null) {
      return NextResponse.json(
        { success: false, error: { code: 'invalid_cursor', message: 'The feed cursor is invalid.' }, data: [] },
        { status: 400 },
      )
    }
    const legacyOffset = Number.parseInt(searchParams.get('offset') || '0', 10)
    const offset = decodedCursor ?? (Number.isFinite(legacyOffset) ? Math.max(0, legacyOffset) : 0)
    const excludePinned = searchParams.get('exclude_pinned') === 'true'

    const supabase = await createFeedReadClient(authResult)

    // Fetch feed posts (profiles hydrated in enrichFeedPosts; no table probe round-trip).
    try {
      // Filter by user when explicitly requested.
      // Support ?profile_id= to show only posts made by a specific entity account.
      // attribution=strict → posted_as_profile_id only (no other owned-account posts).
      const profileIdFilter = searchParams.get('profile_id')
      const attributionParam = searchParams.get('attribution')
      const attribution = attributionParam === 'strict' ? 'strict' as const : 'legacy' as const
      let followingUserIds: string[] | undefined
      let followingProfileIds: string[] | undefined
      let ownedProfileIds: string[] | undefined
      let membershipProfileIds: string[] | undefined
      let extraPostIds: string[] | undefined
      let acceptedCollabPostIds: string[] | undefined
      let profileFeedVisibilityAccess:
        | Awaited<ReturnType<typeof resolveProfileFeedVisibilityAccess>>
        | undefined

      // Handle following feed - friends (user follows) + account follows (persona updates)
      if (type === 'following' && authResult?.user) {
        const [{ data: followingData, error: followingError }, { data: accountFollowRows }] =
          await Promise.all([
            supabase
              .from('follows')
              .select('following_id')
              .eq('follower_id', authResult.user.id),
            supabase
              .from('account_follows')
              .select('account_id')
              .eq('follower_user_id', authResult.user.id),
          ])

        if (followingError) {
          console.error('[Feed Posts API] Error fetching following relationships:', followingError)
          return NextResponse.json({
            success: true,
            data: [],
            message: "Your following feed isn't ready yet. Discover posts while your network catches up.",
            warning: { code: 'following_lookup_failed', message: 'Failed to fetch following relationships' },
          })
        }

        followingUserIds = getFollowingFeedUserIds(authResult.user.id, followingData)
        ownedProfileIds = unique([
          searchParams.get('profile_id'),
          ...(await getAccountProfileIdsForUsers(supabase, [authResult.user.id])),
        ])

        const followedAccountIds = unique(
          (accountFollowRows || []).map((row: any) => row.account_id).filter(Boolean)
        )

        let accountProfileIds: string[] = []
        if (followedAccountIds.length > 0) {
          const { data: followedAccounts } = await supabase
            .from('accounts')
            .select('id, profile_id, owner_user_id')
            .in('id', followedAccountIds)

          accountProfileIds = profileIdsFromFollowedAccounts(followedAccounts)
        }

        // Persona posts come from account_follows only (not expand-all-personas from user follows).
        followingProfileIds = unique([...accountProfileIds, ...(ownedProfileIds || [])])
      }

      // Personalized home: follows + pages + band/org membership + tags + accepted collabs
      if ((type === 'home' || type === 'tagged') && authResult?.user) {
        const {
          resolveHomeFeedScope,
        } = await import('@/lib/feed/resolve-home-feed-scope')
        const homeScope = await resolveHomeFeedScope(supabase, authResult.user.id)
        followingUserIds = homeScope.followingUserIds
        followingProfileIds = homeScope.followingProfileIds
        ownedProfileIds = homeScope.ownedProfileIds
        membershipProfileIds = homeScope.membershipProfileIds
        extraPostIds = homeScope.extraPostIds
      }

      if (type === 'home' && !authResult?.user) {
        return NextResponse.json(
          { success: false, error: { code: 'unauthorized', message: 'Sign in to view your home feed' }, data: [] },
          { status: 401 }
        )
      }

      if (type === 'tagged' && !authResult?.user) {
        return NextResponse.json(
          { success: false, error: { code: 'unauthorized', message: 'Sign in to view tagged posts' }, data: [] },
          { status: 401 }
        )
      }

      if (type === 'user') {
        profileFeedVisibilityAccess = await resolveProfileFeedVisibilityAccess({
          supabase,
          viewerUserId: authResult?.user?.id || null,
          ownerUserId: user_id,
          profileId: profileIdFilter,
        })

        if (!profileFeedVisibilityAccess.profileIsPublic && !profileFeedVisibilityAccess.viewerOwnsProfile) {
          return NextResponse.json({ success: true, data: [], next_cursor: null })
        }

        const {
          resolveAcceptedCollabPostIdsForProfile,
        } = await import('@/lib/feed/resolve-home-feed-scope')
        acceptedCollabPostIds = await resolveAcceptedCollabPostIdsForProfile(supabase, {
          profileId: profileIdFilter,
          userId: user_id,
        })
      }

      // Ignore non-post "types" like 'network' to avoid bad filters

      const { data: basePosts, error: baseError } = await fetchFeedPostsWithFallback(
        supabase,
        {
          type,
          userIdParam: user_id,
          profileIdFilter,
          authUserId: authResult?.user?.id || null,
          followingUserIds,
          followingProfileIds,
          ownedProfileIds,
          membershipProfileIds,
          extraPostIds,
          acceptedCollabPostIds,
          viewerOwnsProfile: profileFeedVisibilityAccess?.viewerOwnsProfile,
          viewerCanSeeFollowersPosts: profileFeedVisibilityAccess?.viewerCanSeeFollowersPosts,
          attribution,
          excludePinned,
        },
        limit,
        offset
      )

      if (baseError) {
        console.error('[Feed Posts API] Error fetching base posts:', baseError)
        return NextResponse.json(
          { success: false, error: { code: 'fetch_posts_failed', message: 'Failed to fetch posts' }, data: [] },
          { status: 500 }
        )
      }

      const enrichedPosts = await enrichFeedPosts(supabase, basePosts, authResult?.user?.id || null)
      let normalized = enrichedPosts.map(normalizeFeedPostDTO)

      // Additive: merge organizer event updates for attending users (not Your Posts).
      const canMergeAttendingUpdates =
        Boolean(authResult?.user) &&
        type !== 'user' &&
        offset === 0

      if (canMergeAttendingUpdates && authResult?.user) {
        try {
          const {
            fetchAttendingEventFeedPosts,
            mergeAttendingEventPostsIntoFeed,
          } = await import('@/lib/feed/attending-event-posts')

          const attendingUpdates = await fetchAttendingEventFeedPosts({
            supabase,
            userId: authResult.user.id,
            limit,
          })

          const merged = mergeAttendingEventPostsIntoFeed({
            posts: normalized,
            eventPosts: attendingUpdates,
            limit,
            offset,
          })

          normalized = merged.map((post) =>
            post.content_ref_type === 'event_update'
              ? normalizeFeedPostDTO(post)
              : post
          )
        } catch (mergeError) {
          console.warn('[Feed Posts API] Attending event merge skipped:', mergeError)
        }
      }

      endTiming({
        userId: authResult?.user?.id,
        rowCount: normalized.length,
        metadata: { type, limit, offset },
      })
      const nextCursor = normalized.length === limit ? encodeFeedCursor(offset + normalized.length) : null
      return NextResponse.json({ success: true, data: normalized, next_cursor: nextCursor })
    } catch (error) {
      console.error('[Feed Posts API] Posts table error:', error)
      endTiming({ metadata: { error: true, stage: 'table' } })
      return NextResponse.json(
        { success: false, error: { code: 'feed_query_failed', message: 'Failed to fetch feed posts' }, data: [] },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('[Feed Posts API] Error:', error)
    endTiming({ metadata: { error: true } })
    return NextResponse.json(
      { success: false, error: { code: 'internal_error', message: 'Internal server error' }, data: [] },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const createRequest = new NextRequest(request.clone())
    const authResult = await authenticateApiRequest(request)

    if (!authResult) {
      return NextResponse.json(
        { success: false, data: null, error: { code: 'unauthorized', message: 'Unauthorized' } },
        { status: 401 }
      )
    }

    const { user, supabase } = authResult
    const body = await request.json()

    // Keep the legacy network-post lookup below, but route every post mutation
    // through the canonical creator so appearance and attribution are identical
    // on all composer surfaces.
    if (!body.following_ids) return createPost(createRequest)

    // Handle network posts request
    if (body.following_ids) {
      const followingIds = Array.isArray(body.following_ids)
        ? body.following_ids.map((id: unknown) => String(id)).filter(Boolean)
        : []

      if (followingIds.length === 0) {
        return NextResponse.json({ success: true, data: [], error: null })
      }

      const { data: posts, error: resolvedPostsError } = await fetchFeedPostsWithFallback(
        supabase,
        {
          type: 'following',
          userIdParam: null,
          profileIdFilter: null,
          authUserId: user.id,
          followingUserIds: followingIds,
        },
        parseInt(body.limit) || 30,
        0
      )

      if (resolvedPostsError) {
        console.error('[Feed Posts API] Error fetching network posts:', resolvedPostsError)
        return NextResponse.json(
          { success: false, data: [], error: { code: 'network_posts_failed', message: 'Failed to fetch network posts' } },
          { status: 500 }
        )
      }

      const enrichedPosts = await enrichFeedPosts(supabase, posts, authResult?.user?.id || null)
      return NextResponse.json({ success: true, data: enrichedPosts.map(normalizeFeedPostDTO), error: null })
    }

    // Handle post creation — resolve acting entity from session/headers
    const { resolveActingContext } = await import('@/lib/auth/acting-context')
    const actingCtx = await resolveActingContext(request)
    if (actingCtx instanceof NextResponse) return actingCtx

    const { userId: actingUserId, accountType, profileId } = actingCtx
    const author = await resolveActingAccountSnapshot(actingCtx)

    const {
      content,
      type = 'text',
      location,
      hashtags = [],
      media_urls = [],
      poll_options: rawPollOptions,
      poll_duration: rawPollDuration,
      tagged_users: rawTaggedUsers,
      collaborators: rawCollaborators,
      collaborator_user_ids: rawCollaboratorUserIds,
    } = body
    const cleanMediaUrls = normalizeFeedMediaUrls(media_urls)

    const {
      normalizeTaggedUserIds,
      normalizeCollaboratorInvites,
      insertFeedPostCollaborators,
      notifyTaggedUsers,
      notifyCollaboratorInvites,
    } = await import('@/lib/feed/post-collaborators')

    const taggedUsers = normalizeTaggedUserIds(rawTaggedUsers, actingUserId)
    const collaboratorInvites = normalizeCollaboratorInvites(
      rawCollaborators || rawCollaboratorUserIds,
      actingUserId
    )

    const isPoll = type === 'poll'
    const visibility = body.visibility || (isPoll ? 'followers' : 'public')

    // Allow posts with either content or media (polls always need content/question)
    if (!content?.trim() && cleanMediaUrls.length === 0) {
      return NextResponse.json(
        { success: false, data: null, error: { code: 'content_required', message: 'Content or media is required' } },
        { status: 400 }
      )
    }

    let pollEndsAtIso: string | null = null
    let pollOptionTexts: string[] = []
    if (isPoll) {
      const {
        isValidPollOptionCount,
        normalizePollOptions,
        resolvePollEndsAt,
      } = await import('@/lib/polls/poll-duration')

      pollOptionTexts = normalizePollOptions(rawPollOptions)
      if (!isValidPollOptionCount(pollOptionTexts)) {
        return NextResponse.json(
          { success: false, data: null, error: { code: 'invalid_poll', message: 'Polls require 2–4 non-empty options' } },
          { status: 400 }
        )
      }
      const endsAt = resolvePollEndsAt({ duration: rawPollDuration || '7d' })
      if (!endsAt) {
        return NextResponse.json(
          { success: false, data: null, error: { code: 'invalid_poll_duration', message: 'Invalid poll duration' } },
          { status: 400 }
        )
      }
      pollEndsAtIso = endsAt.toISOString()
    }

    const postData: Record<string, unknown> = {
      user_id: actingUserId,
      content: content?.trim() || (cleanMediaUrls.length > 0 ? 'Shared a photo' : null),
      type: type || (cleanMediaUrls.length > 0 ? 'image' : 'text'),
      visibility,
      location,
      hashtags,
      media_urls: cleanMediaUrls,
      tagged_users: taggedUsers,
      posted_as_type: accountType,
      posted_as_profile_id: profileId,
      account_display_name: author.name,
      account_username: author.username,
      account_avatar_url: author.avatarUrl,
    }

    if (isPoll && pollEndsAtIso) {
      postData.poll_ends_at = pollEndsAtIso
      postData.poll_total_votes = 0
    }

    const { data: post, error } = await supabase
      .from('posts')
      .insert([postData])
      .select()
      .single()

    if (error) {
      console.error('Error creating post:', error)
      return NextResponse.json(
        { success: false, data: null, error: { code: 'create_post_failed', message: 'Failed to create post' } },
        { status: 500 }
      )
    }

    const insertedCollaborators = await insertFeedPostCollaborators({
      supabase,
      postId: post.id,
      invitedByUserId: actingUserId,
      invites: collaboratorInvites,
    })

    await Promise.all([
      notifyTaggedUsers({
        taggedUserIds: taggedUsers,
        actorUserId: actingUserId,
        postId: post.id,
        actorName: (author.name || author.username) ?? undefined,
      }),
      notifyCollaboratorInvites({
        invites: collaboratorInvites,
        actorUserId: actingUserId,
        postId: post.id,
        actorName: (author.name || author.username) ?? undefined,
      }),
    ])

    let pollPayload = null
    if (isPoll) {
      const optionRows = pollOptionTexts.map((text, index) => ({
        post_id: post.id,
        text,
        position: index,
        vote_count: 0,
      }))
      const { data: options, error: optionsError } = await supabase
        .from('poll_options')
        .insert(optionRows)
        .select('id, text, position, vote_count')

      if (optionsError) {
        await supabase.from('posts').delete().eq('id', post.id)
        return NextResponse.json(
          { success: false, data: null, error: { code: 'create_poll_failed', message: optionsError.message } },
          { status: 500 }
        )
      }

      const { buildPollPayload } = await import('@/lib/polls/hydrate-polls')
      pollPayload = buildPollPayload({
        question: post.content,
        options: options || [],
        endsAt: pollEndsAtIso,
        totalVotes: 0,
      })
    }

    const normalizedPost = normalizeFeedPostDTO({
      ...post,
      tagged_users: taggedUsers,
      collaborators: insertedCollaborators,
      resolved_author: author,
      poll: pollPayload,
      viewer_can_manage: true,
    })
    return NextResponse.json({ success: true, data: normalizedPost, post: normalizedPost, error: null })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { success: false, data: null, error: { code: 'internal_error', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}
