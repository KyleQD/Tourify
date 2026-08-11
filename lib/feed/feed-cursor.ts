const CURSOR_VERSION = 1

type FeedCursorPayload = {
  v: typeof CURSOR_VERSION
  offset: number
}

export function encodeFeedCursor(offset: number): string {
  const payload: FeedCursorPayload = {
    v: CURSOR_VERSION,
    offset: Math.max(0, Math.floor(offset)),
  }

  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
}

export function decodeFeedCursor(cursor: string | null | undefined): number | null {
  if (!cursor) return null

  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as Partial<FeedCursorPayload>
    if (parsed.v !== CURSOR_VERSION || !Number.isSafeInteger(parsed.offset) || Number(parsed.offset) < 0) {
      return null
    }

    return Number(parsed.offset)
  } catch {
    return null
  }
}
