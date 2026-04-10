import { NextRequest, NextResponse } from 'next/server'
import { AdminOnboardingStaffService } from '@/lib/services/admin-onboarding-staff.service'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')
  const token = searchParams.get('token')

  if (action !== 'validate_token' || !token) {
    return NextResponse.json({ success: false, error: 'action=validate_token and token are required' }, { status: 400 })
  }

  const candidate = await AdminOnboardingStaffService.getCandidateByToken(token)
  if (!candidate) return NextResponse.json({ success: false, error: 'Invitation is invalid or expired' }, { status: 404 })
  const templateId =
    (candidate as { template_id?: string | null }).template_id ??
    candidate.workflow_id ??
    null

  return NextResponse.json({
    success: true,
    data: {
      invitation: {
        candidate_id: candidate.id,
        template_id: templateId,
        position: candidate.position,
        department: candidate.department,
        venue_id: candidate.venue_id,
      },
    },
  })
}
