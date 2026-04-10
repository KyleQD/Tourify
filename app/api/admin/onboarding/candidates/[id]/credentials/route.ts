import { NextRequest, NextResponse } from 'next/server'
import { AdminOnboardingStaffService } from '@/lib/services/admin-onboarding-staff.service'
import { withAdminAuth } from '@/lib/auth/api-auth'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return withAdminAuth(async () => {
    const { id } = await context.params
    const summary = await AdminOnboardingStaffService.getCredentialRecordSummary(id)

    return NextResponse.json({ success: true, data: summary })
  })(request)
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return withAdminAuth(async (_req, authContext) => {
    const { id } = await context.params
    const body = await request.json()
    const credentials = Array.isArray(body?.credentials) ? body.credentials : []

    if (credentials.length === 0)
      return NextResponse.json({ success: false, error: 'credentials array is required' }, { status: 400 })

    const result = await AdminOnboardingStaffService.upsertCredentialRecords({
      candidateId: id,
      credentials,
      actorUserId: authContext.user.id,
    })
    const summary = await AdminOnboardingStaffService.getCredentialRecordSummary(id)

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        summary,
      },
      message: 'Credential records stored securely',
    })
  })(request)
}
