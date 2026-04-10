import { NextRequest, NextResponse } from 'next/server'
import { AdminOnboardingStaffService } from '@/lib/services/admin-onboarding-staff.service'
import { withAdminAuth } from '@/lib/auth/api-auth'

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return withAdminAuth(async (req) => {
    const { id } = await context.params
    const body = await req.json()
    const { progress, stage, status, notes } = body

    if (progress === undefined) {
      return NextResponse.json(
        { error: 'Progress is required' },
        { status: 400 }
      )
    }

    const updatedCandidate = await AdminOnboardingStaffService.updateOnboardingProgress(
      id,
      { progress, stage, status, notes }
    )

    return NextResponse.json({
      data: updatedCandidate,
      success: true,
      message: 'Onboarding progress updated successfully'
    })
  })(request)
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return withAdminAuth(async (req) => {
    const { id } = await context.params
    const body = await req.json()
    const { action } = body

    if (action === 'complete') {
      const staffMember = await AdminOnboardingStaffService.completeOnboarding(id)
      return NextResponse.json({
        data: staffMember,
        success: true,
        message: 'Onboarding completed and staff member created successfully'
      })
    } else if (action === 'generate_token') {
      const token = await AdminOnboardingStaffService.generateInvitationToken(id)
      return NextResponse.json({
        data: { token },
        success: true,
        message: 'Invitation token generated successfully'
      })
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )
  })(request)
} 