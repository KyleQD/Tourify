import type { NewsIndexCursor } from '@/lib/news/index/contracts'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function encodeNewsIndexCursor(cursor: NewsIndexCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64url')
}

/**
 * Strictly validate both cursor fields before using them in PostgREST filters.
 * Reject malformed values instead of silently restarting pagination.
 */
export function decodeNewsIndexCursor(encoded: string | null): NewsIndexCursor | null {
  if (!encoded || encoded.length > 512) return null
  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'))
    if (typeof parsed?.id !== 'string' || !UUID_RE.test(parsed.id)) return null
    if (typeof parsed?.publishedAt !== 'string') return null
    const time = Date.parse(parsed.publishedAt)
    if (!Number.isFinite(time) || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?Z$/.test(parsed.publishedAt)) return null
    return { id: parsed.id, publishedAt: parsed.publishedAt }
  } catch {
    return null
  }
}
