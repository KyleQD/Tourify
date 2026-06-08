'use client'

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react'
import { z } from 'zod'
import type { User } from '@supabase/supabase-js'
import { useAuth } from '@/contexts/auth-context'
import { AccountManagementService, UserAccount, ActiveSession } from '@/lib/services/account-management.service'

const ACCOUNTS_FETCH_TIMEOUT_MS = 22_000
const ACTIVE_ACCOUNT_STORAGE_KEY = 'tourify.active-account'

export const ArtistAccountSchema = z.object({
  artist_name: z.string().min(1, 'Artist name is required').max(100),
  bio: z.string().max(500).optional(),
  genres: z.array(z.string()).optional(),
  social_links: z.record(z.string()).optional(),
})

export const VenueAccountSchema = z.object({
  venue_name: z.string().min(1, 'Venue name is required').max(100),
  description: z.string().max(1000).optional(),
  address: z.string().optional(),
  capacity: z.number().positive().optional(),
  venue_types: z.array(z.string()).optional(),
  contact_info: z.record(z.unknown()).optional(),
  social_links: z.record(z.string()).optional(),
})

export const OrganizerAccountSchema = z.object({
  organization_name: z.string().min(1, 'Organization name is required').max(100),
  description: z.string().max(1000).optional(),
  organization_type: z.string().min(1),
  contact_info: z.record(z.unknown()).optional(),
  social_links: z.record(z.string()).optional(),
  specialties: z.array(z.string()).optional(),
})

interface StoredActiveAccount {
  userId: string
  profileId: string
  accountType: string
}

function readStoredActiveAccount(userId: string): StoredActiveAccount | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(ACTIVE_ACCOUNT_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredActiveAccount
    if (parsed.userId !== userId) return null
    return parsed
  } catch {
    return null
  }
}

function writeStoredActiveAccount(userId: string, profileId: string, accountType: string) {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(
      ACTIVE_ACCOUNT_STORAGE_KEY,
      JSON.stringify({ userId, profileId, accountType })
    )
  } catch {
    // ignore storage quota errors
  }
}

function findAccountInList(
  userAccounts: UserAccount[],
  profileId: string,
  accountType: string
): UserAccount | null {
  return (
    userAccounts.find(
      acc => acc.profile_id === profileId && acc.account_type === accountType
    ) ??
    userAccounts.find(acc => acc.account_type === accountType && acc.is_active) ??
    null
  )
}

function fallbackGeneralAccounts(user: User): UserAccount[] {
  const handle = user.email?.split('@')[0] || `user-${user.id.slice(0, 8)}`
  const name =
    (user.user_metadata?.full_name as string | undefined) ||
    (user.user_metadata?.name as string | undefined) ||
    handle

  return [
    {
      account_type: 'general',
      profile_id: user.id,
      profile_data: {
        id: user.id,
        username: (user.user_metadata?.username as string | undefined) || handle,
        full_name: name,
        display_name: name,
        avatar_url: (user.user_metadata?.avatar_url as string | undefined) || null,
        email: user.email,
      },
      permissions: {
        can_post: true,
        can_manage_settings: true,
        can_view_analytics: false,
        can_manage_content: false,
      },
      is_active: true,
    },
  ]
}

function resolveAccountFromSession(
  userAccounts: UserAccount[],
  session: ActiveSession,
  userId: string
): UserAccount | null {
  const directMatch = userAccounts.find(
    acc =>
      acc.profile_id === session.active_profile_id &&
      acc.account_type === session.active_account_type
  )
  if (directMatch) return directMatch

  const sessionAccountId = session.session_data?.account_profile_id as string | undefined
  if (sessionAccountId) {
    const subAccountMatch = userAccounts.find(
      acc =>
        acc.profile_id === sessionAccountId &&
        acc.account_type === session.active_account_type
    )
    if (subAccountMatch) return subAccountMatch
  }

  if (session.active_account_type !== 'general' && session.active_profile_id === userId) {
    return (
      userAccounts.find(acc => acc.account_type === session.active_account_type && acc.is_active) ??
      null
    )
  }

  return null
}

interface MultiAccountContextType {
  accounts: UserAccount[]
  activeAccount: UserAccount | null
  activeSession: ActiveSession | null
  isLoading: boolean
  error: string | null
  switchAccount: (profileId: string, accountType: string) => Promise<boolean>
  createArtistAccount: (data: any) => Promise<string>
  createVenueAccount: (data: any) => Promise<string>
  createOrganizerAccount: (data: any) => Promise<string>
  refreshAccounts: () => Promise<void>
  hasAccountType: (accountType: string) => boolean
  currentAccount: UserAccount | null
  userAccounts: UserAccount[]
}

const MultiAccountContext = createContext<MultiAccountContextType | undefined>(undefined)

export function useMultiAccount() {
  const context = useContext(MultiAccountContext)
  if (context === undefined) {
    throw new Error('useMultiAccount must be used within a MultiAccountProvider')
  }
  return context
}

export function useAccountSwitching() {
  const { switchAccount, activeAccount, isLoading } = useMultiAccount()
  return { switchAccount, activeAccount, isLoading }
}

export function useAccountPermissions() {
  const { activeAccount } = useMultiAccount()
  return {
    permissions: activeAccount?.permissions || {},
    canPost: activeAccount?.permissions?.can_post || false,
    canManageSettings: activeAccount?.permissions?.can_manage_settings || false,
    canViewAnalytics: activeAccount?.permissions?.can_view_analytics || false,
    canManageContent: activeAccount?.permissions?.can_manage_content || false
  }
}

export function useAccountCreation() {
  const { createArtistAccount, createVenueAccount, refreshAccounts } = useMultiAccount()
  
  const createAccount = async (type: 'artist' | 'venue', data: any) => {
    try {
      const accountId = type === 'artist' 
        ? await createArtistAccount(data)
        : await createVenueAccount(data)
      
      await refreshAccounts()
      return accountId
    } catch (error) {
      throw error
    }
  }
  
  return { createAccount }
}

export function useAccountPosting() {
  const { activeAccount } = useMultiAccount()
  
  const canPostAs = (accountType: string) => {
    if (!activeAccount) return false
    return activeAccount.account_type === accountType || activeAccount.permissions?.can_post
  }
  
  return {
    activeAccount,
    canPostAs,
    canPostAsArtist: canPostAs('artist'),
    canPostAsVenue: canPostAs('venue'),
    canPostAsGeneral: canPostAs('general')
  }
}

interface MultiAccountProviderProps {
  children: React.ReactNode
}

export function MultiAccountProvider({ children }: MultiAccountProviderProps) {
  const { user } = useAuth()
  const [accounts, setAccounts] = useState<UserAccount[]>([])
  const [activeAccount, setActiveAccount] = useState<UserAccount | null>(null)
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refreshAccounts = async () => {
    if (!user?.id) return

    try {
      setIsLoading(true)
      setError(null)
      

      // One same-origin request (server runs Supabase) avoids many parallel browser→Supabase calls
      // that can stall under Safari / strict privacy or flaky networks.
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), ACCOUNTS_FETCH_TIMEOUT_MS)
      let res: Response
      try {
        res = await fetch(`/api/accounts?ts=${Date.now()}`, {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
          signal: controller.signal,
        })
      } finally {
        clearTimeout(timeoutId)
      }

      if (res.status === 401) {
        setAccounts([])
        setActiveAccount(null)
        setActiveSession(null)
        setError('Your session expired. Please sign in again.')
        return
      }

      if (!res.ok) {
        throw new Error(`Accounts request failed (${res.status})`)
      }

      const body = (await res.json()) as {
        success?: boolean
        accounts?: UserAccount[]
        activeSession?: ActiveSession | null
        error?: string
      }

      if (!body.success || !Array.isArray(body.accounts)) {
        throw new Error(body.error || 'Invalid accounts response')
      }

      const userAccounts = body.accounts

      
      setAccounts(userAccounts)
      const session = body.activeSession ?? null
      setActiveSession(session)
      
      const currentActiveId = activeAccount?.profile_id
      const currentActiveType = activeAccount?.account_type
      
      let newActiveAccount = null
      if (currentActiveId && currentActiveType) {
        newActiveAccount = userAccounts.find(acc => 
          acc.profile_id === currentActiveId && acc.account_type === currentActiveType
        ) ?? null
      }
      
      if (!newActiveAccount && session) {
        newActiveAccount = resolveAccountFromSession(userAccounts, session, user.id)
      }

      if (!newActiveAccount) {
        const stored = readStoredActiveAccount(user.id)
        if (stored) {
          newActiveAccount = findAccountInList(
            userAccounts,
            stored.profileId,
            stored.accountType
          )
        }
      }
      
      if (!newActiveAccount) {
        const generalAccount = userAccounts.find(acc => acc.account_type === 'general')
        newActiveAccount = generalAccount || userAccounts[0] || null
      }
      
      setActiveAccount(newActiveAccount)
      
      
    } catch (err: any) {
      console.error('Error fetching accounts:', err)
      
      let errorMessage = 'Failed to fetch accounts'
      const isAbort = err?.name === 'AbortError'
      if (isAbort) {
        errorMessage =
          'Loading accounts timed out. You can refresh the page. A minimal profile is shown so you are not stuck on this screen.'
      } else if (err instanceof Error) {
        errorMessage = err.message
      } else if (err && typeof err === 'object') {
        if (err.message) errorMessage = err.message
        else if (err.error) errorMessage = err.error
        else if (err.details) errorMessage = err.details
        else errorMessage = 'Account data unavailable. Please try refreshing the page.'
      }
      
      setError(errorMessage)

      setAccounts(prev => (prev.length > 0 ? prev : fallbackGeneralAccounts(user)))
      setActiveAccount(prev => prev ?? fallbackGeneralAccounts(user)[0] ?? null)
      setActiveSession(null)
    } finally {
      setIsLoading(false)
    }
  }

  const switchAccount = async (profileId: string, accountType: string): Promise<boolean> => {
    if (!user?.id) return false

    const targetAccount = findAccountInList(accounts, profileId, accountType)
    if (!targetAccount) {
      setError(`No active ${accountType} account found`)
      return false
    }

    setError(null)
    setActiveAccount(targetAccount)
    writeStoredActiveAccount(user.id, targetAccount.profile_id, targetAccount.account_type)

    void AccountManagementService.switchAccount(
      user.id,
      targetAccount.profile_id,
      targetAccount.account_type as Parameters<typeof AccountManagementService.switchAccount>[2]
    )
      .then(async () => {
        try {
          const session = await AccountManagementService.getActiveSession(user.id)
          setActiveSession(session)
        } catch {
          // session table optional
        }
      })
      .catch(err => {
        console.warn('[MultiAccount] Session persist failed (non-fatal):', err)
      })

    return true
  }

  // Check if user has a specific account type
  const hasAccountType = (accountType: string): boolean => {
    return accounts.some(account => 
      account.account_type === accountType && account.is_active
    )
  }

  const createArtistAccount = async (data: {
    artist_name: string
    bio?: string
    genres?: string[]
    social_links?: any
  }): Promise<string> => {
    if (!user?.id) throw new Error('You must be logged in to create an artist account')

    try {
      setIsLoading(true)
      setError(null)
      const parsed = ArtistAccountSchema.parse(data)

      const response = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_artist', ...parsed }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const result = await response.json()
      if (!result.success) throw new Error(result.error || 'Failed to create artist account')

      await refreshAccounts()
      return result.artistId
    } catch (err) {
      const errorMessage =
        err instanceof z.ZodError
          ? err.errors.map(e => e.message).join(', ')
          : err instanceof Error
            ? err.message
            : 'Failed to create artist account'

      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const createVenueAccount = async (data: {
    venue_name: string
    description?: string
    address?: string
    capacity?: number
    venue_types?: string[]
    contact_info?: any
    social_links?: any
  }): Promise<string> => {
    if (!user?.id) throw new Error('You must be logged in to create a venue account')

    try {
      setIsLoading(true)
      setError(null)
      const parsed = VenueAccountSchema.parse(data)

      const response = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_venue', ...parsed }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const result = await response.json()
      if (!result.success) throw new Error(result.error || 'Failed to create venue account')

      await refreshAccounts()
      return result.venueId
    } catch (err) {
      const errorMessage =
        err instanceof z.ZodError
          ? err.errors.map(e => e.message).join(', ')
          : err instanceof Error
            ? err.message
            : 'Failed to create venue account'

      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const createOrganizerAccount = async (data: {
    organization_name: string
    description?: string
    organization_type: string
    contact_info?: any
    social_links?: any
    specialties?: string[]
  }): Promise<string> => {
    if (!user?.id) throw new Error('You must be logged in to create an organizer account')

    try {
      setIsLoading(true)
      setError(null)
      const parsed = OrganizerAccountSchema.parse(data)

      const response = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_organizer', ...parsed }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Failed to create organizer account')
      }

      await refreshAccounts()
      return result.organizerId
    } catch (err: any) {
      const errorMessage =
        err instanceof z.ZodError
          ? err.errors.map(e => e.message).join(', ')
          : err instanceof Error
            ? err.message
            : 'Failed to create organizer account'

      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (user?.id) {
      refreshAccounts()
    } else {
      setAccounts([])
      setActiveAccount(null)
      setActiveSession(null)
    }
  }, [user?.id])

  const contextValue = useMemo<MultiAccountContextType>(
    () => ({
      accounts,
      activeAccount,
      activeSession,
      isLoading,
      error,
      switchAccount,
      createArtistAccount,
      createVenueAccount,
      createOrganizerAccount,
      refreshAccounts,
      hasAccountType,
      currentAccount: activeAccount,
      userAccounts: accounts,
    }),
    [
      accounts,
      activeAccount,
      activeSession,
      isLoading,
      error,
      switchAccount,
      createArtistAccount,
      createVenueAccount,
      createOrganizerAccount,
      refreshAccounts,
      hasAccountType,
    ]
  )

  return (
    <MultiAccountContext.Provider value={contextValue}>
      {error ? (
        <div
          role="alert"
          className="fixed top-0 left-0 right-0 z-[9999] bg-red-950/95 border-b border-red-800 px-4 py-2 text-sm text-red-100 text-center"
        >
          {error}
        </div>
      ) : null}
      {children}
    </MultiAccountContext.Provider>
  )
} 