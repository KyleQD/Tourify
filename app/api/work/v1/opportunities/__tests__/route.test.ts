import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
import { createClient } from '@/lib/supabase/server'
import { GET } from '@/app/api/work/v1/opportunities/route'

const originalFlag = process.env.WORK_DISCOVERY_V1_ENABLED
const mockedClient = vi.mocked(createClient)

function queryReturning(rows: Record<string, unknown>[]) {
  const chain: Record<string, any> = {}
  for (const key of ['select', 'eq', 'in', 'or', 'order', 'limit'])
    chain[key] = () => chain
  chain.then = (resolve: any, reject: any) => Promise.resolve({ data: rows, error: null }).then(resolve, reject)
  return chain
}

function get(path = '') {
  return GET(new NextRequest('https://tourify.live/api/work/v1/opportunities' + path))
}

describe('Work v1 public discovery canary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.WORK_DISCOVERY_V1_ENABLED = 'true'
  })
  afterEach(() => {
    if (originalFlag === undefined) delete process.env.WORK_DISCOVERY_V1_ENABLED
    else process.env.WORK_DISCOVERY_V1_ENABLED = originalFlag
  })

  it('is unreachable unless explicitly enabled on the server', async () => {
    delete process.env.WORK_DISCOVERY_V1_ENABLED
    const response = await get()
    expect(response.status).toBe(404)
    expect(mockedClient).not.toHaveBeenCalled()
  })

  it('refuses paid job discovery until protected publishing grants are deployed', async () => {
    const response = await get('?kind=paid_work')
    expect(response.status).toBe(501)
    expect(mockedClient).not.toHaveBeenCalled()
  })

  it('rejects bad request parameters without reading any user data', async () => {
    expect((await get('?limit=999')).status).toBe(400)
    expect((await get('?after=not-a-valid-cursor')).status).toBe(400)
    expect(mockedClient).not.toHaveBeenCalled()
  })

  it('returns only eligible artist collaborations, never raw contact details', async () => {
    const rows = [
      {
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        title: 'Vocalist collaboration',
        description: 'Recording project',
        created_at: '2026-10-01T12:00:00Z',
        status: 'open',
        job_type: 'collaboration',
        payment_type: 'unpaid',
        payment_amount: null,
        location: 'Las Vegas',
        required_skills: ['Vocals'],
        posted_by_type: 'artist',
        posted_by: 'user-123',
        poster_profile_id: 'profile-123',
        contact_email: 'never-expose@example.com',
      },
      {
        id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        title: 'Paid studio work',
        description: 'Not yet verified',
        created_at: '2026-10-02T12:00:00Z',
        status: 'open',
        job_type: 'collaboration',
        payment_type: 'paid',
        payment_amount: 800,
        posted_by_type: 'artist',
        posted_by: 'user-123',
        poster_profile_id: 'profile-123',
      },
    ]
    mockedClient.mockResolvedValue({
      from: (table: string) =>
        table === 'artist_jobs'
          ? queryReturning(rows)
          : queryReturning([{ id: 'profile-123', user_id: 'user-123' }]),
    } as any)

    const response = await get()
    expect(response.status).toBe(200)
    const payload = await response.json()
    expect(payload.items).toHaveLength(1)
    expect(payload.items[0]).toMatchObject({
      kind: 'creative_collaboration',
      title: 'Vocalist collaboration',
      location: 'Las Vegas',
      verifiedPaidEmployer: false,
    })
    expect(JSON.stringify(payload)).not.toContain('never-expose@example.com')
    expect(JSON.stringify(payload)).not.toContain('Paid studio work')
  })

  it('ignores posts that were not actually associated with their artist account', async () => {
    mockedClient.mockResolvedValue({
      from: (table: string) => table === 'artist_jobs'
        ? queryReturning([{
          id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
          title: 'Artist search',
          description: 'Looking for a drummer',
          created_at: '2026-10-01T12:00:00Z',
          status: 'open',
          job_type: 'collaboration',
          payment_type: 'unpaid',
          posted_by_type: 'artist',
          posted_by: 'another-user',
          poster_profile_id: 'profile-123',
        }])
        : queryReturning([{ id: 'profile-123', user_id: 'user-123' }]),
    } as any)

    const response = await get()
    const payload = await response.json()
    expect(payload.items).toHaveLength(0)
  })
})
