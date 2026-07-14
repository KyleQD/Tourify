import { NextRequest, NextResponse } from 'next/server'
import { AdminOnboardingStaffService } from '@/lib/services/admin-onboarding-staff.service'
import { createClient } from '@/lib/supabase/server'
import { canReviewStaffingApplications } from '@/lib/auth/hiring-permissions'
import { isJobApplicationStatus } from '@/lib/hiring/states'
import { canTransitionApplicationStatus } from '@/lib/hiring/application-transitions'
import { isHiringEligibilityGateError } from '@/lib/services/hiring-eligibility.service'
import { OptimizedNotificationService } from '@/lib/services/optimized-notification-service'
import { approveStaffApplication } from '@/lib/services/hiring-application-approval.service'
import { createHiringServiceClient } from '@/lib/supabase/hiring-service-client'

function buildEligibilityConflictPayload(assessment: any) {
  return {
    success: false,
    error: 'Application cannot be approved until required verified evidence is complete',
    code: 'HIRING_ELIGIBILITY_BLOCKED',
    eligibility: {
      mode: assessment.mode,
      blocking_reasons: assessment.blocking_reasons,
      checklist: assessment.checklist,
      summary: assessment.summary,
    },
  }
}

async function writeHiringAuditEvent(input: {
  supabase: any
  actorUserId: string
  applicationId: string
  jobId?: string | null
  venueId?: string | null
  action: string
  fromStatus: string
  toStatus: string
  metadata?: Record<string, unknown>
}) {
  const { supabase, actorUserId, applicationId, jobId, venueId, action, fromStatus, toStatus, metadata } = input
  const title = `Hiring status changed: ${fromStatus} -> ${toStatus}`
  const content = `Application ${applicationId} moved from ${fromStatus} to ${toStatus} via ${action}.`
  await supabase.from('hiring_audit_events').insert({
    application_id: applicationId,
    job_id: jobId || null,
    venue_id: venueId || null,
    actor_user_id: actorUserId,
    action,
    from_status: fromStatus,
    to_status: toStatus,
    title,
    content,
    metadata: {
      actor_user_id: actorUserId,
      application_id: applicationId,
      action,
      from_status: fromStatus,
      to_status: toStatus,
      ...(metadata || {}),
    },
  })
}

async function notifyApplicantStatusChange(input: {
  applicantUserId?: string | null
  applicationId: string
  venueId?: string | null
  status: string
  feedback?: string | null
}) {
  const { applicantUserId, applicationId, venueId, status, feedback } = input
  if (!applicantUserId) return

  const title = status === 'approved' ? 'Application Approved' : 'Application Update'
  const content =
    status === 'approved'
      ? 'Your application was approved. Check your onboarding updates for next steps.'
      : status === 'rejected'
        ? 'Your application was not selected this time.'
        : `Your application status is now ${status}.`

  try {
    await OptimizedNotificationService.createNotification({
      userId: applicantUserId,
      type: 'hiring_application_status_updated',
      title,
      content,
      metadata: {
        application_id: applicationId,
        venue_id: venueId || null,
        status,
        feedback: feedback || null,
      },
    })
  } catch (error) {
    console.warn('⚠️ [Admin Application API] Failed to notify applicant status change:', error)
  }
}

export async function PATCH(
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
    const { status, feedback, rating } = body

    if (!status || !isJobApplicationStatus(status)) {
      return NextResponse.json(
        { success: false, error: 'Valid status is required' },
        { status: 400 }
      )
    }

    const { data: currentApplication, error: currentError } = await supabase
      .from('job_applications')
      .select('id, status, venue_id, job_posting_id, applicant_id')
      .eq('id', id)
      .single()
    if (currentError || !currentApplication)
      return NextResponse.json({ success: false, error: 'Application not found' }, { status: 404 })

    const canReview = await canReviewStaffingApplications({
      userId: user.id,
      venueId: currentApplication.venue_id,
    })
    if (!canReview) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })

    if (!canTransitionApplicationStatus(currentApplication.status, status)) {
      return NextResponse.json(
        { success: false, error: `Cannot transition application from ${currentApplication.status} to ${status}` },
        { status: 409 }
      )
    }

    // Approvals go through the canonical service so every admin surface produces
    // the same side effects: candidate + invitation + workflow + roster shell,
    // separate approval/onboarding notifications, and work-thread messages.
    if (status === 'approved') {
      const serviceClient = createHiringServiceClient()
      const result = await approveStaffApplication({
        supabase: serviceClient,
        actorUserId: user.id,
        applicationId: id,
        options: { feedback: typeof feedback === 'string' ? feedback : undefined },
      })

      if (!result.ok) {
        const eligibilityDetails = result.error.details as { code?: string; eligibility?: unknown } | undefined
        if (eligibilityDetails?.code === 'HIRING_ELIGIBILITY_BLOCKED') {
          return NextResponse.json(
            {
              success: false,
              error: result.error.message,
              code: 'HIRING_ELIGIBILITY_BLOCKED',
              eligibility: eligibilityDetails.eligibility,
            },
            { status: 409 }
          )
        }
        const statusCode =
          result.error.code === 'NOT_FOUND'
            ? 404
            : result.error.code === 'FORBIDDEN'
              ? 403
              : result.error.code === 'CONFLICT'
                ? 409
                : 400
        return NextResponse.json({ success: false, error: result.error.message }, { status: statusCode })
      }

      return NextResponse.json({
        data: result.data.application,
        success: true,
        message: 'Application status updated successfully',
      })
    }

    const updatedApplication = await AdminOnboardingStaffService.updateApplicationStatus(
      id,
      { status, feedback, rating }
    )

    if (status === 'rejected') {
      await notifyApplicantStatusChange({
        applicantUserId: currentApplication.applicant_id,
        applicationId: id,
        venueId: currentApplication.venue_id,
        status,
        feedback: typeof feedback === 'string' ? feedback : null,
      })
    }

    await writeHiringAuditEvent({
      supabase,
      actorUserId: user.id,
      applicationId: id,
      jobId: currentApplication.job_posting_id,
      venueId: currentApplication.venue_id,
      action: 'patch',
      fromStatus: currentApplication.status,
      toStatus: status,
      metadata: { feedback: feedback || null },
    })

    return NextResponse.json({
      data: updatedApplication,
      success: true,
      message: 'Application status updated successfully'
    })
  } catch (error) {
    if (isHiringEligibilityGateError(error))
      return NextResponse.json(buildEligibilityConflictPayload(error.assessment), { status: 409 })
    console.error('❌ [Admin Application API] Error updating application:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update application' },
      { status: 500 }
    )
  }
} 