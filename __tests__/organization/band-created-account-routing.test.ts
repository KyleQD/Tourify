import { describe, expect, it } from 'vitest'
import { resolveOrganizationDashboardAccount } from '@/lib/accounts/resolve-organization-dashboard-account'
import { buildAccountScopedPath } from '@/lib/navigation/account-context-url'
import type { ProfileType } from '@/lib/accounts/account-types'
import type { UserAccount } from '@/lib/services/account-management.service'

function account(profileId: string, accountType: ProfileType, displayName: string): UserAccount {
  return {
    account_type: accountType,
    profile_id: profileId,
    profile_data: {
      id: profileId,
      display_name: displayName,
      organization_name: displayName,
    },
    permissions: {},
    is_active: true,
  }
}

describe('band-created account routing', () => {
  it('builds a Band Hub URL scoped to the newly created organizer account', () => {
    expect(
      buildAccountScopedPath(
        '/admin/dashboard/organization?onboarding=band-created',
        'new-band-id',
        'organization'
      )
    ).toBe('/admin/dashboard/organization?onboarding=band-created&account=new-band-id')
  })

  it('prefers the URL account over the currently active organization', () => {
    const oldOrg = account('old-org-id', 'organization', 'Test Events & Tours LLC')
    const newBand = account('new-band-id', 'organization', 'New Band')

    expect(
      resolveOrganizationDashboardAccount([oldOrg, newBand], oldOrg, 'new-band-id')
    ).toBe(newBand)
  })

  it('does not fall back to the first organization when an unavailable account is requested', () => {
    const oldOrg = account('old-org-id', 'organization', 'Test Events & Tours LLC')

    expect(
      resolveOrganizationDashboardAccount([oldOrg], oldOrg, 'missing-band-id')
    ).toBeNull()
  })
})
