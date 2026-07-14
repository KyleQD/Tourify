'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useMultiAccount, findAccountStrict, findAccountByProfileId } from '@/hooks/use-multi-account'
import type { UserAccount } from '@/lib/services/account-management.service'
import {
  getDashboardPathForAccountType,
  getRequiredAccountTypeForPathname,
  getCompatibleAccountTypesForSection,
  accountTypeMatchesSection,
} from '@/lib/navigation/account-dashboard-routes'
import { navigateToAccountDashboard } from '@/lib/navigation/navigate-to-account-dashboard'
import { ACCOUNT_PARAM, buildAccountScopedPath, readAccountFromSearch } from '@/lib/navigation/account-context-url'
import type { ProfileType } from '@/lib/accounts/account-types'
import { normalizeAccountType } from '@/lib/accounts/account-types'

async function syncVenueScope(profileId: string) {
  const { venueService } = await import('@/lib/services/venue.service')
  venueService.setCurrentVenueId(profileId)
}

function findAccountForSection(
  userAccounts: UserAccount[],
  profileId: string,
  requiredType: ProfileType
): UserAccount | null {
  for (const compatibleType of getCompatibleAccountTypesForSection(requiredType)) {
    const match = findAccountStrict(userAccounts, profileId, compatibleType)
    if (match) return match
  }
  return findAccountByProfileId(userAccounts, profileId, requiredType)
}

function filterAccountsForSection(
  userAccounts: UserAccount[],
  requiredType: ProfileType
): UserAccount[] {
  const compatible = new Set(getCompatibleAccountTypesForSection(requiredType))
  return userAccounts.filter(
    acc => compatible.has(normalizeAccountType(acc.account_type)) && acc.is_active
  )
}

function sessionMatchesSection(
  activeAccountType: string | null | undefined,
  requiredType: ProfileType
): boolean {
  if (!activeAccountType) return false
  return accountTypeMatchesSection(activeAccountType, requiredType)
}

function buildCurrentAccountScopedPath(
  pathname: string,
  searchParams: { get(name: string): string | null; toString(): string },
  account: UserAccount | null | undefined
): string | null {
  if (!account?.profile_id || account.account_type === 'general') return null

  const existingAccountParam = readAccountFromSearch(searchParams.toString())
  if (existingAccountParam === account.profile_id) return null

  const params = new URLSearchParams(searchParams.toString())
  params.delete(ACCOUNT_PARAM)
  const remaining = params.toString()
  const basePath = remaining ? `${pathname}?${remaining}` : pathname

  return buildAccountScopedPath(basePath, account.profile_id, account.account_type)
}

/**
 * Keeps URL and active account aligned for strict app sections (/admin, /artist, /venue).
 *
 * Resolution order (direct navigation to a section):
 *   1. ?account=<profileId> query param  →  exact match by profile_id + required type
 *   2. Session (activeSession)            →  resolveAccountFromSession
 *   3. One or more accounts of required type → auto-select first match
 *   4. Zero accounts of required type → redirect to general /dashboard
 *
 * Account switched via the switcher (pathname unchanged): navigate to the account home.
 */
export function AccountRouteGuard() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { currentAccount, accounts, activeSession, switchAccount, isLoading, isAccountsReady, accountsFetchFailed } = useMultiAccount()

  const prevPathnameRef = useRef(pathname)
  const prevAccountKeyRef = useRef<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function syncRouteAccount() {
      if (!isAccountsReady || accounts.length === 0) return

      const required = getRequiredAccountTypeForPathname(pathname)
      if (!required) return

      const accountParam = readAccountFromSearch(searchParams.toString())

      // URL ?account= is authoritative — switch even when type already matches but profile differs
      if (accountParam) {
        const byParam = findAccountForSection(accounts, accountParam, required)
        if (byParam) {
          const needsSwitch =
            currentAccount?.profile_id !== byParam.profile_id ||
            !accountTypeMatchesSection(currentAccount?.account_type, required)
          if (needsSwitch) {
            if (!cancelled) await switchAccount(byParam.profile_id, byParam.account_type)
          }
          if (required === 'venue' && !cancelled) await syncVenueScope(byParam.profile_id)
          prevPathnameRef.current = pathname
          prevAccountKeyRef.current = `${byParam.profile_id}:${byParam.account_type}`
          return
        }

        const replacement = filterAccountsForSection(accounts, required)[0]
        if (replacement) {
          if (!cancelled) await switchAccount(replacement.profile_id, replacement.account_type)
          if (required === 'venue' && !cancelled) await syncVenueScope(replacement.profile_id)
          const scopedPath = buildCurrentAccountScopedPath(pathname, searchParams, replacement)
          if (scopedPath && !cancelled) router.replace(scopedPath, { scroll: false })
          prevPathnameRef.current = pathname
          prevAccountKeyRef.current = `${replacement.profile_id}:${replacement.account_type}`
          return
        }
      }

      // Already on the correct account type and no conflicting URL param
      if (accountTypeMatchesSection(currentAccount?.account_type, required)) {
        if (required === 'venue' && currentAccount?.profile_id) {
          await syncVenueScope(currentAccount.profile_id)
        }
        const scopedPath = buildCurrentAccountScopedPath(pathname, searchParams, currentAccount)
        if (scopedPath && !cancelled) router.replace(scopedPath, { scroll: false })
        prevPathnameRef.current = pathname
        prevAccountKeyRef.current = currentAccount
          ? `${currentAccount.profile_id}:${currentAccount.account_type}`
          : null
        return
      }

      const pathnameChanged = prevPathnameRef.current !== pathname
      const accountKey = currentAccount
        ? `${currentAccount.profile_id}:${currentAccount.account_type}`
        : null
      const accountChanged =
        prevAccountKeyRef.current !== null && prevAccountKeyRef.current !== accountKey

      prevPathnameRef.current = pathname
      prevAccountKeyRef.current = accountKey

      // User switched account in UI while still on the old section URL → navigate, don't revert.
      if (accountChanged && !pathnameChanged && currentAccount) {
        if (!cancelled) navigateToAccountDashboard(currentAccount.account_type, currentAccount.profile_id)
        return
      }

      // User navigated directly to this section — resolve target account.

      // 1. Try active session (URL param handled above)
      if (activeSession && sessionMatchesSection(activeSession.active_account_type, required)) {
        const bySession = findAccountForSection(
          accounts,
          activeSession.active_profile_id,
          required
        )
        if (bySession) {
          if (!cancelled) await switchAccount(bySession.profile_id, bySession.account_type)
          if (required === 'venue' && !cancelled) await syncVenueScope(bySession.profile_id)
          const scopedPath = buildCurrentAccountScopedPath(pathname, searchParams, bySession)
          if (scopedPath && !cancelled) router.replace(scopedPath, { scroll: false })
          return
        }
        // Check legacy session_data path
        const legacyId = activeSession.session_data?.account_profile_id as string | undefined
        if (legacyId) {
          const legacyMatch = findAccountForSection(accounts, legacyId, required)
          if (legacyMatch) {
            if (!cancelled) await switchAccount(legacyMatch.profile_id, legacyMatch.account_type)
            if (required === 'venue' && !cancelled) await syncVenueScope(legacyMatch.profile_id)
            const scopedPath = buildCurrentAccountScopedPath(pathname, searchParams, legacyMatch)
            if (scopedPath && !cancelled) router.replace(scopedPath, { scroll: false })
            return
          }
        }
      }

      // 3. One or more accounts of the required type → auto-select first match
      //    (keeps multi-org users on /admin instead of ejecting to /dashboard)
      const ofType = filterAccountsForSection(accounts, required)
      if (ofType.length >= 1) {
        if (!cancelled) await switchAccount(ofType[0].profile_id, ofType[0].account_type)
        if (required === 'venue' && !cancelled) await syncVenueScope(ofType[0].profile_id)
        const scopedPath = buildCurrentAccountScopedPath(pathname, searchParams, ofType[0])
        if (scopedPath && !cancelled) router.replace(scopedPath, { scroll: false })
        return
      }

      // 4. No accounts of the required type → send to general dashboard.
      //    Skip when the last accounts fetch failed/aborted — treat as unknown, not "no account".
      if (accountsFetchFailed) return

      if (!cancelled) {
        const fallbackRoute = getDashboardPathForAccountType(currentAccount?.account_type ?? 'general')
        router.replace(fallbackRoute)
      }
    }

    syncRouteAccount()
    return () => {
      cancelled = true
    }
  }, [pathname, searchParams, currentAccount, accounts, activeSession, switchAccount, isAccountsReady, accountsFetchFailed, router])

  return null
}
