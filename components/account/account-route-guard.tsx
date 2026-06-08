'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useMultiAccount } from '@/hooks/use-multi-account'
import {
  getDashboardPathForAccountType,
  getRequiredAccountTypeForPathname,
} from '@/lib/navigation/account-dashboard-routes'

/**
 * Keeps URL aligned with active account mode for strict app sections (e.g. organizer admin).
 * If the user switches to artist/venue/personal while still on /admin, they are sent to the right dashboard.
 */
export function AccountRouteGuard() {
  const pathname = usePathname()
  const router = useRouter()
  const { currentAccount, accounts, switchAccount, isLoading, hasAccountType } = useMultiAccount()

  useEffect(() => {
    let cancelled = false

    async function syncRouteAccount() {
      if (isLoading || !currentAccount || accounts.length === 0) return

      const required = getRequiredAccountTypeForPathname(pathname)
      if (!required) return
      if (currentAccount.account_type === required) return

      const targetAccount = accounts.find(
        acc => acc.account_type === required && acc.is_active
      )

      if (targetAccount) {
        await switchAccount(targetAccount.profile_id, targetAccount.account_type)
        return
      }

      if (!hasAccountType(required)) {
        if (!cancelled) {
          router.replace(getDashboardPathForAccountType(currentAccount.account_type))
        }
      }
    }

    syncRouteAccount()
    return () => {
      cancelled = true
    }
  }, [pathname, currentAccount, accounts, switchAccount, isLoading, hasAccountType, router])

  return null
}
