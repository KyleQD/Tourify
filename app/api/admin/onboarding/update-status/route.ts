import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/auth/api-auth'
import { createClient } from '@/lib/supabase/server'
import { AdminOnboardingStaffService } from '@/lib/services/admin-onboarding-staff.service'

export async function PATCH(request: NextRequest) {
  return withAdminAuth(async (req) => {
    const body = await req.json()
    const candidateId = body.candidate_id
    const status = body.status
    if (!candidateId || !status) {
      return NextResponse.json({ success: false, error: 'candidate_id and status are required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: candidate, error: lookupError } = await supabase
      .from('staff_onboarding_candidates')
      .select('onboarding_progress')
      .eq('id', candidateId)
      .single()
    if (lookupError) throw lookupError

    const updated = await AdminOnboardingStaffService.updateOnboardingProgress(candidateId, {
      progress: Number(candidate?.onboarding_progress || 0),
      status,
    })

    return NextResponse.json({ success: true, data: updated })
  })(request)
}
