import { NextRequest, NextResponse } from 'next/server'
import { AdminOnboardingStaffService } from '@/lib/services/admin-onboarding-staff.service'
import { withAdminAuth } from '@/lib/auth/api-auth'

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

    if (!venueId) {
      return NextResponse.json(
        { success: false, error: 'Venue ID is required' },
        { status: 400 }
      )
    }

    const jobPostings = await AdminOnboardingStaffService.getJobPostings(venueId)
    if (hasSyntheticRecords(jobPostings as Array<{ id?: string }>)) {
      return NextResponse.json(
        { success: false, error: 'Live job postings unavailable' },
        { status: 503 }
      )
    }

    return NextResponse.json({
      success: true,
      data: jobPostings
    })
  })(request)
}

export async function POST(request: NextRequest) {
  return withAdminAuth(async (req) => {
    const body = await req.json()
    const { venue_id, ...jobData } = body

    if (!venue_id) {
      return NextResponse.json(
        { success: false, error: 'Venue ID is required' },
        { status: 400 }
      )
    }

    const jobPosting = await AdminOnboardingStaffService.createJobPosting(venue_id, jobData)

    return NextResponse.json({
      success: true,
      data: jobPosting
    })
  })(request)
} 