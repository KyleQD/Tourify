import type { NewsFeedItem } from '@/lib/news/types'

/**
 * Fail-closed rule for records shown in the public News feed.
 *
 * Source fetchers must also query publicly published records; this check
 * is an additional boundary, not a substitute for RLS and grants.
 *
 * Ordinary social posts are not automatically newsworthy or approved.
 * Until news-specific submission approval is implemented, public News
 * accepts approved blogs, public music, public published legacy events,
 * and authorized links from registered RSS sources.
 */
export function isPublicNewsCandidate(item: NewsFeedItem): boolean {
  if (item.moderation?.moderationState !== 'approved') return false
  if (!item.title?.trim()) return false

  if (item.originType === 'external') {
    if (!item.url) return false
    try {
      const url = new URL(item.url)
      return url.protocol === 'https:' || url.protocol === 'http:'
    } catch {
      return false
    }
  }

  if (item.originType === 'internal_blog') {
    return Boolean(item.url?.startsWith('/blog/'))
  }

  if (item.originType === 'internal_post') {
    return item.id.startsWith('music_') || item.id.startsWith('event_')
  }

  return false
}
