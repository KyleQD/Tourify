import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/auth/api-auth'
import { AdminOnboardingStaffService } from '@/lib/services/admin-onboarding-staff.service'

function hasSyntheticRecords(records: Array<{ id?: string }>) {
  return records.some((record) => {
    const id = typeof record?.id === 'string' ? record.id : ''
    return id.startsWith('mock-') || id.startsWith('fallback-')
  })
}

export async function GET(request: NextRequest) {
  return withAdminAuth(async (req) => {
    const { searchParams } = new URL(req.url)
    const venueId = searchParams.get('venue_id')
    if (!venueId) return NextResponse.json({ success: false, error: 'Venue ID is required' }, { status: 400 })

    const workflows = await AdminOnboardingStaffService.getOnboardingWorkflows(venueId)
    if (hasSyntheticRecords(workflows as Array<{ id?: string }>)) {
      return NextResponse.json(
        { success: false, error: 'Live onboarding workflows unavailable' },
        { status: 503 }
      )
    }
    return NextResponse.json({ success: true, data: workflows })
  })(request)
}
