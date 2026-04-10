import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/auth/api-auth'
import { createClient } from '@/lib/supabase/server'
import { AdminOnboardingStaffService } from '@/lib/services/admin-onboarding-staff.service'

export async function POST(request: NextRequest) {
  return withAdminAuth(async (req) => {
    const body = await req.json()
    const venueId = body.venue_id
    const position = body.position
    const department = body.department
    const email = body.email || null
    const phone = body.phone || null
    if (!venueId || !position || !department || (!email && !phone)) {
      return NextResponse.json(
        { success: false, error: 'venue_id, position, department, and email or phone are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const { data: candidate, error } = await supabase
      .from('staff_onboarding_candidates')
      .insert({
        venue_id: venueId,
        name: email || phone,
        email,
        phone,
        position,
        department,
        status: 'pending',
        stage: 'invitation',
        application_date: new Date().toISOString(),
        employment_type: body.employment_type || 'full_time',
        onboarding_progress: 0,
        template_id: body.onboarding_template_id || null,
        start_date: body.start_date || null,
        salary: body.salary || null,
        notes: body.notes || null,
      })
      .select('*')
      .single()
    if (error) throw error

    const token = await AdminOnboardingStaffService.generateInvitationToken(candidate.id)

    return NextResponse.json({
      success: true,
      data: {
        candidate,
        invitation_token: token,
      },
    })
  })(request)
}
