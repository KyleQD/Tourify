"use client"

import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { useMultiAccount } from '@/hooks/use-multi-account'
import { useCurrentVenue } from '@/hooks/use-venue'

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
  const { venue, loading: venueLoading } = useCurrentVenue()

  const value = useMemo<AdminDashboardContextType>(() => ({
    venueId: venue?.id,
    accountId: currentAccount?.id,
    accountType: currentAccount?.account_type,
    isAdmin: currentAccount?.account_type === 'admin',
    isLoading: accountLoading || venueLoading,
    displayName: currentAccount?.profile_data?.display_name
      || currentAccount?.profile_data?.organization_name
      || 'Organizer',
  }), [currentAccount, venue, accountLoading, venueLoading])

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
