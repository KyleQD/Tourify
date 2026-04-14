/** Max wait for Supabase getSession on cold load (demo / slow networks / hung requests). */
export const AUTH_SESSION_INIT_TIMEOUT_MS = 10_000

export function isSessionCheckTimeout(err: unknown): boolean {
  return err instanceof Error && err.message === 'SESSION_CHECK_TIMEOUT'
}

export function rejectAfterSessionTimeout(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error('SESSION_CHECK_TIMEOUT')), ms)
  })
}
