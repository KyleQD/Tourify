import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/supabase/service-role', () => ({ createServiceRoleClient: vi.fn() }))

import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { POST } from '../route'

const originalFlag = process.env.WORK_EMPLOYER_REVIEW_V1_ENABLED
const useAuth = vi.mocked(createClient)
const useService = vi.mocked(createServiceRoleClient)
const accountId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const inserted: Array<Record<string, unknown>> = []

function setup(input: {
  signedIn?: boolean
  isReviewer?: boolean
  accountType?: string
  accountActive?: boolean
  accountExists?: boolean
  accountProfileTable?: string
  databaseError?: boolean
} = {}) {
  const {
    signedIn = true,
    isReviewer = true,
    accountType = 'artist',
    accountActive = true,
    accountExists = true,
    accountProfileTable = 'artist_profiles',
    databaseError = false,
  } = input

  useAuth.mockResolvedValue({
    auth: { getUser: async () => ({
      data: { user: signedIn ? { id: 'reviewer-id' } : null },
      error: signedIn ? null : { message: 'session missing' },
    }) },
  } as any)

  useService.mockReturnValue({
    auth: { admin: { getUserById: async () => ({
      data: { user: { id: 'reviewer-id', app_metadata: { work_employer_reviewer: isReviewer } } },
      error: null,
    }) } },
    from(table: string) {
      if (table === 'accounts') return {
        select() { return this },
        eq() { return this },
        async maybeSingle() {
          return databaseError
            ? { data: null, error: { message: 'database unavailable' } }
            : {
                data: accountExists ? {
                  id: accountId, is_active: accountActive,
                  account_type: accountType, profile_table: accountProfileTable,
                } : null,
                error: null,
              }
        },
      }
      if (table === 'work_employer_review_events') return {
        insert(row: Record<string, unknown>) {
          inserted.push(row)
          return { select() { return { single: async () => (
            databaseError
              ? { data: null, error: { message: 'write unavailable' } }
              : { data: { id: 'event-123' }, error: null }
          ) } } }
        },
      }
      throw Error('Unexpected table: ' + table)
    },
  } as any)
}

function review(body: Record<string, unknown> | null, origin = 'https://tourify.live') {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (origin) headers.origin = origin
  return POST(new NextRequest('https://tourify.live/api/admin/work/employer-reviews', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  }))
}

const approved = {
  accountId,
  decision: 'approved',
  reason: 'Business identity documents reviewed independently',
}

describe('admin-only Work employer review API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    inserted.length = 0
    process.env.WORK_EMPLOYER_REVIEW_V1_ENABLED = 'true'
  })
  afterEach(() => {
    if (originalFlag === undefined) delete process.env.WORK_EMPLOYER_REVIEW_V1_ENABLED
    else process.env.WORK_EMPLOYER_REVIEW_V1_ENABLED = originalFlag
  })

  it('returns 404 and reads no database when the server feature is disabled', async () => {
    delete process.env.WORK_EMPLOYER_REVIEW_V1_ENABLED
    expect((await review(approved)).status).toBe(404)
    expect(useAuth).not.toHaveBeenCalled()
    expect(useService).not.toHaveBeenCalled()
  })

  it('rejects cross-site and missing-origin administrative requests', async () => {
    expect((await review(approved, 'https://attacker.example')).status).toBe(403)
    expect((await review(approved, '')).status).toBe(403)
    expect(useAuth).not.toHaveBeenCalled()
  })

  it('rejects unauthenticated requests before opening a service-role client', async () => {
    setup({ signedIn: false })
    expect((await review(approved)).status).toBe(401)
    expect(useService).not.toHaveBeenCalled()
  })

  it('ignores claimed reviewer roles in request JSON and uses protected auth metadata', async () => {
    setup({ isReviewer: false })
    expect((await review({ ...approved, work_employer_reviewer: true })).status).toBe(403)
    expect(inserted).toHaveLength(0)
  })

  it('rejects unreviewable accounts and malformed input', async () => {
    setup()
    expect((await review({ ...approved, accountId: 'not-an-account-id' })).status).toBe(400)
    expect((await review({ ...approved, reason: 'too short' })).status).toBe(400)
    expect((await review({ ...approved, admin: true })).status).toBe(400)
    expect(inserted).toHaveLength(0)
    setup({ accountType: 'general', accountProfileTable: 'profiles' })
    expect((await review(approved)).status).toBe(404)
    setup({ accountActive: false })
    expect((await review(approved)).status).toBe(404)
  })

  it('records a protected immutable review event with verified actor identity', async () => {
    setup()
    const res = await review(approved)
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({
      success: true, accountId, decision: 'approved', reviewEventId: 'event-123',
    })
    expect(inserted).toEqual([{
      account_id: accountId,
      reviewer_user_id: 'reviewer-id',
      decision: 'approved',
      reason: approved.reason,
      expires_at: null,
    }])
    expect(res.headers.get('cache-control')).toBe('private, no-store')
  })

  it('rejects past expiration and non-approval expiration', async () => {
    setup()
    expect((await review({ ...approved, expiresAt: '2020-01-01T00:00:00Z' })).status).toBe(400)
    expect((await review({ ...approved, decision: 'revoked', expiresAt: '2030-01-01T00:00:00Z' })).status).toBe(400)
    expect(inserted).toHaveLength(0)
  })

  it('fails closed when the protected tables are unavailable', async () => {
    setup({ databaseError: true })
    expect((await review(approved)).status).toBe(503)
    expect(inserted).toHaveLength(0)
  })
})
