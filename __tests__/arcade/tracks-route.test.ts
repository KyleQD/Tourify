import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createClient } from '@/lib/supabase/server'
import { GET } from '@/app/api/arcade/tracks/route'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))

const mockClient = vi.mocked(createClient)

describe('creator-only arcade music catalog', () => {
  beforeEach(() => { vi.resetAllMocks() })

  it('does not query music at all for unauthenticated visitors', async () => {
    const from = vi.fn()
    mockClient.mockResolvedValue({ auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) }, from } as never)
    const response = await GET()
    expect(response.status).toBe(200)
    expect((await response.json()).tracks).toEqual([])
    expect(response.headers.get('Cache-Control')).toContain('no-store')
    expect(from).not.toHaveBeenCalled()
  })

  it('requires owner, visibility, rights and moderation predicates', async () => {
    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: [{ id: 'track1', title: 'Original Mix', genre: 'house', duration: 50, cover_art_url: null, access_mode: 'free', preview_mode: 'full', preview_duration_seconds: 15 }],
        error: null,
      }),
    }
    const from = vi.fn().mockReturnValue(query)
    mockClient.mockResolvedValue({ auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'artist-abc' } } }) }, from } as never)

    const response = await GET()
    expect(response.status).toBe(200)
    expect(from).toHaveBeenCalledWith('artist_music')
    expect(query.eq).toHaveBeenCalledWith('user_id', 'artist-abc')
    expect(query.eq).toHaveBeenCalledWith('is_public', true)
    expect(query.eq).toHaveBeenCalledWith('is_visible', true)
    expect(query.eq).toHaveBeenCalledWith('moderation_status', 'approved')
    expect(query.eq).toHaveBeenCalledWith('rights_confirmed', true)
    expect(query.limit).toHaveBeenCalledWith(40)
    expect(response.headers.get('Cache-Control')).toContain('no-store')
    expect((await response.json()).tracks[0]).toEqual({
      id: 'track1', title: 'Original Mix', genre: 'house', duration: 50, coverUrl: null,
      accessMode: 'free', previewMode: 'full', previewDurationSeconds: 15,
    })
  })

  it('fails closed instead of returning private tracks on query errors', async () => {
    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
    }
    mockClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'owner' } } }) },
      from: vi.fn().mockReturnValue(query),
    } as never)
    const response = await GET()
    expect(response.status).toBe(500)
    expect((await response.json()).tracks).toEqual([])
  })
})
