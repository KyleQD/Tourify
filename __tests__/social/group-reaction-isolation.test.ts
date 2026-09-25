/**
 * SOCIAL-007 — group message reaction isolation.
 *
 * `POST /api/groups/threads/[id]/messages/[messageId]/reactions` read the
 * message row through the service-role client *before* verifying thread
 * membership, so a non-member received 404 for a missing message and 403 for
 * an existing one. That is a message-existence oracle across the social
 * messaging boundary.
 *
 * Negative tests: membership is proven first, a non-member gets the same 404
 * as a missing message, and no reaction row is ever written.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

type Row = Record<string, any>

const MEMBER = '11111111-1111-4111-8111-111111111111'
const OUTSIDER = '33333333-3333-4333-8333-333333333333'
const THREAD_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const MESSAGE_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const OTHER_MESSAGE_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'

const { authenticateRequestWithBearerFallback, serviceRoleFrom } = vi.hoisted(() => ({
  authenticateRequestWithBearerFallback: vi.fn(),
  serviceRoleFrom: vi.fn(),
}))

vi.mock('@/lib/auth/mobile-request-auth', () => ({ authenticateRequestWithBearerFallback }))
vi.mock('@/lib/supabase/service-role', () => ({
  createServiceRoleClient: () => ({ from: serviceRoleFrom }),
}))

let db: Record<string, Row[]>

function seedDb() {
  return {
    thread_members: [
      { thread_id: THREAD_ID, user_id: MEMBER, left_at: null },
      // A member who has left must not pass the active-membership check.
      { thread_id: THREAD_ID, user_id: OUTSIDER, left_at: '2026-01-01T00:00:00Z' },
    ],
    group_messages: [
      { id: MESSAGE_ID, thread_id: THREAD_ID, sender_id: MEMBER, content: 'hi' },
      { id: OTHER_MESSAGE_ID, thread_id: THREAD_ID, sender_id: MEMBER, content: 'again' },
    ],
    group_message_reactions: [],
  }
}

function makeClient(rows: Record<string, Row[]>) {
  return {
    from(table: string) {
      const filters: Array<{ col: string; val: any }> = []
      const isNull: Array<{ col: string; val: any }> = []

      const run = (single: boolean) => {
        let result = (rows[table] || []).slice()
        for (const filter of filters) {
          result = result.filter((row) => row[filter.col] === filter.val)
        }
        for (const filter of isNull) {
          result = filter.val === null
            ? result.filter((row) => row[filter.col] === null || row[filter.col] === undefined)
            : result.filter((row) => row[filter.col] !== null)
        }
        if (single) {
          return Promise.resolve({
            data: result.length ? result[0] : null,
            error: result.length ? null : { code: 'PGRST116' },
            count: result.length,
          })
        }
        return Promise.resolve({ data: result, error: null, count: result.length })
      }

      const query: any = {
        select() { return query },
        eq(col: string, val: any) { filters.push({ col, val }); return query },
        is(col: string, val: any) { isNull.push({ col, val }); return query },
        insert(value: Row) {
          rows[table].push({ id: `generated-${rows[table].length + 1}`, ...value })
          return Promise.resolve({ data: value, error: null })
        },
        delete() {
          const doomed = new Set(
            (rows[table] || [])
              .filter((row) => filters.every((filter) => row[filter.col] === filter.val))
              .map((row) => row.id),
          )
          rows[table] = rows[table].filter((row) => !doomed.has(row.id))
          return Promise.resolve({ data: null, error: null })
        },
        maybeSingle() { return run(true) },
        single() { return run(true) },
        then(resolve: any, reject: any) { return run(false).then(resolve, reject) },
      }
      return query
    },
  }
}

function postRequest(messageId = MESSAGE_ID) {
  const url = `http://localhost/api/groups/threads/${THREAD_ID}/messages/${messageId}/reactions`
  return new NextRequest(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer actor-token' },
    body: JSON.stringify({ emoji: '🎸' }),
  })
}

function signIn(userId: string | null) {
  authenticateRequestWithBearerFallback.mockResolvedValue(
    userId ? { user: { id: userId } } : null,
  )
}

describe('SOCIAL-007 group reaction non-disclosure', () => {
  beforeEach(() => {
    db = seedDb()
    authenticateRequestWithBearerFallback.mockReset()
    serviceRoleFrom.mockReset()
    serviceRoleFrom.mockImplementation((table: string) => makeClient(db).from(table))
    signIn(OUTSIDER)
  })

  it('rejects an unauthenticated caller', async () => {
    signIn(null)
    const { POST } = await import('@/app/api/groups/threads/[id]/messages/[messageId]/reactions/route')
    const response = await POST(postRequest())
    expect(response.status).toBe(401)
    expect(db.group_message_reactions).toHaveLength(0)
  })

  it('denies a non-member and does not disclose that the message exists', async () => {
    db.thread_members = db.thread_members.filter((row) => row.user_id !== OUTSIDER)
    const { POST } = await import('@/app/api/groups/threads/[id]/messages/[messageId]/reactions/route')
    const existing = await POST(postRequest(MESSAGE_ID))
    const missing = await POST(postRequest(OTHER_MESSAGE_ID.replace(/c/g, 'f')))
    expect(existing.status).toBe(404)
    // Identical body for an existing message and a nonexistent one.
    expect(await existing.json()).toEqual(await missing.json())
    expect(db.group_message_reactions).toHaveLength(0)
  })

  it('denies a member who has left the thread', async () => {
    const { POST } = await import('@/app/api/groups/threads/[id]/messages/[messageId]/reactions/route')
    const response = await POST(postRequest())
    expect(response.status).toBe(404)
    expect(db.group_message_reactions).toHaveLength(0)
  })

  it('verifies membership before reading the message row', async () => {
    db.thread_members = db.thread_members.filter((row) => row.user_id !== OUTSIDER)
    const { POST } = await import('@/app/api/groups/threads/[id]/messages/[messageId]/reactions/route')
    await POST(postRequest())
    const tables = serviceRoleFrom.mock.calls.map((call) => call[0])
    expect(tables[0]).toBe('thread_members')
    expect(tables).not.toContain('group_messages')
  })

  it('returns the same 404 for a message that is not in this thread', async () => {
    signIn(MEMBER)
    const { POST } = await import('@/app/api/groups/threads/[id]/messages/[messageId]/reactions/route')
    const response = await POST(postRequest('dddddddd-dddd-4ddd-8ddd-dddddddddddd'))
    expect(response.status).toBe(404)
    expect(db.group_message_reactions).toHaveLength(0)
  })

  it('still lets an active member react', async () => {
    signIn(MEMBER)
    const { POST } = await import('@/app/api/groups/threads/[id]/messages/[messageId]/reactions/route')
    const response = await POST(postRequest())
    expect(response.status).toBe(200)
    expect((await response.json()).added).toBe(true)
    expect(db.group_message_reactions).toHaveLength(1)
  })
})
