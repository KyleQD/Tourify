import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { canManageVenueStaffing, canReviewStaffingApplications } from '@/lib/auth/hiring-permissions'
import { AdminOnboardingStaffService } from '@/lib/services/admin-onboarding-staff.service'

/**
 * Aggregated Workforce dashboard data for the admin Staff & Crew hub.
 *
 * Returns every slice the page needs in a single authenticated, venue-scoped
 * request. Each slice is resolved independently so one failing query degrades
 * that section only instead of blanking the whole page. No synthetic/mock data
 * is returned: a failed slice is reported in `failed_slices` and its data is
 * an empty array (or null for stats).
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const venueId = searchParams.get('venue_id')
    const commsLimit = Math.min(Number(searchParams.get('comms_limit')) || 20, 100)

    if (!venueId) {
      return NextResponse.json({ success: false, error: 'Venue ID is required' }, { status: 400 })
    }

    const [canManage, canReview] = await Promise.all([
      canManageVenueStaffing({ userId: user.id, venueId }),
      canReviewStaffingApplications({ userId: user.id, venueId }),
    ])
    if (!canManage && !canReview) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const [
      statsResult,
      jobPostingsResult,
      applicationsResult,
      candidatesResult,
      staffResult,
      workflowsResult,
      communicationsResult,
    ] = await Promise.allSettled([
      AdminOnboardingStaffService.getDashboardStats(venueId, supabase),
      AdminOnboardingStaffService.getJobPostings(venueId, supabase),
      AdminOnboardingStaffService.getJobApplications(venueId, supabase),
      AdminOnboardingStaffService.getOnboardingCandidates(venueId, supabase),
      AdminOnboardingStaffService.getStaffMembers(venueId, supabase),
      AdminOnboardingStaffService.getOnboardingWorkflows(venueId, supabase),
      AdminOnboardingStaffService.getTeamCommunications(venueId, supabase),
    ])

    const failedSlices: string[] = []

    function unwrapArray<T>(result: PromiseSettledResult<T[]>, slice: string): T[] {
      if (result.status === 'fulfilled') return result.value
      failedSlices.push(slice)
      return []
    }

    const stats = statsResult.status === 'fulfilled' ? statsResult.value : null
    if (statsResult.status !== 'fulfilled') failedSlices.push('dashboard_stats')

    const communications = unwrapArray(communicationsResult, 'communications').slice(0, commsLimit)

    return NextResponse.json({
      success: true,
      data: {
        stats,
        job_postings: unwrapArray(jobPostingsResult, 'job_postings'),
        applications: unwrapArray(applicationsResult, 'applications'),
        onboarding_candidates: unwrapArray(candidatesResult, 'onboarding_candidates'),
        staff_members: unwrapArray(staffResult, 'staff_members'),
        onboarding_workflows: unwrapArray(workflowsResult, 'onboarding_workflows'),
        communications,
      },
      failed_slices: failedSlices,
    })
  } catch (error) {
    console.error('❌ [Staff Dashboard API] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to load staff dashboard data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
