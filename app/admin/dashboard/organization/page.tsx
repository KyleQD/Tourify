'use client'

import { useMemo } from 'react'
import { useMultiAccount } from '@/hooks/use-multi-account'
import { isOrganizationType } from '@/lib/accounts/account-types'
import { OrgTeamGrantsPanel } from '@/components/admin/org-team-grants-panel'
import { AdminPageHeader } from '../components/admin-page-header'

export default function OrganizationTeamPage() {
  const { currentAccount, accounts } = useMultiAccount()

  const organization = useMemo(() => {
    if (currentAccount && isOrganizationType(currentAccount.account_type))
      return currentAccount
    return accounts.find((account) => isOrganizationType(account.account_type)) || null
  }, [currentAccount, accounts])

  const subtype =
    (organization?.profile_data as { subtype?: string; organization_type?: string } | undefined)
      ?.subtype ||
    (organization?.profile_data as { organization_type?: string } | undefined)?.organization_type ||
    null

  return (
    <div className="space-y-6 p-4 md:p-6">
      <AdminPageHeader
        title="Organization team"
        subtitle="Invite tour managers and roster artists. Tour managers stay General users with Admin / Work Mode grants."
      />

      {!organization ? (
        <p className="text-sm text-slate-400">
          Switch to an Organization account to manage team grants and artist roster.
        </p>
      ) : (
        <OrgTeamGrantsPanel
          organizerAccountId={organization.profile_id}
          subtype={subtype}
        />
      )}
    </div>
  )
}
