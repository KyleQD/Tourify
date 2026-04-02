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
  const { currentAccount, isLoading } = useMultiAccount()

  useEffect(() => {
    if (isLoading || !currentAccount) return

    const required = getRequiredAccountTypeForPathname(pathname)
    if (!required) return

    if (currentAccount.account_type !== required) {
      const next = getDashboardPathForAccountType(currentAccount.account_type)
      router.replace(next)
    }
  }, [pathname, currentAccount, isLoading, router])

  return null
}
