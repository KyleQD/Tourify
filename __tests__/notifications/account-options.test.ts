import { describe, expect, it } from 'vitest'
import type { UserAccount } from '@/lib/services/account-management.service'
import {
  ALL_NOTIFICATION_ACCOUNTS,
  filterNotificationsByAccount,
  findNotificationAccountOption,
  getOwnedNotificationAccountOptions,
  toNotificationAccountScopes,
} from '@/lib/notifications/account-options'

function account(overrides: Partial<UserAccount> & Pick<UserAccount, 'account_type' | 'profile_id'>): UserAccount {
  return {
    profile_data: {},
    permissions: {},
    is_active: true,
    ...overrides,
  }
}

const accounts: UserAccount[] = [
  account({
    account_type: 'general',
    profile_id: 'user-1',
    profile_data: { full_name: 'Kyle Tour' },
  }),
  account({
    account_type: 'artist',
    profile_id: 'artist-1',
    profile_data: { artist_name: 'Zed Artist' },
  }),
  account({
    account_type: 'venue',
    profile_id: 'venue-1',
    profile_data: { venue_name: 'Alpha Venue' },
  }),
  account({
    account_type: 'organization',
    profile_id: 'co-owned-org',
    profile_data: { organization_name: 'Co-owned Org' },
  }),
  account({
    account_type: 'organization',
    profile_id: 'member-org',
    profile_data: { organization_name: 'Member Org', grant_role: 'admin' },
  }),
  account({
    account_type: 'organization',
    profile_id: 'owner-org',
    profile_data: { organization_name: 'Owner Org', grant_role: 'owner' },
  }),
  account({
    account_type: 'organization',
    profile_id: 'tour-org',
    profile_data: { organization_name: 'Tour Org', tour_collaborator: true, grant_role: 'tour_admin' },
  }),
  account({
    account_type: 'staff',
    profile_id: 'staff-1',
    profile_data: { display_name: 'Staff Mode' },
  }),
  account({
    account_type: 'service',
    profile_id: 'inactive-service',
    profile_data: { artist_name: 'Inactive Service' },
    is_active: false,
  }),
]

describe('owned notification account options', () => {
  it('includes personal and owned/co-owned entities while excluding access-only identities', () => {
    const options = getOwnedNotificationAccountOptions(accounts)

    expect(options.map((option) => option.profileId)).toEqual([
      'user-1',
      'venue-1',
      'co-owned-org',
      'owner-org',
      'artist-1',
    ])
    expect(options.map((option) => option.profileId)).not.toContain('member-org')
    expect(options.map((option) => option.profileId)).not.toContain('tour-org')
    expect(options.map((option) => option.profileId)).not.toContain('staff-1')
  })

  it('builds database scopes for every eligible account', () => {
    const scopes = toNotificationAccountScopes('user-1', getOwnedNotificationAccountOptions(accounts))

    expect(scopes).toContainEqual({
      userId: 'user-1',
      targetProfileId: 'user-1',
      accountType: 'general',
    })
    expect(scopes).toContainEqual({
      userId: 'user-1',
      targetProfileId: 'artist-1',
      accountType: 'artist',
    })
  })

  it('filters locally without changing account identity and maps rows back to their account', () => {
    const options = getOwnedNotificationAccountOptions(accounts)
    const notifications = [
      { id: 'n3', target_profile_id: 'venue-1', target_account_type: 'venue' },
      { id: 'n2', target_profile_id: 'user-1', target_account_type: 'general' },
      { id: 'n1', target_profile_id: 'artist-1', target_account_type: 'artist' },
    ]
    const artistKey = options.find((option) => option.profileId === 'artist-1')!.key

    expect(filterNotificationsByAccount(
      notifications,
      ALL_NOTIFICATION_ACCOUNTS,
      'user-1',
      options,
    )).toEqual(notifications)
    expect(filterNotificationsByAccount(notifications, artistKey, 'user-1', options))
      .toEqual([notifications[2]])
    expect(findNotificationAccountOption(notifications[0], 'user-1', options)?.profileId)
      .toBe('venue-1')
  })

  it('falls back to all rows when a selected account disappears', () => {
    const notifications = [{ id: 'n1', target_profile_id: 'user-1', target_account_type: 'general' }]
    expect(filterNotificationsByAccount(notifications, 'venue:missing', 'user-1', []))
      .toEqual(notifications)
  })
})
