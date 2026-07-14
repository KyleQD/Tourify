import { describe, expect, it } from 'vitest'
import { presentFollowRequests } from '@/lib/social/follow-request-presenter'

describe('presentFollowRequests', () => {
  it('hydrates requester profiles by id without PostgREST embeds', () => {
    const presented = presentFollowRequests({
      rows: [
        {
          id: 'req-1',
          requester_id: 'user-a',
          created_at: '2026-07-09T12:00:00.000Z',
        },
        {
          id: 'req-2',
          requester_id: 'user-b',
          created_at: '2026-07-09T13:00:00.000Z',
        },
      ],
      profiles: [
        {
          id: 'user-a',
          username: 'alice',
          full_name: 'Alice Tour',
          avatar_url: null,
          is_verified: true,
        },
      ],
    })

    expect(presented).toHaveLength(2)
    expect(presented[0].profiles).toMatchObject({
      id: 'user-a',
      username: 'alice',
      full_name: 'Alice Tour',
      is_verified: true,
    })
    expect(presented[1].profiles).toMatchObject({
      id: 'user-b',
      username: 'unknown',
      full_name: null,
    })
  })

  it('returns empty list for empty rows', () => {
    expect(presentFollowRequests({ rows: [], profiles: [] })).toEqual([])
  })
})
