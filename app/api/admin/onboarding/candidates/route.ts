import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/auth/api-auth'
import { AdminOnboardingStaffService } from '@/lib/services/admin-onboarding-staff.service'

function hasSyntheticRecords(records: Array<{ id?: string }>) {
  return records.some((record) => {
    const id = typeof record?.id === 'string' ? record.id : ''
    return id.startsWith('mock-') || id.startsWith('fallback-')
  })
}

function buildCandidateStats(candidates: Array<{ status?: string; onboarding_progress?: number }>) {
  const total = candidates.length
  const pending = candidates.filter((candidate) => candidate.status === 'pending').length
  const inProgress = candidates.filter((candidate) => candidate.status === 'in_progress').length
  const completed = candidates.filter((candidate) => candidate.status === 'completed').length
  const approved = candidates.filter((candidate) => candidate.status === 'approved').length
  const rejected = candidates.filter((candidate) => candidate.status === 'rejected').length
  const averageProgress = total
    ? Math.round(
        candidates.reduce((sum, candidate) => sum + Number(candidate.onboarding_progress || 0), 0) / total
      )
    : 0

  return {
    total,
    pending,
    in_progress: inProgress,
    completed,
    approved,
    rejected,
    average_progress: averageProgress,
  }
}

export async function GET(request: NextRequest) {
  return withAdminAuth(async (req) => {
    const { searchParams } = new URL(req.url)
    const venueId = searchParams.get('venue_id')
    if (!venueId) return NextResponse.json({ success: false, error: 'Venue ID is required' }, { status: 400 })

    const candidates = await AdminOnboardingStaffService.getOnboardingCandidates(venueId)
    if (hasSyntheticRecords(candidates as Array<{ id?: string }>)) {
      return NextResponse.json(
        { success: false, error: 'Live onboarding candidates unavailable' },
        { status: 503 }
      )
    }
    const stats = buildCandidateStats(candidates)

    return NextResponse.json({
      success: true,
      data: {
        candidates,
        stats,
      },
    })
  })(request)
}
