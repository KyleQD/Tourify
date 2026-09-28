/**
 * SOCIAL-007 / SIM-20260922-SOC-003 — poll interaction read isolation.
 *
 * `GET /api/posts/[id]/poll/vote` previously read the poll bundle through the
 * service-role client with no visibility gate at all, so an unauthenticated
 * caller could read a followers-only or private post's poll question, options
 * and per-option vote tallies, and could probe poll existence by status code.
 *
 * These are negative tests: the gate must run before any poll read, it must be
 * fail-closed, and it must not distinguish a missing post from a non-entitled
 * one.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

type Row = Record<string, any>

const OWNER = '11111111-1111-4111-8111-111111111111'
const FOLLOWER = '22222222-2222-4222-8222-222222222222'
const OUTSIDER = '33333333-3333-4333-8333-333333333333'

const PUBLIC_POLL = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const FOLLOWERS_POLL = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const PRIVATE_POLL = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
const MISSING_POLL = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'

const { parseAuthFromCookies, serviceRoleFrom, serverFrom } = vi.hoisted(() => ({
  parseAuthFromCookies: vi.fn(),
  serviceRoleFrom: vi.fn(),
  serverFrom: vi.fn(),
}))

vi.mock('@/lib/auth/api-auth', () => ({ parseAuthFromCookies }))
vi.mock('@/lib/supabase/server', () => ({
  // In a real route handler `cookies()` is in request scope; the test only
  // needs the anonymous reader the route falls back to.
  createClient: async () => ({ from: serverFrom, auth: { uid: () => null } }),
}))
vi.mock('@/lib/config/audit-feature-gates', () => ({
  isAuditFeatureApproved: () => true,
  auditFeatureUnavailable: () =>
    new Response('unavailable', { status: 503 }) as any,
}))
vi.mock('@/lib/polls/hydrate-polls', () => ({
  buildPollPayload: (args: any) => ({
    question: args.question,
    options: args.options,
    endsAt: args.endsAt,
    totalVotes: args.totalVotes,
    viewerVotedOptionId: args.viewerVotedOptionId,
  }),
}))
vi.mock('@/lib/supabase/service-role', () => ({
  createServiceRoleClient: () => ({ from: serviceRoleFrom }),
}))

let db: Record<string, Row[]>

function seedDb() {
  return {
    posts: [
      {
        id: PUBLIC_POLL,
        user_id: OWNER,
        content: 'public poll?',
        type: 'poll',
        visibility: 'public',
        is_visible: true,
        moderation_status: 'approved',
        posted_as_profile_id: null,
        poll_ends_at: null,
        poll_total_votes: 2,
      },
      {
        id: FOLLOWERS_POLL,
        user_id: OWNER,
        content: 'followers poll?',
        type: 'poll',
        visibility: 'followers',
        is_visible: true,
        moderation_status: 'approved',
        posted_as_profile_id: null,
        poll_ends_at: null,
        poll_total_votes: 1,
      },
      {
        id: PRIVATE_POLL,
        user_id: OWNER,
        content: 'private poll?',
        type: 'poll',
        visibility: 'private',
        is_visible: true,
        moderation_status: 'approved',
        posted_as_profile_id: null,
        poll_ends_at: null,
        poll_total_votes: 1,
      },
    ],
    poll_options: [
      { id: 'opt-1', post_id: PUBLIC_POLL, text: 'A', position: 1, vote_count: 1 },
      { id: 'opt-2', post_id: PUBLIC_POLL, text: 'B', position: 2, vote_count: 1 },
      { id: 'opt-3', post_id: FOLLOWERS_POLL, text: 'secret', position: 1, vote_count: 1 },
      { id: 'opt-4', post_id: PRIVATE_POLL, text: 'hidden', position: 1, vote_count: 1 },
    ],
    poll_votes: [
      { id: 'vote-1', post_id: PUBLIC_POLL, option_id: 'opt-1', user_id: FOLLOWER },
    ],
    follows: [{ id: 'f-1', follower_id: FOLLOWER, following_id: OWNER }],
    accounts: [],
    account_follows: [],
    profiles: [],
  }
}

/** Minimal RLS-faithful reader for the gate client and the poll bundle. */
function makeClient(rows: Record<string, Row[]>, authUid: string | null) {
  return {
    from(table: string) {
      const filters: Array<{ col: string; val: any }> = []
      let orderAsc = true
      let orderCol: string | null = null
      let rangeBounds: [number, number] | null = null
      let exactCount = false
      let head = false

      const run = (single: boolean) => {
        let result = (rows[table] || []).slice()
        for (const filter of filters) {
          result = result.filter((row) => row[filter.col] === filter.val)
        }
        if (orderCol) {
          const col = orderCol
          result.sort((a, b) => {
            const left = String(a[col] ?? '')
            const right = String(b[col] ?? '')
            return orderAsc ? left.localeCompare(right) : right.localeCompare(left)
          })
        }
        const total = result.length
        if (rangeBounds) result = result.slice(rangeBounds[0], rangeBounds[1] + 1)
        if (head) return Promise.resolve({ data: null, error: null, count: exactCount ? total : null })
        if (single) {
          return Promise.resolve({
            data: result.length ? result[0] : null,
            error: result.length ? null : { code: 'PGRST116' },
            count: exactCount ? total : null,
          })
        }
        return Promise.resolve({ data: result, error: null, count: exactCount ? total : null })
      }

      const query: any = {
        select(_spec: string, opts?: any) {
          exactCount = opts?.count === 'exact'
          head = Boolean(opts?.head)
          return query
        },
        eq(col: string, val: any) {
          filters.push({ col, val })
          return query
        },
        neq() { return query },
        in() { return query },
        not() { return query },
        is() { return query },
        order(col: string, opts?: any) {
          orderCol = col
          orderAsc = opts?.ascending !== false
          return query
        },
        range(from: number, to: number) {
          rangeBounds = [from, to]
          return query
        },
        limit() { return query },
        maybeSingle() { return run(true) },
        single() { return run(true) },
        then(resolve: any, reject: any) { return run(false).then(resolve, reject) },
      }
      return query
    },
    auth: { uid: () => authUid },
  }
}

function signIn(userId: string | null) {
  if (!userId) {
    parseAuthFromCookies.mockResolvedValue(null)
    return
  }
  parseAuthFromCookies.mockResolvedValue({
    user: { id: userId },
    supabase: makeClient(db, userId),
  })
}

function getRequest() {
  return new NextRequest('http://localhost/api/posts/abc/poll/vote', {
    headers: { authorization: 'Bearer actor-token' },
  })
}

describe('SOCIAL-007 poll interaction read isolation', () => {
  beforeEach(() => {
    db = seedDb()
    parseAuthFromCookies.mockReset()
    serviceRoleFrom.mockReset()
    serverFrom.mockReset()
    serviceRoleFrom.mockImplementation((table: string) => makeClient(db, OWNER).from(table))
    serverFrom.mockImplementation((table: string) => makeClient(db, null).from(table))
    signIn(OUTSIDER)
  })

  it('denies an anonymous caller a followers-only poll', async () => {
    signIn(null)
    const { GET } = await import('@/app/api/posts/[id]/poll/vote/route')
    const response = await GET(getRequest(), {
      params: Promise.resolve({ id: FOLLOWERS_POLL }),
    })
    expect(response.status).toBe(404)
    const body = await response.json()
    expect(body).toEqual({ error: 'Post not found' })
    expect(JSON.stringify(body)).not.toContain('secret')
  })

  it('never reads the poll bundle for a denied caller', async () => {
    const { GET } = await import('@/app/api/posts/[id]/poll/vote/route')
    await GET(getRequest(), { params: Promise.resolve({ id: PRIVATE_POLL }) })
    const tablesTouched = serviceRoleFrom.mock.calls.map((call) => call[0])
    expect(tablesTouched).not.toContain('poll_options')
    expect(tablesTouched).not.toContain('poll_votes')
  })

  it('denies an outsider a private poll', async () => {
    const { GET } = await import('@/app/api/posts/[id]/poll/vote/route')
    const response = await GET(getRequest(), {
      params: Promise.resolve({ id: PRIVATE_POLL }),
    })
    expect(response.status).toBe(404)
    expect(JSON.stringify(await response.json())).not.toContain('hidden')
  })

  it('denies an outsider a followers-only poll even when they do not follow', async () => {
    db.follows = []
    const { GET } = await import('@/app/api/posts/[id]/poll/vote/route')
    const response = await GET(getRequest(), {
      params: Promise.resolve({ id: FOLLOWERS_POLL }),
    })
    expect(response.status).toBe(404)
  })

  it('answers a missing post and a non-entitled post identically', async () => {
    const { GET } = await import('@/app/api/posts/[id]/poll/vote/route')
    const missing = await GET(getRequest(), { params: Promise.resolve({ id: MISSING_POLL }) })
    const notEntitled = await GET(getRequest(), { params: Promise.resolve({ id: PRIVATE_POLL }) })
    expect(missing.status).toBe(notEntitled.status)
    expect(await missing.json()).toEqual(await notEntitled.json())
  })

  it('authorizes a follower for a followers-only poll', async () => {
    signIn(FOLLOWER)
    const { GET } = await import('@/app/api/posts/[id]/poll/vote/route')
    const response = await GET(getRequest(), {
      params: Promise.resolve({ id: FOLLOWERS_POLL }),
    })
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.success).toBe(true)
    expect(body.data.question).toBe('followers poll?')
  })

  it('authorizes the author for their own private poll', async () => {
    signIn(OWNER)
    const { GET } = await import('@/app/api/posts/[id]/poll/vote/route')
    const response = await GET(getRequest(), {
      params: Promise.resolve({ id: PRIVATE_POLL }),
    })
    expect(response.status).toBe(200)
    expect((await response.json()).data.question).toBe('private poll?')
  })

  it('keeps a public poll readable by an anonymous caller', async () => {
    signIn(null)
    const { GET } = await import('@/app/api/posts/[id]/poll/vote/route')
    const response = await GET(getRequest(), { params: Promise.resolve({ id: PUBLIC_POLL }) })
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.data.question).toBe('public poll?')
    expect(body.data.totalVotes).toBe(2)
    expect(body.data.viewerVotedOptionId).toBeNull()
  })

  it('reports the caller’s own vote only', async () => {
    signIn(FOLLOWER)
    const { GET } = await import('@/app/api/posts/[id]/poll/vote/route')
    const response = await GET(getRequest(), { params: Promise.resolve({ id: PUBLIC_POLL }) })
    const body = await response.json()
    expect(body.data.viewerVotedOptionId).toBe('opt-1')
  })

  it('fails closed when the authorization gate throws', async () => {
    parseAuthFromCookies.mockImplementation(() => { throw new Error('auth store unavailable') })
    const { GET } = await import('@/app/api/posts/[id]/poll/vote/route')
    // The outer handler converts the auth failure to a 500; the important
    // invariant is that the poll bundle is never read.
    const response = await GET(getRequest(), { params: Promise.resolve({ id: PUBLIC_POLL }) })
    expect(response.status).toBeGreaterThanOrEqual(400)
    expect(serviceRoleFrom).not.toHaveBeenCalled()
  })
})
