import { redirect } from 'next/navigation'
import { AccountsSeed } from '@/components/account/accounts-seed'
import { loadUserAccountsForSession } from '@/lib/accounts/server-load-accounts'
import { AdminLayoutClient } from './admin-layout-client'
import './globals.css'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const startedAt = Date.now()
  const loaded = await loadUserAccountsForSession()

  if (!loaded) {
    redirect('/login?redirectTo=%2Fadmin%2Fdashboard')
  }

  return (
    <>
      <AccountsSeed accounts={loaded.accounts} activeSession={loaded.activeSession} />
      <AdminLayoutClient>{children}</AdminLayoutClient>
    </>
  )
}
