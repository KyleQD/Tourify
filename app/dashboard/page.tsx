import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { loadUserAccountsForSession } from '@/lib/accounts/server-load-accounts'
import { AccountsSeed } from '@/components/account/accounts-seed'
import { DashboardPageClient } from '@/components/dashboard/dashboard-page-client'
import DashboardLoading from './loading'

export default async function DashboardPage() {
  const loaded = await loadUserAccountsForSession()

  if (!loaded) redirect('/login')

  return (
    <>
      <AccountsSeed accounts={loaded.accounts} activeSession={loaded.activeSession} />
      <Suspense fallback={<DashboardLoading />}>
        <DashboardPageClient serverUserId={loaded.userId} />
      </Suspense>
    </>
  )
}
