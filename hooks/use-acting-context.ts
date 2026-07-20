'use client'

import { useMemo } from 'react'
import { useMultiAccount } from '@/hooks/use-multi-account'
import { isOrganizationType, normalizeAccountType } from '@/lib/accounts/account-types'

/**
 * Thin client hook that exposes the current acting context and helpers for
 * attaching it to API requests.
 *
 * Usage:
 *   const { actingHeaders } = useActingContext()
 *   const res = await fetch('/api/posts/create', {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json', ...actingHeaders },
 *     body: JSON.stringify(data),
 *   })
 */
export function useActingContext() {
  const { currentAccount, isAccountsReady } = useMultiAccount()

  const actingHeaders = useMemo<Record<string, string>>(() => {
    if (!currentAccount) return {} as Record<string, string>
    const headers: Record<string, string> = {
      'x-acting-profile-id': currentAccount.profile_id,
      'x-acting-account-type': normalizeAccountType(currentAccount.account_type) as string,
    }
    const orgId = currentAccount.profile_data?.ops_org_id
    if (isOrganizationType(currentAccount.account_type) && typeof orgId === 'string' && orgId)
      headers['x-acting-org-id'] = orgId

    return headers
  }, [currentAccount])

  const actingContextKey = currentAccount
    ? [
        normalizeAccountType(currentAccount.account_type),
        currentAccount.profile_id,
        currentAccount.profile_data?.ops_org_id || '',
      ].join(':')
    : ''

  return {
    /** The currently active account (alias for currentAccount). */
    actingAccount: currentAccount,
    /** True when the active account has been resolved and headers are safe to send. */
    isActingReady: isAccountsReady && Boolean(currentAccount),
    /** Ready-to-spread headers for fetch() calls. */
    actingHeaders,
    /** Stable key for preventing one account's data from flashing after a switch. */
    actingContextKey,
    /** Shortcut: current account type (normalized). */
    actingType: currentAccount ? normalizeAccountType(currentAccount.account_type) : 'general',
    /** Whether the user is acting as a non-general entity. */
    isActingAsEntity: currentAccount
      ? normalizeAccountType(currentAccount.account_type) !== 'general'
      : false,
  }
}
