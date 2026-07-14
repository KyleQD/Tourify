export interface FeedApiErrorObject {
  code?: string
  message?: string
  details?: unknown
}

export type FeedApiError = string | FeedApiErrorObject | null | undefined

export type FeedTabValue = 'following' | 'all' | 'personal'

interface BuildFeedPostsUrlOptions {
  type: FeedTabValue | string
  limit: number
  offset?: number
  userId?: string | null
  profileId?: string | null
}

export function extractFeedErrorMessage(
  error: FeedApiError,
  fallback: string = 'Failed to load feed.'
): string {
  if (typeof error === 'string') {
    const message = error.trim()
    return message || fallback
  }

  if (error && typeof error === 'object') {
    const message = typeof error.message === 'string' ? error.message.trim() : ''
    if (message) return message

    const code = typeof error.code === 'string' ? error.code.trim() : ''
    if (code) return code.replace(/_/g, ' ')
  }

  return fallback
}

export function buildFeedPostsUrl({
  type,
  limit,
  offset = 0,
  userId,
  profileId,
}: BuildFeedPostsUrlOptions): string {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  })

  if (type === 'personal') {
    params.set('type', 'user')
    if (profileId) {
      params.set('profile_id', profileId)
    }
    if (userId) {
      params.set('user_id', userId)
    }
  } else {
    params.set('type', type)
    if (profileId) {
      params.set('profile_id', profileId)
    }
  }

  return `/api/feed/posts?${params.toString()}`
}
