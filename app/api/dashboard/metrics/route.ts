import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api-auth'
import { DashboardService } from '@/lib/services/dashboard.service'
import type { UserAccount } from '@/lib/services/account-management.service'

export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json()
    const accounts = (body.accounts || []) as UserAccount[]

    if (!Array.isArray(accounts) || accounts.length === 0) {
      return NextResponse.json({ metrics: [] })
    }

    const metrics = await DashboardService.getAccountMetrics(accounts)
    return NextResponse.json({ metrics })
  } catch (error) {
    console.error('[Dashboard Metrics API] Error:', error)
    return NextResponse.json({ error: 'Failed to load account metrics' }, { status: 500 })
  }
})
