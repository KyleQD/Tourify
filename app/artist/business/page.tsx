import BusinessDashboardClient from './_page-client'
import { createClient } from '@/lib/supabase/server'
import { getBusinessOverview, getRecentTransactions } from '@/lib/services/artist-business.service'
import type { BusinessOverview, BusinessTransaction } from '@/lib/services/artist-business.service'

export default async function BusinessDashboard() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return <BusinessDashboardClient initialStats={null} initialTransactions={[]} />

  let overview: BusinessOverview | null = null
  let transactions: BusinessTransaction[] = []
  try {
    const results = await Promise.allSettled([
      getBusinessOverview({ userId: user.id }),
      getRecentTransactions({ userId: user.id, limit: 5 }),
    ])
    if (results[0].status === 'fulfilled') overview = results[0].value
    if (results[1].status === 'fulfilled') transactions = results[1].value
  } catch (err) {
    console.error('Business hub preload failed:', err)
  }

  return <BusinessDashboardClient initialStats={overview} initialTransactions={transactions} />
}
