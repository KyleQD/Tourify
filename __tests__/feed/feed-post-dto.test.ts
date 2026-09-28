import { describe, expect, it } from 'vitest'
import { normalizeFeedPostDTO } from '@/lib/feed/feed-post-dto'

const appearance = {
  post_id: 'post-1',
  template_id: 'bootleg-pixel',
  template_version: 1,
  schema_version: 3,
  snapshot: { configuration: { textureId: 'chrome-grid' } },
  snapshot_hash: 'hash-1',
  status: 'active',
}

describe('normalizeFeedPostDTO', () => {
  it('uses the live entity author while preserving owner and appearance aliases', () => {
    const post = normalizeFeedPostDTO({
      id: 'post-1',
      user_id: 'owner-user',
      content: 'Artist update',
      created_at: '2026-08-01T12:00:00.000Z',
      posted_as_profile_id: 'artist-1',
      posted_as_type: 'artist',
      account_display_name: 'Old Artist Name',
      account_username: 'old-name',
      resolved_author: {
        id: 'artist-1',
        type: 'artist',
        name: 'Feelix',
        username: 'feelix',
        avatarUrl: '/feelix.jpg',
        isVerified: true,
      },
      post_appearances: appearance,
    })

    expect(post.user_id).toBe('owner-user')
    expect(post.author).toMatchObject({
      id: 'artist-1',
      type: 'artist',
      displayName: 'Feelix',
      profilePath: '/artist/feelix',
    })
    expect(post.profiles).toMatchObject({
      id: 'artist-1',
      full_name: 'Feelix',
      account_context: { profile_path: '/artist/feelix' },
    })
    expect(post.appearance).toEqual(appearance)
    expect(post.post_appearances).toEqual(appearance)
  })

  it('uses the stored entity snapshot when a live entity is unavailable', () => {
    const post = normalizeFeedPostDTO({
      id: 'post-2',
      user_id: 'owner-user',
      content: 'Archived artist update',
      created_at: '2026-08-01T12:00:00.000Z',
      posted_as_profile_id: 'missing-artist',
      posted_as_type: 'artist',
      account_display_name: 'Archived Artist',
      account_username: 'archived-artist',
      account_avatar_url: '/archived.jpg',
    })

    expect(post.author).toMatchObject({
      id: 'missing-artist',
      type: 'artist',
      displayName: 'Archived Artist',
      profilePath: '/artist/archived-artist',
    })
    expect(post.author.displayName).not.toBe('owner-user')
    expect(post.appearance).toBeNull()
  })
})
