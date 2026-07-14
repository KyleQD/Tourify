import { NextRequest, NextResponse } from 'next/server'
import { AdminOnboardingStaffService } from '@/lib/services/admin-onboarding-staff.service'
import type { JobApplication } from '@/types/admin-onboarding'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { OptimizedNotificationService } from '@/lib/services/optimized-notification-service'
import { CONTRACT_PROVIDERS, sendHireContractWithProvider } from '@/lib/contracts/provider-adapter'
import { isJobApplicationStatus } from '@/lib/hiring/states'
import { canTransitionApplicationStatus } from '@/lib/hiring/application-transitions'
import { canReviewStaffingApplications } from '@/lib/auth/hiring-permissions'
import { recordAchievementMetricEvent } from '@/lib/services/achievement-metric-events.service'
import {
  evaluateHiringEligibility,
  isHiringEligibilityGateError,
  recordHiringEligibilitySnapshot,
} from '@/lib/services/hiring-eligibility.service'
import { runStaffApplicationApprovedSideEffects } from '@/lib/rebuild/hiring-automation'
import { approveStaffApplication } from '@/lib/services/hiring-application-approval.service'
import { createHiringServiceClient } from '@/lib/supabase/hiring-service-client'

function isApplicationStatus(value: string): value is JobApplication['status'] {
  return isJobApplicationStatus(value)
}

function buildInvitationToken(candidateId: string) {
  return `invite_${candidateId}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

async function hasVenueReviewAccess(input: {
  userId: string
  venueId?: string | null
}): Promise<boolean> {
  if (!input.venueId) return false
  return canReviewStaffingApplications({ userId: input.userId, venueId: input.venueId })
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
  const eventMetadata = {
    actor_user_id: actorUserId,
    application_id: applicationId,
    action,
    from_status: fromStatus,
    to_status: toStatus,
    timestamp: new Date().toISOString(),
    ...(metadata || {}),
  }

  try {
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
      metadata: eventMetadata,
    })
  } catch (error) {
    console.warn('⚠️ [Applications API] Failed to write hiring_audit_events row:', error)
  }

  try {
    await supabase.from('notifications').insert({
      user_id: actorUserId,
      type: 'hiring_status_transition',
      title,
      content,
      metadata: eventMetadata,
    })
  } catch (error) {
    console.warn('⚠️ [Applications API] Failed to write hiring audit event:', error)
  }
}

async function recordApprovedApplicationMetric(input: {
  applicantId?: string | null
  applicationId: string
  jobPostingId?: string | null
  venueId?: string | null
  source?: 'approve' | 'bulk_patch'
}) {
  if (!input.applicantId) return

  try {
    const serviceRoleSupabase = createServiceRoleClient()
    await recordAchievementMetricEvent({
      supabase: serviceRoleSupabase,
      userId: input.applicantId,
      metricKey: 'accepted_applications_total',
      eventType: 'job_application_approved',
      delta: 1,
      eventData: {
        application_id: input.applicationId,
        job_posting_id: input.jobPostingId,
        venue_id: input.venueId,
        source: input.source || 'approve',
      },
      relatedProjectId: input.jobPostingId || undefined,
    })
  } catch (error) {
    console.warn('⚠️ [Applications API] Failed to record approved-application metric:', error)
  }
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
    console.warn('⚠️ [Applications API] Failed to notify applicant status change:', error)
  }
}

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

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    let venueId = searchParams.get('venue_id')
    const jobPostingId = searchParams.get('job_posting_id') || null

    // When only job_posting_id is supplied, resolve the venue_id from the posting so we
    // can do the same RBAC check without requiring callers to pass both params.
    if (!venueId && jobPostingId) {
      const { data: posting } = await supabase
        .from('job_posting_templates')
        .select('venue_id')
        .eq('id', jobPostingId)
        .single()
      venueId = posting?.venue_id ?? null
    }

    if (!venueId) {
      return NextResponse.json(
        { success: false, error: 'venue_id or job_posting_id is required' },
        { status: 400 }
      )
    }

    const canReview = await hasVenueReviewAccess({ userId: user.id, venueId })
    if (!canReview)
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })

    const allApplications = await AdminOnboardingStaffService.getJobApplications(venueId)
    const applications = jobPostingId
      ? allApplications.filter((a: any) => a.job_posting_id === jobPostingId)
      : allApplications
    const applicationIds = applications.map((application) => application.id).filter(Boolean)
    const applicantIds = applications
      .map((application) => (application as any).applicant_id)
      .filter((id): id is string => Boolean(id))

    let onboardingByApplication = new Map<string, any>()
    let contractsByUser = new Map<string, any>()

    if (applicationIds.length > 0) {
      const { data: candidateRows } = await supabase
        .from('staff_onboarding_candidates')
        .select('id, application_id, status, stage, onboarding_progress, user_id, updated_at')
        .in('application_id', applicationIds)

      onboardingByApplication = new Map(
        (candidateRows || []).map((candidate: any) => [candidate.application_id, candidate])
      )
    }

    if (applicantIds.length > 0) {
      const { data: contractRows } = await supabase
        .from('artist_contracts')
        .select('id, counterparty_user_id, status, updated_at')
        .in('counterparty_user_id', applicantIds)
        .order('updated_at', { ascending: false })

      contractsByUser = new Map<string, any>()
      ;(contractRows || []).forEach((contract: any) => {
        if (!contractsByUser.has(contract.counterparty_user_id))
          contractsByUser.set(contract.counterparty_user_id, contract)
      })
    }

    const enrichedApplications = applications.map((application) => {
      const onboarding = onboardingByApplication.get(application.id)
      const contract = contractsByUser.get((application as any).applicant_id)

      return {
        ...application,
        onboarding_status: onboarding
          ? {
              status: onboarding.status,
              stage: onboarding.stage,
              progress: onboarding.onboarding_progress,
              updated_at: onboarding.updated_at,
            }
          : null,
        contract_status: contract
          ? {
              id: contract.id,
              status: contract.status,
              updated_at: contract.updated_at,
            }
          : null,
      }
    })

    const { data: evidenceRequestRows } = await supabase
      .from('hiring_audit_events')
      .select('application_id, actor_user_id, content, metadata, created_at')
      .in('application_id', applicationIds.length > 0 ? applicationIds : ['00000000-0000-0000-0000-000000000000'])
      .eq('action', 'request_evidence')
      .order('created_at', { ascending: false })

    const latestEvidenceRequestByApplication = new Map<string, any>()
    ;(evidenceRequestRows || []).forEach((row: any) => {
      if (latestEvidenceRequestByApplication.has(row.application_id)) return
      latestEvidenceRequestByApplication.set(row.application_id, row)
    })

    const applicationsWithEvidenceState = enrichedApplications.map((application) => {
      const evidenceRequest = latestEvidenceRequestByApplication.get(application.id)
      return {
        ...application,
        evidence_request_status: evidenceRequest
          ? {
              requested_at: evidenceRequest.created_at,
              requested_by: evidenceRequest.actor_user_id,
              message: evidenceRequest.metadata?.message || evidenceRequest.content || '',
            }
          : null,
      }
    })

    return NextResponse.json({
      success: true,
      data: applicationsWithEvidenceState,
    })
  } catch (error) {
    console.error('❌ [Applications API] Error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch applications',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()
    const { action, application_id: applicationId } = body || {}
    if (!action || !applicationId) {
      return NextResponse.json({ success: false, error: 'action and application_id required' }, { status: 400 })
    }

    if (action === 'approve') {
      const serviceSupabase = createHiringServiceClient()
      const approvalResult = await approveStaffApplication({
        supabase: serviceSupabase,
        actorUserId: user.id,
        applicationId,
        options: {
          feedback: body?.feedback,
          note: body?.feedback,
          sendContract: body?.send_contract !== false,
          contractProvider: body?.contract_provider,
          contractTerms: body?.contract_terms,
        },
      })

      if (!approvalResult.ok) {
        if (approvalResult.error.code === 'CONFLICT' && approvalResult.error.details) {
          return NextResponse.json(
            {
              success: false,
              error: approvalResult.error.message,
              ...(approvalResult.error.details as Record<string, unknown>),
            },
            { status: 409 }
          )
        }

        const status =
          approvalResult.error.code === 'NOT_FOUND'
            ? 404
            : approvalResult.error.code === 'FORBIDDEN'
              ? 403
              : approvalResult.error.code === 'VALIDATION_ERROR'
                ? 422
                : 500

        return NextResponse.json(
          { success: false, error: approvalResult.error.message, details: approvalResult.error.details },
          { status }
        )
      }

      return NextResponse.json({
        success: true,
        data: {
          candidate: approvalResult.data.candidate,
          onboarding_url: approvalResult.data.onboardingUrl,
          contract: approvalResult.data.contract,
        },
        message: 'Application approved, onboarding started, and contract initiated',
      })
    }

    if (action === 'reject') {
      const { data: currentApplication, error: currentError } = await supabase
        .from('job_applications')
        .select('id, status, job_posting_id, venue_id, applicant_id')
        .eq('id', applicationId)
        .single()

      if (currentError || !currentApplication)
        return NextResponse.json({ success: false, error: 'Application not found' }, { status: 404 })

      const canReview = await hasVenueReviewAccess({
        userId: user.id,
        venueId: currentApplication.venue_id,
      })
      if (!canReview)
        return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })

      if (!canTransitionApplicationStatus(currentApplication.status, 'rejected')) {
        return NextResponse.json(
          {
            success: false,
            error: `Cannot transition application from ${currentApplication.status} to rejected`,
          },
          { status: 409 }
        )
      }

      const updated = await AdminOnboardingStaffService.updateApplicationStatus(applicationId, { status: 'rejected' })
      await notifyApplicantStatusChange({
        applicantUserId: currentApplication.applicant_id,
        applicationId,
        venueId: currentApplication.venue_id,
        status: 'rejected',
      })
      await writeHiringAuditEvent({
        supabase,
        actorUserId: user.id,
        applicationId,
        jobId: currentApplication.job_posting_id,
        venueId: currentApplication.venue_id,
        action: 'reject',
        fromStatus: currentApplication.status,
        toStatus: 'rejected',
      })
      return NextResponse.json({ success: true, data: updated, message: 'Application rejected' })
    }

    if (action === 'request_evidence') {
      const { data: currentApplication, error: currentError } = await supabase
        .from('job_applications')
        .select('id, status, job_posting_id, venue_id, applicant_id, applicant_name')
        .eq('id', applicationId)
        .single()

      if (currentError || !currentApplication)
        return NextResponse.json({ success: false, error: 'Application not found' }, { status: 404 })

      const canReview = await hasVenueReviewAccess({
        userId: user.id,
        venueId: currentApplication.venue_id,
      })
      if (!canReview)
        return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })

      const requestedMessage =
        typeof body?.message === 'string' && body.message.trim().length > 0
          ? body.message.trim()
          : `Please provide missing verified evidence so we can continue your review.`

      await writeHiringAuditEvent({
        supabase,
        actorUserId: user.id,
        applicationId,
        jobId: currentApplication.job_posting_id,
        venueId: currentApplication.venue_id,
        action: 'request_evidence',
        fromStatus: currentApplication.status,
        toStatus: currentApplication.status,
        metadata: {
          request_type: 'missing_evidence',
          message: requestedMessage,
        },
      })

      if (currentApplication.applicant_id) {
        try {
          await OptimizedNotificationService.createNotification({
            userId: currentApplication.applicant_id,
            type: 'hiring_evidence_requested',
            title: 'Additional verification requested',
            content: requestedMessage,
            relatedUserId: user.id,
            metadata: {
              application_id: applicationId,
              venue_id: currentApplication.venue_id,
              requested_by: user.id,
            },
          })
        } catch (notificationError) {
          console.warn('⚠️ [Applications API] Failed to send evidence request notification:', notificationError)
        }
      }

      return NextResponse.json({
        success: true,
        data: {
          application_id: applicationId,
          requested_at: new Date().toISOString(),
        },
        message: 'Evidence request sent',
      })
    }

    return NextResponse.json({ success: false, error: 'Unsupported action' }, { status: 400 })
  } catch (error) {
    if (isHiringEligibilityGateError(error))
      return NextResponse.json(buildEligibilityConflictPayload(error.assessment), { status: 409 })
    console.error('❌ [Applications API] Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to process request' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()
    const { applicationIds, status, feedback } = body || {}

    if (!Array.isArray(applicationIds) || applicationIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'applicationIds (non-empty array) is required' },
        { status: 400 }
      )
    }
    if (!status || typeof status !== 'string') {
      return NextResponse.json(
        { success: false, error: 'status is required' },
        { status: 400 }
      )
    }
    if (!isApplicationStatus(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid application status' },
        { status: 400 }
      )
    }

    if (status === 'approved') {
      const blocked: Array<{ application_id: string; eligibility: any }> = []
      for (const id of applicationIds) {
        if (typeof id !== 'string' || !id) continue
        const { data: currentApplication } = await supabase
          .from('job_applications')
          .select('id, venue_id')
          .eq('id', id)
          .single()

        if (!currentApplication) continue
        const canReview = await hasVenueReviewAccess({
          userId: user.id,
          venueId: currentApplication.venue_id,
        })
        if (!canReview) continue

        const eligibility = await evaluateHiringEligibility({
          supabase,
          applicationId: id,
        })
        try {
          await recordHiringEligibilitySnapshot({
            supabase,
            assessment: eligibility,
            actorUserId: user.id,
          })
        } catch (snapshotError) {
          console.warn('⚠️ [Applications API] Failed to write eligibility snapshot:', snapshotError)
        }
        if (eligibility.mode === 'enforce' && !eligibility.is_eligible) {
          blocked.push({ application_id: id, eligibility })
        }
      }

      if (blocked.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'One or more applications are blocked by hiring eligibility gates',
            code: 'HIRING_ELIGIBILITY_BLOCKED',
            blocked,
          },
          { status: 409 }
        )
      }
    }

    const updatedIds: string[] = []
    const skipped: Array<{ application_id: string; reason: string }> = []
    for (const id of applicationIds) {
      if (typeof id !== 'string' || !id) {
        skipped.push({ application_id: String(id || ''), reason: 'invalid_application_id' })
        continue
      }
      const { data: currentApplication } = await supabase
        .from('job_applications')
        .select('id, status, job_posting_id, venue_id, applicant_id')
        .eq('id', id)
        .single()

      if (!currentApplication) {
        skipped.push({ application_id: id, reason: 'application_not_found' })
        continue
      }
      const canReview = await hasVenueReviewAccess({
        userId: user.id,
        venueId: currentApplication.venue_id,
      })
      if (!canReview) {
        skipped.push({ application_id: id, reason: 'forbidden' })
        continue
      }
      if (!canTransitionApplicationStatus(currentApplication.status, status)) {
        skipped.push({
          application_id: id,
          reason: `invalid_transition:${currentApplication.status}->${status}`,
        })
        continue
      }
      try {
        await AdminOnboardingStaffService.updateApplicationStatus(id, { status, feedback })
      } catch (error) {
        if (isHiringEligibilityGateError(error)) {
          return NextResponse.json(buildEligibilityConflictPayload(error.assessment), { status: 409 })
        }
        throw error
      }
      updatedIds.push(id)
      if (status === 'approved' && currentApplication.applicant_id) {
        await recordApprovedApplicationMetric({
          applicantId: currentApplication.applicant_id,
          applicationId: id,
          jobPostingId: currentApplication.job_posting_id,
          venueId: currentApplication.venue_id,
          source: 'bulk_patch',
        })
      }
      await writeHiringAuditEvent({
        supabase,
        actorUserId: user.id,
        applicationId: id,
        jobId: currentApplication.job_posting_id,
        venueId: currentApplication.venue_id,
        action: 'bulk_patch',
        fromStatus: currentApplication.status,
        toStatus: status,
        metadata: { feedback: feedback || null },
      })
    }

    if (updatedIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No applications were updated',
          data: {
            updated_ids: updatedIds,
            skipped,
          },
        },
        { status: 409 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `${updatedIds.length} application(s) updated`,
      data: {
        updated_ids: updatedIds,
        skipped,
      },
    })
  } catch (error) {
    console.error('❌ [Applications API] Bulk PATCH error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to bulk update applications',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}