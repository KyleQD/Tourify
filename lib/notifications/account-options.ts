import {
  getAccountAvatarUrl,
  getAccountDisplayName,
  getAccountInitials,
  getAccountTypeLabel,
} from '@/lib/accounts/account-presentation'
import { normalizeAccountType } from '@/lib/accounts/account-types'
import type { UserAccount } from '@/lib/services/account-management.service'
import type { NotificationAccountScope, NotificationTarget } from '@/lib/notifications/account-scope'
import { notificationMatchesAccountScope } from '@/lib/notifications/account-scope'

export const ALL_NOTIFICATION_ACCOUNTS = 'all'

export interface NotificationAccountOption {
  key: string
  profileId: string
  accountType: string
  displayName: string
  typeLabel: string
  avatarUrl: string | null
  initials: string
  account: UserAccount
}

export function isOwnedNotificationAccount(account: UserAccount): boolean {
  const accountType = normalizeAccountType(account.account_type)
  const profileData = account.profile_data ?? {}
  const grantRole = typeof profileData.grant_role === 'string'
    ? profileData.grant_role.toLowerCase()
    : null

  if (!account.is_active || accountType === 'staff') return false
  if (profileData.tour_collaborator === true) return false
  if (grantRole && grantRole !== 'owner') return false

  return ['general', 'artist', 'service', 'venue', 'organization'].includes(accountType)
}

export function getOwnedNotificationAccountOptions(
  accounts: UserAccount[],
): NotificationAccountOption[] {
  const seen = new Set<string>()

  return accounts
    .filter(isOwnedNotificationAccount)
    .map((account) => {
      const accountType = normalizeAccountType(account.account_type)
      return {
        key: `${accountType}:${account.profile_id}`,
        profileId: account.profile_id,
        accountType,
        displayName: getAccountDisplayName(account),
        typeLabel: getAccountTypeLabel(accountType),
        avatarUrl: getAccountAvatarUrl(account),
        initials: getAccountInitials(account),
        account,
      }
    })
    .filter((option) => {
      if (seen.has(option.key)) return false
      seen.add(option.key)
      return true
    })
    .sort((a, b) => {
      if (a.accountType === 'general') return -1
      if (b.accountType === 'general') return 1
      return a.displayName.localeCompare(b.displayName)
    })
}

export function toNotificationAccountScopes(
  userId: string,
  options: NotificationAccountOption[],
): NotificationAccountScope[] {
  return options.map((option) => ({
    userId,
    targetProfileId: option.accountType === 'general' ? userId : option.profileId,
    accountType: option.accountType,
  }))
}

export function findNotificationAccountOption(
  notification: NotificationTarget,
  userId: string,
  options: NotificationAccountOption[],
): NotificationAccountOption | null {
  return options.find((option) => notificationMatchesAccountScope(notification, {
    userId,
    targetProfileId: option.accountType === 'general' ? userId : option.profileId,
    accountType: option.accountType,
  })) ?? null
}

export function filterNotificationsByAccount<T extends NotificationTarget>(
  notifications: T[],
  selectedAccountKey: string,
  userId: string,
  options: NotificationAccountOption[],
): T[] {
  if (selectedAccountKey === ALL_NOTIFICATION_ACCOUNTS) return notifications

  const option = options.find((candidate) => candidate.key === selectedAccountKey)
  if (!option) return notifications

  const scope: NotificationAccountScope = {
    userId,
    targetProfileId: option.accountType === 'general' ? userId : option.profileId,
    accountType: option.accountType,
  }

  return notifications.filter((notification) => notificationMatchesAccountScope(notification, scope))
}
