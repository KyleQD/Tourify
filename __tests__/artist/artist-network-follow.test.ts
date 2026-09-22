import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { setArtistNetworkFollow } from '@/app/artist/network/page'

const targetId = '22222222-2222-4222-8222-222222222222'

describe('artist network follow actions', () => {
  it.each([
    ['follow', true],
    ['unfollow', false],
  ] as const)('accepts a successful %s retry through the canonical route', async (action, isFollowing) => {
    const request = vi.fn(async (_path: RequestInfo | URL, _options?: RequestInit) => ({
      ok: true,
      json: async () => ({ success: true, isFollowing, changed: false }),
    }))

    await expect(setArtistNetworkFollow(targetId, action, request as unknown as typeof fetch)).resolves.toBeUndefined()
    expect(request).toHaveBeenCalledOnce()
    const [path, options] = request.mock.calls[0]
    expect(path).toBe('/api/social/follow')
    expect(options).toMatchObject({ method: 'POST', credentials: 'include' })
    expect(JSON.parse(String(options?.body))).toEqual({ followingId: targetId, action })
  })

  it('preserves the server error and no longer writes follows from the browser', async () => {
    const request = vi.fn(async () => ({
      ok: false,
      json: async () => ({ error: 'Unauthorized' }),
    }))
    await expect(setArtistNetworkFollow(targetId, 'follow', request as unknown as typeof fetch))
      .rejects.toThrow('Unauthorized')

    const source = readFileSync(join(process.cwd(), 'app/artist/network/page.tsx'), 'utf8')
    expect(source).not.toMatch(/\.from\(["']follows["']\)[\s\S]{0,100}\.(?:insert|delete)\(/)
    expect(source).toContain('setArtistNetworkFollow(userId, "follow")')
    expect(source).toContain('setArtistNetworkFollow(userId, "unfollow")')
  })
})
