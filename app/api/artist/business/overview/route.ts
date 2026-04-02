import { NextResponse } from 'next/server'
import { getBusinessOverview, getRecentTransactions } from '@/lib/services/artist-business.service'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const [overview, transactions] = await Promise.all([
      getBusinessOverview({ userId: user.id }),
      getRecentTransactions({ userId: user.id, limit: 5 }),
    ])

    return NextResponse.json({ overview, transactions })
  } catch (error) {
    console.error('Business overview API error:', error)
    return NextResponse.json({ error: 'Failed to load business overview' }, { status: 500 })
  }
}
