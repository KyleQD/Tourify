import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AdminOnboardingStaffService } from '@/lib/services/admin-onboarding-staff.service'

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user)
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })

    const { id } = await context.params
    const summary = await AdminOnboardingStaffService.getCredentialRecordSummary(id)

    return NextResponse.json({ success: true, data: summary })
  } catch (error) {
    console.error('❌ [Onboarding Credentials API] Failed to fetch summary:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch credential summary' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user)
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })

    const { id } = await context.params
    const body = await request.json()
    const credentials = Array.isArray(body?.credentials) ? body.credentials : []

    if (credentials.length === 0)
      return NextResponse.json({ success: false, error: 'credentials array is required' }, { status: 400 })

    const result = await AdminOnboardingStaffService.upsertCredentialRecords({
      candidateId: id,
      credentials,
      actorUserId: user.id,
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
  } catch (error) {
    console.error('❌ [Onboarding Credentials API] Failed to store records:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to store credential records securely' },
      { status: 500 }
    )
  }
}
