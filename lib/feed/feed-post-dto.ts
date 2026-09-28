import type { RawPostAppearanceRow } from '@/lib/feed/resolve-post-appearance-dto'
import { getAccountAuthor, getAccountAuthorPath } from '@/lib/accounts/account-author'
import {
  countUnavailableFeedMediaUrls,
  normalizeFeedMediaUrls,
} from '@/lib/feed/media-url-utils'

/**
 * Canonical author identity returned by every social post read/create path.
 * `id` and `type` identify the account that authored the post; presentation
 * fields are refreshed from that account's current public profile.
 */
export interface FeedAuthorDTO {
  id: string
  type: string
  subtype: string | null
  displayName: string
  username: string | null
  avatarUrl: string | null
  isVerified: boolean
  profilePath: string | null
}

/**
 * Shared post shape. Legacy aliases remain while older feed cards migrate to
 * the canonical `author` and `appearance` properties.
 */
export interface FeedPostDTO {
  id: string
  user_id: string
  content: string
  type: string
  visibility: string
  created_at: string
  updated_at?: string | null
  posted_as_profile_id: string
  posted_as_type: string
  author: FeedAuthorDTO
  appearance: RawPostAppearanceRow | null
  post_appearances: RawPostAppearanceRow | null
  profiles: Record<string, unknown>
  user: Record<string, unknown>
  [key: string]: unknown
}

function firstRelated<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function getMediaUnavailableCount(post: Record<string, any>) {
  const metadata = post.metadata && typeof post.metadata === 'object'
    ? post.metadata as Record<string, any>
    : {}
  const explicitCount = Number(
    metadata.media_unavailable_count || metadata.mediaUnavailableCount || 0,
  )
  const invalidUrlCount = countUnavailableFeedMediaUrls(post.media_urls)

  if (explicitCount > 0) return explicitCount
  if (metadata.media_unavailable === true || metadata.mediaUnavailable === true) {
    return Math.max(1, invalidUrlCount)
  }
  return invalidUrlCount
}

/**
 * One normalizer for refreshed feeds and immediate publication responses.
 * Enrichments may be absent, but canonical authorship and appearance aliases
 * always retain the same shape.
 */
export function normalizeFeedPostDTO(post: Record<string, any>): FeedPostDTO {
  const author = getAccountAuthor(post)
  const profilePath = getAccountAuthorPath(author)
  const appearance = firstRelated(post.post_appearances) || firstRelated(post.appearance)
  const ownerProfile = firstRelated(post.profiles)
  const mediaUrls = normalizeFeedMediaUrls(post.media_urls)
  const commentsCount = Number(post.comments_count || 0)
  const mediaUnavailableCount = Number(
    post.media_unavailable_count || getMediaUnavailableCount(post) || 0,
  )
  const profile = {
    id: author.id || post.user_id,
    username: author.username || ownerProfile?.username || 'user',
    full_name: author.name,
    avatar_url: author.avatarUrl || ownerProfile?.avatar_url || '',
    is_verified: author.isVerified || Boolean(ownerProfile?.is_verified),
    account_context: {
      type: author.type,
      profile_id: author.id || post.user_id,
      display_name: author.name,
      profile_path: profilePath,
    },
  }

  return {
    id: post.id,
    user_id: post.user_id,
    content: post.content,
    type: post.type || 'text',
    visibility: post.visibility || 'public',
    location: post.location || null,
    hashtags: Array.isArray(post.hashtags) ? post.hashtags : [],
    tagged_users: Array.isArray(post.tagged_users) ? post.tagged_users : [],
    collaborators: Array.isArray(post.collaborators) ? post.collaborators : [],
    media_urls: mediaUrls,
    media_unavailable_count: mediaUnavailableCount > 0 ? mediaUnavailableCount : undefined,
    likes_count: post.likes_count || 0,
    comments_count: commentsCount,
    shares_count: post.shares_count || 0,
    is_pinned: Boolean(post.is_pinned),
    created_at: post.created_at,
    updated_at: post.updated_at,
    posted_as_profile_id: author.id || post.posted_as_profile_id || post.user_id,
    posted_as_type: author.type,
    account_display_name: author.name,
    account_username: author.username,
    account_avatar_url: author.avatarUrl,
    content_ref_type: post.content_ref_type || null,
    content_ref_id: post.content_ref_id || null,
    article_preview: post.article_preview || null,
    listing_preview: post.listing_preview || null,
    event_preview: post.event_preview || null,
    track_preview: post.track_preview || null,
    metadata: post.metadata || null,
    author: {
      id: author.id || post.posted_as_profile_id || post.user_id,
      type: author.type,
      subtype: author.subtype || null,
      displayName: author.name,
      username: author.username,
      avatarUrl: author.avatarUrl,
      isVerified: author.isVerified,
      profilePath,
    },
    appearance,
    post_appearances: appearance,
    viewer_can_manage: Boolean(post.viewer_can_manage),
    poll_ends_at: post.poll_ends_at || null,
    poll_total_votes: post.poll_total_votes || post.poll?.totalVotes || 0,
    poll: post.poll || null,
    profiles: profile,
    user: profile,
    is_liked: Boolean(post.is_liked),
    like_count: post.likes_count || 0,
  }
}
