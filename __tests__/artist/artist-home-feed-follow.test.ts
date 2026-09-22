import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { followArtistFeedUser } from '@/components/artist/artist-home-feed'

const targetId = '22222222-2222-4222-8222-222222222222'

describe('artist home feed follow action', () => {
  it('uses the canonical authenticated request and accepts an idempotent retry', async () => {
    const request = vi.fn(async () => ({
      ok: true,
      json: async () => ({ success: true, action: 'followed', isFollowing: true, changed: false }),
    })) as unknown as typeof fetch

    expect(await followArtistFeedUser(targetId, request)).toBe(true)
    expect(request).toHaveBeenCalledOnce()
    const [path, options] = (request as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(path).toBe('/api/social/follow')
    expect(options).toMatchObject({ method: 'POST', credentials: 'include', cache: 'no-store' })
    expect(JSON.parse(options.body)).toEqual({ followingId: targetId, action: 'follow' })
  })

  it('keeps errors out of the success path and has no direct follows write', async () => {
    const request = vi.fn(async () => ({ ok: false })) as unknown as typeof fetch
    expect(await followArtistFeedUser(targetId, request)).toBe(false)

    const source = readFileSync(join(process.cwd(), 'components/artist/artist-home-feed.tsx'), 'utf8')
    expect(source).not.toContain(".from('follows')")
    expect(source).toContain('followArtistFeedUser(targetUserId)')
  })
})
