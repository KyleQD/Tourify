import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { useSession } from "@/hooks/use-session"
import {
  getUserAccounts,
  switchAccountOnServer,
  type MobileAccountType,
  type UserAccount,
} from "@/lib/api/accounts"
import { buildActingHeaders } from "@/lib/api/acting-headers"

const ACTIVE_ACCOUNT_KEY = "tourify.active-account"

interface MultiAccountContextValue {
  userAccounts: UserAccount[]
  currentAccount: UserAccount | null
  isLoading: boolean
  actingHeaders: Record<string, string>
  switchAccount: (profileId: string) => Promise<void>
  refreshAccounts: () => Promise<void>
}

const MultiAccountContext = createContext<MultiAccountContextValue | null>(null)

function pickDefaultAccount(
  accounts: UserAccount[],
  storedProfileId: string | null,
  activeProfileId: string | null
): UserAccount | null {
  if (accounts.length === 0) return null
  const byStored = storedProfileId && accounts.find((a) => a.profile_id === storedProfileId)
  if (byStored) return byStored
  const byServer = activeProfileId && accounts.find((a) => a.profile_id === activeProfileId)
  if (byServer) return byServer
  const general = accounts.find((a) => a.account_type === "general")
  return general ?? accounts[0]
}

export function MultiAccountProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useSession()
  const [userAccounts, setUserAccounts] = useState<UserAccount[]>([])
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadAccounts = useCallback(async () => {
    if (!isAuthenticated) {
      setUserAccounts([])
      setCurrentProfileId(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const [{ accounts, activeSession }, storedProfileId] = await Promise.all([
        getUserAccounts(),
        AsyncStorage.getItem(ACTIVE_ACCOUNT_KEY),
      ])
      setUserAccounts(accounts)
      const resolved = pickDefaultAccount(
        accounts,
        storedProfileId,
        activeSession?.active_profile_id ?? null
      )
      setCurrentProfileId(resolved?.profile_id ?? null)
    } catch {
      setUserAccounts([])
      setCurrentProfileId(null)
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    void loadAccounts()
  }, [loadAccounts, user?.id])

  const currentAccount = useMemo(
    () => userAccounts.find((a) => a.profile_id === currentProfileId) ?? null,
    [userAccounts, currentProfileId]
  )

  const switchAccount = useCallback(
    async (profileId: string) => {
      const target = userAccounts.find((a) => a.profile_id === profileId)
      if (!target) return

      setCurrentProfileId(profileId)
      await AsyncStorage.setItem(ACTIVE_ACCOUNT_KEY, profileId)

      try {
        await switchAccountOnServer(profileId, target.account_type as MobileAccountType)
      } catch {
        // Local switch already applied; server session will reconcile on next load.
      }
    },
    [userAccounts]
  )

  const actingHeaders = useMemo(
    () =>
      buildActingHeaders(
        currentAccount
          ? { profileId: currentAccount.profile_id, accountType: currentAccount.account_type }
          : null
      ),
    [currentAccount]
  )

  const value = useMemo<MultiAccountContextValue>(
    () => ({
      userAccounts,
      currentAccount,
      isLoading,
      actingHeaders,
      switchAccount,
      refreshAccounts: loadAccounts,
    }),
    [userAccounts, currentAccount, isLoading, actingHeaders, switchAccount, loadAccounts]
  )

  return <MultiAccountContext.Provider value={value}>{children}</MultiAccountContext.Provider>
}

export function useMultiAccount() {
  const context = useContext(MultiAccountContext)
  if (!context) throw new Error("useMultiAccount must be used inside MultiAccountProvider")
  return context
}
