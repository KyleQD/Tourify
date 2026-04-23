/**
 * Supabase/PostgREST errors are often plain objects with `message`, `code`, `details`.
 * `instanceof Error` misses them, which produced opaque 500s in API routes.
 */
export function getPostgrestErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error !== 'object' || error === null) return 'Unknown error'
  const o = error as Record<string, unknown>
  if (typeof o.message === 'string' && o.message.length > 0) return o.message
  if (typeof o.error_description === 'string') return o.error_description
  if (typeof o.hint === 'string' && typeof o.details === 'string')
    return `${o.details} (${o.hint})`
  if (typeof o.details === 'string') return o.details
  try {
    return JSON.stringify(error)
  } catch {
    return 'Unknown error'
  }
}

export function getPostgrestErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) return undefined
  const code = (error as Record<string, unknown>).code
  return typeof code === 'string' ? code : undefined
}
