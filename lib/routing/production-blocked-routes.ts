const productionBlockedPrefixes = [
  '/auth-test',
  '/auth-demo',
  '/debug',
  '/artist/debug',
  '/migrations',
  '/setup',
  '/test-friend-suggestions',
  '/admin/debug',
  '/admin/setup',
  '/admin/dashboard/test-api',
  // Legacy ad-hoc admin tooling (ADM-M-060): disabled stub pages must never
  // render in production even though they no longer execute SQL.
  '/admin/create-tables',
  '/admin/reset-onboarding',
  '/api/debug',
  '/api/debug-auth',
  '/api/auth-debug',
  '/api/migrations',
  '/api/setup-storage',
  '/api/marketplace/migrations',
  // Ad-hoc test endpoints that must never ship to production (AUDIT M3).
  // They are dev-only diagnostics; internal-secret guards remain as a
  // second layer for non-production environments.
  '/api/test-db',
  '/api/test-header-url',
  '/api/test-rss',
  '/api/test-venues',
]

export function isProductionBlockedPathname(pathname: string) {
  return productionBlockedPrefixes.some(prefix => pathname.startsWith(prefix))
}
