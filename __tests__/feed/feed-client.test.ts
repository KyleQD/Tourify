import { describe, expect, it } from 'vitest'

import { buildFeedPostsUrl, extractFeedErrorMessage } from '@/lib/feed/feed-client'

describe('extractFeedErrorMessage', () => {
  it('prefers structured error messages', () => {
    expect(
      extractFeedErrorMessage({ code: 'feed_query_failed', message: 'Failed to fetch feed posts' })
    ).toBe('Failed to fetch feed posts')
  })

  it('falls back to string errors', () => {
    expect(extractFeedErrorMessage('Unauthorized')).toBe('Unauthorized')
  })

  it('uses the provided fallback for empty values', () => {
    expect(extractFeedErrorMessage(null, 'Try again later')).toBe('Try again later')
  })
})

describe('buildFeedPostsUrl', () => {
  it('maps personal tabs to the user feed API contract', () => {
    expect(
      buildFeedPostsUrl({
        type: 'personal',
        limit: 20,
        offset: 40,
        profileId: 'profile-123',
        userId: 'user-123',
      })
    ).toBe('/api/feed/posts?limit=20&offset=40&type=user&profile_id=profile-123&user_id=user-123')
  })

  it('falls back to user_id when no profile id is available', () => {
    expect(
      buildFeedPostsUrl({
        type: 'personal',
        limit: 20,
        userId: 'user-123',
      })
    ).toBe('/api/feed/posts?limit=20&offset=0&type=user&user_id=user-123')
  })

  it('includes active profile id for non-personal feeds', () => {
    expect(
      buildFeedPostsUrl({
        type: 'following',
        limit: 20,
        profileId: 'venue-123',
        userId: 'user-123',
      })
    ).toBe('/api/feed/posts?limit=20&offset=0&type=following&profile_id=venue-123')
  })
})
