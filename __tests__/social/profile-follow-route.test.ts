import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

const { authenticate, recordMetric, sendFollowNotification } = vi.hoisted(() => ({
  authenticate: vi.fn(),
  recordMetric: vi.fn(),
  sendFollowNotification: vi.fn(),
}))

vi.mock('@/lib/auth/api-auth', () => ({ authenticateApiRequest: authenticate }))
vi.mock('@/lib/services/achievement-engine.service', () => ({
  achievementEngine: { recordMetricEvent: recordMetric },
}))
vi.mock('@/lib/services/optimized-notification-service', () => ({
  OptimizedNotificationService: { sendFollowNotification },
}))

import { GET as getFollow, POST as postFollow } from '@/app/api/social/follow/route'
import { POST as postLegacyFollow } from '@/app/api/follow/route'

const actorId = '11111111-1111-4111-8111-111111111111'
const targetId = '22222222-2222-4222-8222-222222222222'

function request(path: string, body: object) {
  return new NextRequest(`http://localhost${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('canonical profile follow mutation', () => {
  const follows = new Set<string>()
  const key = `${actorId}:${targetId}`
  const from = vi.fn((table: string) => {
    if (table === 'follows') {
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              single: async () => follows.has(key)
                ? { data: { id: 'follow-id' }, error: null }
                : { data: null, error: { code: 'PGRST116' } },
            }),
          }),
        }),
        insert: vi.fn(async ({ follower_id, following_id }) => {
          const rowKey = `${follower_id}:${following_id}`
          if (follows.has(rowKey)) return { error: { code: '23505' } }
          follows.add(rowKey)
          return { error: null }
        }),
        delete: () => ({
          eq: () => ({
            eq: () => ({
              select: async () => {
                const existed = follows.delete(key)
                return { data: existed ? [{ id: 'follow-id' }] : [], error: null }
              },
            }),
          }),
        }),
      }
    }
    if (table === 'profiles') {
      return {
        select: () => ({
          eq: () => ({ maybeSingle: async () => ({ data: { followers_count: follows.size }, error: null }) }),
        }),
      }
    }
    throw new Error(`Unexpected table ${table}`)
  })

  beforeEach(() => {
    follows.clear()
    authenticate.mockReset()
    authenticate.mockResolvedValue({ user: { id: actorId }, supabase: { from } })
    recordMetric.mockReset()
    recordMetric.mockResolvedValue({ unlockedAchievementIds: [] })
    sendFollowNotification.mockReset()
    sendFollowNotification.mockResolvedValue({ id: 'notification-id' })
    from.mockClear()
  })

  it('returns one state and records the metric only for the first insert, including legacy retry', async () => {
    const first = await postFollow(request('/api/social/follow', { followingId: targetId, action: 'follow' }))
    expect(first.status).toBe(200)
    expect(await first.json()).toEqual({ success: true, action: 'followed', isFollowing: true, changed: true })
    expect(recordMetric).toHaveBeenCalledOnce()
    expect(sendFollowNotification).toHaveBeenCalledExactlyOnceWith(targetId, actorId)
    expect(recordMetric).toHaveBeenCalledWith(expect.objectContaining({
      userId: targetId,
      metricKey: 'followers_total',
      absoluteValue: 1,
    }))

    const retry = await postLegacyFollow(request('/api/follow', { following_id: targetId, action: 'follow' }))
    expect(retry.status).toBe(200)
    expect(await retry.json()).toEqual({ success: true, action: 'followed', isFollowing: true, changed: false })
    expect(recordMetric).toHaveBeenCalledOnce()
    expect(sendFollowNotification).toHaveBeenCalledOnce()
    expect(follows.size).toBe(1)
  })

  it('makes repeated unfollow successful without deleting another relationship', async () => {
    follows.add(key)
    const first = await postFollow(request('/api/social/follow', { followingId: targetId, action: 'unfollow' }))
    expect(await first.json()).toEqual({ success: true, action: 'unfollowed', isFollowing: false, changed: true })
    const retry = await postFollow(request('/api/social/follow', { followingId: targetId, action: 'unfollow' }))
    expect(await retry.json()).toEqual({ success: true, action: 'unfollowed', isFollowing: false, changed: false })
    expect(recordMetric).not.toHaveBeenCalled()
  })

  it('reports the persisted state through the status contract after follow and unfollow', async () => {
    const statusRequest = () => new NextRequest(`http://localhost/api/social/follow?action=check&followingId=${targetId}`)
    expect(await (await getFollow(statusRequest())).json()).toEqual({ isFollowing: false })
    await postFollow(request('/api/social/follow', { followingId: targetId, action: 'follow' }))
    expect(await (await getFollow(statusRequest())).json()).toEqual({ isFollowing: true })
    await postFollow(request('/api/social/follow', { followingId: targetId, action: 'unfollow' }))
    expect(await (await getFollow(statusRequest())).json()).toEqual({ isFollowing: false })
  })

  it('does not turn a committed follow into a retry when notification delivery fails', async () => {
    sendFollowNotification.mockRejectedValueOnce(new Error('notification unavailable'))
    const response = await postFollow(request('/api/social/follow', { followingId: targetId, action: 'follow' }))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ success: true, action: 'followed', isFollowing: true, changed: true })
    expect(follows.has(key)).toBe(true)
  })

  it('rejects unauthenticated mutation and self-follow', async () => {
    authenticate.mockResolvedValueOnce(null)
    expect((await postFollow(request('/api/social/follow', { followingId: targetId, action: 'follow' }))).status).toBe(401)
    expect((await postFollow(request('/api/social/follow', { followingId: actorId, action: 'follow' }))).status).toBe(400)
    expect(from).not.toHaveBeenCalled()
  })

  it('rejects malformed and unsupported requests before a database write', async () => {
    expect((await postFollow(request('/api/social/follow', null as unknown as object))).status).toBe(400)
    expect((await postFollow(request('/api/social/follow', { followingId: targetId, action: 'block' }))).status).toBe(400)
    expect(from).not.toHaveBeenCalled()
  })

  it('keeps profile, feed, service, and mobile clients on the canonical request shape', () => {
    for (const path of [
      'components/profile/public-profile-view.tsx',
      'components/feed/social-feed.tsx',
      'lib/services/social-interactions.service.ts',
      'apps/mobile/lib/api/follow.ts',
    ]) {
      const source = readFileSync(join(process.cwd(), path), 'utf8')
      expect(source).toContain('/api/social/follow')
      expect(source).toContain('followingId')
      expect(source).not.toContain('"/api/follow"')
    }
  })
})
