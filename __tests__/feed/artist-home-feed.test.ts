import { describe, expect, it } from 'vitest'
import {
  matchesHomeFeedScope,
  matchesTaggedFeedScope,
  profileIdsFromFollowedAccounts,
  type FeedQueryScope,
} from '@/lib/feed/feed-posts-query'
import {
  normalizeCollaboratorInvites,
  normalizeTaggedUserIds,
} from '@/lib/feed/post-collaborator-helpers'
import { buildFeedPostsUrl } from '@/lib/feed/feed-client'

const viewerId = '11111111-1111-4111-8111-111111111111'
const friendId = '22222222-2222-4222-8222-222222222222'
const bandProfileId = '33333333-3333-4333-8333-333333333333'
const taggedPostId = '44444444-4444-4444-8444-444444444444'
const collabPostId = '55555555-5555-4555-8555-555555555555'

function homeScope(overrides: Partial<FeedQueryScope> = {}): FeedQueryScope {
  return {
    type: 'home',
    userIdParam: null,
    profileIdFilter: null,
    authUserId: viewerId,
    followingUserIds: [viewerId, friendId],
    followingProfileIds: [],
    ownedProfileIds: [],
    membershipProfileIds: [bandProfileId],
    extraPostIds: [taggedPostId, collabPostId],
    ...overrides,
  }
}

describe('artist home feed scope matching', () => {
  it('includes followed user personal posts', () => {
    expect(
      matchesHomeFeedScope(
        { id: 'p1', user_id: friendId, posted_as_profile_id: null, visibility: 'public' },
        homeScope()
      )
    ).toBe(true)
  })

  it('includes band/org membership posts without following the page', () => {
    expect(
      matchesHomeFeedScope(
        {
          id: 'p2',
          user_id: '99999999-9999-4999-8999-999999999999',
          posted_as_profile_id: bandProfileId,
          visibility: 'public',
        },
        homeScope()
      )
    ).toBe(true)
  })

  it('includes tagged and accepted-collab posts via extraPostIds', () => {
    expect(
      matchesHomeFeedScope(
        {
          id: taggedPostId,
          user_id: '88888888-8888-4888-8888-888888888888',
          posted_as_profile_id: null,
          visibility: 'followers',
        },
        homeScope()
      )
    ).toBe(true)

    expect(
      matchesHomeFeedScope(
        {
          id: collabPostId,
          user_id: '77777777-7777-4777-8777-777777777777',
          posted_as_profile_id: null,
          visibility: 'public',
        },
        homeScope()
      )
    ).toBe(true)
  })

  it('includes posts where tagged_users contains the viewer', () => {
    expect(
      matchesHomeFeedScope(
        {
          id: 'p-tag',
          user_id: '66666666-6666-4666-8666-666666666666',
          tagged_users: [viewerId],
          visibility: 'public',
        },
        homeScope({ extraPostIds: [] })
      )
    ).toBe(true)
  })

  it('excludes unrelated posts', () => {
    expect(
      matchesHomeFeedScope(
        {
          id: 'p-other',
          user_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          posted_as_profile_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
          visibility: 'public',
        },
        homeScope({ extraPostIds: [] })
      )
    ).toBe(false)
  })
})

describe('tagged feed scope', () => {
  it('only matches posts that tag the viewer', () => {
    const scope: FeedQueryScope = {
      type: 'tagged',
      userIdParam: null,
      profileIdFilter: null,
      authUserId: viewerId,
    }

    expect(
      matchesTaggedFeedScope(
        { id: '1', tagged_users: [viewerId], visibility: 'public' },
        scope
      )
    ).toBe(true)

    expect(
      matchesTaggedFeedScope(
        { id: '2', tagged_users: [friendId], visibility: 'public' },
        scope
      )
    ).toBe(false)
  })
})

describe('account follow profile expansion', () => {
  it('uses profile_id only for page follows', () => {
    expect(
      profileIdsFromFollowedAccounts([
        { profile_id: bandProfileId, owner_user_id: 'owner-leak' },
        { profile_id: null, owner_user_id: 'ignored' },
      ])
    ).toEqual([bandProfileId])
  })
})

describe('post collaborator / tag helpers', () => {
  it('normalizes tagged user ids and excludes author', () => {
    expect(
      normalizeTaggedUserIds([viewerId, friendId, 'not-a-uuid', friendId], viewerId)
    ).toEqual([friendId])
  })

  it('normalizes collaborator invites from strings and objects', () => {
    expect(
      normalizeCollaboratorInvites(
        [
          friendId,
          { userId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', profileId: bandProfileId },
          { user_id: viewerId },
        ],
        viewerId
      )
    ).toEqual([
      { userId: friendId, profileId: null },
      { userId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', profileId: bandProfileId },
    ])
  })
})

describe('feed client home/tagged urls', () => {
  it('builds home and tagged feed urls', () => {
    expect(buildFeedPostsUrl({ type: 'home', limit: 20 })).toContain('type=home')
    expect(buildFeedPostsUrl({ type: 'tagged', limit: 20 })).toContain('type=tagged')
  })
})
