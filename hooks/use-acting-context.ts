'use client'

import { useMemo } from 'react'
import { useMultiAccount } from '@/hooks/use-multi-account'
import { normalizeAccountType } from '@/lib/accounts/account-types'

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
    return {
      'x-acting-profile-id':   currentAccount.profile_id,
      'x-acting-account-type': normalizeAccountType(currentAccount.account_type) as string,
    }
  }, [currentAccount])

  return {
    /** The currently active account (alias for currentAccount). */
    actingAccount: currentAccount,
    /** True when the active account has been resolved and headers are safe to send. */
    isActingReady: isAccountsReady && Boolean(currentAccount),
    /** Ready-to-spread headers for fetch() calls. */
    actingHeaders,
    /** Shortcut: current account type (normalized). */
    actingType: currentAccount ? normalizeAccountType(currentAccount.account_type) : 'general',
    /** Whether the user is acting as a non-general entity. */
    isActingAsEntity: currentAccount
      ? normalizeAccountType(currentAccount.account_type) !== 'general'
      : false,
  }
}
