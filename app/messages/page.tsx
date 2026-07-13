import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { loadUserAccountsForSession } from '@/lib/accounts/server-load-accounts'
import { AccountsSeed } from '@/components/account/accounts-seed'
import { MessagesPageClient } from './messages-page-client'
import { MessagesSkeleton } from './messages-skeleton'

export default async function MessagesPage() {
  const loaded = await loadUserAccountsForSession()

  if (!loaded) redirect('/login')

  return (
    <>
      <AccountsSeed accounts={loaded.accounts} activeSession={loaded.activeSession} />
      <Suspense fallback={<MessagesSkeleton />}>
        <MessagesPageClient serverUserId={loaded.userId} />
      </Suspense>
    </>
  )
}
