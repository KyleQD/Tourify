'use client'

import { useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { useMultiAccount } from '@/hooks/use-multi-account'
import { readAccountFromSearch } from '@/lib/navigation/account-context-url'
import { resolveOrganizationDashboardAccount } from '@/lib/accounts/resolve-organization-dashboard-account'
import { OrgTeamGrantsPanel } from '@/components/admin/org-team-grants-panel'
import { AdminPageHeader } from '../components/admin-page-header'
import { BandHub } from '@/components/admin/band-hub'
import { Music } from 'lucide-react'

export default function OrganizationTeamPage() {
  const searchParams = useSearchParams()
  const { currentAccount, accounts, isAccountsReady, isLoading } = useMultiAccount()
  const requestedAccountId = readAccountFromSearch(searchParams.toString())

  const organization = useMemo(() => {
    return resolveOrganizationDashboardAccount(accounts, currentAccount, requestedAccountId)
  }, [currentAccount, accounts, requestedAccountId])

  const subtype =
    (organization?.profile_data as { subtype?: string; organization_type?: string } | undefined)
      ?.subtype ||
    (organization?.profile_data as { organization_type?: string } | undefined)?.organization_type ||
    null
  const isBand = subtype === 'band'

  return (
    <div className="space-y-6 p-4 md:p-6">
      <AdminPageHeader
        icon={isBand ? Music : undefined}
        title={isBand ? "Band Hub" : "Organization team"}
        subtitle={
          isBand
            ? "Manage the public band page, member roster, launch checklist, and manager access."
            : "Invite tour managers and roster artists. Tour managers stay General users with Admin / Work Mode grants."
        }
      />

      {!organization ? (
        <p className="text-sm text-slate-400">
          {requestedAccountId && (isLoading || !isAccountsReady)
            ? 'Loading the selected organization account...'
            : requestedAccountId
              ? 'This organization account is not available to your current session.'
              : 'Switch to an Organization account to manage team grants and artist roster.'}
        </p>
      ) : isBand ? (
        <BandHub
          organizerAccountId={organization.profile_id}
          onboarding={searchParams.get('onboarding') === 'band-created'}
        />
      ) : (
        <OrgTeamGrantsPanel
          organizerAccountId={organization.profile_id}
          subtype={subtype}
        />
      )}
    </div>
  )
}
