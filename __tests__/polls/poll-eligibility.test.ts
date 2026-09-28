import { describe, expect, it } from 'vitest'
import { canVoteOnPoll } from '@/lib/polls/poll-eligibility'

describe('poll-eligibility', () => {
  const basePost = {
    id: 'post-1',
    type: 'poll',
    visibility: 'followers',
    user_id: 'owner-1',
    posted_as_profile_id: 'profile-1',
    poll_ends_at: '2026-07-20T00:00:00.000Z',
  }

  it('requires authentication', () => {
    const result = canVoteOnPoll({
      post: basePost,
      voterUserId: null,
      isAccountFollower: true,
      isUserFollower: false,
      isPostOwner: false,
    })
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('Authentication required')
  })

  it('rejects closed polls', () => {
    const result = canVoteOnPoll({
      post: { ...basePost, poll_ends_at: '2026-07-01T00:00:00.000Z' },
      voterUserId: 'user-2',
      isAccountFollower: true,
      isUserFollower: false,
      isPostOwner: false,
      now: new Date('2026-07-11T00:00:00.000Z'),
    })
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('Poll has ended')
  })

  it('enforces followers-only visibility', () => {
    const now = new Date('2026-07-11T00:00:00.000Z')
    const denied = canVoteOnPoll({
      post: basePost,
      voterUserId: 'user-2',
      isAccountFollower: false,
      isUserFollower: false,
      isPostOwner: false,
      now,
    })
    expect(denied.ok).toBe(false)
    expect(denied.reason).toBe('Followers only')

    const allowed = canVoteOnPoll({
      post: basePost,
      voterUserId: 'user-2',
      isAccountFollower: true,
      isUserFollower: false,
      isPostOwner: false,
      now,
    })
    expect(allowed.ok).toBe(true)
  })

  it('allows public polls for any authenticated voter', () => {
    const result = canVoteOnPoll({
      post: { ...basePost, visibility: 'public' },
      voterUserId: 'user-2',
      isAccountFollower: false,
      isUserFollower: false,
      isPostOwner: false,
      now: new Date('2026-07-11T00:00:00.000Z'),
    })
    expect(result.ok).toBe(true)
  })

  it('rejects duplicate-style already closed owner vote after end', () => {
    const result = canVoteOnPoll({
      post: { ...basePost, type: 'text' },
      voterUserId: 'user-2',
      isAccountFollower: true,
      isUserFollower: false,
      isPostOwner: false,
    })
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('Post is not a poll')
  })
})
