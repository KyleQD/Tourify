/**
 * SOCIAL-007 / HF-DB-006-SOCIAL-007 — the canonical server-authorized read for
 * "which of these posts has the caller liked?".
 *
 * Why this exists: the shipped migration chain gives `post_likes` a permissive
 * `USING (true)` SELECT policy
 * (`supabase/migrations/20240430000000_create_posts.sql:47-49`), so a browser
 * can select every liker of every post straight through PostgREST. Two surfaces
 * (`components/artist/artist-home-feed.tsx` and
 * `components/profile/public-profile-view.tsx`) were reading that table from the
 * browser. Their reads were already self-scoped with `.eq('user_id', user.id)`,
 * so they leaked nothing, but they *depended* on `USING (true)`: any policy that
 * requires an entitled viewer would break them, and the browser is the wrong
 * place for an authorization decision.
 *
 * This module is the replacement. It is deliberately narrow:
 *
 *   - The `post_likes` read is always pinned to the authenticated viewer's own
 *     `user_id`, so it is safe under `USING (true)` and under a tightened
 *     `auth.uid() = user_id` policy. It never reads another actor's rows.
 *   - It runs on the caller-scoped client, never a service-role client
 *     (CP-058), so the caller's own RLS applies and the server is the only
 *     place the decision is made.
 *   - The requested post ids are filtered through the mandatory post-visibility
 *     gate (`canViewPostComments`, the same predicate the canonical
 *     `app/api/posts/[id]/{likes,comments,shares}` routes use) before any like
 *     row is read, so the response cannot be used to confirm the existence of a
 *     post the caller may not see.
 *   - It fails closed. If the post read or the like read errors, the result is
 *     an empty set plus `degraded: true`, so a caller can distinguish "not
 *     liked" from "could not be determined" (CP-049) instead of being handed a
 *     false zero.
 *   - Query count is constant in the batch size: at most five reads regardless
 *     of how many post ids are requested.
 */
import {
  canViewPostComments,
  type CommentParentPost,
  type CommentVisibilityRelationships,
} from '@/lib/feed/post-comment-access'

/** Bounded so one request cannot turn into an unbounded `in (...)` list. */
export const MAX_POST_LIKE_BATCH = 50

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const POST_VISIBILITY_COLUMNS =
  'id, user_id, visibility, is_visible, moderation_status, posted_as_profile_id'

export function isPostId(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value)
}

/**
 * Normalize a caller-supplied post-id list: trim, drop empties, de-duplicate,
 * preserve order, and enforce the batch bound. Returns the ids plus whether any
 * supplied value was not a post id, so a route can answer 400 rather than
 * silently drop input it could not interpret.
 */
export function normalizePostIds(raw: unknown): {
  postIds: string[]
  invalid: boolean
  overLimit: boolean
} {
  const supplied = Array.isArray(raw) ? raw : typeof raw === 'string' ? raw.split(',') : []
  const postIds: string[] = []
  let invalid = false

  for (const entry of supplied) {
    const value = typeof entry === 'string' ? entry.trim() : ''
    if (!value) continue
    if (!isPostId(value)) {
      invalid = true
      continue
    }
    if (!postIds.includes(value)) postIds.push(value)
  }

  return {
    postIds,
    invalid,
    overLimit: postIds.length > MAX_POST_LIKE_BATCH,
  }
}

/** Parse the `postIds` query parameter of the canonical read. */
export function parsePostIdsParam(value: string | null): ReturnType<typeof normalizePostIds> {
  return normalizePostIds(value)
}

const NO_RELATIONSHIPS: CommentVisibilityRelationships = {
  viewerFollowsAuthor: false,
  authorFollowsViewer: false,
  viewerFollowsAccount: false,
}

/** Narrow, de-duplicated, order-preserving id list. */
function uniqueStrings(values: Array<string | null | undefined>): string[] {
  const out: string[] = []
  for (const value of values) {
    if (value && !out.includes(value)) out.push(value)
  }
  return out
}

/**
 * Resolve follow relationships for the posts that actually need them, in two
 * bounded reads. `canViewPostComments` only consults the relationship flags for
 * `followers` and `friends` posts, so public and viewer-owned posts are not
 * charged a follow lookup. Every failure is treated as "not following", which
 * matches `resolvePostCommentAccess` and fails closed.
 */
async function resolveRelationships(
  supabase: any,
  posts: CommentParentPost[],
  viewerUserId: string | null,
): Promise<Map<string, CommentVisibilityRelationships>> {
  const resolved = new Map<string, CommentVisibilityRelationships>()
  if (!viewerUserId) return resolved

  const needsRelationship = posts.filter(
    (post) =>
      post.user_id !== viewerUserId &&
      (post.visibility === 'followers' || post.visibility === 'friends'),
  )
  if (needsRelationship.length === 0) return resolved

  const authorIds = uniqueStrings(needsRelationship.map((post) => post.user_id))
  const profileIds = uniqueStrings(needsRelationship.map((post) => post.posted_as_profile_id))

  const [viewerFollows, authorsFollowViewer, accountFollows] = await Promise.all([
    authorIds.length
      ? supabase.from('follows').select('following_id').eq('follower_id', viewerUserId).in('following_id', authorIds)
      : Promise.resolve({ data: [], error: null }),
    authorIds.length
      ? supabase.from('follows').select('follower_id').eq('following_id', viewerUserId).in('follower_id', authorIds)
      : Promise.resolve({ data: [], error: null }),
    profileIds.length ? resolveAccountFollows(supabase, viewerUserId, profileIds) : Promise.resolve(new Set<string>()),
  ])

  const followedByViewer = new Set(
    viewerFollows?.error ? [] : (viewerFollows.data || []).map((row: any) => row.following_id),
  )
  const followingViewer = new Set(
    authorsFollowViewer?.error ? [] : (authorsFollowViewer.data || []).map((row: any) => row.follower_id),
  )

  for (const post of needsRelationship) {
    resolved.set(post.id, {
      viewerFollowsAuthor: followedByViewer.has(post.user_id),
      authorFollowsViewer: followingViewer.has(post.user_id),
      viewerFollowsAccount: accountFollows.has(post.posted_as_profile_id),
    })
  }

  return resolved
}

async function resolveAccountFollows(
  supabase: any,
  viewerUserId: string,
  profileIds: string[],
): Promise<Set<string | null>> {
  const { data: accounts, error: accountsError } = await supabase
    .from('accounts')
    .select('id, profile_id')
    .in('profile_id', profileIds)

  if (accountsError || !Array.isArray(accounts) || accounts.length === 0) return new Set()

  const accountIds = accounts.map((account: any) => account.id)
  const { data: follows, error: followsError } = await supabase
    .from('account_follows')
    .select('account_id')
    .eq('follower_user_id', viewerUserId)
    .in('account_id', accountIds)

  if (followsError || !Array.isArray(follows)) return new Set()

  const followedAccountIds = new Set((follows || []).map((row: any) => row.account_id))
  // Report the profile ids whose owning account the viewer follows, so the
  // caller can match on the post column it actually has.
  return new Set(
    accounts
      .filter((account: any) => followedAccountIds.has(account.id))
      .map((account: any) => account.profile_id),
  )
}

export interface ViewerPostLikeState {
  /** Post ids the viewer may see. Only these were considered for likes. */
  visiblePostIds: string[]
  /** Subset of `visiblePostIds` the viewer has liked. Never another actor's. */
  likedPostIds: string[]
  /**
   * True when an authorization or read step failed. The set is then empty by
   * construction (fail closed) and the caller must not present it as truth.
   */
  degraded: boolean
}

const EMPTY_STATE: ViewerPostLikeState = {
  visiblePostIds: [],
  likedPostIds: [],
  degraded: false,
}

/**
 * Resolve the viewer's own like state for a bounded set of post ids.
 *
 * Order matters and is part of the contract: the post-visibility gate resolves
 * first, and no `post_likes` row is read for a post that failed it.
 */
export async function resolveViewerPostLikeState(params: {
  supabase: any
  postIds: string[]
  viewerUserId: string | null
}): Promise<ViewerPostLikeState> {
  const { supabase, viewerUserId } = params
  const postIds = params.postIds.slice(0, MAX_POST_LIKE_BATCH)

  if (postIds.length === 0) return EMPTY_STATE
  if (!viewerUserId) {
    // An anonymous caller has no like state. Fail closed rather than reading
    // anything on its behalf.
    return { visiblePostIds: [], likedPostIds: [], degraded: false }
  }

  let posts: CommentParentPost[]
  try {
    const { data, error } = await supabase
      .from('posts')
      .select(POST_VISIBILITY_COLUMNS)
      .in('id', postIds)

    if (error || !Array.isArray(data)) {
      console.error('[Social Post Likes] post visibility read failed', { code: error?.code })
      return { visiblePostIds: [], likedPostIds: [], degraded: true }
    }
    posts = data as CommentParentPost[]
  } catch (error) {
    console.error('[Social Post Likes] post visibility read threw', { error })
    return { visiblePostIds: [], likedPostIds: [], degraded: true }
  }

  const relationships = await resolveRelationships(supabase, posts, viewerUserId)
  const visiblePostIds = posts
    .filter((post) =>
      canViewPostComments(
        post,
        viewerUserId,
        relationships.get(post.id) || NO_RELATIONSHIPS,
      ),
    )
    .map((post) => post.id)

  if (visiblePostIds.length === 0) {
    return { visiblePostIds: [], likedPostIds: [], degraded: false }
  }

  try {
    // Self-scoped: the caller's own like rows only. This is the read the
    // browser surfaces used to perform directly.
    const { data, error } = await supabase
      .from('post_likes')
      .select('post_id')
      .eq('user_id', viewerUserId)
      .in('post_id', visiblePostIds)

    if (error) {
      console.error('[Social Post Likes] like read failed', { code: error.code })
      return { visiblePostIds, likedPostIds: [], degraded: true }
    }

    const likedPostIds = (data || [])
      .map((row: any) => row.post_id)
      .filter((postId: unknown): postId is string => visiblePostIds.includes(postId as string))

    return { visiblePostIds, likedPostIds, degraded: false }
  } catch (error) {
    console.error('[Social Post Likes] like read threw', { error })
    return { visiblePostIds, likedPostIds: [], degraded: true }
  }
}
