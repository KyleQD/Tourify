import { isAccountAttributionSchemaError } from '@/lib/accounts/account-author'

// Intentionally no `profiles:user_id (...)` embed: many environments lack a posts→profiles
// FK (PGRST200). Owner profiles are hydrated in enrichFeedPosts instead.
const POST_SELECT_COLUMNS = `
  id,
  user_id,
  content,
  media_urls,
  likes_count,
  comments_count,
  shares_count,
  is_pinned,
  created_at,
  updated_at,
  type,
  visibility,
  location,
  hashtags,
  tagged_users,
  posted_as_profile_id,
  posted_as_type,
  account_display_name,
  account_username,
  account_avatar_url,
  content_ref_type,
  content_ref_id,
  metadata
`

const POST_SELECT_COLUMNS_LEGACY = `
  id,
  user_id,
  content,
  media_urls,
  likes_count,
  comments_count,
  shares_count,
  is_pinned,
  created_at,
  updated_at,
  type,
  visibility,
  location,
  hashtags
`

// Stable attribution fallbacks deliberately exclude optional preview, poll,
// tagging, and relationship fields. Older deployments can therefore lose an
// optional feature without losing the account that authored the post.
const POST_SELECT_COLUMNS_ACCOUNT_STABLE = `
  id,
  user_id,
  content,
  media_urls,
  likes_count,
  comments_count,
  shares_count,
  is_pinned,
  created_at,
  updated_at,
  type,
  visibility,
  location,
  hashtags,
  posted_as_profile_id,
  posted_as_type,
  account_display_name,
  account_username,
  account_avatar_url
`

const POST_SELECT_COLUMNS_ACCOUNT_MINIMAL = `
  id,
  user_id,
  content,
  created_at,
  visibility,
  posted_as_profile_id,
  posted_as_type,
  account_display_name,
  account_username,
  account_avatar_url
`

const POST_SELECT_COLUMNS_CORE_WITH_PROFILE = `
  id,
  user_id,
  content,
  media_urls,
  likes_count,
  comments_count,
  shares_count,
  created_at,
  updated_at
`

const POST_SELECT_COLUMNS_CORE = `
  id,
  user_id,
  content,
  media_urls,
  likes_count,
  comments_count,
  shares_count,
  created_at,
  updated_at
`

const POST_SELECT_COLUMNS_MINIMAL = `
  id,
  user_id,
  content,
  created_at
`

export type FeedPostSelectVariant = {
  name: string
  selectColumns: string
  supportsAccountAttribution: boolean
  supportsPinnedOrder: boolean
  supportsVisibility: boolean
}

export const FEED_POST_SELECT_VARIANTS: FeedPostSelectVariant[] = [
  {
    name: 'full',
    selectColumns: POST_SELECT_COLUMNS,
    supportsAccountAttribution: true,
    supportsPinnedOrder: true,
    supportsVisibility: true,
  },
  {
    name: 'account_stable',
    selectColumns: POST_SELECT_COLUMNS_ACCOUNT_STABLE,
    supportsAccountAttribution: true,
    supportsPinnedOrder: true,
    supportsVisibility: true,
  },
  {
    name: 'account_minimal',
    selectColumns: POST_SELECT_COLUMNS_ACCOUNT_MINIMAL,
    supportsAccountAttribution: true,
    supportsPinnedOrder: false,
    supportsVisibility: true,
  },
  {
    name: 'legacy_account',
    selectColumns: POST_SELECT_COLUMNS_LEGACY,
    supportsAccountAttribution: false,
    supportsPinnedOrder: true,
    supportsVisibility: true,
  },
  {
    name: 'core_with_profile',
    selectColumns: POST_SELECT_COLUMNS_CORE_WITH_PROFILE,
    supportsAccountAttribution: false,
    supportsPinnedOrder: false,
    supportsVisibility: false,
  },
  {
    name: 'core',
    selectColumns: POST_SELECT_COLUMNS_CORE,
    supportsAccountAttribution: false,
    supportsPinnedOrder: false,
    supportsVisibility: false,
  },
  {
    name: 'minimal',
    selectColumns: POST_SELECT_COLUMNS_MINIMAL,
    supportsAccountAttribution: false,
    supportsPinnedOrder: false,
    supportsVisibility: false,
  },
]

const OPTIONAL_POST_READ_FIELDS = [
  'is_pinned',
  'media_urls',
  'likes_count',
  'comments_count',
  'shares_count',
  'updated_at',
  'type',
  'visibility',
  'location',
  'hashtags',
  'tagged_users',
  'views_count',
  'posted_as_profile_id',
  'posted_as_type',
  'posted_as_account_type',
  'account_display_name',
  'account_username',
  'account_avatar_url',
  'account_is_verified',
  'content_ref_type',
  'content_ref_id',
  'metadata',
  'poll_ends_at',
  'poll_total_votes',
  'appearance',
]

export type FeedAttributionMode = 'legacy' | 'strict'

export type FeedQueryScope = {
  type: string
  userIdParam: string | null
  profileIdFilter: string | null
  authUserId?: string | null
  followingUserIds?: string[]
  followingProfileIds?: string[]
  ownedProfileIds?: string[]
  membershipProfileIds?: string[]
  /** Tagged + collab (and similar) post IDs to OR into home/following-style feeds */
  extraPostIds?: string[]
  /** For type=user: accepted collab posts that should appear on this profile */
  acceptedCollabPostIds?: string[]
  viewerOwnsProfile?: boolean
  viewerCanSeeFollowersPosts?: boolean
  /** legacy (default): profile_id OR user_id owner posts. strict: posted_as_profile_id only. */
  attribution?: FeedAttributionMode
  /** Exclude pinned posts so profile pagination cannot repeat the pinned lane. */
  excludePinned?: boolean
}

export function isPostReadSchemaError(error: unknown): boolean {
  if (isAccountAttributionSchemaError(error)) return true
  if (!error || typeof error !== 'object') return false

  const record = error as Record<string, unknown>
  const code = String(record.code || '')
  const message = String(record.message || '')
  const details = String(record.details || '')
  const hint = String(record.hint || '')
  const combined = `${message} ${details} ${hint}`

  // Missing posts↔profiles (or posts.user_id) relationship for embeds — retry without join.
  if (
    code === 'PGRST200' &&
    (combined.includes('profiles') || combined.includes("between 'posts' and 'user_id'"))
  ) {
    return true
  }
  if (code === '42703' || code === 'PGRST204') {
    return OPTIONAL_POST_READ_FIELDS.some(field => combined.includes(field))
  }

  return OPTIONAL_POST_READ_FIELDS.some(field =>
    combined.includes(`'${field}'`) ||
    combined.includes(`.${field}`) ||
    combined.includes(` ${field} `)
  )
}

export function getFollowingFeedUserIds(
  currentUserId: string,
  followingData: Array<{ following_id: string | null }> | null | undefined
): string[] {
  return Array.from(new Set([
    currentUserId,
    ...((followingData || []).map(row => row.following_id).filter(Boolean) as string[]),
  ]))
}

/**
 * When expanding account_follows into feed authors, use accounts.profile_id only.
 * Do not include owner_user_id — that leaks the org owner's personal posts into the following feed.
 */
export function profileIdsFromFollowedAccounts(
  rows: Array<{ profile_id?: string | null; owner_user_id?: string | null }> | null | undefined
): string[] {
  return Array.from(
    new Set(
      (rows || [])
        .map((row) => row.profile_id)
        .filter(Boolean)
        .map((id) => String(id))
    )
  )
}

function unique(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.filter(Boolean) as string[]))
}

function formatPostgrestList(values: string[]) {
  return values.join(',')
}

function getOwnerUserIdForFallback(scope: FeedQueryScope) {
  return scope.userIdParam || scope.authUserId || null
}

function shouldPrioritizePinnedPosts(scope: FeedQueryScope) {
  return scope.type === 'user'
}

function buildBasePostsQuery(
  supabase: any,
  variant: FeedPostSelectVariant,
  scope: FeedQueryScope,
  limit: number,
  offset: number
) {
  let query = supabase
    .from('posts')
    .select(variant.selectColumns)

  if (variant.supportsPinnedOrder && shouldPrioritizePinnedPosts(scope)) {
    query = query.order('is_pinned', { ascending: false })
  }

  if (scope.excludePinned && variant.supportsPinnedOrder) {
    query = query.eq('is_pinned', false)
  }

  return query
    .order('created_at', { ascending: false })
    .limit(limit)
    .range(offset, offset + limit - 1)
}

function getAllowedVisibilityValues(scope: FeedQueryScope): string[] | null {
  if (scope.type === 'all') return ['public']
  if (scope.type === 'following' || scope.type === 'home' || scope.type === 'tagged')
    return ['public', 'followers']

  if (scope.type === 'user') {
    if (scope.viewerOwnsProfile) return null
    if (scope.viewerCanSeeFollowersPosts) return ['public', 'followers']
    return ['public']
  }

  return null
}

function applyVisibilityScopeToQuery(query: any, variant: FeedPostSelectVariant, scope: FeedQueryScope) {
  if (!variant.supportsVisibility) return query

  const allowed = getAllowedVisibilityValues(scope)
  if (!allowed) return query
  if (allowed.length === 1) return query.eq('visibility', allowed[0])
  return query.in('visibility', allowed)
}

function isVisiblePost(row: any, scope: FeedQueryScope) {
  if (!('visibility' in (row || {}))) return true

  const visibility = row?.visibility || 'public'
  if (scope.type === 'all') return visibility === 'public'
  if (scope.type === 'following' || scope.type === 'home' || scope.type === 'tagged')
    return visibility === 'public' || visibility === 'followers'

  if (scope.type === 'user') {
    if (scope.viewerOwnsProfile) return true
    if (visibility === 'private') return false
    if (visibility === 'followers') return Boolean(scope.viewerCanSeeFollowersPosts)
    return visibility === 'public'
  }

  return true
}

function rowTaggedUsers(row: any): string[] {
  if (!Array.isArray(row?.tagged_users)) return []
  return row.tagged_users.map((id: unknown) => String(id))
}

function matchesUserScope(row: any, scope: FeedQueryScope) {
  const acceptedCollabIds = unique(scope.acceptedCollabPostIds || [])
  if (acceptedCollabIds.length > 0 && acceptedCollabIds.includes(row?.id)) return true

  if (scope.attribution === 'strict' && scope.profileIdFilter)
    return row?.posted_as_profile_id === scope.profileIdFilter

  const ownerUserId = getOwnerUserIdForFallback(scope)
  const ownerIds = unique([ownerUserId, scope.profileIdFilter])

  if (scope.profileIdFilter && row?.posted_as_profile_id === scope.profileIdFilter) return true
  if (ownerIds.length > 0 && ownerIds.includes(row?.user_id)) return true
  return ownerIds.length === 0
}

function matchesFollowingScope(row: any, scope: FeedQueryScope) {
  const friendUserIds = unique(scope.followingUserIds || [])
  const followedProfileIds = unique(scope.followingProfileIds || [])
  const ownedProfileIds = unique(scope.ownedProfileIds || [])

  // Friend graph: personal / general posts from mutual or one-way user follows
  if (friendUserIds.length > 0 && friendUserIds.includes(row?.user_id)) {
    if (!row?.posted_as_profile_id || ownedProfileIds.includes(row.posted_as_profile_id) || friendUserIds.includes(row.posted_as_profile_id))
      return true
  }

  // Account follows: posts authored as that persona profile
  if (followedProfileIds.length > 0 && followedProfileIds.includes(row?.posted_as_profile_id))
    return true

  // Own posts in following feed
  if (ownedProfileIds.length > 0 && ownedProfileIds.includes(row?.posted_as_profile_id))
    return true
  if (scope.authUserId && row?.user_id === scope.authUserId && !row?.posted_as_profile_id)
    return true

  return false
}

function matchesHomeScope(row: any, scope: FeedQueryScope) {
  if (matchesFollowingScope(row, scope)) return true

  const membershipProfileIds = unique(scope.membershipProfileIds || [])
  if (membershipProfileIds.length > 0 && membershipProfileIds.includes(row?.posted_as_profile_id))
    return true

  const extraPostIds = unique(scope.extraPostIds || [])
  if (extraPostIds.length > 0 && extraPostIds.includes(row?.id)) return true

  if (scope.authUserId && rowTaggedUsers(row).includes(scope.authUserId)) return true

  return false
}

function matchesTaggedScope(row: any, scope: FeedQueryScope) {
  if (!scope.authUserId) return false
  return rowTaggedUsers(row).includes(scope.authUserId)
}

function applyScopeInMemory(rows: any[], scope: FeedQueryScope) {
  return rows.filter(row => {
    if (scope.excludePinned && Boolean(row?.is_pinned)) return false
    if (!isVisiblePost(row, scope)) return false
    if (scope.type === 'user') return matchesUserScope(row, scope)
    if (scope.type === 'following') return matchesFollowingScope(row, scope)
    if (scope.type === 'home') return matchesHomeScope(row, scope)
    if (scope.type === 'tagged') return matchesTaggedScope(row, scope)
    return true
  })
}

/** Exported for unit tests */
export function matchesHomeFeedScope(row: any, scope: FeedQueryScope) {
  return matchesHomeScope(row, scope)
}

export function matchesTaggedFeedScope(row: any, scope: FeedQueryScope) {
  return matchesTaggedScope(row, scope)
}

function compareCreatedAtDesc(left: any, right: any) {
  const leftTime = new Date(left?.created_at || 0).getTime()
  const rightTime = new Date(right?.created_at || 0).getTime()
  return rightTime - leftTime
}

function comparePostsForScope(scope: FeedQueryScope) {
  return (left: any, right: any) => {
    if (shouldPrioritizePinnedPosts(scope) && !scope.excludePinned) {
      const leftPinned = Boolean(left?.is_pinned)
      const rightPinned = Boolean(right?.is_pinned)
      if (leftPinned !== rightPinned) return leftPinned ? -1 : 1
    }

    return compareCreatedAtDesc(left, right)
  }
}

async function fetchPostsWithStarFallback(
  supabase: any,
  scope: FeedQueryScope,
  limit: number,
  offset: number
) {
  const fetchLimit = Math.max(offset + limit, limit)
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(fetchLimit)

  if (error) {
    return { data: null, error }
  }

  const scoped = applyScopeInMemory(data || [], scope)
    .sort(comparePostsForScope(scope))
    .slice(offset, offset + limit)

  return { data: scoped, error: null }
}

function buildAuthorOrExtraFilter(
  userIds: string[],
  profileIds: string[],
  extraPostIds: string[],
  supportsAccountAttribution: boolean
) {
  const clauses: string[] = []
  if (userIds.length > 0) clauses.push(`user_id.in.(${formatPostgrestList(userIds)})`)
  if (supportsAccountAttribution && profileIds.length > 0)
    clauses.push(`posted_as_profile_id.in.(${formatPostgrestList(profileIds)})`)
  if (extraPostIds.length > 0) clauses.push(`id.in.(${formatPostgrestList(extraPostIds)})`)
  return clauses
}

export function applyFeedScopeToQuery(query: any, variant: FeedPostSelectVariant, scope: FeedQueryScope) {
  if (scope.type === 'user') {
    const ownerUserId = getOwnerUserIdForFallback(scope)
    const acceptedCollabIds = unique(scope.acceptedCollabPostIds || [])

    if (scope.attribution === 'strict' && scope.profileIdFilter) {
      if (variant.supportsAccountAttribution) {
        if (acceptedCollabIds.length > 0) {
          return query.or(
            `posted_as_profile_id.eq.${scope.profileIdFilter},id.in.(${formatPostgrestList(acceptedCollabIds)})`
          )
        }
        return query.eq('posted_as_profile_id', scope.profileIdFilter)
      }
      // Without attribution columns, strict mode cannot safely include owner-wide posts.
      if (acceptedCollabIds.length > 0) {
        return query.or(
          `user_id.eq.${scope.profileIdFilter},id.in.(${formatPostgrestList(acceptedCollabIds)})`
        )
      }
      return query.eq('user_id', scope.profileIdFilter)
    }

    if (scope.profileIdFilter && variant.supportsAccountAttribution) {
      const legacyOwnerIds = unique([ownerUserId, scope.profileIdFilter])
      const clauses = [
        `posted_as_profile_id.eq.${scope.profileIdFilter}`,
        `user_id.in.(${formatPostgrestList(legacyOwnerIds)})`,
      ]
      if (acceptedCollabIds.length > 0)
        clauses.push(`id.in.(${formatPostgrestList(acceptedCollabIds)})`)
      return query.or(clauses.join(','))
    }

    const fallbackOwnerIds = unique([ownerUserId, scope.profileIdFilter])
    if (acceptedCollabIds.length > 0 && fallbackOwnerIds.length > 0) {
      return query.or(
        `user_id.in.(${formatPostgrestList(fallbackOwnerIds)}),id.in.(${formatPostgrestList(acceptedCollabIds)})`
      )
    }
    if (fallbackOwnerIds.length > 1) return query.in('user_id', fallbackOwnerIds)
    if (fallbackOwnerIds.length === 1) return query.eq('user_id', fallbackOwnerIds[0])
    if (acceptedCollabIds.length > 0) return query.in('id', acceptedCollabIds)
    if (scope.profileIdFilter) return query.eq('user_id', scope.profileIdFilter)
    return query
  }

  if (scope.type === 'tagged' && scope.authUserId) {
    return query.contains('tagged_users', [scope.authUserId])
  }

  if ((scope.type === 'following' || scope.type === 'home') && scope.authUserId) {
    const userIds = unique(scope.followingUserIds || [])
    const profileIds = unique([
      ...(scope.ownedProfileIds || []),
      ...(scope.followingProfileIds || []),
      ...(scope.type === 'home' ? (scope.membershipProfileIds || []) : []),
    ])
    const extraPostIds = scope.type === 'home' ? unique(scope.extraPostIds || []) : []

    if (userIds.length === 0 && profileIds.length === 0 && extraPostIds.length === 0)
      return query.eq('user_id', scope.authUserId)

    const clauses = buildAuthorOrExtraFilter(
      userIds,
      profileIds,
      extraPostIds,
      variant.supportsAccountAttribution
    )

    if (clauses.length === 0) return query.eq('user_id', scope.authUserId)
    if (clauses.length === 1) {
      if (userIds.length > 0 && !variant.supportsAccountAttribution && extraPostIds.length === 0)
        return query.in('user_id', userIds)
      if (extraPostIds.length > 0 && userIds.length === 0 && profileIds.length === 0)
        return query.in('id', extraPostIds)
      if (variant.supportsAccountAttribution && profileIds.length > 0 && userIds.length === 0 && extraPostIds.length === 0)
        return query.in('posted_as_profile_id', profileIds)
    }

    return query.or(clauses.join(','))
  }

  return query
}

export async function fetchFeedPostsWithFallback(
  supabase: any,
  scope: FeedQueryScope,
  limit: number,
  offset: number
): Promise<{ data: any[] | null; error: any; variantName: string | null }> {
  let lastError: any = null

  for (const variant of FEED_POST_SELECT_VARIANTS) {
    let query = buildBasePostsQuery(supabase, variant, scope, limit, offset)
    query = applyFeedScopeToQuery(query, variant, scope)
    query = applyVisibilityScopeToQuery(query, variant, scope)

    const { data, error } = await query

    if (!error) {
      return { data, error: null, variantName: variant.name }
    }

    lastError = error
    if (!isPostReadSchemaError(error)) {
      console.warn(`[Feed Posts API] ${variant.name} posts query failed; trying raw posts fallback.`, error)
      break
    }

    console.warn(`[Feed Posts API] ${variant.name} posts query hit a schema mismatch; trying a safer select.`)
  }

  const rawFallback = await fetchPostsWithStarFallback(supabase, scope, limit, offset)
  if (!rawFallback.error) {
    return { data: rawFallback.data, error: null, variantName: 'raw_star' }
  }

  return { data: null, error: rawFallback.error || lastError, variantName: null }
}
