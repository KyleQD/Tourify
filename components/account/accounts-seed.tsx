'use client'

import { useLayoutEffect, useRef } from 'react'
import { useMultiAccount } from '@/hooks/use-multi-account'
import type { ActiveSession, UserAccount } from '@/lib/services/account-management.service'

interface AccountsSeedProps {
  accounts: UserAccount[]
  activeSession: ActiveSession | null
}

/** Hydrates MultiAccountProvider with server-fetched accounts before paint / sibling effects. */
export function AccountsSeed({ accounts, activeSession }: AccountsSeedProps) {
  const { hydrateFromServer } = useMultiAccount()
  const hasHydratedRef = useRef(false)

  useLayoutEffect(() => {
    if (hasHydratedRef.current || accounts.length === 0) return
    hasHydratedRef.current = true
    hydrateFromServer(accounts, activeSession)
  }, [accounts, activeSession, hydrateFromServer])

  return null
}
