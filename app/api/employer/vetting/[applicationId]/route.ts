import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { canReviewStaffingApplications } from '@/lib/auth/hiring-permissions'
import {
  evaluateHiringEligibility,
  recordHiringEligibilitySnapshot,
} from '@/lib/services/hiring-eligibility.service'

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ applicationId: string }> }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user)
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })

    const { applicationId } = await context.params
    const { data: application, error: applicationError } = await supabase
      .from('job_applications')
      .select(
        'id, status, applicant_id, applicant_name, applicant_email, applicant_phone, applied_at, venue_id, job_posting_id'
      )
      .eq('id', applicationId)
      .single()

    if (applicationError || !application)
      return NextResponse.json({ success: false, error: 'Application not found' }, { status: 404 })

    const canReview = await canReviewStaffingApplications({
      userId: user.id,
      venueId: application.venue_id,
    })
    if (!canReview) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })

    const [eligibility, jobPostingResult, documentsResult, agreementsResult, endorsementsResult, achievementsResult, walletResult, connectionsResult] =
      await Promise.all([
        evaluateHiringEligibility({
          supabase,
          applicationId,
        }),
        supabase
          .from('job_posting_templates')
          .select('id, title, department, position, required_certifications')
          .eq('id', application.job_posting_id)
          .maybeSingle(),
        supabase
          .from('staff_documents')
          .select('id, document_type, verified_status, expires_at, metadata, created_at')
          .eq('owner_user_id', application.applicant_id)
          .eq('verified_status', 'approved')
          .order('created_at', { ascending: false }),
        supabase
          .from('agreement_acceptances')
          .select('id, template_id, template_version, context, accepted_at, organization_id')
          .eq('user_id', application.applicant_id)
          .order('accepted_at', { ascending: false }),
        supabase
          .from('endorsements')
          .select('id, skill, category, level, comment, created_at, event_id, job_id, project_id')
          .eq('endorsee_id', application.applicant_id)
          .eq('is_verified', true)
          .eq('is_active', true)
          .order('created_at', { ascending: false }),
        supabase
          .from('user_achievements')
          .select('achievement:achievements(name, category, points), completed_at')
          .eq('user_id', application.applicant_id)
          .eq('is_completed', true)
          .order('completed_at', { ascending: false })
          .limit(8),
        supabase
          .from('user_reward_wallets')
          .select('tier, total_points')
          .eq('user_id', application.applicant_id)
          .maybeSingle(),
        supabase
          .from('follows')
          .select('id', { count: 'exact', head: true })
          .eq('following_id', application.applicant_id),
      ])

    try {
      await recordHiringEligibilitySnapshot({
        supabase,
        assessment: eligibility,
        actorUserId: user.id,
      })
    } catch (snapshotError) {
      console.warn('⚠️ [employer/vetting] Failed to write eligibility snapshot:', snapshotError)
    }

    const agreementsForVenue = (agreementsResult.data || []).filter((agreement: any) => {
      if (!agreement.organization_id) return true
      return agreement.organization_id === application.venue_id
    })

    return NextResponse.json({
      success: true,
      data: {
        application,
        job_posting: jobPostingResult.data || null,
        gate: eligibility,
        verified_evidence: {
          documents: documentsResult.data || [],
          agreements: agreementsForVenue,
          endorsements: endorsementsResult.data || [],
          achievements: achievementsResult.data || [],
          wallet: walletResult.data || { tier: 'bronze', total_points: 0 },
          followers_count: connectionsResult.count || 0,
        },
      },
    })
  } catch (error) {
    console.error('[employer/vetting] GET failed:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to load employer vetting profile' },
      { status: 500 }
    )
  }
}
