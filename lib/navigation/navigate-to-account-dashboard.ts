import { getDashboardPathForAccountType } from '@/lib/navigation/account-dashboard-routes'
import { buildAccountScopedPath } from '@/lib/navigation/account-context-url'

/**
 * Full-page navigation to an account home (reliable across app sections). Client-only.
 *
 * Pass `profileId` to include `?account=<profileId>` in the URL so that
 * `AccountRouteGuard` and `resolveAccountFromSession` can select the correct entity
 * on page load without an extra server round-trip.
 */
export function navigateToAccountDashboard(
  accountType: string,
  profileId?: string | null
): void {
  if (typeof window === 'undefined') return

  const basePath = getDashboardPathForAccountType(accountType)
  const targetRoute = buildAccountScopedPath(basePath, profileId, accountType)
  const targetPath = basePath.split('?')[0]
  const currentPath = window.location.pathname

  // Only skip if we're already on the target path AND the account param matches
  const currentParams = new URLSearchParams(window.location.search)
  const currentAccountParam = currentParams.get('account')
  const isAlreadyOnTarget =
    (currentPath === targetPath || currentPath.startsWith(`${targetPath}/`)) &&
    (!profileId || currentAccountParam === profileId)

  if (isAlreadyOnTarget) return

  window.location.assign(targetRoute)
}
