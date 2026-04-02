import { NextRequest, NextResponse } from 'next/server'
import { AdminOnboardingStaffService } from '@/lib/services/admin-onboarding-staff.service'
import type { JobApplication } from '@/types/admin-onboarding'
import { createClient } from '@/lib/supabase/server'
import { CONTRACT_PROVIDERS, sendHireContractWithProvider } from '@/lib/contracts/provider-adapter'
import { isJobApplicationStatus } from '@/lib/hiring/states'

function isApplicationStatus(value: string): value is JobApplication['status'] {
  return isJobApplicationStatus(value)
}

function buildInvitationToken(candidateId: string) {
  return `invite_${candidateId}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

const allowedApplicationTransitions: Record<string, string[]> = {
  pending: ['reviewed', 'shortlisted', 'approved', 'rejected', 'withdrawn'],
  reviewed: ['shortlisted', 'approved', 'rejected', 'withdrawn'],
  shortlisted: ['approved', 'rejected', 'withdrawn'],
  approved: ['withdrawn'],
  rejected: [],
  withdrawn: [],
}

function canTransitionApplicationStatus(currentStatus: string, nextStatus: string) {
  if (currentStatus === nextStatus) return true
  return (allowedApplicationTransitions[currentStatus] || []).includes(nextStatus)
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

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const venueId = searchParams.get('venue_id')

    if (!venueId) {
      return NextResponse.json(
        { success: false, error: 'Venue ID is required' },
        { status: 400 }
      )
    }

    const applications = await AdminOnboardingStaffService.getJobApplications(venueId)
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

    return NextResponse.json({
      success: true,
      data: enrichedApplications,
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
      const { data: currentApplication, error: currentError } = await supabase
        .from('job_applications')
        .select('id, status, job_posting_id, venue_id')
        .eq('id', applicationId)
        .single()

      if (currentError || !currentApplication)
        return NextResponse.json({ success: false, error: 'Application not found' }, { status: 404 })

      if (!canTransitionApplicationStatus(currentApplication.status, 'approved')) {
        return NextResponse.json(
          {
            success: false,
            error: `Cannot transition application from ${currentApplication.status} to approved`,
          },
          { status: 409 }
        )
      }

      // Mark application approved then create/link candidate
      await AdminOnboardingStaffService.updateApplicationStatus(applicationId, { status: 'approved' })
      const candidate = await AdminOnboardingStaffService.createOrLinkCandidateFromApplication(applicationId)
      const invitationToken = buildInvitationToken(candidate.id)
      let onboardingUrl: string | null = null

      try {
        const { data: existingInvitation } = await supabase
          .from('staff_invitations')
          .select('id, token')
          .eq('user_id', candidate.user_id)
          .eq('status', 'accepted')
          .maybeSingle()

        const token = existingInvitation?.token || invitationToken
        if (!existingInvitation) {
          await supabase.from('staff_invitations').insert({
            email: candidate.email,
            phone: candidate.phone || null,
            position_details: {
              position: candidate.position,
              department: candidate.department,
              candidate_id: candidate.id,
              application_id: applicationId,
            },
            token,
            status: 'accepted',
            user_id: candidate.user_id,
            created_by: user.id,
          })
        }

        const appUrl =
          process.env.NEXT_PUBLIC_APP_URL ||
          process.env.VERCEL_URL?.replace(/^https?:\/\//, '').replace(/\/$/, '')
        onboardingUrl = appUrl
          ? `${appUrl.startsWith('http') ? appUrl : `https://${appUrl}`}/onboarding/${token}`
          : `/onboarding/${token}`
      } catch (invitationError) {
        console.warn('⚠️ [Applications API] Failed to create onboarding invitation:', invitationError)
      }

      let contract: any = null
      const shouldSendContract = body?.send_contract !== false
      const provider = CONTRACT_PROVIDERS.includes(body?.contract_provider)
        ? body.contract_provider
        : 'internal'

      if (shouldSendContract && candidate?.user_id) {
        try {
          const contractTerms = body?.contract_terms || `Offer details for ${candidate.position}`
          contract = await sendHireContractWithProvider({
            supabase,
            payload: {
              ownerUserId: user.id,
              counterpartyUserId: candidate.user_id,
              clientName: candidate.name || candidate.email || 'Candidate',
              clientEmail: candidate.email || null,
              title: `${candidate.position} - Employment Contract`,
              terms: contractTerms,
              provider,
              metadata: {
                source: 'admin_applications_approve',
                application_id: applicationId,
                candidate_id: candidate.id,
                venue_id: candidate.venue_id,
              },
            },
          })
        } catch (contractError) {
          console.warn('⚠️ [Applications API] Failed to send contract:', contractError)
        }
      }

      // Notify candidate if we have a user_id
      if (candidate?.user_id) {
        try {
          await AdminOnboardingStaffService.sendTeamCommunication(candidate.venue_id, {
            recipients: [candidate.user_id],
            subject: 'Application Approved',
            content: `You have been approved for ${candidate.position}. Please begin onboarding.`,
            message_type: 'announcement',
            priority: 'normal'
          })
        } catch {}
      }

      await writeHiringAuditEvent({
        supabase,
        actorUserId: user.id,
        applicationId,
        jobId: currentApplication.job_posting_id,
        venueId: currentApplication.venue_id,
        action: 'approve',
        fromStatus: currentApplication.status,
        toStatus: 'approved',
        metadata: {
          candidate_id: candidate?.id,
          onboarding_url: onboardingUrl,
          contract_id: contract?.contractId || contract?.id || null,
          contract_provider: contract?.provider || null,
        },
      })

      return NextResponse.json({
        success: true,
        data: {
          candidate,
          onboarding_url: onboardingUrl,
          contract,
        },
        message: 'Application approved, onboarding started, and contract initiated',
      })
    }

    if (action === 'reject') {
      const { data: currentApplication, error: currentError } = await supabase
        .from('job_applications')
        .select('id, status, job_posting_id, venue_id')
        .eq('id', applicationId)
        .single()

      if (currentError || !currentApplication)
        return NextResponse.json({ success: false, error: 'Application not found' }, { status: 404 })

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

    return NextResponse.json({ success: false, error: 'Unsupported action' }, { status: 400 })
  } catch (error) {
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

    for (const id of applicationIds) {
      if (typeof id !== 'string' || !id) continue
      const { data: currentApplication } = await supabase
        .from('job_applications')
        .select('id, status, job_posting_id, venue_id')
        .eq('id', id)
        .single()

      if (!currentApplication) continue
      if (!canTransitionApplicationStatus(currentApplication.status, status)) continue
      await AdminOnboardingStaffService.updateApplicationStatus(id, { status, feedback })
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

    return NextResponse.json({
      success: true,
      message: `${applicationIds.length} application(s) updated`,
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