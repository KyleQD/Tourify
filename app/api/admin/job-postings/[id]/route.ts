import { NextRequest, NextResponse } from 'next/server'
import { AdminOnboardingStaffService } from '@/lib/services/admin-onboarding-staff.service'
import { withAdminAuth } from '@/lib/auth/api-auth'

function hasSyntheticRecord(record?: { id?: string } | null) {
  const id = typeof record?.id === 'string' ? record.id : ''
  return id.startsWith('mock-') || id.startsWith('fallback-')
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return withAdminAuth(async (req) => {
    const { id } = await context.params
    const { searchParams } = new URL(req.url)
    const venueId = searchParams.get('venue_id')

    if (!venueId) {
      return NextResponse.json(
        { error: 'Venue ID is required' },
        { status: 400 }
      )
    }

    // Get specific job posting
    const jobPostings = await AdminOnboardingStaffService.getJobPostings(venueId)
    const jobPosting = jobPostings.find(job => job.id === id)
    if (hasSyntheticRecord(jobPosting as { id?: string } | null)) {
      return NextResponse.json(
        { success: false, error: 'Live job posting unavailable' },
        { status: 503 }
      )
    }

    if (!jobPosting) {
      return NextResponse.json(
        { error: 'Job posting not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      data: jobPosting,
      success: true
    })
  })(request)
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return withAdminAuth(async (req) => {
    const { id } = await context.params
    const body = await req.json()
    const { status } = body

    if (status) {
      const updatedJobPosting = await AdminOnboardingStaffService.updateJobPostingStatus(
        id,
        status
      )

      return NextResponse.json({
        data: updatedJobPosting,
        success: true,
        message: 'Job posting status updated successfully'
      })
    }

    return NextResponse.json(
      { error: 'No valid updates provided' },
      { status: 400 }
    )
  })(request)
} 