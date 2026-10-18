import { encodeNewsIndexCursor, decodeNewsIndexCursor } from '@/lib/news/index/cursor'

describe('news index cursor', () => {
  const good = { id: '1a0f0000-0000-4000-8000-000000000002', publishedAt: '2026-10-18T10:00:00.000Z' }

  it('round trips a cursor', () => {
    expect(decodeNewsIndexCursor(encodeNewsIndexCursor(good))).toEqual(good)
  })

  it('rejects malformed and injected values', () => {
    expect(decodeNewsIndexCursor('')).toBe(null)
    expect(decodeNewsIndexCursor('a'.repeat(600))).toBe(null)
    expect(decodeNewsIndexCursor(Buffer.from(JSON.stringify({
      ...good, id: '1a0f0000-0000-4000-8000-000000000002),publication_state.eq.pending'
    })).toString('base64url'))).toBe(null)
    expect(decodeNewsIndexCursor(Buffer.from(JSON.stringify({
      ...good, publishedAt: 'not-a-date'
    })).toString('base64url'))).toBe(null)
  })
})
