import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/auth/api-auth'
import { AdminOnboardingStaffService } from '@/lib/services/admin-onboarding-staff.service'

export async function GET(request: NextRequest) {
  return withAdminAuth(async (req) => {
    const { searchParams } = new URL(req.url)
    const venueId = searchParams.get('venue_id')
    if (!venueId) return NextResponse.json({ success: false, error: 'Venue ID is required' }, { status: 400 })

    const stats = await AdminOnboardingStaffService.getDashboardStats(venueId)
    return NextResponse.json({ success: true, data: stats.onboarding || stats })
  })(request)
}
