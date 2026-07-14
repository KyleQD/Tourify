"use client"

import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { useMultiAccount } from '@/hooks/use-multi-account'
import { useCurrentVenue } from '@/hooks/use-venue'
import { isOrganizationType } from '@/lib/accounts/account-types'

interface AdminDashboardContextType {
  venueId: string | undefined
  accountId: string | undefined
  accountType: string | undefined
  isAdmin: boolean
  isLoading: boolean
  displayName: string
}

const AdminDashboardContext = createContext<AdminDashboardContextType | undefined>(undefined)

export function AdminDashboardProvider({ children }: { children: ReactNode }) {
  const { currentAccount, isLoading: accountLoading } = useMultiAccount()
  const isVenueAccount = currentAccount?.account_type === 'venue'
  // Organizer/admin shells do not need a venue profile fetch on every navigation.
  const { venue, loading: venueLoading } = useCurrentVenue({ enabled: isVenueAccount })

  const value = useMemo<AdminDashboardContextType>(() => ({
    venueId: isVenueAccount ? venue?.id : undefined,
    accountId: currentAccount?.profile_id,
    accountType: currentAccount?.account_type,
    isAdmin: isOrganizationType(currentAccount?.account_type),
    isLoading: accountLoading || (isVenueAccount && venueLoading),
    displayName: currentAccount?.profile_data?.display_name
      || currentAccount?.profile_data?.organization_name
      || 'Organizer',
  }), [currentAccount, venue, accountLoading, venueLoading, isVenueAccount])

  return (
    <AdminDashboardContext.Provider value={value}>
      {children}
    </AdminDashboardContext.Provider>
  )
}

export function useAdminDashboard() {
  const context = useContext(AdminDashboardContext)
  if (!context) {
    throw new Error('useAdminDashboard must be used within AdminDashboardProvider')
  }
  return context
}
