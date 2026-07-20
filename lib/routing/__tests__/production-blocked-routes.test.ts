import { isProductionBlockedPathname } from '../production-blocked-routes'

describe('production blocked routes', () => {
  it.each([
    '/auth-test',
    '/auth-demo',
    '/debug/session',
    '/artist/debug',
    '/migrations',
    '/setup',
    '/admin/debug',
    '/admin/setup',
    '/admin/dashboard/test-api',
    '/api/debug/profile-check',
    '/api/debug-auth',
    '/api/auth-debug',
    '/api/migrations/create-tables',
    '/api/setup-storage',
    '/api/marketplace/migrations/backfill-artist-music',
  ])('blocks %s in production', pathname => {
    expect(isProductionBlockedPathname(pathname)).toBe(true)
  })

  it.each(['/api/health', '/marketplace', '/jobs', '/admin/dashboard'])(
    'does not block normal route %s',
    pathname => {
      expect(isProductionBlockedPathname(pathname)).toBe(false)
    }
  )
})
