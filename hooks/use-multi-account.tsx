'use client'

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { z } from 'zod'
import type { User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/auth-context'
import { supabase } from '@/lib/supabase'
import { AccountManagementService, UserAccount, ActiveSession } from '@/lib/services/account-management.service'
import type { ProfileType } from '@/lib/accounts/account-types'
import { normalizeAccountType } from '@/lib/accounts/account-types'
import { getDashboardPathForAccountType, accountTypeMatchesSection } from '@/lib/navigation/account-dashboard-routes'
import { navigateToAccountDashboard } from '@/lib/navigation/navigate-to-account-dashboard'
import { buildAccountScopedPath, readAccountFromSearch } from '@/lib/navigation/account-context-url'
import { OrganizerAccountSchema } from '@/lib/accounts/organization-account-schema'
import {
  PROFILE_IMAGES_UPDATED_EVENT,
  type ProfileImagesUpdatedDetail,
} from '@/lib/profile/profile-image-events'

export { OrganizerAccountSchema, OrganizationAccountSchema } from '@/lib/accounts/organization-account-schema'

function syncVenueScopeForAccount(account: UserAccount | null) {
  if (account?.account_type !== 'venue' || !account.profile_id) return
  void import('@/lib/services/venue.service').then(({ venueService }) => {
    venueService.setCurrentVenueId(account.profile_id)
  })
}
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

/** Lookup by profile_id with optional section filter; handles legacy truncated URL ids. */
export function findAccountByProfileId(
  userAccounts: UserAccount[],
  profileId: string,
  requiredType?: ProfileType | null
): UserAccount | null {
  if (!profileId) return null

  let match = userAccounts.find(acc => acc.profile_id === profileId) ?? null

  if (!match) {
    match =
      userAccounts.find(
        acc =>
          acc.profile_id.startsWith(profileId) ||
          profileId.startsWith(acc.profile_id)
      ) ?? null
  }

  if (!match) return null

  if (requiredType && !accountTypeMatchesSection(match.account_type, requiredType)) return null

  return match
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

function resolveActiveAccount(
  userAccounts: UserAccount[],
  userId: string,
  session: ActiveSession | null,
  currentActive: UserAccount | null
): UserAccount | null {
  // 1. URL ?account= wins on navigation/refresh (session ref is empty after full page load)
  if (typeof window !== 'undefined') {
    const accountParam = readAccountFromSearch(window.location.search)
    if (accountParam) {
      const byUrl =
        findAccountByProfileId(userAccounts, accountParam) ??
        userAccounts.find(acc => acc.profile_id === accountParam && acc.is_active) ??
        null
      if (byUrl) return byUrl
    }
  }

  // 2. Keep in-memory active account if still valid
  if (currentActive?.profile_id && currentActive?.account_type) {
    const stillValid = userAccounts.find(
      acc =>
        acc.profile_id === currentActive.profile_id &&
        acc.account_type === currentActive.account_type
    )
    if (stillValid) return stillValid
  }

  let newActiveAccount: UserAccount | null = null

  if (session) {
    newActiveAccount = resolveAccountFromSession(userAccounts, session, userId)
  }

  if (!newActiveAccount) {
    const stored = readStoredActiveAccount(userId)
    if (stored) {
      newActiveAccount = findAccountInList(userAccounts, stored.profileId, stored.accountType)
    }
  }

  if (!newActiveAccount) {
    const generalAccount = userAccounts.find(acc => acc.account_type === 'general')
    newActiveAccount = generalAccount || userAccounts[0] || null
  }

  return newActiveAccount
}

interface MultiAccountContextType {
  accounts: UserAccount[]
  activeAccount: UserAccount | null
  activeSession: ActiveSession | null
  isLoading: boolean
  error: string | null
  /** True when the last accounts fetch failed/aborted (not a confirmed empty account list). */
  accountsFetchFailed: boolean
  switchAccount: (profileId: string, accountType: string) => Promise<boolean>
  switchAccountAndNavigate: (profileId: string, accountType: string) => Promise<boolean>
  activateAccountAfterCreate: (profileId: string, accountType: string) => Promise<boolean>
  createArtistAccount: (data: any) => Promise<string>
  createVenueAccount: (data: any) => Promise<string>
  createOrganizerAccount: (data: any) => Promise<string>
  refreshAccounts: () => Promise<void>
  hydrateFromServer: (accounts: UserAccount[], activeSession: ActiveSession | null) => void
  /** True after server seed or first client accounts fetch attempt completes. */
  isAccountsReady: boolean
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

function resolveOwnerUserId(
  authUser: User | null | undefined,
  userAccounts: UserAccount[],
  ownerUserIdRef: React.MutableRefObject<string | null>
): string | null {
  if (authUser?.id) return authUser.id
  if (ownerUserIdRef.current) return ownerUserIdRef.current
  const general = userAccounts.find(acc => acc.account_type === 'general')
  return general?.profile_id ?? userAccounts[0]?.profile_id ?? null
}

export function MultiAccountProvider({ children }: MultiAccountProviderProps) {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [accounts, setAccounts] = useState<UserAccount[]>([])
  const [activeAccount, setActiveAccount] = useState<UserAccount | null>(null)
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [accountsFetchFailed, setAccountsFetchFailed] = useState(false)
  const [isAccountsReady, setIsAccountsReady] = useState(false)
  const activeAccountRef = useRef<UserAccount | null>(null)
  const userRef = useRef<User | null>(null)
  const accountsRef = useRef<UserAccount[]>([])
  const ownerUserIdRef = useRef<string | null>(null)
  const hasServerSeedRef = useRef(false)
  const accountsFetchControllerRef = useRef<AbortController | null>(null)
  const accountsFetchAbortReasonRef = useRef<'timeout' | 'superseded' | null>(null)

  useEffect(() => {
    activeAccountRef.current = activeAccount
  }, [activeAccount])

  useEffect(() => {
    userRef.current = user
    if (user?.id) ownerUserIdRef.current = user.id
  }, [user])

  useEffect(() => {
    accountsRef.current = accounts
  }, [accounts])

  const hydrateFromServer = useCallback(
    (userAccounts: UserAccount[], session: ActiveSession | null) => {
      if (userAccounts.length === 0) return

      const userId = resolveOwnerUserId(userRef.current, userAccounts, ownerUserIdRef)
      if (!userId) return

      hasServerSeedRef.current = true
      ownerUserIdRef.current = userId
      // Keep refs in sync immediately so the mount refetch effect can skip safely
      // before the accounts→accountsRef sync effect runs.
      accountsRef.current = userAccounts

      // Supersede any in-flight client fetch once RSC seed arrives.
      if (accountsFetchControllerRef.current) {
        accountsFetchAbortReasonRef.current = 'superseded'
        accountsFetchControllerRef.current.abort()
        accountsFetchControllerRef.current = null
      }

      setAccounts(userAccounts)
      setActiveSession(session)
      setError(null)
      setAccountsFetchFailed(false)
      setIsLoading(false)

      const resolved = resolveActiveAccount(
        userAccounts,
        userId,
        session,
        activeAccountRef.current
      )
      setActiveAccount(resolved)
      activeAccountRef.current = resolved
      if (resolved) {
        writeStoredActiveAccount(userId, resolved.profile_id, resolved.account_type)
        syncVenueScopeForAccount(resolved)
      }
      setIsAccountsReady(true)
    },
    []
  )

  const refreshAccounts = useCallback(async () => {
    let authUser = userRef.current
    if (!authUser?.id) {
      const { data: { session } } = await supabase.auth.getSession()
      authUser = session?.user ?? null
      if (authUser?.id) userRef.current = authUser
    }

    const userId = resolveOwnerUserId(authUser, accountsRef.current, ownerUserIdRef)
    if (!userId) return

    ownerUserIdRef.current = userId
    const isBackgroundRefresh = accountsRef.current.length > 0

    try {
      if (!isBackgroundRefresh) setIsLoading(true)
      setError(null)

      const controller = new AbortController()
      accountsFetchControllerRef.current = controller
      accountsFetchAbortReasonRef.current = null
      const timeoutId = setTimeout(() => {
        accountsFetchAbortReasonRef.current = 'timeout'
        controller.abort(
          typeof DOMException !== 'undefined'
            ? new DOMException('Accounts fetch timed out', 'AbortError')
            : undefined
        )
      }, ACCOUNTS_FETCH_TIMEOUT_MS)
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
        if (accountsFetchControllerRef.current === controller)
          accountsFetchControllerRef.current = null
      }

      if (res.status === 401) {
        if (accountsRef.current.length === 0) {
          setActiveAccount(null)
          setActiveSession(null)
        }
        setError('Your session expired. Please sign in again.')
        setAccountsFetchFailed(true)
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

      accountsRef.current = userAccounts
      setAccounts(userAccounts)
      const session = body.activeSession ?? null
      setActiveSession(session)
      setAccountsFetchFailed(false)

      const resolved = resolveActiveAccount(
        userAccounts,
        userId,
        session,
        activeAccountRef.current
      )
      if (
        resolved &&
        (resolved.profile_id !== activeAccountRef.current?.profile_id ||
          resolved.account_type !== activeAccountRef.current?.account_type)
      ) {
        setActiveAccount(resolved)
        activeAccountRef.current = resolved
        writeStoredActiveAccount(userId, resolved.profile_id, resolved.account_type)
        syncVenueScopeForAccount(resolved)
      } else if (resolved && !activeAccountRef.current) {
        setActiveAccount(resolved)
        activeAccountRef.current = resolved
        writeStoredActiveAccount(userId, resolved.profile_id, resolved.account_type)
        syncVenueScopeForAccount(resolved)
      }
    } catch (err: any) {
      const isAbort = err?.name === 'AbortError'
      const abortReason = accountsFetchAbortReasonRef.current
      const hasAccounts = accountsRef.current.length > 0
      const isSoftAbort =
        isAbort && (abortReason === 'superseded' || hasAccounts || hasServerSeedRef.current)

      if (isSoftAbort) {
        setError(null)
        setAccountsFetchFailed(false)
        return
      }

      if (!isAbort)
        console.error('Error fetching accounts:', err)

      let errorMessage = 'Failed to fetch accounts'
      if (isAbort) {
        errorMessage =
          'Loading accounts timed out. You can refresh the page to try again.'
      } else if (err instanceof Error) {
        errorMessage = err.message
      } else if (err && typeof err === 'object') {
        if (err.message) errorMessage = err.message
        else if (err.error) errorMessage = err.error
        else if (err.details) errorMessage = err.details
        else errorMessage = 'Account data unavailable. Please try refreshing the page.'
      }

      setError(errorMessage)
      setAccountsFetchFailed(true)

      // Preserve seeded/hydrated accounts. On abort, never inject a synthetic general
      // account (that can eject users from /artist). For other failures with an empty
      // list, allow a minimal general fallback so the shell is not blank.
      if (!isAbort) {
        const fallbackUser = authUser ?? userRef.current
        if (fallbackUser) {
          setAccounts(prev => (prev.length > 0 ? prev : fallbackGeneralAccounts(fallbackUser)))
          setActiveAccount(prev => prev ?? fallbackGeneralAccounts(fallbackUser)[0] ?? null)
        }
      }
      setActiveSession(null)
    } finally {
      setIsLoading(false)
      setIsAccountsReady(true)
    }
  }, [user?.id])

  const persistActiveAccount = useCallback(
    async (account: UserAccount): Promise<void> => {
      let ownerId = resolveOwnerUserId(userRef.current, accountsRef.current, ownerUserIdRef)
      if (!ownerId) {
        const { data: { session } } = await supabase.auth.getSession()
        ownerId = session?.user?.id ?? ownerUserIdRef.current
      }
      if (!ownerId) return

      try {
        await AccountManagementService.switchAccount(
          ownerId,
          account.profile_id,
          account.account_type as Parameters<typeof AccountManagementService.switchAccount>[2]
        )
        const session = await AccountManagementService.getActiveSession(ownerId)
        setActiveSession(session)
      } catch (err) {
        console.warn('[MultiAccount] Session persist failed (non-fatal):', err)
      }
    },
    []
  )

  const applyActiveAccount = useCallback(
    (profileId: string, accountType: string): UserAccount | null => {
      const ownerId = resolveOwnerUserId(userRef.current, accountsRef.current, ownerUserIdRef)
      if (!ownerId) return null

      const targetAccount =
        findAccountStrict(accountsRef.current, profileId, accountType) ??
        findAccountByProfileId(accountsRef.current, profileId, accountType as ProfileType)
      if (!targetAccount) return null
      setError(null)
      setActiveAccount(targetAccount)
      activeAccountRef.current = targetAccount
      writeStoredActiveAccount(ownerId, targetAccount.profile_id, targetAccount.account_type)
      syncVenueScopeForAccount(targetAccount)
      return targetAccount
    },
    []
  )

  const switchAccount = useCallback(
    async (profileId: string, accountType: string): Promise<boolean> => {
      const targetAccount = applyActiveAccount(profileId, accountType)
      if (!targetAccount) {
        console.warn(`[MultiAccount] No account found with id ${profileId} and type ${accountType}`)
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

  const activateAccountAfterCreate = useCallback(
    async (profileId: string, accountType: string): Promise<boolean> => {
      const resolveTarget = () =>
        findAccountStrict(accountsRef.current, profileId, accountType) ??
        findAccountByProfileId(accountsRef.current, profileId, accountType as ProfileType)

      let targetAccount = resolveTarget()
      for (let attempt = 0; !targetAccount && attempt < 4; attempt += 1) {
        await refreshAccounts()
        targetAccount = resolveTarget()
        if (!targetAccount) {
          await new Promise(resolve => setTimeout(resolve, 150 * (attempt + 1)))
        }
      }

      if (!targetAccount) {
        const errorMessage = 'Created account was saved, but could not be loaded as the active workspace. Refresh and select it from the account switcher.'
        setError(errorMessage)
        toast.error(errorMessage)
        return false
      }

      setError(null)
      setActiveAccount(targetAccount)
      activeAccountRef.current = targetAccount

      const ownerId = resolveOwnerUserId(userRef.current, accountsRef.current, ownerUserIdRef)
      if (ownerId) {
        writeStoredActiveAccount(ownerId, targetAccount.profile_id, targetAccount.account_type)
      }
      syncVenueScopeForAccount(targetAccount)

      await Promise.race([
        persistActiveAccount(targetAccount),
        new Promise<void>(resolve => setTimeout(resolve, 1200)),
      ])

      return true
    },
    [persistActiveAccount, refreshAccounts]
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
      subtype?: string
      url_slug?: string
      contact_info?: any
      social_links?: any
      specialties?: string[]
      is_public?: boolean
    }): Promise<string> => {
      if (!user?.id) throw new Error('You must be logged in to create an organization account')

      try {
        setIsLoading(true)
        setError(null)
        const parsed = OrganizerAccountSchema.parse(data)
        const payload = {
          ...parsed,
          url_slug: parsed.url_slug || undefined,
          subtype: parsed.subtype || parsed.organization_type,
        }

        const response = await fetch('/api/accounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'create_organizer', ...payload }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
        }

        const result = await response.json()
        if (!result.success) {
          throw new Error(result.error || 'Failed to create organization account')
        }

        await refreshAccounts()
        return result.organizerId
      } catch (err: any) {
        const errorMessage =
          err instanceof z.ZodError
            ? err.errors.map(e => e.message).join(', ')
            : err instanceof Error
              ? err.message
              : 'Failed to create organization account'

        setError(errorMessage)
        throw new Error(errorMessage)
      } finally {
        setIsLoading(false)
      }
    },
    [user?.id, refreshAccounts]
  )

  useEffect(() => {
    if (!user?.id && !ownerUserIdRef.current) return

    // Skip the initial client refetch when RSC already seeded a non-empty account list.
    // Mutations (create/switch/retry) still call refreshAccounts() explicitly.
    if (hasServerSeedRef.current && accountsRef.current.length > 0) return

    void refreshAccounts()
  }, [user?.id, refreshAccounts])

  // Keep sidebar / account switcher avatars in sync after Appearance uploads.
  useEffect(() => {
    if (!user?.id) return
    const userId = user.id

    function handleProfileImagesUpdated(event: Event) {
      const detail = (event as CustomEvent<ProfileImagesUpdatedDetail>).detail
      if (detail && 'avatarUrl' in detail) {
        setAccounts((prev) =>
          prev.map((account) => {
            if (normalizeAccountType(account.account_type) !== 'general') return account
            if (account.profile_id !== userId) return account
            return {
              ...account,
              profile_data: {
                ...account.profile_data,
                avatar_url: detail.avatarUrl ?? null,
              },
            }
          })
        )
        setActiveAccount((prev) => {
          if (!prev || normalizeAccountType(prev.account_type) !== 'general') return prev
          if (prev.profile_id !== userId) return prev
          return {
            ...prev,
            profile_data: {
              ...prev.profile_data,
              avatar_url: detail.avatarUrl ?? null,
            },
          }
        })
      }
      void refreshAccounts()
    }

    window.addEventListener(PROFILE_IMAGES_UPDATED_EVENT, handleProfileImagesUpdated)
    return () => {
      window.removeEventListener(PROFILE_IMAGES_UPDATED_EVENT, handleProfileImagesUpdated)
    }
  }, [user?.id, refreshAccounts])

  useEffect(() => {
    if (user?.id) return
    if (!authLoading && !user && !hasServerSeedRef.current) {
      setAccounts([])
      setActiveAccount(null)
      setActiveSession(null)
      ownerUserIdRef.current = null
      setIsAccountsReady(true)
    }
  }, [user?.id, authLoading])

  const contextValue = useMemo<MultiAccountContextType>(
    () => ({
      accounts,
      activeAccount,
      activeSession,
      isLoading,
      error,
      accountsFetchFailed,
      switchAccount,
      switchAccountAndNavigate,
      activateAccountAfterCreate,
      createArtistAccount,
      createVenueAccount,
      createOrganizerAccount,
      refreshAccounts,
      hydrateFromServer,
      isAccountsReady,
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
      accountsFetchFailed,
      switchAccount,
      switchAccountAndNavigate,
      activateAccountAfterCreate,
      createArtistAccount,
      createVenueAccount,
      createOrganizerAccount,
      refreshAccounts,
      hydrateFromServer,
      isAccountsReady,
      hasAccountType,
    ]
  )

  return (
    <MultiAccountContext.Provider value={contextValue}>
      {error ? (
        <div
          role="alert"
          className="fixed top-0 left-0 right-0 z-[9999] bg-red-950/95 border-b border-red-800 px-4 py-2 text-sm text-red-100 text-center flex items-center justify-center gap-3 flex-wrap"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void refreshAccounts()}
            disabled={isLoading}
            className="rounded-md border border-red-400/60 px-2.5 py-0.5 text-xs font-medium hover:bg-red-900/60 disabled:opacity-50"
          >
            {isLoading ? 'Retrying…' : 'Retry'}
          </button>
        </div>
      ) : null}
      {children}
    </MultiAccountContext.Provider>
  )
} 
