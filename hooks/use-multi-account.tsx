'use client'

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { z } from 'zod'
import type { User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/auth-context'
import { AccountManagementService, UserAccount, ActiveSession } from '@/lib/services/account-management.service'
import { normalizeAccountType } from '@/lib/accounts/account-types'
import { getDashboardPathForAccountType } from '@/lib/navigation/account-dashboard-routes'
import { navigateToAccountDashboard } from '@/lib/navigation/navigate-to-account-dashboard'
import { buildAccountScopedPath, readAccountFromSearch } from '@/lib/navigation/account-context-url'

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

/**
 * Strict lookup — returns the account that exactly matches both profile_id AND account_type.
 * Never falls back to "first of type". Returns null if not found.
 * Use this everywhere except initial session restore.
 */
export function findAccountStrict(
  userAccounts: UserAccount[],
  profileId: string,
  accountType: string
): UserAccount | null {
  const normalizedType = normalizeAccountType(accountType)
  return (
    userAccounts.find(
      acc =>
        acc.profile_id === profileId &&
        (acc.account_type === normalizedType || normalizeAccountType(acc.account_type) === normalizedType)
    ) ?? null
  )
}

/**
 * Session-restore lookup — used only during initial account load.
 * Falls back gracefully but never silently picks the wrong entity.
 * If multiple accounts of the same type exist and the profile_id doesn't match any, returns null.
 */
function findAccountForSessionRestore(
  userAccounts: UserAccount[],
  profileId: string,
  accountType: string,
): UserAccount | null {
  // 1. Exact match
  const exact = findAccountStrict(userAccounts, profileId, accountType)
  if (exact) return exact

  const normalizedType = normalizeAccountType(accountType)

  // 2. If exactly one account of this type exists, it must be the one
  const ofType = userAccounts.filter(
    acc => normalizeAccountType(acc.account_type) === normalizedType && acc.is_active
  )
  if (ofType.length === 1) return ofType[0]

  // 3. Multiple accounts of same type, no id match — caller must show picker
  return null
}

/** @deprecated use findAccountStrict — kept only for session-restore path inside this file */
function findAccountInList(
  userAccounts: UserAccount[],
  profileId: string,
  accountType: string
): UserAccount | null {
  return findAccountStrict(userAccounts, profileId, accountType)
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
  // 1. Direct exact match (active_profile_id is the real entity UUID post P2.1 migration)
  const directMatch = findAccountStrict(
    userAccounts,
    session.active_profile_id,
    session.active_account_type
  )
  if (directMatch) return directMatch

  // 2. Pre-P2.1 sessions store entity id in session_data.account_profile_id;
  //    active_profile_id is userId in those rows.
  const legacyEntityId = session.session_data?.account_profile_id as string | undefined
  if (legacyEntityId) {
    const legacyMatch = findAccountStrict(userAccounts, legacyEntityId, session.active_account_type)
    if (legacyMatch) return legacyMatch
  }

  // 3. For general accounts, active_profile_id === userId — always resolves to one account
  if (session.active_account_type === 'general') {
    return findAccountStrict(userAccounts, userId, 'general')
  }

  // 4. No safe match — do NOT fall back to first-of-type.
  //    Caller will use the account picker or default to general.
  return null
}

interface MultiAccountContextType {
  accounts: UserAccount[]
  activeAccount: UserAccount | null
  activeSession: ActiveSession | null
  isLoading: boolean
  error: string | null
  switchAccount: (profileId: string, accountType: string) => Promise<boolean>
  switchAccountAndNavigate: (profileId: string, accountType: string) => Promise<boolean>
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
  const { switchAccount, switchAccountAndNavigate, activeAccount, isLoading } = useMultiAccount()
  return { switchAccount, switchAccountAndNavigate, activeAccount, isLoading }
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
  const router = useRouter()
  const [accounts, setAccounts] = useState<UserAccount[]>([])
  const [activeAccount, setActiveAccount] = useState<UserAccount | null>(null)
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const activeAccountRef = useRef<UserAccount | null>(null)

  useEffect(() => {
    activeAccountRef.current = activeAccount
  }, [activeAccount])

  const refreshAccounts = useCallback(async () => {
    if (!user?.id) return

    try {
      setIsLoading(true)
      setError(null)

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

      const currentActiveId = activeAccountRef.current?.profile_id
      const currentActiveType = activeAccountRef.current?.account_type

      let newActiveAccount = null
      if (currentActiveId && currentActiveType) {
        newActiveAccount =
          userAccounts.find(
            acc =>
              acc.profile_id === currentActiveId && acc.account_type === currentActiveType
          ) ?? null
      }

      // Explicit ?account=<profileId> in the URL is the freshest, most authoritative
      // signal — it is set by a just-completed account switch (and by deep links).
      // It must win over the server session, which can be stale because the session
      // upsert is sometimes cancelled by the full-page navigation that follows a switch.
      if (!newActiveAccount && typeof window !== 'undefined') {
        const accountParam = readAccountFromSearch(window.location.search)
        if (accountParam) {
          newActiveAccount =
            userAccounts.find(acc => acc.profile_id === accountParam && acc.is_active) ?? null
        }
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
  }, [user])

  const persistActiveAccount = useCallback(
    async (account: UserAccount): Promise<void> => {
      if (!user?.id) return
      try {
        await AccountManagementService.switchAccount(
          user.id,
          account.profile_id,
          account.account_type as Parameters<typeof AccountManagementService.switchAccount>[2]
        )
        const session = await AccountManagementService.getActiveSession(user.id)
        setActiveSession(session)
      } catch (err) {
        console.warn('[MultiAccount] Session persist failed (non-fatal):', err)
      }
    },
    [user?.id]
  )

  const applyActiveAccount = useCallback(
    (profileId: string, accountType: string): UserAccount | null => {
      if (!user?.id) return null
      const targetAccount = findAccountStrict(accounts, profileId, accountType)
      if (!targetAccount) return null
      setError(null)
      setActiveAccount(targetAccount)
      writeStoredActiveAccount(user.id, targetAccount.profile_id, targetAccount.account_type)
      return targetAccount
    },
    [user?.id, accounts]
  )

  const switchAccount = useCallback(
    async (profileId: string, accountType: string): Promise<boolean> => {
      const targetAccount = applyActiveAccount(profileId, accountType)
      if (!targetAccount) {
        setError(`No account found with id ${profileId} and type ${accountType}`)
        return false
      }

      // Soft (in-app) switch: persist in the background so the UI stays snappy.
      void persistActiveAccount(targetAccount)
      return true
    },
    [applyActiveAccount, persistActiveAccount]
  )

  const switchAccountAndNavigate = useCallback(
    async (profileId: string, accountType: string): Promise<boolean> => {
      const targetAccount = applyActiveAccount(profileId, accountType)
      if (!targetAccount) {
        toast.error(`Could not switch to your ${accountType} account`)
        return false
      }

      const resolvedType = targetAccount.account_type
      const resolvedProfileId = targetAccount.profile_id

      if (resolvedType === 'venue') {
        const { venueService } = await import('@/lib/services/venue.service')
        venueService.setCurrentVenueId(resolvedProfileId)
      }

      void router.prefetch(getDashboardPathForAccountType(resolvedType))

      // Persist the session BEFORE the full-page navigation so the reloaded page
      // resolves the correct entity server-side. Bounded so a slow/offline upsert
      // never blocks navigation — the ?account= URL param + sessionStorage guarantee
      // the client resolves correctly even if the upsert is cut short.
      await Promise.race([
        persistActiveAccount(targetAccount),
        new Promise<void>(resolve => setTimeout(resolve, 1200)),
      ])

      navigateToAccountDashboard(resolvedType, resolvedProfileId)
      return true
    },
    [applyActiveAccount, persistActiveAccount, router]
  )

  const hasAccountType = useCallback(
    (accountType: string): boolean => {
      return accounts.some(account => account.account_type === accountType && account.is_active)
    },
    [accounts]
  )

  const createArtistAccount = useCallback(
    async (data: {
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
    },
    [user?.id, refreshAccounts]
  )

  const createVenueAccount = useCallback(
    async (data: {
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
    },
    [user?.id, refreshAccounts]
  )

  const createOrganizerAccount = useCallback(
    async (data: {
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
    },
    [user?.id, refreshAccounts]
  )

  useEffect(() => {
    if (user?.id) {
      refreshAccounts()
    } else {
      setAccounts([])
      setActiveAccount(null)
      setActiveSession(null)
    }
  }, [user?.id, refreshAccounts])

  const contextValue = useMemo<MultiAccountContextType>(
    () => ({
      accounts,
      activeAccount,
      activeSession,
      isLoading,
      error,
      switchAccount,
      switchAccountAndNavigate,
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
      switchAccountAndNavigate,
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