import type { ProfileType } from '@/lib/accounts/account-types'

/**
 * Canonical "home" route for each account mode. Use after account switches and for
 * route guards so navigation stays consistent across Nav, switchers, and layouts.
 */
export function getDashboardPathForAccountType(accountType: ProfileType | string | undefined): string {
  switch (accountType) {
    case 'artist':
    case 'service':
      return '/artist'
    case 'venue':
      return '/venue/dashboard'
    case 'organization':
    case 'admin': // legacy alias
      return '/admin/dashboard'
    case 'staff': // deprecated — redirects to general until Work Mode
      return '/dashboard'
    case 'general':
    default:
      return '/dashboard'
  }
}

/**
 * For strict section routes, the active account type that must match to stay on the URL.
 * Returns null when we should not auto-redirect (unknown sections, public pages handled elsewhere).
 */
export function getRequiredAccountTypeForPathname(pathname: string): ProfileType | null {
  if (pathname.startsWith('/admin')) return 'organization'
  if (pathname.startsWith('/venue')) return 'venue'
  if (pathname.startsWith('/artist')) return 'artist'
  return null
}
