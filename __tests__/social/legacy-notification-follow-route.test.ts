import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const { checkAuth, canonicalPost, getUser, from } = vi.hoisted(() => ({
  checkAuth: vi.fn(),
  canonicalPost: vi.fn(),
  getUser: vi.fn(),
  from: vi.fn(),
}))

vi.mock('@/lib/auth/api-auth', () => ({ checkAuth }))
vi.mock('@/app/api/social/follow/route', () => ({ POST: canonicalPost }))
vi.mock('@/lib/supabase/service-role', () => ({
  serviceRoleClient: { auth: { getUser }, from },
}))

import { GET, POST } from '@/app/api/notifications/social/route'

const targetUserId = '22222222-2222-4222-8222-222222222222'
const postId = '33333333-3333-4333-8333-333333333333'

function request(body: object) {
  return new NextRequest('http://localhost/api/notifications/social', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: 'Bearer actor-token',
    },
    body: JSON.stringify(body),
  })
}

describe('legacy notification social follow envelope', () => {
  beforeEach(() => {
    checkAuth.mockReset()
    checkAuth.mockResolvedValue({ user: { id: 'actor-id' }, supabase: {} })
    canonicalPost.mockReset()
    canonicalPost.mockImplementation(async () => NextResponse.json({
      success: true,
      action: 'followed',
      isFollowing: true,
      changed: false,
    }))
    getUser.mockReset()
    from.mockReset()
  })

  it.each(['follow', 'unfollow'])('delegates %s to the canonical authenticated route', async (type) => {
    const response = await POST(request({ action: 'follow', type, targetUserId }))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      success: true,
      action: 'followed',
      isFollowing: true,
      changed: false,
    })
    expect(canonicalPost).toHaveBeenCalledOnce()
    const forwardedRequest = canonicalPost.mock.calls[0][0] as NextRequest
    expect(forwardedRequest.headers.get('authorization')).toBe('Bearer actor-token')
    expect(await forwardedRequest.json()).toEqual({ followingId: targetUserId, action: type })
    expect(from).not.toHaveBeenCalled()
  })

  it('rejects unauthenticated or invalid legacy mutations before delegation', async () => {
    checkAuth.mockResolvedValueOnce(null)
    expect((await POST(request({ action: 'follow', type: 'follow', targetUserId }))).status).toBe(401)
    expect((await POST(request({ action: 'follow', type: 'block', targetUserId }))).status).toBe(400)
    expect(canonicalPost).not.toHaveBeenCalled()
  })

  it('keeps the notification post-interaction read path available', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'actor-id' } }, error: null })
    from.mockImplementation(() => ({
      select: () => ({
        eq: () => ({ order: async () => ({ data: [], error: null }) }),
      }),
    }))
    const response = await GET(new NextRequest(
      `http://localhost/api/notifications/social?postId=${postId}`,
      { headers: { authorization: 'Bearer actor-token' } },
    ))
    expect(response.status).toBe(200)
    expect((await response.json()).interactions).toEqual({
      likes: { count: 0, users: [] },
      comments: { count: 0, users: [] },
      shares: { count: 0, users: [] },
    })
    expect(from).toHaveBeenCalledTimes(3)
    expect(canonicalPost).not.toHaveBeenCalled()
  })
})
