/**
 * SOCIAL-007 / SIM-20260922-SOC-003 — interaction and notification read
 * isolation.
 *
 * These are negative tests and they are the point of the task: a user must
 * never read another user's private interaction data, and no user-supplied
 * identifier may reach an unscoped service-role read.
 *
 * The fake client models the RLS posture that actually ships in the migration
 * chain, because that posture decides which layer is the real boundary:
 *   - `post_likes`   SELECT policy is `USING (true)`  (20240430000000)
 *   - `post_comments` SELECT policy is `USING (true)`  (20241220000010)
 *   - `post_shares`   SELECT policy is `auth.uid() = user_id` (20241220000010)
 *   - `posts`         SELECT policy is `USING (true)`
 *   - `follows`       SELECT policy is `USING (true)`
 * Because likes/comments are permissive at the database, the mandatory
 * application-level post-visibility gate is the enforcement boundary and is
 * proven here to run *before* any interaction read.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

type Row = Record<string, any>

const OWNER = '11111111-1111-4111-8111-111111111111'
const FOLLOWER = '22222222-2222-4222-8222-222222222222'
const OUTSIDER = '33333333-3333-4333-8333-333333333333'

const PUBLIC_POST = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const FOLLOWERS_POST = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const PRIVATE_POST = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'

/** SELECT policies that are `auth.uid() = user_id` in the shipped chain. */
const OWNER_SCOPED_SELECT_TABLES = new Set(['post_shares'])

function seedDb(): Record<string, Row[]> {
  return {
    accounts: [],
    account_follows: [],
    profiles: [
      { id: OWNER, username: 'owner', full_name: 'Owner', avatar_url: '', is_verified: true },
      { id: FOLLOWER, username: 'follower', full_name: 'Follower', avatar_url: '', is_verified: false },
      { id: OUTSIDER, username: 'outsider', full_name: 'Outsider', avatar_url: '', is_verified: false },
    ],
    posts: [
      {
        id: PUBLIC_POST,
        user_id: OWNER,
        visibility: 'public',
        is_visible: true,
        moderation_status: 'approved',
        posted_as_profile_id: null,
      },
      {
        id: FOLLOWERS_POST,
        user_id: OWNER,
        visibility: 'followers',
        is_visible: true,
        moderation_status: 'approved',
        posted_as_profile_id: null,
      },
      {
        id: PRIVATE_POST,
        user_id: OWNER,
        visibility: 'private',
        is_visible: true,
        moderation_status: 'approved',
        posted_as_profile_id: null,
      },
    ],
    // Every post carries engagement from all three actors so a leak and an
    // authorized read are distinguishable by who appears in the payload.
    post_likes: [
      { id: 'like-1', post_id: PUBLIC_POST, user_id: FOLLOWER, created_at: '2026-01-01T00:00:00Z' },
      { id: 'like-2', post_id: FOLLOWERS_POST, user_id: FOLLOWER, created_at: '2026-01-01T00:00:01Z' },
      { id: 'like-3', post_id: PRIVATE_POST, user_id: OUTSIDER, created_at: '2026-01-01T00:00:02Z' },
      { id: 'like-4', post_id: PUBLIC_POST, user_id: OUTSIDER, created_at: '2026-01-01T00:00:03Z' },
    ],
    post_comments: [
      {
        id: 'comment-1',
        post_id: PUBLIC_POST,
        user_id: FOLLOWER,
        content: 'public comment',
        created_at: '2026-01-01T00:00:00Z',
      },
      {
        id: 'comment-2',
        post_id: FOLLOWERS_POST,
        user_id: FOLLOWER,
        content: 'followers comment',
        created_at: '2026-01-01T00:00:01Z',
      },
      {
        id: 'comment-3',
        post_id: PRIVATE_POST,
        user_id: OUTSIDER,
        content: 'private comment',
        created_at: '2026-01-01T00:00:02Z',
      },
    ],
    post_shares: [
      { id: 'share-1', post_id: PUBLIC_POST, user_id: OWNER, created_at: '2026-01-01T00:00:00Z', shared_to: 'feed' },
      { id: 'share-2', post_id: PUBLIC_POST, user_id: OUTSIDER, created_at: '2026-01-01T00:00:01Z', shared_to: 'feed' },
    ],
    follows: [
      { id: 'follow-1', follower_id: FOLLOWER, following_id: OWNER },
    ],
  }
}

interface Filter {
  op: 'eq' | 'neq' | 'in' | 'is'
  col: string
  val: any
}

function matches(row: Row, db: Record<string, Row[]>, filter: Filter) {
  const parts = filter.col.split('.')
  const embeddedTable = parts.length > 1 ? parts[0] : null
  const embeddedCol = parts.length > 1 ? parts[1] : parts[0]

  if (embeddedTable) {
    // `posts.user_id` style embedded filter: resolve through the child row
    // using the child table's `post_id` foreign key.
    const children = (db[embeddedTable] || []).filter((child) => child.id === row.post_id)
    if (filter.op === 'in') return children.some((child) => filter.val.includes(child[embeddedCol]))
    if (filter.op === 'eq') return children.some((child) => child[embeddedCol] === filter.val)
    if (filter.op === 'neq') return children.every((child) => child[embeddedCol] !== filter.val)
    return true
  }

  const value = row[parts[0]]
  if (filter.op === 'eq') return value === filter.val
  if (filter.op === 'neq') return value !== filter.val
  if (filter.op === 'in') return filter.val.includes(value)
  if (filter.op === 'is') return filter.val === null ? value === null : value !== null
  return true
}

function makeClient(db: Record<string, Row[]>, authUid: string | null) {
  return {
    from(table: string) {
      const filters: Filter[] = []
      let selectSpec: string | null = null
      let exactCount = false
      let head = false
      let orderCol: string | null = null
      let orderAsc = true
      let rangeBounds: [number, number] | null = null

      const rlsRows = () => {
        const all = db[table] || []
        if (OWNER_SCOPED_SELECT_TABLES.has(table) && authUid) {
          return all.filter((row) => row.user_id === authUid)
        }
        return all.slice()
      }

      const execute = (single: boolean) => {
        let rows = rlsRows()
        for (const filter of filters) {
          rows = rows.filter((row) => matches(row, db, filter))
        }
        if (orderCol) {
          rows.sort((a, b) => {
            const left = String(a[orderCol as string] ?? '')
            const right = String(b[orderCol as string] ?? '')
            return orderAsc ? left.localeCompare(right) : right.localeCompare(left)
          })
        }
        const total = rows.length
        if (rangeBounds) rows = rows.slice(rangeBounds[0], rangeBounds[1] + 1)
        if (head) {
          return Promise.resolve({
            data: null,
            error: null,
            count: exactCount ? total : null,
          })
        }
        if (single) {
          return Promise.resolve({
            data: rows.length ? rows[0] : null,
            error: rows.length ? null : { code: 'PGRST116' },
            count: exactCount ? total : null,
          })
        }
        return Promise.resolve({
          data: rows,
          error: null,
          count: exactCount ? total : null,
        })
      }

      const query: any = {
        select(spec: string, opts?: any) {
          selectSpec = spec
          exactCount = opts?.count === 'exact'
          head = Boolean(opts?.head)
          return query
        },
        eq(col: string, val: any) {
          filters.push({ op: 'eq', col, val })
          return query
        },
        neq(col: string, val: any) {
          filters.push({ op: 'neq', col, val })
          return query
        },
        in(col: string, vals: any) {
          filters.push({ op: 'in', col, val: vals })
          return query
        },
        not() {
          return query
        },
        is() {
          return query
        },
        order(col: string, opts?: any) {
          orderCol = col
          orderAsc = opts?.ascending !== false
          return query
        },
        range(from: number, to: number) {
          rangeBounds = [from, to]
          return query
        },
        limit() {
          return query
        },
        insert(values: Row) {
          const row = { id: `generated-${table}-${db[table].length + 1}`, ...values }
          db[table].push(row)
          return Promise.resolve({ data: row, error: null })
        },
        delete() {
          const doomed = new Set(
            rlsRows()
              .filter((row) => filters.every((filter) => matches(row, db, filter)))
              .map((row) => row.id),
          )
          db[table] = db[table].filter((row) => !doomed.has(row.id))
          return Promise.resolve({ data: null, error: null })
        },
        maybeSingle() {
          return execute(true)
        },
        single() {
          return execute(true)
        },
        then(resolve: any, reject: any) {
          return execute(false).then(resolve, reject)
        },
      }

      void selectSpec
      return query
    },
  }
}

const { checkAuth } = vi.hoisted(() => ({ checkAuth: vi.fn() }))

vi.mock('@/lib/auth/api-auth', () => ({
  checkAuth,
  parseAuthFromCookies: checkAuth,
  authenticateApiRequest: checkAuth,
}))
vi.mock('@/lib/supabase/service-role', () => ({
  serviceRoleClient: { auth: { getUser: vi.fn() }, from: vi.fn(() => { throw new Error('service-role read on social interaction path') }) },
  createServiceRoleClient: () => ({ from: () => { throw new Error('service-role read on social interaction path') } }),
}))
vi.mock('@/app/api/social/follow/route', () => ({ POST: vi.fn() }))

let db = seedDb()

function signIn(userId: string | null) {
  if (!userId) {
    checkAuth.mockResolvedValue(null)
    return
  }
  checkAuth.mockResolvedValue({ user: { id: userId }, supabase: makeClient(db, userId) })
}

function getRequest(query: string) {
  return new NextRequest(`http://localhost/api/notifications/social${query}`, {
    headers: { authorization: 'Bearer actor-token' },
  })
}

describe('SOCIAL-007 interaction read isolation', () => {
  beforeEach(() => {
    db = seedDb()
    checkAuth.mockReset()
    signIn(OUTSIDER)
  })

  describe('unauthenticated access fails closed', () => {
    it('rejects a post interaction read with no session', async () => {
      signIn(null)
      const { GET } = await import('@/app/api/notifications/social/route')
      const response = await GET(getRequest(`?postId=${PUBLIC_POST}`))
      expect(response.status).toBe(401)
      expect(await response.json()).toEqual({ error: 'Unauthorized' })
    })

    it('rejects a per-user stats read with no session', async () => {
      signIn(null)
      const { GET } = await import('@/app/api/notifications/social/route')
      const response = await GET(getRequest(''))
      expect(response.status).toBe(401)
    })
  })

  describe('post interaction reads require post visibility', () => {
    it('denies an outsider a followers-only post and leaks no engagement', async () => {
      const { GET } = await import('@/app/api/notifications/social/route')
      const response = await GET(getRequest(`?postId=${FOLLOWERS_POST}`))
      expect(response.status).toBe(404)
      const body = await response.json()
      expect(body).toEqual({ error: 'Post not found' })
      expect(JSON.stringify(body)).not.toContain('follower')
      expect(JSON.stringify(body)).not.toContain('followers comment')
    })

    it('denies an outsider a private post and leaks no engagement', async () => {
      const { GET } = await import('@/app/api/notifications/social/route')
      const response = await GET(getRequest(`?postId=${PRIVATE_POST}`))
      expect(response.status).toBe(404)
      expect(await response.json()).toEqual({ error: 'Post not found' })
    })

    it('answers a missing post and a non-entitled post identically', async () => {
      const { GET } = await import('@/app/api/notifications/social/route')
      const missing = await GET(getRequest('?postId=dddddddd-dddd-4ddd-8ddd-dddddddddddd'))
      const notEntitled = await GET(getRequest(`?postId=${FOLLOWERS_POST}`))
      expect(missing.status).toBe(notEntitled.status)
      expect(await missing.json()).toEqual(await notEntitled.json())
    })

    it('authorizes a follower for a followers-only post', async () => {
      signIn(FOLLOWER)
      const { GET } = await import('@/app/api/notifications/social/route')
      const response = await GET(getRequest(`?postId=${FOLLOWERS_POST}`))
      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.interactions.likes.count).toBe(1)
      expect(body.interactions.comments.count).toBe(1)
    })

    it('lets the author read their own private post stats', async () => {
      signIn(OWNER)
      const { GET } = await import('@/app/api/notifications/social/route')
      const response = await GET(getRequest(`?postId=${PRIVATE_POST}`))
      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.interactions.comments.count).toBe(1)
      expect(body.interactions.comments.users[0].user.username).toBe('outsider')
    })

    it('never discloses another actor’s share row on a post the caller can see', async () => {
      const { GET } = await import('@/app/api/notifications/social/route')
      const response = await GET(getRequest(`?postId=${PUBLIC_POST}`))
      expect(response.status).toBe(200)
      const body = await response.json()
      // `post_shares` SELECT is `auth.uid() = user_id`, so the caller sees
      // only their own share (share-2) and never the owner's (share-1).
      expect(body.interactions.shares.users.map((row: Row) => row.id)).toEqual(['share-2'])
      expect(body.interactions.shares.count).toBe(1)
    })

    it('returns only the caller’s own share row and adds no other actor’s', async () => {
      db.post_shares.push({
        id: 'share-3',
        post_id: PUBLIC_POST,
        user_id: OWNER,
        created_at: '2026-01-01T00:00:02Z',
        shared_to: 'feed',
      })
      const { GET } = await import('@/app/api/notifications/social/route')
      const response = await GET(getRequest(`?postId=${PUBLIC_POST}`))
      const body = await response.json()
      expect(body.interactions.shares.users.map((row: Row) => row.id)).toEqual(['share-2'])
    })

    it('rejects a malformed post id before touching interaction tables', async () => {
      const { GET } = await import('@/app/api/notifications/social/route')
      const response = await GET(getRequest('?postId=not-a-uuid'))
      expect(response.status).toBe(400)
    })
  })

  describe('per-user aggregate stats are self-only', () => {
    it('denies reading another user’s interaction counters', async () => {
      const { GET } = await import('@/app/api/notifications/social/route')
      const response = await GET(getRequest(`?userId=${OWNER}`))
      expect(response.status).toBe(403)
      expect(await response.json()).toEqual({
        error: 'Forbidden',
        code: 'not_own_interaction_stats',
      })
    })

    it('never discloses the requested user’s id in a denial', async () => {
      const { GET } = await import('@/app/api/notifications/social/route')
      const response = await GET(getRequest(`?userId=${OWNER}`))
      expect(JSON.stringify(await response.json())).not.toContain(OWNER)
    })

    it('rejects a malformed user id', async () => {
      const { GET } = await import('@/app/api/notifications/social/route')
      const response = await GET(getRequest('?userId=nope'))
      expect(response.status).toBe(400)
    })

    it('returns self-scoped counters when no userId is supplied', async () => {
      const { GET } = await import('@/app/api/notifications/social/route')
      const response = await GET(getRequest(''))
      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.userId).toBe(OUTSIDER)
      // likesGiven = the caller's own like rows (like-3, like-4).
      expect(body.stats.likesGiven).toBe(2)
      // likesReceived = likes on the caller's own posts (the caller owns none).
      expect(body.stats.likesReceived).toBe(0)
      expect(body.stats.commentsGiven).toBe(1)
      expect(body.stats.commentsReceived).toBe(0)
    })

    it('computes likesReceived only for the caller’s own posts', async () => {
      signIn(OWNER)
      const { GET } = await import('@/app/api/notifications/social/route')
      const response = await GET(getRequest(''))
      const body = await response.json()
      // All four seeded likes land on posts the owner authored.
      expect(body.stats.likesReceived).toBe(4)
      expect(body.stats.commentsReceived).toBe(3)
      // `post_shares` SELECT is `auth.uid() = user_id`, so sharesReceived only
      // ever counts share rows the caller may read. The outsider's share on
      // the owner's post is not disclosed.
      expect(body.stats.sharesReceived).toBe(1)
    })

    it('never counts another actor’s share toward the caller’s stats', async () => {
      const { GET } = await import('@/app/api/notifications/social/route')
      const withOutsiderShare = await (await GET(getRequest(''))).json()
      expect(withOutsiderShare.stats.sharesReceived).toBe(0)

      signIn(OWNER)
      const ownerView = await (await GET(getRequest(''))).json()
      // Owner sees exactly the owner's own share row (share-1) and never
      // share-2, which belongs to the outsider.
      expect(ownerView.stats.sharesReceived).toBe(1)
    })
  })

  describe('social interaction writes require post visibility', () => {
    it('refuses to like a private post the caller cannot see', async () => {
      const before = db.post_likes.length
      const { POST } = await import('@/app/api/notifications/social/route')
      const request = new NextRequest('http://localhost/api/notifications/social', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: 'Bearer actor-token' },
        body: JSON.stringify({
          action: 'social_interaction',
          type: 'like',
          postId: PRIVATE_POST,
        }),
      })
      const response = await POST(request)
      expect(response.status).toBe(404)
      // No like row was written.
      expect(db.post_likes).toHaveLength(before)
    })

    it('refuses to comment on a followers-only post the caller does not follow', async () => {
      const { POST } = await import('@/app/api/notifications/social/route')
      const request = new NextRequest('http://localhost/api/notifications/social', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: 'Bearer actor-token' },
        body: JSON.stringify({
          action: 'social_interaction',
          type: 'comment',
          postId: FOLLOWERS_POST,
          content: 'intruding',
        }),
      })
      const response = await POST(request)
      expect(response.status).toBe(404)
      expect(db.post_comments.some((row) => row.content === 'intruding')).toBe(false)
    })

    it('allows the author to comment on their own private post', async () => {
      signIn(OWNER)
      const { POST } = await import('@/app/api/notifications/social/route')
      const request = new NextRequest('http://localhost/api/notifications/social', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: 'Bearer actor-token' },
        body: JSON.stringify({
          action: 'social_interaction',
          type: 'comment',
          postId: PRIVATE_POST,
          content: 'author note',
        }),
      })
      const response = await POST(request)
      expect(response.status).toBe(200)
      expect(db.post_comments.some((row) => row.content === 'author note')).toBe(true)
    })
  })
})
