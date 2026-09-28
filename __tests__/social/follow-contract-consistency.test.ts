/**
 * SOCIAL-005 — the canonical idempotent follow contract, proven across actors.
 *
 * `__tests__/social/profile-follow-route.test.ts` proves the single-actor
 * retry contract. This file covers what acceptance criterion 3 and 4 still
 * need: two actors, cross-actor isolation of the relationship, the legacy and
 * notification entrypoints resolving to the same state, and the mutation being
 * bounded so its notification side effect cannot be used as a spam primitive.
 *
 * The fake keeps a real edge table so "changed" and the follower's own view can
 * be compared against the other actor's view, which is the only way to catch a
 * delete that reaches across actors.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { authenticate, recordMetric, sendFollowNotification, rateLimitCheck } = vi.hoisted(() => ({
  authenticate: vi.fn(),
  recordMetric: vi.fn(),
  sendFollowNotification: vi.fn(),
  rateLimitCheck: vi.fn(),
}))

vi.mock('@/lib/auth/api-auth', () => ({
  authenticateApiRequest: authenticate,
  checkAuth: authenticate,
  parseAuthFromCookies: authenticate,
}))
vi.mock('@/lib/services/achievement-engine.service', () => ({
  achievementEngine: { recordMetricEvent: recordMetric },
}))
vi.mock('@/lib/services/optimized-notification-service', () => ({
  OptimizedNotificationService: { sendFollowNotification },
}))
vi.mock('@/lib/utils/rate-limit', () => ({
  createRateLimiter: () => ({ check: rateLimitCheck }),
}))

import { GET as getFollow, POST as postFollow } from '@/app/api/social/follow/route'
import { POST as postLegacyFollow } from '@/app/api/follow/route'
import { POST as postNotificationFollow } from '@/app/api/notifications/social/route'

const ALICE = '11111111-1111-4111-8111-111111111111'
const BOB = '22222222-2222-4222-8222-222222222222'
const CAROL = '33333333-3333-4333-8333-333333333333'

interface Edge {
  id: string
  follower_id: string
  following_id: string
}

/** follow key -> edge, so a cross-actor delete is observable. */
let edges: Edge[]
/**
 * Profile id -> `profiles.followers_count`. In the chain this column is
 * maintained by the follows count triggers, so it is independent of the edge
 * table and is served here as an independent input rather than a derived value.
 */
let followersCount: Record<string, number>

function edgeKey(followerId: string, followingId: string) {
  return `${followerId}:${followingId}`
}

function makeSupabase() {
  return {
    from(table: string) {
      if (table === 'follows') {
        const filters: Record<string, string> = {}
        let mode: 'select' | 'insert' | 'delete' = 'select'
        let single = false
        let deleted: Edge[] = []

        const matching = () =>
          edges.filter(
            (edge) =>
              Object.entries(filters).every(([column, value]) => (edge as any)[column] === value),
          )

        const query: any = {
          _filters: filters,
          select: () => {
            if (mode === 'delete') return query
            single = true
            return query
          },
          eq(column: string, value: string) {
            filters[column] = value
            return query
          },
          insert: async ({ follower_id, following_id }: Edge) => {
            const key = edgeKey(follower_id, following_id)
            if (edges.some((edge) => edgeKey(edge.follower_id, edge.following_id) === key)) {
              return { error: { code: '23505' } }
            }
            const edge: Edge = { id: `edge-${edges.length + 1}`, follower_id, following_id }
            edges.push(edge)
            // `profiles.followers_count` is trigger-maintained in the chain and is
            // deliberately not derived from this fake's edge table.
            return { error: null }
          },
          delete: () => {
            // The filters are applied after `delete()` in the Supabase builder,
            // so the mutation happens when the chain is awaited.
            mode = 'delete'
            return query
          },
          single: () => {
            single = true
            return query
          },
          then: (resolve: any, reject: any) => {
            if (mode === 'delete') {
              deleted = matching()
              edges = edges.filter((edge) => !deleted.includes(edge))
              return Promise.resolve({ data: deleted, error: null }).then(resolve, reject)
            }
            const found = matching()
            if (single) {
              return Promise.resolve(
                found.length ? { data: found[0], error: null } : { data: null, error: { code: 'PGRST116' } },
              ).then(resolve, reject)
            }
            return Promise.resolve({ data: found, error: null }).then(resolve, reject)
          },
        }
        return query
      }
      if (table === 'profiles') {
        const query: any = {
          _id: null as string | null,
          select: () => query,
          eq: (_column: string, value: string) => {
            query._id = value
            return query
          },
          maybeSingle: async () => ({
            data: { id: query._id, followers_count: followersCount[query._id as string] || 0 },
            error: null,
          }),
        }
        return query
      }
      throw new Error(`Unexpected table ${table}`)
    },
  }
}

function actAs(actorId: string | null) {
  if (!actorId) {
    authenticate.mockResolvedValue(null)
    return
  }
  authenticate.mockResolvedValue({ user: { id: actorId }, supabase: makeSupabase() })
}

function post(path: string, body: unknown) {
  return new NextRequest(`http://localhost${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function checkRequest(followingId: string) {
  return new NextRequest(
    `http://localhost/api/social/follow?action=check&followingId=${followingId}`,
  )
}

/** The status contract is actor-scoped, so the actor has to be acting. */
async function isFollowing(actorId: string, followingId: string) {
  actAs(actorId)
  const response = await getFollow(checkRequest(followingId))
  expect(response.status).toBe(200)
  return (await response.json()).isFollowing
}

beforeEach(() => {
  edges = []
  followersCount = { [ALICE]: 0, [BOB]: 0, [CAROL]: 0 }
  authenticate.mockReset()
  recordMetric.mockReset()
  recordMetric.mockResolvedValue({ unlockedAchievementIds: [] })
  sendFollowNotification.mockReset()
  sendFollowNotification.mockResolvedValue({ id: 'notification-id' })
  rateLimitCheck.mockReset()
  rateLimitCheck.mockResolvedValue({ success: true })
  actAs(ALICE)
})

describe('SOCIAL-005 one canonical follow contract across entrypoints', () => {
  it('resolves the legacy and notification entrypoints to the same state', async () => {
    const first = await postFollow(post('/api/social/follow', { followingId: BOB, action: 'follow' }))
    expect(await first.json()).toEqual({ success: true, action: 'followed', isFollowing: true, changed: true })

    const viaLegacy = await postLegacyFollow(post('/api/follow', { following_id: BOB, action: 'follow' }))
    expect(viaLegacy.status).toBe(200)
    expect(await viaLegacy.json()).toEqual({ success: true, action: 'followed', isFollowing: true, changed: false })

    const viaNotifications = await postNotificationFollow(
      post('/api/notifications/social', { action: 'follow', type: 'follow', targetUserId: BOB }),
    )
    expect(viaNotifications.status).toBe(200)
    expect(await viaNotifications.json()).toEqual({ success: true, action: 'followed', isFollowing: true, changed: false })

    // One edge, one achievement, one notification, whatever the entrypoint.
    expect(edges).toHaveLength(1)
    expect(recordMetric).toHaveBeenCalledOnce()
    expect(sendFollowNotification).toHaveBeenCalledExactlyOnceWith(BOB, ALICE)

    // And all three entrypoints leave the same reloaded state.
    expect(await isFollowing(ALICE, BOB)).toBe(true)
  })

  it('records the target profile count, not a count of the edges it just wrote', async () => {
    // The profile counter is maintained by the chain's count triggers and can
    // legitimately disagree with the number of edges this request created.
    followersCount[BOB] = 7
    await postFollow(post('/api/social/follow', { followingId: BOB, action: 'follow' }))
    actAs(CAROL)
    await postFollow(post('/api/social/follow', { followingId: BOB, action: 'follow' }))

    expect(edges).toHaveLength(2)
    const bobMetrics = recordMetric.mock.calls.filter((call) => call[0].userId === BOB)
    expect(bobMetrics).toHaveLength(2)
    // Both actors read the same profile counter, and neither sees an
    // edge-derived number.
    for (const [arg] of bobMetrics) {
      expect(arg.absoluteValue).toBe(7)
    }
  })
})

describe('SOCIAL-005 relationship state agrees across actors', () => {
  it('keeps each actor view independent after a mutual follow and an unfollow', async () => {
    await postFollow(post('/api/social/follow', { followingId: BOB, action: 'follow' }))
    actAs(BOB)
    await postFollow(post('/api/social/follow', { followingId: ALICE, action: 'follow' }))

    expect(await isFollowing(ALICE, BOB)).toBe(true)
    expect(await isFollowing(BOB, ALICE)).toBe(true)

    actAs(ALICE)
    const unfollow = await postFollow(post('/api/social/follow', { followingId: BOB, action: 'unfollow' }))
    expect(await unfollow.json()).toEqual({ success: true, action: 'unfollowed', isFollowing: false, changed: true })

    // Alice's view changed; Bob's did not. One edge remains.
    expect(await isFollowing(ALICE, BOB)).toBe(false)
    expect(await isFollowing(BOB, ALICE)).toBe(true)
    expect(edges).toEqual([{ id: 'edge-2', follower_id: BOB, following_id: ALICE }])
  })

  it('is idempotent for a replayed unfollow and for a replayed follow', async () => {
    await postFollow(post('/api/social/follow', { followingId: BOB, action: 'follow' }))
    const firstUnfollow = await postFollow(post('/api/social/follow', { followingId: BOB, action: 'unfollow' }))
    expect(await firstUnfollow.json()).toMatchObject({ changed: true })

    const replay = await postFollow(post('/api/social/follow', { followingId: BOB, action: 'unfollow' }))
    expect(await replay.json()).toEqual({ success: true, action: 'unfollowed', isFollowing: false, changed: false })

    // Re-following after the unfollow is a real change, and re-notifies once.
    const refollow = await postFollow(post('/api/social/follow', { followingId: BOB, action: 'follow' }))
    expect(await refollow.json()).toMatchObject({ changed: true })
    expect(sendFollowNotification).toHaveBeenCalledTimes(2)
  })
})

describe('SOCIAL-005 unauthorized and malformed follow access is refused', () => {
  it('refuses an unauthenticated mutation and never reaches the database', async () => {
    actAs(null)
    const response = await postFollow(post('/api/social/follow', { followingId: BOB, action: 'follow' }))
    expect(response.status).toBe(401)
    expect(edges).toHaveLength(0)
  })

  it('refuses an unauthenticated relationship read', async () => {
    actAs(null)
    expect((await getFollow(checkRequest(BOB))).status).toBe(401)
  })

  it('refuses a self-follow, a malformed target and an unknown action', async () => {
    expect((await postFollow(post('/api/social/follow', { followingId: ALICE, action: 'follow' }))).status).toBe(400)
    expect((await postFollow(post('/api/social/follow', { followingId: 'not-a-uuid', action: 'follow' }))).status).toBe(400)
    expect((await postFollow(post('/api/social/follow', { followingId: BOB, action: 'block' }))).status).toBe(400)
    expect(edges).toHaveLength(0)
    expect(recordMetric).not.toHaveBeenCalled()
    expect(sendFollowNotification).not.toHaveBeenCalled()
  })

  it('never lets one actor delete another actor’s follow edge', async () => {
    // Bob follows Alice.
    actAs(BOB)
    await postFollow(post('/api/social/follow', { followingId: ALICE, action: 'follow' }))

    // Alice asks to unfollow Bob. There is no such edge owned by Alice.
    actAs(ALICE)
    const response = await postFollow(post('/api/social/follow', { followingId: BOB, action: 'unfollow' }))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ success: true, action: 'unfollowed', isFollowing: false, changed: false })
    expect(edges).toEqual([{ id: 'edge-1', follower_id: BOB, following_id: ALICE }])

    // Bob still sees the relationship he owns.
    expect(await isFollowing(BOB, ALICE)).toBe(true)
  })

  it('does not record a side effect for a refused target', async () => {
    actAs(ALICE)
    await postFollow(post('/api/social/follow', { followingId: 'not-a-uuid', action: 'follow' }))
    expect(recordMetric).not.toHaveBeenCalled()
    expect(sendFollowNotification).not.toHaveBeenCalled()
    expect(rateLimitCheck).toHaveBeenCalledWith(ALICE)
  })
})

describe('SOCIAL-005 the canonical mutation is bounded', () => {
  it('refuses a caller that exhausts the window without writing a relationship', async () => {
    rateLimitCheck.mockResolvedValue({ success: false })
    const response = await postFollow(post('/api/social/follow', { followingId: BOB, action: 'follow' }))
    expect(response.status).toBe(429)
    expect(await response.json()).toEqual({ error: 'Too many follow requests' })
    expect(edges).toHaveLength(0)
    expect(sendFollowNotification).not.toHaveBeenCalled()
  })

  it('bounds the mutation per authenticated user, not per target', async () => {
    await postFollow(post('/api/social/follow', { followingId: BOB, action: 'follow' }))
    await postFollow(post('/api/social/follow', { followingId: CAROL, action: 'follow' }))
    expect(rateLimitCheck).toHaveBeenCalledTimes(2)
    for (const call of rateLimitCheck.mock.calls) {
      expect(call).toEqual([ALICE])
    }
  })
})
