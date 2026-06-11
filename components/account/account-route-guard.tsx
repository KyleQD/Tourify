'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useMultiAccount, findAccountStrict } from '@/hooks/use-multi-account'
import {
  getDashboardPathForAccountType,
  getRequiredAccountTypeForPathname,
} from '@/lib/navigation/account-dashboard-routes'
import { navigateToAccountDashboard } from '@/lib/navigation/navigate-to-account-dashboard'
import { readAccountFromSearch } from '@/lib/navigation/account-context-url'
import { normalizeAccountType } from '@/lib/accounts/account-types'

/**
 * Keeps URL and active account aligned for strict app sections (/admin, /artist, /venue).
 *
 * Resolution order (direct navigation to a section):
 *   1. ?account=<profileId> query param  →  exact match by profile_id + required type
 *   2. Session (activeSession)            →  resolveAccountFromSession
 *   3. Exactly one account of required type → auto-select
 *   4. Multiple accounts, none identified → redirect to general /dashboard
 *      (a future Account Picker modal will handle this case)
 *
 * Account switched via the switcher (pathname unchanged): navigate to the account home.
 */
export function AccountRouteGuard() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { currentAccount, accounts, activeSession, switchAccount, isLoading } = useMultiAccount()

  const prevPathnameRef = useRef(pathname)
  const prevAccountKeyRef = useRef<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function syncRouteAccount() {
      if (isLoading || accounts.length === 0) return

      const required = getRequiredAccountTypeForPathname(pathname)
      if (!required) return

      const currentType = currentAccount ? normalizeAccountType(currentAccount.account_type) : null
      const requiredNorm = normalizeAccountType(required)

      // Already on the correct account type
      if (currentType === requiredNorm) {
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

      // 1. Try ?account= query param (most explicit signal)
      const accountParam = readAccountFromSearch(searchParams.toString())
      if (accountParam) {
        const byParam = findAccountStrict(accounts, accountParam, required)
        if (byParam) {
          if (!cancelled) await switchAccount(byParam.profile_id, byParam.account_type)
          return
        }
        // param present but no match — fall through to session / single-account
      }

      // 2. Try active session
      if (activeSession && normalizeAccountType(activeSession.active_account_type) === requiredNorm) {
        const bySession = findAccountStrict(accounts, activeSession.active_profile_id, required)
        if (bySession) {
          if (!cancelled) await switchAccount(bySession.profile_id, bySession.account_type)
          return
        }
        // Check legacy session_data path
        const legacyId = activeSession.session_data?.account_profile_id as string | undefined
        if (legacyId) {
          const legacyMatch = findAccountStrict(accounts, legacyId, required)
          if (legacyMatch) {
            if (!cancelled) await switchAccount(legacyMatch.profile_id, legacyMatch.account_type)
            return
          }
        }
      }

      // 3. Exactly one account of the required type → unambiguous selection
      const ofType = accounts.filter(
        acc => normalizeAccountType(acc.account_type) === requiredNorm && acc.is_active
      )
      if (ofType.length === 1) {
        if (!cancelled) await switchAccount(ofType[0].profile_id, ofType[0].account_type)
        return
      }

      // 4. Multiple accounts, no identifier → send to general dashboard
      //    (Phase 5 will show an Account Picker modal here instead)
      if (!cancelled) {
        router.replace(getDashboardPathForAccountType(currentAccount?.account_type ?? 'general'))
      }
    }

    syncRouteAccount()
    return () => {
      cancelled = true
    }
  }, [pathname, searchParams, currentAccount, accounts, activeSession, switchAccount, isLoading, router])

  return null
}
