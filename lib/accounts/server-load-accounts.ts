import 'server-only'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { AccountManagementService } from '@/lib/services/account-management.service'
import type { ActiveSession, UserAccount } from '@/lib/services/account-management.service'

export interface LoadedUserAccounts {
  userId: string
  accounts: UserAccount[]
  activeSession: ActiveSession | null
}

/** Request-scoped memoization — same checks, fewer duplicate round trips per RSC tree. */
export const loadUserAccountsForSession = cache(async function loadUserAccountsForSession(): Promise<LoadedUserAccounts | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const serviceSupabase = createServiceRoleClient()
  const [accounts, activeSession] = await Promise.all([
    AccountManagementService.getUserAccounts(user.id, serviceSupabase),
    AccountManagementService.getActiveSession(user.id, serviceSupabase),
  ])

  return { userId: user.id, accounts, activeSession }
})
