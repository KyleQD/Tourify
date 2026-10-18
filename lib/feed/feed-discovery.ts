/**
 * Discovery cards are derived solely from posts the existing feed API has
 * already authorized for the viewer. No additional privileged fetches, fake
 * recommendations, location assumptions, or popularity claims are made here.
 */
export type FeedDiscoveryMode = 'highlights' | 'events' | 'music' | 'artists'
export type FeedDiscoveryKind = 'event' | 'music' | 'artist' | 'moment'

export interface FeedDiscoveryPost {
  id: string
  content?: string | null
  type?: string | null
  user_id?: string | null
  media_urls?: string[] | null
  event_preview?: {
    id?: string
    title?: string | null
    url?: string | null
    posterUrl?: string | null
    venueName?: string | null
    location?: string | null
  } | null
  track_preview?: {
    id?: string
    title?: string | null
    coverArtUrl?: string | null
    artistName?: string | null
    genre?: string | null
  } | null
  profiles?: {
    full_name?: string | null
    username?: string | null
    avatar_url?: string | null
    account_context?: {
      type?: string | null
      profile_id?: string | null
      profile_path?: string | null
      display_name?: string | null
    } | null
  } | null
}

export interface FeedDiscoveryItem {
  id: string
  kind: FeedDiscoveryKind
  title: string
  subtitle: string
  imageUrl: string | null
  href: string
}

function safeImageUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const url = value.trim()
  // Never render data: or javascript: from a post's metadata as image URLs.
  return url.startsWith('/') && !url.startsWith('//') || /^https:\/\//i.test(url) ? url : null
}

function safeHref(value: unknown, fallback: string) {
  if (typeof value !== 'string') return fallback
  const url = value.trim()
  return url.startsWith('/') && !url.startsWith('//') || /^https:\/\//i.test(url) ? url : fallback
}

function getProfilePath(post: FeedDiscoveryPost): string | null {
  const contextPath = post.profiles?.account_context?.profile_path
  if (contextPath) return safeHref(contextPath, '/discover/users')
  const username = post.profiles?.username
  return username ? '/profile/' + encodeURIComponent(username) : null
}

function getName(post: FeedDiscoveryPost): string {
  return post.profiles?.account_context?.display_name ||
    post.profiles?.full_name || post.profiles?.username || 'From the community'
}

function classify(post: FeedDiscoveryPost, mode: FeedDiscoveryMode): FeedDiscoveryKind | null {
  if (mode === 'events') return post.event_preview?.title ? 'event' : null
  if (mode === 'music') return post.track_preview?.title ? 'music' : null
  if (mode === 'artists') return post.profiles?.account_context?.type === 'artist' ? 'artist' : null

  if (post.event_preview?.title) return 'event'
  if (post.track_preview?.title) return 'music'
  if (post.media_urls?.some(url => safeImageUrl(url))) return 'moment'
  if (post.profiles?.account_context?.type === 'artist') return 'artist'
  return null
}

function toItem(post: FeedDiscoveryPost, kind: FeedDiscoveryKind): FeedDiscoveryItem | null {
  if (kind === 'event') {
    const event = post.event_preview
    if (!event?.title) return null
    return {
      id: 'event:' + (event.id || post.id),
      kind,
      title: event.title,
      subtitle: [event.venueName, event.location].filter(Boolean).join(' · ') || 'Event update',
      imageUrl: safeImageUrl(event.posterUrl),
      href: safeHref(event.url, '/posts/' + encodeURIComponent(post.id)),
    }
  }

  if (kind === 'music') {
    const track = post.track_preview
    if (!track?.title) return null
    return {
      id: 'music:' + (track.id || post.id),
      kind,
      title: track.title,
      subtitle: track.artistName || track.genre || getName(post),
      imageUrl: safeImageUrl(track.coverArtUrl),
      href: '/posts/' + encodeURIComponent(post.id),
    }
  }

  if (kind === 'artist') {
    const href = getProfilePath(post)
    if (!href) return null
    return {
      id: 'artist:' + (post.profiles?.account_context?.profile_id || post.user_id || post.profiles?.username),
      kind,
      title: getName(post),
      subtitle: 'Artist on Tourify',
      imageUrl: safeImageUrl(post.profiles?.avatar_url),
      href,
    }
  }

  const photo = post.media_urls?.find(url => safeImageUrl(url))
  if (!photo) return null
  return {
    id: 'moment:' + post.id,
    kind: 'moment',
    title: post.content?.trim().slice(0, 64) || 'A moment from the community',
    subtitle: getName(post),
    imageUrl: safeImageUrl(photo),
    href: '/posts/' + encodeURIComponent(post.id),
  }
}

export function buildFeedDiscovery(
  posts: readonly FeedDiscoveryPost[],
  mode: FeedDiscoveryMode,
  limit = 6
): FeedDiscoveryItem[] {
  const seen = new Set<string>()
  const result: FeedDiscoveryItem[] = []
  for (const post of posts) {
    const kind = classify(post, mode)
    if (!kind) continue
    const item = toItem(post, kind)
    if (!item || seen.has(item.id)) continue
    seen.add(item.id)
    result.push(item)
    if (result.length >= Math.max(1, Math.min(12, limit))) break
  }
  return result
}
