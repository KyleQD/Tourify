const productionBlockedPrefixes = [
  '/auth-test',
  '/auth-demo',
  '/debug',
  '/artist/debug',
  '/migrations',
  '/setup',
  '/admin/debug',
  '/admin/setup',
  '/admin/dashboard/test-api',
  '/api/debug',
  '/api/debug-auth',
  '/api/auth-debug',
  '/api/migrations',
  '/api/setup-storage',
  '/api/marketplace/migrations',
]

export function isProductionBlockedPathname(pathname: string) {
  return productionBlockedPrefixes.some(prefix => pathname.startsWith(prefix))
}
