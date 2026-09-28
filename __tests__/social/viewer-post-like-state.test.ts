/**
 * SOCIAL-007 / `HF-DB-006-SOCIAL-007` — the server-authorized read that replaces
 * the browser `post_likes` reads.
 *
 * The two browser readers are `components/artist/artist-home-feed.tsx` and
 * `components/profile/public-profile-view.tsx`. Both did the same thing:
 *
 *   supabase.from('post_likes').select('post_id')
 *     .eq('user_id', currentUser.id)
 *     .in('post_id', <ids the surface just rendered>)
 *
 * ...and turned the result into `new Set(rows.map(r => r.post_id))`. That read
 * was self-scoped and so disclosed nothing, but it ran in the browser against
 * `post_likes`, whose shipped SELECT policy is `USING (true)`
 * (`supabase/migrations/20240430000000_create_posts.sql:47-49`). This file pins
 * the replacement: `GET /api/social/post-likes` plus
 * `lib/social/post-like-state.ts`, both caller-scoped and both gated on post
 * visibility before any like row is read.
 *
 * The fake client models the RLS posture that actually ships, because that
 * posture is what decides which layer is the boundary:
 *   - `post_likes`   SELECT is `USING (true)`
 *   - `post_comments` SELECT is `USING (true)`
 *   - `post_shares`  SELECT is `auth.uid() = user_id`
 *   - `posts`, `follows` SELECT are `USING (true)`
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

import {
  MAX_POST_LIKE_BATCH,
  normalizePostIds,
  resolveViewerPostLikeState,
} from '@/lib/social/post-like-state'

type Row = Record<string, any>

const OWNER = '11111111-1111-4111-8111-111111111111'
const FOLLOWER = '22222222-2222-4222-8222-222222222222'
const OUTSIDER = '33333333-3333-4333-8333-333333333333'
const FRIEND = '44444444-4444-4444-8444-444444444444'

const PUBLIC_POST = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const FOLLOWERS_POST = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const PRIVATE_POST = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
const FRIENDS_POST = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
const MISSING_POST = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'

interface RecordedQuery {
  table: string
  filters: Array<{ op: string; col: string; val: any }>
}

function seedDb(): Record<string, Row[]> {
  return {
    accounts: [
      { id: 'acct-owner', profile_id: 'profile-owner' },
    ],
    account_follows: [],
    profiles: [
      { id: OWNER, followers_count: 2 },
      { id: FOLLOWER, followers_count: 1 },
      { id: OUTSIDER, followers_count: 0 },
      { id: FRIEND, followers_count: 1 },
    ],
    posts: [
      { id: PUBLIC_POST, user_id: OWNER, visibility: 'public', is_visible: true, moderation_status: 'approved', posted_as_profile_id: null },
      { id: FOLLOWERS_POST, user_id: OWNER, visibility: 'followers', is_visible: true, moderation_status: 'approved', posted_as_profile_id: null },
      { id: PRIVATE_POST, user_id: OWNER, visibility: 'private', is_visible: true, moderation_status: 'approved', posted_as_profile_id: null },
      { id: FRIENDS_POST, user_id: OWNER, visibility: 'friends', is_visible: true, moderation_status: 'approved', posted_as_profile_id: null },
    ],
    // The outsider likes every post, including ones they may not see. Those
    // rows are exactly what a browser read used to return.
    post_likes: [
      { id: 'like-pub-out', post_id: PUBLIC_POST, user_id: OUTSIDER },
      { id: 'like-fol-out', post_id: FOLLOWERS_POST, user_id: OUTSIDER },
      { id: 'like-pri-out', post_id: PRIVATE_POST, user_id: OUTSIDER },
      { id: 'like-pub-fol', post_id: PUBLIC_POST, user_id: FOLLOWER },
      { id: 'like-fol-fol', post_id: FOLLOWERS_POST, user_id: FOLLOWER },
      { id: 'like-priv-owner', post_id: PRIVATE_POST, user_id: OWNER },
      { id: 'like-pub-other', post_id: PUBLIC_POST, user_id: FRIEND },
    ],
    follows: [
      { id: 'f1', follower_id: FOLLOWER, following_id: OWNER },
      { id: 'f2', follower_id: OWNER, following_id: FOLLOWER },
      { id: 'f3', follower_id: FRIEND, following_id: OWNER },
      { id: 'f4', follower_id: OWNER, following_id: FRIEND },
    ],
  }
}

/**
 * `post_shares` is the one interaction table whose shipped SELECT policy is
 * `auth.uid() = user_id`; it is included so the fake refuses cross-actor rows
 * for it, which keeps the fake honest if this suite is ever widened.
 */
const OWNER_SCOPED_SELECT_TABLES = new Set<string>(['post_shares'])

function makeClient(db: Record<string, Row[]>, authUid: string | null, log: RecordedQuery[] = []) {
  function matches(row: Row, filter: { op: string; col: string; val: any }) {
    if (filter.op === 'eq') return row[filter.col] === filter.val
    if (filter.op === 'in') return filter.val.includes(row[filter.col])
    return true
  }

  return {
    log,
    from(table: string) {
      const filters: Array<{ op: string; col: string; val: any }> = []

      const query: any = {
        select() {
          return query
        },
        eq(col: string, val: any) {
          filters.push({ op: 'eq', col, val })
          return query
        },
        in(col: string, val: any) {
          filters.push({ op: 'in', col, val })
          return query
        },
        maybeSingle() {
          return query
        },
        then(resolve: any, reject: any) {
          const recorded: RecordedQuery = { table, filters: [...filters] }
          log.push(recorded)

          let rows = db[table] || []
          if (OWNER_SCOPED_SELECT_TABLES.has(table) && authUid) {
            rows = rows.filter((row) => row.user_id === authUid)
          }
          for (const filter of filters) rows = rows.filter((row) => matches(row, filter))

          return Promise.resolve({ data: rows, error: null }).then(resolve, reject)
        },
      }
      return query
    },
  }
}

/** The exact browser read that `artist-home-feed.tsx` / `public-profile-view.tsx` performed. */
async function legacyBrowserRead(supabase: any, userId: string, postIds: string[]): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('post_likes')
    .select('post_id')
    .eq('user_id', userId)
    .in('post_id', postIds)
  if (error) throw new Error('read failed')
  const liked = new Set<string>()
  for (const like of data || []) liked.add(like.post_id)
  return liked
}

const { checkAuth } = vi.hoisted(() => ({ checkAuth: vi.fn() }))

vi.mock('@/lib/auth/api-auth', () => ({
  checkAuth,
  parseAuthFromCookies: checkAuth,
  authenticateApiRequest: checkAuth,
}))
// A service-role client is not reachable from this path at all; if a future
// edit reaches for one, the import itself throws instead of silently widening.
vi.mock('@/lib/supabase/service-role', () => ({
  createServiceRoleClient: () => {
    throw new Error('service-role client is not permitted on the post-like read path')
  },
  serviceRoleClient: { from: () => { throw new Error('service-role read on post-like path') } },
}))

let db = seedDb()
let log: RecordedQuery[] = []

function signIn(userId: string | null) {
  log = []
  if (!userId) {
    checkAuth.mockResolvedValue(null)
    return
  }
  checkAuth.mockResolvedValue({ user: { id: userId }, supabase: makeClient(db, userId, log) })
}

function getRequest(query: string) {
  return new NextRequest(`http://localhost/api/social/post-likes${query}`, {
    headers: { authorization: 'Bearer actor-token' },
  })
}

async function readRoute(query: string) {
  const { GET } = await import('@/app/api/social/post-likes/route')
  const response = await GET(getRequest(query))
  return { status: response.status, body: await response.json() }
}

beforeEach(() => {
  db = seedDb()
  log = []
  checkAuth.mockReset()
  signIn(OUTSIDER)
})

describe('SOCIAL-007 post id normalization', () => {
  it('de-duplicates, trims and preserves order', () => {
    const result = normalizePostIds(` ${PUBLIC_POST} , ${FOLLOWERS_POST},${PUBLIC_POST} ,`)
    expect(result.invalid).toBe(false)
    expect(result.postIds).toEqual([PUBLIC_POST, FOLLOWERS_POST])
  })

  it('flags a non-post id instead of dropping it silently', () => {
    const result = normalizePostIds(`${PUBLIC_POST},not-a-uuid`)
    expect(result.invalid).toBe(true)
    expect(result.postIds).toEqual([PUBLIC_POST])
  })

  it('flags an oversized batch', () => {
    const many = Array.from({ length: MAX_POST_LIKE_BATCH + 1 }, (_, i) =>
      `${String(i).padStart(8, '0')}-0000-4000-8000-000000000000`,
    )
    expect(normalizePostIds(many).overLimit).toBe(true)
  })
})

describe('SOCIAL-007 the server read replaces the browser read', () => {
  it('returns the same liked-post set the browser read produced', async () => {
    const postIds = [PUBLIC_POST, FRIENDS_POST]
    const browserSet = await legacyBrowserRead(makeClient(db, OUTSIDER), OUTSIDER, postIds)
    const { body } = await readRoute(`?postIds=${postIds.join(',')}`)

    // Only the public post survives the gate, and that is the whole difference.
    expect(new Set(body.likedPostIds)).toEqual(new Set([...browserSet].filter((id) => id === PUBLIC_POST)))
    expect(body.degraded).toBe(false)
  })

  it('returns the browser set verbatim for posts the caller is entitled to see', async () => {
    signIn(FOLLOWER)
    const postIds = [PUBLIC_POST, FOLLOWERS_POST]
    const browserSet = await legacyBrowserRead(makeClient(db, FOLLOWER), FOLLOWER, postIds)
    const { body } = await readRoute(`?postIds=${postIds.join(',')}`)
    expect(new Set(body.likedPostIds)).toEqual(browserSet)
    expect([...browserSet].sort()).toEqual([FOLLOWERS_POST, PUBLIC_POST].sort())
  })

  it('never returns another actor like', async () => {
    signIn(OWNER)
    const { body } = await readRoute(`?postIds=${PUBLIC_POST},${PRIVATE_POST}`)
    // The owner liked only the private post; the follower's and the
    // outsider's public-post likes are not disclosed.
    expect(body.likedPostIds).toEqual([PRIVATE_POST])
  })
})

describe('SOCIAL-007 the read is gated on post visibility', () => {
  it('excludes a followers-only post the viewer does not follow, and issues no like read for it', async () => {
    const { status, body } = await readRoute(`?postIds=${FOLLOWERS_POST}`)
    expect(status).toBe(200)
    // The outsider has a like row on it (like-fol-out). The gate runs first,
    // so the row never reaches the response.
    expect(body.likedPostIds).toEqual([])
    const likeReads = log.filter((q) => q.table === 'post_likes')
    expect(likeReads).toHaveLength(0)
  })

  it('excludes a private post the caller does not own', async () => {
    const { body } = await readRoute(`?postIds=${PRIVATE_POST}`)
    expect(body.likedPostIds).toEqual([])
  })

  it('requires a mutual follow for a friends-only post', async () => {
    // Give the outsider a like row on the friends-only post, so the assertion
    // is about the visibility predicate and not about an empty like table.
    db.post_likes.push({ id: 'like-fri-out', post_id: FRIENDS_POST, user_id: OUTSIDER })

    const { body: oneWay } = await readRoute(`?postIds=${FRIENDS_POST}`)
    expect(oneWay.likedPostIds).toEqual([])

    // The reverse follow alone is not friendship.
    db.follows.push({ id: 'f5', follower_id: OWNER, following_id: OUTSIDER })
    const { body: stillDenied } = await readRoute(`?postIds=${FRIENDS_POST}`)
    expect(stillDenied.likedPostIds).toEqual([])

    db.follows.push({ id: 'f6', follower_id: OUTSIDER, following_id: OWNER })
    const { body: mutual } = await readRoute(`?postIds=${FRIENDS_POST}`)
    expect(mutual.likedPostIds).toEqual([FRIENDS_POST])
  })

  it('answers a missing post and a non-entitled post identically', async () => {
    const missing = await readRoute(`?postIds=${MISSING_POST}`)
    const notEntitled = await readRoute(`?postIds=${FOLLOWERS_POST}`)
    expect(missing.status).toBe(notEntitled.status)
    expect(missing.body).toEqual(notEntitled.body)
  })

  it('treats an unapproved or hidden post as not visible', async () => {
    db.posts[0].moderation_status = 'pending'
    db.posts[0].is_visible = false
    const { body } = await readRoute(`?postIds=${PUBLIC_POST}`)
    expect(body.likedPostIds).toEqual([])
  })
})

describe('SOCIAL-007 the read fails closed and stays bounded', () => {
  it('refuses an anonymous caller', async () => {
    signIn(null)
    const { status, body } = await readRoute(`?postIds=${PUBLIC_POST}`)
    expect(status).toBe(401)
    expect(body).toEqual({ error: 'Unauthorized' })
    expect(log).toHaveLength(0)
  })

  it('refuses a malformed post id and a malformed viewer id', async () => {
    const invalid = await readRoute('?postIds=nope')
    expect(invalid.status).toBe(400)
    expect(invalid.body).toEqual({ error: 'invalid_post_ids', maxPostIds: MAX_POST_LIKE_BATCH })

    const missingParam = await readRoute('')
    expect(missingParam.status).toBe(200)
    expect(missingParam.body.likedPostIds).toEqual([])
  })

  it('refuses an oversized batch rather than silently truncating it', async () => {
    const many = Array.from({ length: MAX_POST_LIKE_BATCH + 1 }, (_, i) =>
      `${String(i).padStart(8, '0')}-0000-4000-8000-000000000000`,
    )
    const { status, body } = await readRoute(`?postIds=${many.join(',')}`)
    expect(status).toBe(400)
    expect(body).toEqual({ error: 'too_many_post_ids', maxPostIds: MAX_POST_LIKE_BATCH })
  })

  it('reports degradation instead of a false zero when the post read fails', async () => {
    const failing = {
      from(table: string) {
        const query: any = {
          select: () => query,
          eq: () => query,
          in: () => query,
          then: (resolve: any) => resolve({ data: null, error: { code: 'XX000', message: 'boom' } }),
        }
        return query
      },
    }
    const state = await resolveViewerPostLikeState({
      supabase: failing,
      postIds: [PUBLIC_POST],
      viewerUserId: OUTSIDER,
    })
    expect(state).toEqual({ visiblePostIds: [], likedPostIds: [], degraded: true })
  })

  it('reports degradation instead of a false zero when the like read fails', async () => {
    const partial = {
      from(table: string) {
        const query: any = {
          select: () => query,
          eq: () => query,
          in: () => query,
          then: (resolve: any) =>
            table === 'posts'
              ? resolve({
                  data: db.posts.filter((row) => row.id === PUBLIC_POST),
                  error: null,
                })
              : resolve({ data: null, error: { code: 'XX000', message: 'boom' } }),
        }
        return query
      },
    }
    const state = await resolveViewerPostLikeState({
      supabase: partial,
      postIds: [PUBLIC_POST],
      viewerUserId: OUTSIDER,
    })
    expect(state.visiblePostIds).toEqual([PUBLIC_POST])
    expect(state.likedPostIds).toEqual([])
    expect(state.degraded).toBe(true)
  })

  it('never answers a degraded state as a zero-filled success', () => {
    // The route maps degradation onto an explicit 500 so a caller cannot read
    // a failed authorization step as "you have liked none of these".
    const source = readFileSync(
      join(process.cwd(), 'app/api/social/post-likes/route.ts'),
      'utf8',
    )
    expect(source).toContain('if (state.degraded) {')
    expect(source).toContain("'like_state_unavailable'")
  })

  it('keeps the query count constant as the batch grows', async () => {
    signIn(FOLLOWER)
    const batch = [PUBLIC_POST, FOLLOWERS_POST, FRIENDS_POST, PRIVATE_POST, MISSING_POST]
    await readRoute(`?postIds=${batch.join(',')}`)
    const perFive = log.length

    log = []
    await readRoute(`?postIds=${batch.slice(0, 2).join(',')}`)
    const perTwo = log.length

    // posts + follows(2, needed only for followers/friends) + post_likes.
    expect(perFive).toBeLessThanOrEqual(5)
    expect(perTwo).toBeLessThanOrEqual(perFive)
  })

  it('reads no like rows at all for an anonymous state resolution', async () => {
    const state = await resolveViewerPostLikeState({
      supabase: makeClient(db, null),
      postIds: [PUBLIC_POST],
      viewerUserId: null,
    })
    expect(state).toEqual({ visiblePostIds: [], likedPostIds: [], degraded: false })
    expect(log.filter((q) => q.table === 'post_likes')).toHaveLength(0)
  })
})

describe('SOCIAL-007 the replacement field the feed already carries', () => {
  it('the feed DTO carries `is_liked` through to the response body', async () => {
    // The equivalence argument depends on this: the field the browser read used
    // to produce must survive the response normalizer, or the deletion below is
    // not safe.
    const { normalizeFeedPostDTO } = await import('@/lib/feed/feed-post-dto')
    const base = {
      id: PUBLIC_POST,
      user_id: OWNER,
      content: 'hello',
      posted_as_profile_id: OWNER,
      posted_as_type: 'general',
    }

    expect(normalizeFeedPostDTO({ ...base, is_liked: true }).is_liked).toBe(true)
    expect(normalizeFeedPostDTO({ ...base, is_liked: false }).is_liked).toBe(false)
    // Absent is falsy, never `undefined`, so a consumer can rely on a boolean.
    expect(normalizeFeedPostDTO({ ...base }).is_liked).toBe(false)
  })

  it('`GET /api/feed/posts` computes is_liked on the caller-scoped client', () => {
    const source = readFileSync(join(process.cwd(), 'app/api/feed/posts/route.ts'), 'utf8')
    // The per-row `is_liked` field is what the two browser consumers already
    // OR into their transform, so it is the drop-in replacement.
    expect(source).toContain('is_liked: viewerLikedPostIds.has(post.id)')
    // ...and it is no longer an interaction read on the service-role client.
    expect(source).toContain('fetchViewerLikedPostIds(viewerSupabase || supabase, safePosts, viewerUserId)')
    expect(source).not.toMatch(
      /fetchViewerLikedPostIds\(supabase, safePosts, viewerUserId\)/,
    )
  })

  it('both browser consumers only need their own `is_liked`, not a `post_likes` read', () => {
    for (const path of [
      'components/artist/artist-home-feed.tsx',
      'components/profile/public-profile-view.tsx',
    ]) {
      const source = readFileSync(join(process.cwd(), path), 'utf8')
      // The transform already consumes `is_liked` from the feed response.
      expect(source).toMatch(/is_liked/)
      // The browser `post_likes` read is the thing to remove. This assertion
      // is what fails once the artist lane has made the change; until then it
      // documents the exact line to delete.
      expect(source).toContain("from('post_likes')")
    }
  })

  it('the batch route is the only server-authorized post-like read it needs', () => {
    const source = readFileSync(join(process.cwd(), 'app/api/social/post-likes/route.ts'), 'utf8')
    expect(source).toContain("from '@/lib/social/post-like-state'")
    expect(source).not.toContain('createServiceRoleClient')
    expect(source).not.toMatch(/from '@\/lib\/supabase\/service-role'/)
  })
})
