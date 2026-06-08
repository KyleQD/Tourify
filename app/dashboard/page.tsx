import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardPageClient } from '@/components/dashboard/dashboard-page-client'
import DashboardLoading from './loading'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  await supabase
    .from('profiles')
    .select('id, full_name, username, avatar_url, custom_url, bio')
    .eq('id', user.id)
    .maybeSingle()

  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardPageClient />
    </Suspense>
  )
}
