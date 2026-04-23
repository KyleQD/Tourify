import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { canReviewStaffingApplications } from '@/lib/auth/hiring-permissions'
import { AdminOnboardingStaffService } from '@/lib/services/admin-onboarding-staff.service'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })

    const venueId = new URL(request.url).searchParams.get('venue_id')
    if (!venueId) return NextResponse.json({ success: false, error: 'venue_id required' }, { status: 400 })

    const allowed = await canReviewStaffingApplications({ userId: user.id, venueId })
    if (!allowed) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })

    const [candidates, workflows] = await Promise.all([
      AdminOnboardingStaffService.getOnboardingCandidates(venueId),
      AdminOnboardingStaffService.getOnboardingWorkflows(venueId),
    ])

    return NextResponse.json({
      success: true,
      data: {
        candidates,
        workflows,
      },
    })
  } catch (e) {
    console.error('[venue/onboarding/summary]', e)
    return NextResponse.json({ success: false, error: 'Failed to load onboarding summary' }, { status: 500 })
  }
}
