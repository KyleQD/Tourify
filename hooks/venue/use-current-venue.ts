'use client'

import { useMemo } from 'react'
import { useMultiAccount } from '@/hooks/use-multi-account'
import { normalizeAccountType } from '@/lib/accounts/account-types'

interface CurrentVenue {
  id: string
  venue_name: string
  description?: string | null
  user_id?: string | null
}

/**
 * Returns the currently active venue account from the multi-account context.
 * This replaces the former placeholder implementation.
 *
 * Consumers should check `isLoading` before using `currentVenue`.
 */
export function useCurrentVenue() {
  const { currentAccount, accounts, isLoading } = useMultiAccount()

  const currentVenue = useMemo<CurrentVenue | null>(() => {
    // Prefer the actively selected account when it is a venue
    if (currentAccount && normalizeAccountType(currentAccount.account_type) === 'venue') {
      const pd = currentAccount.profile_data ?? {}
      return {
        id: currentAccount.profile_id,
        venue_name: pd.venue_name ?? 'Venue',
        description: pd.description ?? null,
        user_id: pd.user_id ?? null,
      }
    }

    // No venue is active — return null so callers know to prompt a switch
    return null
  }, [currentAccount, accounts])

  return { currentVenue, isLoading }
} 