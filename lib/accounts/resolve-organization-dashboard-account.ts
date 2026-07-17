import { isOrganizationType } from '@/lib/accounts/account-types'
import type { UserAccount } from '@/lib/services/account-management.service'

export function resolveOrganizationDashboardAccount(
  accounts: UserAccount[],
  currentAccount: UserAccount | null,
  requestedAccountId: string | null
): UserAccount | null {
  if (requestedAccountId) {
    return accounts.find(
      (account) =>
        account.profile_id === requestedAccountId &&
        isOrganizationType(account.account_type)
    ) || null
  }

  if (currentAccount && isOrganizationType(currentAccount.account_type)) {
    return currentAccount
  }

  return null
}
