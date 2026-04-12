export function extractApiError(body: unknown, fallback: string): string {
  if (!body || typeof body !== 'object') return fallback
  const err = (body as Record<string, unknown>).error
  if (!err) return fallback
  if (typeof err === 'string') return err
  if (typeof err === 'object' && err !== null && typeof (err as Record<string, unknown>).message === 'string')
    return (err as Record<string, unknown>).message as string
  return fallback
}
